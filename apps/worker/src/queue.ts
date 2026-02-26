import { PoolClient } from "pg";
import { pool } from "./db/pool";
import { DbJob, JobHandler, JobType, PRIORITY_ORDER } from "./types";

// ─── Handler registry ─────────────────────────────────────────────────────────
const handlers = new Map<JobType, JobHandler>();

export function registerHandler(type: JobType, handler: JobHandler): void {
  handlers.set(type, handler);
}

// ─── Claim: SELECT the next queued job (priority-ordered, SKIP LOCKED) ────────
async function claimNextJob(client: PoolClient): Promise<DbJob | null> {
  // Build a CASE expression so Postgres sorts by our priority list before
  // falling back to created_at (FIFO within the same priority bucket).
  const priorityCases = PRIORITY_ORDER.map(
    (t, i) => `WHEN type = '${t}' THEN ${i}`
  ).join(" ");

  const { rows } = await client.query(
    `SELECT id, project_id, type, status, progress,
            payload, result_ref, error, dedupe_key, created_at, updated_at
     FROM jobs
     WHERE status = 'queued'
     ORDER BY
       CASE ${priorityCases} ELSE ${PRIORITY_ORDER.length} END ASC,
       created_at ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED`
  );

  if (rows.length === 0) return null;

  const r = rows[0];
  // Transition to running
  await client.query(
    `UPDATE jobs SET status = 'running', updated_at = now() WHERE id = $1`,
    [r.id]
  );

  return {
    id: r.id,
    projectId: r.project_id,
    type: r.type as JobType,
    status: "running",
    progress: r.progress,
    payload: r.payload ?? {},
    resultRef: r.result_ref ?? null,
    error: r.error ?? null,
    dedupeKey: r.dedupe_key ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ─── Execute one job ──────────────────────────────────────────────────────────
async function executeJob(job: DbJob): Promise<void> {
  const handler = handlers.get(job.type);
  if (!handler) {
    await pool.query(
      `UPDATE jobs
       SET status = 'failed', error = $1, updated_at = now()
       WHERE id = $2`,
      [`No handler registered for job type '${job.type}'`, job.id]
    );
    return;
  }

  const setProgress = async (pct: number): Promise<void> => {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    await pool.query(
      `UPDATE jobs SET progress = $1, updated_at = now() WHERE id = $2`,
      [clamped, job.id]
    );
  };

  try {
    const resultRef = await handler({ job, setProgress });
    await pool.query(
      `UPDATE jobs
       SET status = 'succeeded', progress = 100, result_ref = $1, updated_at = now()
       WHERE id = $2`,
      [resultRef ?? null, job.id]
    );
    console.log(`[worker] job ${job.id} (${job.type}) succeeded`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[worker] job ${job.id} (${job.type}) failed:`, message);
    await pool.query(
      `UPDATE jobs
       SET status = 'failed', error = $1, updated_at = now()
       WHERE id = $2`,
      [message, job.id]
    );
  }
}

// ─── Poll loop ────────────────────────────────────────────────────────────────
const POLL_IDLE_MS = parseInt(process.env.WORKER_POLL_IDLE_MS ?? "2000", 10);
const POLL_BUSY_MS = parseInt(process.env.WORKER_POLL_BUSY_MS ?? "100", 10);

let running = true;

export function stopWorker(): void {
  running = false;
}

export async function startWorker(): Promise<void> {
  console.log("[worker] started (poll interval: idle=%dms busy=%dms)", POLL_IDLE_MS, POLL_BUSY_MS);

  while (running) {
    let claimed: DbJob | null = null;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      claimed = await claimNextJob(client);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error("[worker] claim error:", err);
    } finally {
      client.release();
    }

    if (claimed) {
      await executeJob(claimed);
      await sleep(POLL_BUSY_MS);
    } else {
      await sleep(POLL_IDLE_MS);
    }
  }

  console.log("[worker] stopped");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
