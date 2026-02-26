import { Router, Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { sendError } from "../middleware/errorHandler";
import { enqueueJob } from "./jobs";
import { InsightAnswer, Filter } from "../types";

export const insightAgentRouter = Router({ mergeParams: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FilterSchema = z.object({
  field: z.string(),
  op: z.enum(["eq", "neq", "in", "contains", "gte", "lte"]),
  value: z.unknown(),
});

function rowToAnswer(r: Record<string, unknown>): InsightAnswer {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    jobId: (r.job_id as string) ?? null,
    question: r.question as string,
    answer: r.answer as string,
    aiGenerated: r.ai_generated as boolean,
    sampleSize: r.sample_size as number,
    filters: (r.filters as Filter[]) ?? [],
    segments: (r.segments as Filter[]) ?? [],
    dateRange: (r.date_range as Record<string, unknown>) ?? null,
    viewId: (r.view_id as string) ?? null,
    createdAt: (r.created_at as Date).toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /insight-agent/ask
// ═══════════════════════════════════════════════════════════════════════════════
// GWT: "When user asks a question
//       Then the agent request includes those parameters (filters/segments/dateRange)"

const AskSchema = z.object({
  question: z.string().min(1),
  viewId: z.string().uuid().optional(),
  filters: z.array(FilterSchema).default([]),
  segments: z.array(FilterSchema).default([]),
  dateRange: z.record(z.unknown()).nullable().optional(),
});

insightAgentRouter.post("/ask", async (req: Request, res: Response) => {
  const parsed = AskSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 422, "VALIDATION_ERROR", "Invalid request body", req.requestId, {
      issues: parsed.error.issues,
    });
    return;
  }

  const { projectId } = req.params;
  const { question, viewId, filters, segments, dateRange } = parsed.data;

  try {
    // Pass full filter context to the worker so the AI answer is scoped correctly.
    // The worker uses these to filter the dataset rows it analyses (producing sampleSize)
    // and stores the completed InsightAnswer in insight_answers.
    const job = await enqueueJob(projectId, "insight_agent_ask", {
      question,
      viewId: viewId ?? null,
      filters,
      segments,
      dateRange: dateRange ?? null,
    });
    res.status(202).json(job);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to enqueue insight agent job", req.requestId);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /insight-agent/answers
// ═══════════════════════════════════════════════════════════════════════════════
// GWT: "And the response is labeled AI-generated
//       And includes sample size (n=...)"
//
// Returns completed AI answers for this project.
// Each answer carries aiGenerated=true and sampleSize=n (rows analysed).

insightAgentRouter.get("/answers", async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT id, project_id, job_id, question, answer, ai_generated, sample_size,
              filters, segments, date_range, view_id, created_at
       FROM insight_answers
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [projectId]
    );
    const items: InsightAnswer[] = rows.map(rowToAnswer);
    res.json({ items, page: 1, pageSize: items.length, total: items.length });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list answers", req.requestId);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /insight-agent/answers/:answerId
// ═══════════════════════════════════════════════════════════════════════════════

insightAgentRouter.get("/answers/:answerId", async (req: Request, res: Response) => {
  const { projectId, answerId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT id, project_id, job_id, question, answer, ai_generated, sample_size,
              filters, segments, date_range, view_id, created_at
       FROM insight_answers
       WHERE id = $1 AND project_id = $2`,
      [answerId, projectId]
    );
    if (rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Answer not found", req.requestId);
      return;
    }
    res.json(rowToAnswer(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch answer", req.requestId);
  }
});
