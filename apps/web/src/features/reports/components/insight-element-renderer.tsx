"use client";

import type { InsightElement } from "@/shared/types/api";
import { ChartFrame, MetricCard, StateLoading, StateError } from "@/shared/ui";

interface InsightElementRendererProps {
  element: InsightElement;
  isLoading?: boolean;
  error?: string | null;
}

export function InsightElementRenderer({
  element,
  isLoading,
  error,
}: InsightElementRendererProps) {
  if (isLoading) {
    return <StateLoading label="Loading element..." />;
  }

  if (error) {
    return <StateError message={error} />;
  }

  switch (element.type) {
    case "key_metrics_overview":
      return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {(
            (element.config.metrics as { label: string; value: string; delta?: string }[]) ?? []
          ).map((metric, idx) => (
            <MetricCard
              key={idx}
              label={metric.label}
              value={metric.value}
              delta={metric.delta}
            />
          ))}
        </div>
      );

    case "narrative_ai_block":
      return (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <p className="text-sm leading-relaxed text-[var(--text-primary)]">
            {(element.config.narrative as string) ?? "No narrative content."}
          </p>
          <span className="mt-2 inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
            AI-generated
          </span>
        </div>
      );

    case "nps_score":
    case "nps_over_time":
    case "topic_correlation":
    case "topic_breakdown":
    case "topic_sentiment":
    case "overall_sentiment":
    case "selected_rows":
      return (
        <ChartFrame title={formatElementTitle(element.type)}>
          <div className="flex h-48 items-center justify-center text-sm text-[var(--text-secondary)]">
            {formatElementTitle(element.type)} chart placeholder
          </div>
        </ChartFrame>
      );

    default: {
      const _exhaustive: never = element.type;
      return (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
          Unknown element type: {String(_exhaustive)}
        </div>
      );
    }
  }
}

function formatElementTitle(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
