import { Router, Request, Response } from "express";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { z } from "zod";
import { pool } from "../db/pool";
import { sendError } from "../middleware/errorHandler";
import { ReportPermission, ReportShareSettings } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function passwordsMatch(provided: string, stored: string): boolean {
  const a = Buffer.from(hashPassword(provided), "hex");
  const b = Buffer.from(stored, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function rowToPermission(r: Record<string, unknown>): ReportPermission {
  return {
    id: r.id as string,
    reportId: r.report_id as string,
    userId: r.user_id as string,
    permission: r.permission as ReportPermission["permission"],
    grantedBy: (r.granted_by as string) ?? null,
    createdAt: (r.created_at as Date).toISOString(),
  };
}

function rowToShareSettings(r: Record<string, unknown>): ReportShareSettings {
  return {
    reportId: r.id as string,
    shareEnabled: r.share_enabled as boolean,
    shareToken: (r.share_token as string) ?? null,
    passwordEnabled: r.share_password_hash != null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC SHARE — /r/:token  (no auth required)
// ═══════════════════════════════════════════════════════════════════════════════

export const publicShareRouter = Router();

// ─── GET /r/:token ────────────────────────────────────────────────────────────
// GWT S1: "When someone opens /r/:token → they can view the report
//          And if password enabled, they must enter it before viewing"
publicShareRouter.get("/:token", async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT id, project_id, name, mode, share_enabled, share_token, share_password_hash,
              created_at, updated_at
       FROM reports
       WHERE share_token = $1 AND share_enabled = TRUE`,
      [token]
    );

    if (rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Share link not found or disabled", req.requestId);
      return;
    }

    const report = rows[0];

    // Password gate
    if (report.share_password_hash != null) {
      const provided = req.headers["x-share-password"] as string | undefined;
      if (!provided) {
        res.status(401).json({ passwordRequired: true });
        return;
      }
      if (!passwordsMatch(provided, report.share_password_hash as string)) {
        sendError(res, 401, "UNAUTHORIZED", "Invalid share password", req.requestId);
        return;
      }
    }

    // Return report as read-only view (no editing capabilities)
    res.json({
      id: report.id,
      projectId: report.project_id,
      name: report.name,
      mode: "preview",   // always preview for public share
      createdAt: (report.created_at as Date).toISOString(),
      updatedAt: (report.updated_at as Date).toISOString(),
    });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch shared report", req.requestId);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SHARING MANAGEMENT — /api/projects/:projectId/reports/:reportId/share
// ═══════════════════════════════════════════════════════════════════════════════

export const sharingRouter = Router({ mergeParams: true });

// ─── GET /:reportId/share ─────────────────────────────────────────────────────
sharingRouter.get("/:reportId/share", async (req: Request, res: Response) => {
  const { projectId, reportId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT id, share_enabled, share_token, share_password_hash
       FROM reports WHERE id = $1 AND project_id = $2`,
      [reportId, projectId]
    );
    if (rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Report not found", req.requestId);
      return;
    }
    res.json(rowToShareSettings(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get share settings", req.requestId);
  }
});

// ─── POST /:reportId/share ────────────────────────────────────────────────────
// GWT S1: "Given user enables public share" → generate token, optionally set password
const EnableShareSchema = z.object({
  password: z.string().min(1).optional(),
});

sharingRouter.post("/:reportId/share", async (req: Request, res: Response) => {
  const parsed = EnableShareSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  const { projectId, reportId } = req.params;
  const { password } = parsed.data;
  const token = randomBytes(24).toString("hex");
  const passwordHash = password ? hashPassword(password) : null;

  try {
    const { rows } = await pool.query(
      `UPDATE reports
       SET share_enabled = TRUE,
           share_token = $1,
           share_password_hash = $2,
           updated_at = now()
       WHERE id = $3 AND project_id = $4
       RETURNING id, share_enabled, share_token, share_password_hash`,
      [token, passwordHash, reportId, projectId]
    );
    if (rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Report not found", req.requestId);
      return;
    }
    res.status(201).json(rowToShareSettings(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to enable sharing", req.requestId);
  }
});

// ─── DELETE /:reportId/share ──────────────────────────────────────────────────
sharingRouter.delete("/:reportId/share", async (req: Request, res: Response) => {
  const { projectId, reportId } = req.params;
  try {
    const { rowCount } = await pool.query(
      `UPDATE reports
       SET share_enabled = FALSE,
           share_token = NULL,
           share_password_hash = NULL,
           updated_at = now()
       WHERE id = $1 AND project_id = $2`,
      [reportId, projectId]
    );
    if (!rowCount || rowCount === 0) {
      sendError(res, 404, "NOT_FOUND", "Report not found", req.requestId);
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to disable sharing", req.requestId);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSIONS — /api/projects/:projectId/reports/:reportId/permissions
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /:reportId/permissions ───────────────────────────────────────────────
sharingRouter.get("/:reportId/permissions", async (req: Request, res: Response) => {
  const { projectId, reportId } = req.params;
  try {
    // verify report belongs to project
    const check = await pool.query(
      `SELECT id FROM reports WHERE id = $1 AND project_id = $2`,
      [reportId, projectId]
    );
    if (check.rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Report not found", req.requestId);
      return;
    }

    const { rows } = await pool.query(
      `SELECT id, report_id, user_id, permission, granted_by, created_at
       FROM report_permissions WHERE report_id = $1 ORDER BY created_at ASC`,
      [reportId]
    );
    const items: ReportPermission[] = rows.map(rowToPermission);
    res.json({ items });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list permissions", req.requestId);
  }
});

// ─── POST /:reportId/permissions ─────────────────────────────────────────────
// GWT S2: "When they are granted edit permission on a report they do not own"
const GrantPermissionSchema = z.object({
  userId: z.string().min(1),
  permission: z.enum(["view", "edit"]),
});

sharingRouter.post("/:reportId/permissions", async (req: Request, res: Response) => {
  const parsed = GrantPermissionSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  const { projectId, reportId } = req.params;
  const { userId, permission } = parsed.data;
  const grantedBy = req.auth.sub;

  try {
    const check = await pool.query(
      `SELECT id FROM reports WHERE id = $1 AND project_id = $2`,
      [reportId, projectId]
    );
    if (check.rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Report not found", req.requestId);
      return;
    }

    const { rows } = await pool.query(
      `INSERT INTO report_permissions (report_id, user_id, permission, granted_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (report_id, user_id) DO UPDATE
         SET permission = EXCLUDED.permission,
             granted_by = EXCLUDED.granted_by
       RETURNING id, report_id, user_id, permission, granted_by, created_at`,
      [reportId, userId, permission, grantedBy]
    );
    res.status(201).json(rowToPermission(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to grant permission", req.requestId);
  }
});

// ─── DELETE /:reportId/permissions/:userId ────────────────────────────────────
sharingRouter.delete("/:reportId/permissions/:userId", async (req: Request, res: Response) => {
  const { projectId, reportId, userId } = req.params;
  try {
    // verify report belongs to project first
    const check = await pool.query(
      `SELECT id FROM reports WHERE id = $1 AND project_id = $2`,
      [reportId, projectId]
    );
    if (check.rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Report not found", req.requestId);
      return;
    }

    const { rowCount } = await pool.query(
      `DELETE FROM report_permissions WHERE report_id = $1 AND user_id = $2`,
      [reportId, userId]
    );
    if (!rowCount || rowCount === 0) {
      sendError(res, 404, "NOT_FOUND", "Permission not found", req.requestId);
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to revoke permission", req.requestId);
  }
});
