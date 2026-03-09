"use client";

import type { InsightResponse } from "@/shared/types/api";
import { ChartFrame } from "@/shared/ui";
import { SuggestedQuestions } from "./suggested-questions";

interface InsightResponseCardProps {
  response: InsightResponse;
  onFollowUp: (question: string) => void;
}

export function InsightResponseCard({ response, onFollowUp }: InsightResponseCardProps) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <h3 className="text-base font-semibold text-[var(--text-primary)]">
        {response.title}
      </h3>

      {/* Narrative */}
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
        {response.narrative}
      </p>

      {/* Chart */}
      {response.chart && (
        <ChartFrame title={response.chart.type}>
          <div className="flex h-48 items-center justify-center text-sm text-[var(--text-secondary)]">
            Chart placeholder ({response.chart.type} &mdash; {response.chart.data.length} data points)
          </div>
        </ChartFrame>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--text-secondary)]">
          Rows analyzed: {response.rowsAnalyzed.toLocaleString()}
        </span>
        {response.aiGenerated && (
          <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
            AI-generated
          </span>
        )}
      </div>

      {/* Follow-up questions */}
      {response.suggestedQuestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Follow-up questions</p>
          <SuggestedQuestions questions={response.suggestedQuestions} onSelect={onFollowUp} />
        </div>
      )}
    </div>
  );
}
