"use client";

import { Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { Checkbox, Chip } from "@/shared/ui";
import type { DatasetRow, Sentiment } from "@/shared/types/api";
import { cn } from "@/shared/utils/cn";

interface TopicRowItemProps {
  row: DatasetRow;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onCopy?: (text: string) => void;
}

const sentimentVariant: Record<Sentiment, "sentiment_positive" | "sentiment_neutral" | "sentiment_negative"> = {
  positive: "sentiment_positive",
  neutral: "sentiment_neutral",
  negative: "sentiment_negative",
};

export function TopicRowItem({ row, selected, onSelect, onCopy }: TopicRowItemProps) {
  const hasUncertainAssignment = row.assignments.some((a) => a.confidence < 0.5);

  return (
    <div
      className={cn(
        "grid min-h-[88px] grid-cols-[24px_1fr_auto] items-start gap-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 transition-colors duration-[120ms] ease-out hover:bg-[var(--bg-muted)]",
        selected && "bg-[var(--color-brand-500)]/5",
      )}
      style={{ padding: "12px 16px" }}
    >
      {/* Checkbox */}
      <div className="pt-0.5">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(row.id, !!checked)}
          aria-label={`Select row ${row.id}`}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 space-y-2">
        <p className="text-sm leading-relaxed text-[var(--text-primary)]">
          {row.text}
        </p>

        {/* Topic chips */}
        {row.assignments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {row.assignments.map((assignment) => (
              <Chip
                key={assignment.topicId}
                label={assignment.topicLabel}
                variant={sentimentVariant[assignment.sentiment]}
              />
            ))}
          </div>
        )}

        {/* Badges */}
        <div className="flex items-center gap-2">
          {row.reviewed && (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--color-success-500)]">
              <CheckCircle2 size={12} />
              Reviewed
            </span>
          )}
          {hasUncertainAssignment && (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--color-warning-500)]">
              <AlertTriangle size={12} />
              Uncertain
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-start pt-0.5">
        <button
          type="button"
          onClick={() => onCopy?.(row.text)}
          className="rounded-[var(--radius-sm)] p-1.5 text-[var(--icon-muted)] transition-colors duration-[120ms] ease-out hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
          aria-label="Copy text"
        >
          <Copy size={14} />
        </button>
      </div>
    </div>
  );
}
