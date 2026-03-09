"use client";

import { Chip } from "@/shared/ui";
import type { Job, JobStatus } from "@/shared/types/api";

// ─── Status styling ──────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<JobStatus, "status_info" | "status_warning" | "status_success" | "status_danger"> = {
  queued: "status_info",
  running: "status_warning",
  completed: "status_success",
  failed: "status_danger",
};

const STATUS_LABELS: Record<JobStatus, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

// ─── Component ───────────────────────────────────────────────────────────────

interface SmartColumnJobStatusProps {
  job: Job | null;
}

export function SmartColumnJobStatus({ job }: SmartColumnJobStatusProps) {
  if (!job) return null;

  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
      {/* Status chip */}
      <Chip
        label={STATUS_LABELS[job.status]}
        variant={STATUS_VARIANT[job.status]}
      />

      {/* Progress bar (running only) */}
      {job.status === "running" && (
        <div className="flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]">
            <div
              className="h-full rounded-full bg-[var(--color-brand-500)] transition-all duration-[120ms] ease-out"
              style={{ width: `${Math.min(job.progress, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {job.progress}% complete
          </p>
        </div>
      )}

      {/* Rows affected */}
      <div className="text-right">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {job.rowsAffected.toLocaleString()}
        </p>
        <p className="text-xs text-[var(--text-secondary)]">rows affected</p>
      </div>
    </div>
  );
}
