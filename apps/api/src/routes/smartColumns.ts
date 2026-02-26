import { Router, Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { sendError } from "../middleware/errorHandler";
import { SmartColumn, SmartColumnValue } from "../types";
import { enqueueJob } from "./jobs";

export const smartColumnsRouter = Router({ mergeParams: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToSmartColumn(r: Record<string, unknown>): SmartColumn {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    name: r.name as string,
    outputType: r.output_type as SmartColumn["outputType"],
    computeType: r.compute_type as SmartColumn["computeType"],
    sourceColumns: (r.source_columns as string[]) ?? [],
    config: (r.config as Record<string, unknown>) ?? {},
    status: r.status as SmartColumn["status"],
    createdAt: (r.created_at as Date).toISOString(),
    updatedAt: (r.updated_at as Date).toISOString(),
  };
}

function rowToSmartColumnValue(r: Record<string, unknown>): SmartColumnValue {
  return {
    rowId: r.row_id as string,
    smartColumnId: r.smart_column_id as string,
    value: r.value,
    confidence: (r.confidence as number) ?? null,
    computedAt: (r.computed_at as Date).toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMART COLUMNS CRUD
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /projects/:projectId/smart-columns ───────────────────────────────────
smartColumnsRouter.get("/", async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT id, project_id, name, output_type, compute_type,
              source_columns, config, status, created_at, updated_at
       FROM smart_columns WHERE project_id = $1 ORDER BY created_at ASC`,
      [projectId]
    );
    const items: SmartColumn[] = rows.map(rowToSmartColumn);
    res.json({ items, page: 1, pageSize: items.length, total: items.length });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list smart columns", req.requestId);
  }
});

// ─── POST /projects/:projectId/smart-columns ──────────────────────────────────
const CreateSmartColumnSchema = z.object({
  name: z.string().min(1),
  outputType: z.enum(["text", "number", "boolean", "date", "json"]),
  computeType: z.enum(["mapping", "formula", "llm"]),
  sourceColumns: z.array(z.string()).default([]),
  config: z.record(z.unknown()).default({}),
});

smartColumnsRouter.post("/", async (req: Request, res: Response) => {
  const parsed = CreateSmartColumnSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  const { projectId } = req.params;
  const { name, outputType, computeType, sourceColumns, config } = parsed.data;

  try {
    const { rows } = await pool.query(
      `INSERT INTO smart_columns (project_id, name, output_type, compute_type, source_columns, config)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, project_id, name, output_type, compute_type,
                 source_columns, config, status, created_at, updated_at`,
      [projectId, name, outputType, computeType, JSON.stringify(sourceColumns), JSON.stringify(config)]
    );
    res.status(201).json(rowToSmartColumn(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to create smart column", req.requestId);
  }
});

// ─── GET /projects/:projectId/smart-columns/:smartColumnId ───────────────────
smartColumnsRouter.get("/:smartColumnId", async (req: Request, res: Response) => {
  const { projectId, smartColumnId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT id, project_id, name, output_type, compute_type,
              source_columns, config, status, created_at, updated_at
       FROM smart_columns WHERE id = $1 AND project_id = $2`,
      [smartColumnId, projectId]
    );
    if (rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Smart column not found", req.requestId);
      return;
    }
    res.json(rowToSmartColumn(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get smart column", req.requestId);
  }
});

// ─── PATCH /projects/:projectId/smart-columns/:smartColumnId ─────────────────
// GWT S2: allows the system to persist status='outdated' when new rows arrive
//         (the DB trigger handles it automatically; this endpoint is the manual path).
const PatchSmartColumnSchema = z.object({
  name: z.string().min(1).optional(),
  outputType: z.enum(["text", "number", "boolean", "date", "json"]).optional(),
  computeType: z.enum(["mapping", "formula", "llm"]).optional(),
  sourceColumns: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
  status: z.enum(["draft", "idle", "running", "completed", "failed", "outdated"]).optional(),
});

smartColumnsRouter.patch("/:smartColumnId", async (req: Request, res: Response) => {
  const parsed = PatchSmartColumnSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  const { projectId, smartColumnId } = req.params;
  const { name, outputType, computeType, sourceColumns, config, status } = parsed.data;

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (name !== undefined)          { fields.push(`name = $${i++}`);            values.push(name); }
  if (outputType !== undefined)    { fields.push(`output_type = $${i++}`);     values.push(outputType); }
  if (computeType !== undefined)   { fields.push(`compute_type = $${i++}`);    values.push(computeType); }
  if (sourceColumns !== undefined) { fields.push(`source_columns = $${i++}`);  values.push(JSON.stringify(sourceColumns)); }
  if (config !== undefined)        { fields.push(`config = $${i++}`);          values.push(JSON.stringify(config)); }
  if (status !== undefined)        { fields.push(`status = $${i++}`);          values.push(status); }

  if (fields.length === 0) {
    sendError(res, 422, "VALIDATION_ERROR", "Nothing to update", req.requestId);
    return;
  }

  values.push(smartColumnId, projectId);
  try {
    const { rows } = await pool.query(
      `UPDATE smart_columns SET ${fields.join(", ")}, updated_at = now()
       WHERE id = $${i} AND project_id = $${i + 1}
       RETURNING id, project_id, name, output_type, compute_type,
                 source_columns, config, status, created_at, updated_at`,
      values
    );
    if (rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Smart column not found", req.requestId);
      return;
    }
    res.json(rowToSmartColumn(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to update smart column", req.requestId);
  }
});

// ─── DELETE /projects/:projectId/smart-columns/:smartColumnId ────────────────
smartColumnsRouter.delete("/:smartColumnId", async (req: Request, res: Response) => {
  const { projectId, smartColumnId } = req.params;
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM smart_columns WHERE id = $1 AND project_id = $2`,
      [smartColumnId, projectId]
    );
    if (!rowCount || rowCount === 0) {
      sendError(res, 404, "NOT_FOUND", "Smart column not found", req.requestId);
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to delete smart column", req.requestId);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PREVIEW VALUES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /projects/:projectId/smart-columns/:smartColumnId/preview ────────────
// GWT S1: "Then system enqueues SMART_COLUMN_PREVIEW And returns a sample of computed values"
// After the preview job completes, the worker writes to smart_column_values.
// This endpoint returns the latest 10 computed values for UI display.
smartColumnsRouter.get("/:smartColumnId/preview", async (req: Request, res: Response) => {
  const { smartColumnId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT smart_column_id, row_id, value, confidence, computed_at
       FROM smart_column_values
       WHERE smart_column_id = $1
       ORDER BY computed_at DESC
       LIMIT 10`,
      [smartColumnId]
    );
    res.json({ items: rows.map(rowToSmartColumnValue) });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch preview values", req.requestId);
  }
});

// ─── POST /projects/:projectId/smart-columns/:smartColumnId/preview ───────────
// GWT S1: "When user clicks Preview → system enqueues SMART_COLUMN_PREVIEW"
smartColumnsRouter.post("/:smartColumnId/preview", async (req: Request, res: Response) => {
  const { projectId, smartColumnId } = req.params;
  try {
    const check = await pool.query(
      `SELECT id FROM smart_columns WHERE id = $1 AND project_id = $2`,
      [smartColumnId, projectId]
    );
    if (check.rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Smart column not found", req.requestId);
      return;
    }

    const job = await enqueueJob(projectId, "smart_column_preview", { smartColumnId });
    res.status(202).json(job);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to enqueue preview job", req.requestId);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILL
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /projects/:projectId/smart-columns/:smartColumnId/fill ──────────────
// GWT S1: "When user confirms Create & fill
//          Then system enqueues SMART_COLUMN_FILL with scope=all
//          And updates status/progress until completion"
// GWT S2: mode=outdated → Reapply to outdated rows only
//         mode=future   → Apply to future uploads only
const FillSchema = z.object({
  mode: z.enum(["outdated", "all", "future"]).default("outdated"),
});

smartColumnsRouter.post("/:smartColumnId/fill", async (req: Request, res: Response) => {
  const parsed = FillSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  const { projectId, smartColumnId } = req.params;
  const { mode } = parsed.data;

  try {
    const check = await pool.query(
      `SELECT id FROM smart_columns WHERE id = $1 AND project_id = $2`,
      [smartColumnId, projectId]
    );
    if (check.rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Smart column not found", req.requestId);
      return;
    }

    const job = await enqueueJob(projectId, "smart_column_fill", { smartColumnId, mode });

    // GWT S1: immediately reflect running state so the UI sees progress without
    // waiting for the worker to pick up the job.
    await pool.query(
      `UPDATE smart_columns SET status = 'running', updated_at = now() WHERE id = $1`,
      [smartColumnId]
    );

    res.status(202).json(job);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to enqueue fill job", req.requestId);
  }
});
