// ─── Job types ────────────────────────────────────────────────────────────────
export type JobType =
  | "topic_generation"
  | "topic_recompute"
  | "smart_column_preview"
  | "smart_column_fill"
  | "insight_agent_ask";

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

export interface DbJob {
  id: string;
  projectId: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  payload: Record<string, unknown>;
  resultRef: string | null;
  error: string | null;
  dedupeKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Handler context ──────────────────────────────────────────────────────────
export interface JobContext {
  job: DbJob;
  /** Report 0–100 progress; persists to DB. */
  setProgress: (pct: number) => Promise<void>;
}

// ─── Handler signature ────────────────────────────────────────────────────────
export type JobHandler = (ctx: JobContext) => Promise<string | null>; // returns optional resultRef

// ─── Priority list (lower index = higher priority) ───────────────────────────
export const PRIORITY_ORDER: JobType[] = [
  "topic_generation",
  "smart_column_fill",
  "topic_recompute",
  "smart_column_preview",
  "insight_agent_ask",
];
