import { Router, Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { sendError } from "../middleware/errorHandler";
import { Report, ReportView, ReportSection, InsightElement, Filter } from "../types";

export const reportsRouter = Router({ mergeParams: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToReport(r: Record<string, unknown>): Report {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    name: r.name as string,
    mode: ((r.mode as string) ?? "edit") as Report["mode"],
    createdAt: (r.created_at as Date).toISOString(),
    updatedAt: (r.updated_at as Date).toISOString(),
  };
}

function rowToView(r: Record<string, unknown>): ReportView {
  return {
    id: r.id as string,
    reportId: r.report_id as string,
    name: r.name as string,
    filters: (r.filters as Filter[]) ?? [],
    segments: (r.segments as Filter[]) ?? [],
    dateRange: (r.date_range as Record<string, unknown>) ?? null,
    sortOrder: r.sort_order as number,
  };
}

function rowToElement(r: Record<string, unknown>): InsightElement {
  return {
    id: r.id as string,
    sectionId: (r.section_id as string),
    type: r.type as string,
    config: (r.config as Record<string, unknown>) ?? {},
    sortOrder: r.sort_order as number,
  };
}

function rowToSection(r: Record<string, unknown>): ReportSection {
  const elements = Array.isArray(r.elements)
    ? (r.elements as Record<string, unknown>[]).map(rowToElement)
    : [];
  return {
    id: r.id as string,
    reportId: r.report_id as string,
    title: r.title as string,
    sortOrder: r.sort_order as number,
    elements,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS CRUD
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /projects/:projectId/reports ─────────────────────────────────────────
reportsRouter.get("/", async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT id, project_id, name, mode, created_at, updated_at
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
       RETURNING id, project_id, name, mode, created_at, updated_at`,
      [projectId, parsed.data.name]
    );
    res.status(201).json(rowToReport(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to create report", req.requestId);
  }
});

// ─── GET /projects/:projectId/reports/:reportId ───────────────────────────────
reportsRouter.get("/:reportId", async (req: Request, res: Response) => {
  const { projectId, reportId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT id, project_id, name, mode, created_at, updated_at
       FROM reports WHERE id = $1 AND project_id = $2`,
      [reportId, projectId]
    );
    if (rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Report not found", req.requestId);
      return;
    }
    res.json(rowToReport(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get report", req.requestId);
  }
});

// ─── PATCH /projects/:projectId/reports/:reportId ─────────────────────────────
// GWT S2: persists mode switch (preview ↔ edit)
const PatchReportSchema = z.object({
  name: z.string().min(1).optional(),
  mode: z.enum(["preview", "edit"]).optional(),
});

reportsRouter.patch("/:reportId", async (req: Request, res: Response) => {
  const parsed = PatchReportSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  const { projectId, reportId } = req.params;
  const { name, mode } = parsed.data;

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name); }
  if (mode !== undefined) { fields.push(`mode = $${i++}`); values.push(mode); }

  if (fields.length === 0) {
    sendError(res, 422, "VALIDATION_ERROR", "Nothing to update", req.requestId);
    return;
  }

  values.push(reportId, projectId);
  try {
    const { rows } = await pool.query(
      `UPDATE reports SET ${fields.join(", ")}, updated_at = now()
       WHERE id = $${i} AND project_id = $${i + 1}
       RETURNING id, project_id, name, mode, created_at, updated_at`,
      values
    );
    if (rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Report not found", req.requestId);
      return;
    }
    res.json(rowToReport(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to update report", req.requestId);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /projects/:projectId/reports/:reportId/views ────────────────────────
// GWT S1: "When user creates a new view
//          Then system saves filters/segments/dateRange as ReportView
//          And updates URL viewId to that view"
const FilterSchema = z.object({
  field: z.string(),
  op: z.enum(["eq", "neq", "in", "contains", "gte", "lte"]),
  value: z.unknown(),
});

const CreateViewSchema = z.object({
  name: z.string().min(1),
  filters: z.array(FilterSchema).default([]),
  segments: z.array(FilterSchema).default([]),
  dateRange: z.record(z.unknown()).nullable().optional(),
  sortOrder: z.number().int().default(0),
});

reportsRouter.post("/:reportId/views", async (req: Request, res: Response) => {
  const parsed = CreateViewSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  const { reportId } = req.params;
  const { name, filters, segments, dateRange, sortOrder } = parsed.data;

  try {
    const { rows } = await pool.query(
      `INSERT INTO report_views (report_id, name, filters, segments, date_range, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, report_id, name, filters, segments, date_range, sort_order`,
      [
        reportId,
        name,
        JSON.stringify(filters),
        JSON.stringify(segments),
        dateRange != null ? JSON.stringify(dateRange) : null,
        sortOrder,
      ]
    );
    res.status(201).json(rowToView(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to create view", req.requestId);
  }
});

// ─── DELETE /projects/:projectId/reports/:reportId/views/:viewId ──────────────
reportsRouter.delete("/:reportId/views/:viewId", async (req: Request, res: Response) => {
  const { reportId, viewId } = req.params;
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM report_views WHERE id = $1 AND report_id = $2`,
      [viewId, reportId]
    );
    if (!rowCount || rowCount === 0) {
      sendError(res, 404, "NOT_FOUND", "View not found", req.requestId);
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to delete view", req.requestId);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /projects/:projectId/reports/:reportId/layout ───────────────────────
reportsRouter.get("/:reportId/layout", async (req: Request, res: Response) => {
  const { reportId } = req.params;
  try {
    const [sectionsResult, viewsResult] = await Promise.all([
      pool.query(
        `SELECT rs.id, rs.report_id, rs.title, rs.sort_order,
                json_agg(
                  json_build_object(
                    'id',         ie.id,
                    'section_id', ie.section_id,
                    'type',       ie.type,
                    'config',     ie.config,
                    'sort_order', ie.sort_order
                  ) ORDER BY ie.sort_order
                ) FILTER (WHERE ie.id IS NOT NULL) AS elements
         FROM report_sections rs
         LEFT JOIN insight_elements ie ON ie.section_id = rs.id
         WHERE rs.report_id = $1
         GROUP BY rs.id, rs.report_id ORDER BY rs.sort_order`,
        [reportId]
      ),
      pool.query(
        `SELECT id, report_id, name, filters, segments, date_range, sort_order
         FROM report_views WHERE report_id = $1 ORDER BY sort_order`,
        [reportId]
      ),
    ]);
    res.json({
      sections: sectionsResult.rows.map(rowToSection),
      views: viewsResult.rows.map(rowToView),
    });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get report layout", req.requestId);
  }
});

// ─── PATCH /projects/:projectId/reports/:reportId/layout ─────────────────────
// GWT S2: "When mode=edit → user can add sections and insight elements, with autosave"
//         "When mode=preview → all editing controls are hidden/disabled" → 409 CONFLICT
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

  const { projectId, reportId } = req.params;
  const sections = parsed.data.sections ?? [];
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // GWT S2 guard: block layout mutations in preview mode
    const reportRes = await client.query(
      `SELECT id, mode FROM reports WHERE id = $1 AND project_id = $2`,
      [reportId, projectId]
    );
    if (reportRes.rows.length === 0) {
      await client.query("ROLLBACK");
      sendError(res, 404, "NOT_FOUND", "Report not found", req.requestId);
      return;
    }
    if ((reportRes.rows[0].mode as string) === "preview") {
      await client.query("ROLLBACK");
      sendError(res, 409, "CONFLICT", "Cannot edit layout in preview mode", req.requestId);
      return;
    }

    // Full replace: delete all existing sections (insight_elements cascade automatically)
    await client.query(`DELETE FROM report_sections WHERE report_id = $1`, [reportId]);

    // Re-insert sections + their elements
    const savedSections: ReportSection[] = [];
    for (const section of sections) {
      const sRes = await client.query(
        `INSERT INTO report_sections (report_id, title, sort_order)
         VALUES ($1, $2, $3)
         RETURNING id, report_id, title, sort_order`,
        [reportId, section.title, section.sortOrder]
      );
      const newSectionId = sRes.rows[0].id as string;
      const savedElements: InsightElement[] = [];

      for (const el of section.elements) {
        const eRes = await client.query(
          `INSERT INTO insight_elements (section_id, type, config, sort_order)
           VALUES ($1, $2, $3, $4)
           RETURNING id, section_id, type, config, sort_order`,
          [newSectionId, el.type, JSON.stringify(el.config), el.sortOrder]
        );
        savedElements.push(rowToElement(eRes.rows[0]));
      }

      savedSections.push({
        id: sRes.rows[0].id as string,
        reportId: sRes.rows[0].report_id as string,
        title: sRes.rows[0].title as string,
        sortOrder: sRes.rows[0].sort_order as number,
        elements: savedElements,
      });
    }

    await client.query("COMMIT");
    res.json({ sections: savedSections });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to save layout", req.requestId);
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SHARE SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

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
      createdAt: (r.created_at as Date).toISOString(),
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
