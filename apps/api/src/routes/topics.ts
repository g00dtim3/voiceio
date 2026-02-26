import { Router, Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { sendError } from "../middleware/errorHandler";
import { Job } from "../types";
import { enqueueJob } from "./jobs";

export const topicsRouter = Router({ mergeParams: true });

// ─── POST /projects/:projectId/topics/collections ─────────────────────────────
const CreateCollectionSchema = z.object({
  textColumnId: z.string().min(1),
  language: z.string().min(2),
  startMode: z.enum(["scratch", "template", "inherit", "import_file"]),
  enableSentiment: z.boolean(),
  prompt: z.string().nullable().optional(),
});

topicsRouter.post("/collections", async (req: Request, res: Response) => {
  const parsed = CreateCollectionSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  const { projectId } = req.params;
  const { textColumnId, language, enableSentiment, startMode, prompt } = parsed.data;

  try {
    // Upsert topic collection (unique on project_id + text_column_id)
    const { rows } = await pool.query(
      `INSERT INTO topic_collections (project_id, text_column_id, language, sentiment_enabled)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_id, text_column_id) DO UPDATE
         SET language = EXCLUDED.language,
             sentiment_enabled = EXCLUDED.sentiment_enabled
       RETURNING id`,
      [projectId, textColumnId, language, enableSentiment]
    );
    const collectionId: string = rows[0].id;

    const job = await enqueueJob(projectId, "topic_generation", {
      collectionId,
      startMode,
      prompt: prompt ?? null,
    });

    res.status(202).json(job);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to start topic analysis", req.requestId);
  }
});

// ─── POST /projects/:projectId/topics/assignments ─────────────────────────────
const BulkAssignSchema = z.object({
  op: z.enum(["assign", "remove", "replace"]),
  rowIds: z.array(z.string().uuid()),
  topicIds: z.array(z.string().uuid()),
  sentiment: z.enum(["positive", "neutral", "negative"]).nullable().optional(),
  source: z.enum(["ai", "human"]).default("human"),
});

topicsRouter.post("/assignments", async (req: Request, res: Response) => {
  const parsed = BulkAssignSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  // TODO: implement bulk assign/remove/replace logic
  res.json({ affected: 0 });
});

// ─── POST /projects/:projectId/topics/review ──────────────────────────────────
const BulkReviewSchema = z.object({
  rowIds: z.array(z.string().uuid()),
  reviewed: z.boolean(),
});

topicsRouter.post("/review", async (req: Request, res: Response) => {
  const parsed = BulkReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  const { projectId } = req.params;
  const { rowIds, reviewed } = parsed.data;

  try {
    await pool.query(
      `UPDATE topic_assignments SET reviewed = $1
       WHERE project_id = $2 AND row_id = ANY($3::uuid[])`,
      [reviewed, projectId, rowIds]
    );
    res.json({ affected: rowIds.length });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to bulk review topics", req.requestId);
  }
});
