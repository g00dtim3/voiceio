import { Router, Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { sendError } from "../middleware/errorHandler";
import { SmartColumn } from "../types";
import { enqueueJob } from "./jobs";

export const smartColumnsRouter = Router({ mergeParams: true });

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

// ─── POST /projects/:projectId/smart-columns/:smartColumnId/preview ───────────
smartColumnsRouter.post("/:smartColumnId/preview", async (req: Request, res: Response) => {
  const { projectId, smartColumnId } = req.params;
  try {
    const job = await enqueueJob(projectId, "smart_column_preview", { smartColumnId });
    res.status(202).json(job);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to enqueue preview job", req.requestId);
  }
});

// ─── POST /projects/:projectId/smart-columns/:smartColumnId/fill ──────────────
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
  try {
    const job = await enqueueJob(projectId, "smart_column_fill", {
      smartColumnId,
      mode: parsed.data.mode,
    });
    res.status(202).json(job);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to enqueue fill job", req.requestId);
  }
});

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
