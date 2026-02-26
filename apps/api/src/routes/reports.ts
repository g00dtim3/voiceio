import { Router, Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { sendError } from "../middleware/errorHandler";
import { Report } from "../types";

export const reportsRouter = Router({ mergeParams: true });

// ─── GET /projects/:projectId/reports ─────────────────────────────────────────
reportsRouter.get("/", async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT id, project_id, name, created_at, updated_at
       FROM reports WHERE project_id = $1 ORDER BY created_at DESC`,
      [projectId]
    );
    const items: Report[] = rows.map(rowToReport);
    res.json({ items, page: 1, pageSize: items.length, total: items.length });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list reports", req.requestId);
  }
});

// ─── POST /projects/:projectId/reports ────────────────────────────────────────
const CreateReportSchema = z.object({ name: z.string().min(1) });

reportsRouter.post("/", async (req: Request, res: Response) => {
  const parsed = CreateReportSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  const { projectId } = req.params;
  try {
    const { rows } = await pool.query(
      `INSERT INTO reports (project_id, name) VALUES ($1, $2)
       RETURNING id, project_id, name, created_at, updated_at`,
      [projectId, parsed.data.name]
    );
    res.status(201).json(rowToReport(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to create report", req.requestId);
  }
});

// ─── GET /projects/:projectId/reports/:reportId/layout ───────────────────────
reportsRouter.get("/:reportId/layout", async (req: Request, res: Response) => {
  const { reportId } = req.params;
  try {
    const [sectionsResult, viewsResult] = await Promise.all([
      pool.query(
        `SELECT rs.id, rs.title, rs.sort_order,
                json_agg(ie ORDER BY ie.sort_order) FILTER (WHERE ie.id IS NOT NULL) AS elements
         FROM report_sections rs
         LEFT JOIN insight_elements ie ON ie.section_id = rs.id
         WHERE rs.report_id = $1
         GROUP BY rs.id ORDER BY rs.sort_order`,
        [reportId]
      ),
      pool.query(
        `SELECT id, name, filters, segments, date_range, sort_order
         FROM report_views WHERE report_id = $1 ORDER BY sort_order`,
        [reportId]
      ),
    ]);
    res.json({ sections: sectionsResult.rows, views: viewsResult.rows });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get report layout", req.requestId);
  }
});

// ─── PATCH /projects/:projectId/reports/:reportId/layout ─────────────────────
const PatchLayoutSchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        title: z.string(),
        sortOrder: z.number().int().default(0),
        elements: z
          .array(
            z.object({
              id: z.string().uuid().optional(),
              type: z.string(),
              config: z.record(z.unknown()).default({}),
              sortOrder: z.number().int().default(0),
            })
          )
          .default([]),
      })
    )
    .optional(),
});

reportsRouter.patch("/:reportId/layout", async (req: Request, res: Response) => {
  const parsed = PatchLayoutSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  // TODO: implement transactional layout upsert (sections + elements)
  res.json({ ok: true });
});

// ─── GET /projects/:projectId/reports/:reportId/share ────────────────────────
reportsRouter.get("/:reportId/share", async (req: Request, res: Response) => {
  const { reportId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT report_id, public_enabled, embed_enabled, created_at
       FROM report_share_settings WHERE report_id = $1`,
      [reportId]
    );
    if (rows.length === 0) {
      res.json({ reportId, publicEnabled: false, embedEnabled: false });
      return;
    }
    const r = rows[0];
    res.json({
      reportId: r.report_id,
      publicEnabled: r.public_enabled,
      embedEnabled: r.embed_enabled,
      createdAt: r.created_at.toISOString(),
    });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get share settings", req.requestId);
  }
});

// ─── POST /projects/:projectId/reports/:reportId/share ───────────────────────
const ShareSettingsSchema = z.object({
  publicEnabled: z.boolean(),
  embedEnabled: z.boolean(),
  passwordHash: z.string().nullable().optional(),
});

reportsRouter.post("/:reportId/share", async (req: Request, res: Response) => {
  const parsed = ShareSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  const { reportId } = req.params;
  const { publicEnabled, embedEnabled, passwordHash } = parsed.data;

  try {
    await pool.query(
      `INSERT INTO report_share_settings (report_id, public_enabled, embed_enabled, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (report_id) DO UPDATE
         SET public_enabled = EXCLUDED.public_enabled,
             embed_enabled  = EXCLUDED.embed_enabled,
             password_hash  = EXCLUDED.password_hash`,
      [reportId, publicEnabled, embedEnabled, passwordHash ?? null]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to update share settings", req.requestId);
  }
});

function rowToReport(r: Record<string, unknown>): Report {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    name: r.name as string,
    createdAt: (r.created_at as Date).toISOString(),
    updatedAt: (r.updated_at as Date).toISOString(),
  };
}
