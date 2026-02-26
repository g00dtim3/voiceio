/**
 * StateSuccess — Global success state (00_UI_STATES.md)
 *
 * Rules:
 *  - Render the actual data content (children)
 *  - Optionally show sample size (n=...) for charts / AI answers
 *
 * Usage:
 *   // Simple data wrapper
 *   <StateSuccess sampleSize={120}>
 *     <AnswerCard answer={answer} />
 *   </StateSuccess>
 *
 *   // Without sample size (regular lists)
 *   <StateSuccess>
 *     <ReportList reports={reports} />
 *   </StateSuccess>
 */

import type { ReactNode } from "react";

interface StateSuccessProps {
  children: ReactNode;
  /**
   * Number of dataset rows analysed (shown as "n=120").
   * Required for AI-generated answers and chart sections per 00_UI_STATES.md.
   */
  sampleSize?: number;
  /** Override the aria-label of the success region */
  label?: string;
}

export function StateSuccess({ children, sampleSize, label = "Content loaded" }: StateSuccessProps) {
  return (
    <div role="region" aria-label={label} className="w-full space-y-3">
      {sampleSize !== undefined && (
        <SampleSizeBadge n={sampleSize} />
      )}
      {children}
    </div>
  );
}

// ─── Sample size badge ────────────────────────────────────────────────────────

interface SampleSizeBadgeProps {
  n: number;
}

export function SampleSizeBadge({ n }: SampleSizeBadgeProps) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full bg-[var(--color-success)]"
      />
      <span>
        <span className="font-semibold text-[var(--color-text)]">n={n.toLocaleString()}</span>
        {" "}responses analysed
      </span>
    </p>
  );
}
