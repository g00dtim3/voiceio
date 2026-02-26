import { Request, Response, NextFunction } from "express";
import { pool } from "../db/pool";
import { sendError } from "./errorHandler";

// ─── requireReportEditPermission ─────────────────────────────────────────────
// GWT S2: "Given a user has org role viewer
//          When they are granted edit permission on a report they do not own
//          Then they can edit that report, but remain viewer elsewhere"
//
// - admin / editor  → always allowed (next() immediately, no DB hit)
// - viewer          → check report_permissions for an explicit 'edit' grant
// - external_view_only → always 403
export async function requireReportEditPermission(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { role, sub } = req.auth;

  if (role === "admin" || role === "editor") {
    next();
    return;
  }

  if (role === "viewer") {
    const { reportId } = req.params;
    try {
      const { rows } = await pool.query(
        `SELECT id FROM report_permissions
         WHERE report_id = $1 AND user_id = $2 AND permission = 'edit'`,
        [reportId, sub]
      );
      if (rows.length > 0) {
        next();
        return;
      }
    } catch (err) {
      console.error(err);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to check report permissions", req.requestId);
      return;
    }
  }

  sendError(res, 403, "FORBIDDEN", "Insufficient permissions to edit this report", req.requestId);
}
