import { Router, Request, Response } from "express";
import { pool } from "../db/pool";
import { sendError } from "../middleware/errorHandler";
import { computeDedupeKey } from "../lib/dedupeKey";
import { Job } from "../types";

export const jobsRouter = Router({ mergeParams: true });

// ─── Helper: enqueue a job (idempotent) ──────────────────────────────────────
export async function enqueueJob(
  projectId: string,
  type: string,
  payload: Record<string, unknown>,
  force = false
): Promise<Job> {
  const dedupeKey = computeDedupeKey(type, payload);

  if (!force) {
    // Return existing active job for the same work
    const existing = await pool.query(
      `SELECT id, type, status, progress, payload, result_ref, error, created_at, updated_at
       FROM jobs
       WHERE project_id = $1
         AND type = $2
         AND dedupe_key = $3
         AND status IN ('queued', 'running', 'succeeded')
       ORDER BY created_at DESC
       LIMIT 1`,
      [projectId, type, dedupeKey]
    );
    if (existing.rows.length > 0) return rowToJob(existing.rows[0]);
  }

  const { rows } = await pool.query(
    `INSERT INTO jobs (project_id, type, payload, dedupe_key)
     VALUES ($1, $2, $3, $4)
     RETURNING id, type, status, progress, payload, result_ref, error, created_at, updated_at`,
    [projectId, type, JSON.stringify(payload), dedupeKey]
  );
  return rowToJob(rows[0]);
}

// ─── GET /projects/:projectId/jobs/:jobId ────────────────────────────────────
jobsRouter.get("/:jobId", async (req: Request, res: Response) => {
  const { projectId, jobId } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT id, type, status, progress, payload, result_ref, error, created_at, updated_at
       FROM jobs
       WHERE id = $1 AND project_id = $2`,
      [jobId, projectId]
    );

    if (rows.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Job not found", req.requestId);
      return;
    }

    res.json(rowToJob(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch job", req.requestId);
  }
});

function rowToJob(r: Record<string, unknown>): Job {
  return {
    id: r.id as string,
    type: r.type as string,
    status: r.status as Job["status"],
    progress: r.progress as number,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    resultRef: (r.result_ref as string) ?? null,
    error: (r.error as string) ?? null,
    createdAt: (r.created_at as Date).toISOString(),
    updatedAt: (r.updated_at as Date).toISOString(),
  };
}
