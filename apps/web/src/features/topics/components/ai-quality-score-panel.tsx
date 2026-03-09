"use client";

import { ChartFrame } from "@/shared/ui";
import { StateLoading, StateEmpty, StateError } from "@/shared/ui";
import { useQualityScore } from "../hooks/use-topics";

interface AiQualityScorePanelProps {
  projectId: string;
  collectionId: string;
}

export function AiQualityScorePanel({
  projectId,
  collectionId,
}: AiQualityScorePanelProps) {
  const { data: score, isLoading, isError, refetch } = useQualityScore(
    projectId,
    collectionId,
  );

  if (isLoading) {
    return <StateLoading variant="card" />;
  }

  if (isError) {
    return (
      <StateError
        message="Failed to load quality score."
        onRetry={() => refetch()}
      />
    );
  }

  if (!score) {
    return (
      <StateEmpty
        title="No quality data"
        description="Quality scores will appear once topics have been assigned."
      />
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Global score */}
      <div className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
        <div className="text-center">
          <span className="text-5xl font-bold text-[var(--text-primary)]">
            {Math.round(score.globalScore)}
          </span>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Global Score
          </p>
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap gap-3">
            {score.dimensions.map((dim) => (
              <div
                key={dim.label}
                className="rounded-[var(--radius-sm)] bg-[var(--bg-muted)] px-3 py-1.5"
              >
                <p className="text-xs font-medium text-[var(--text-secondary)]">
                  {dim.label}
                </p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {Math.round(dim.score)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Radar chart placeholder */}
      <ChartFrame title="Score Distribution">
        <div className="flex h-[240px] items-center justify-center text-sm text-[var(--text-secondary)]">
          Radar chart placeholder
        </div>
      </ChartFrame>

      {/* Breakdown table */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="border-b border-[var(--border-default)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-muted)]">
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">
                  Category
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">
                  Topic
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                  Score
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                  Count
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                  Influence
                </th>
              </tr>
            </thead>
            <tbody>
              {score.breakdown.map((row) => (
                <tr
                  key={`${row.categoryId}-${row.topicId}`}
                  className="border-b border-[var(--border-default)] transition-colors duration-[120ms] ease-out hover:bg-[var(--bg-muted)]"
                >
                  <td className="px-4 py-2 text-[var(--text-primary)]">
                    {row.categoryLabel}
                  </td>
                  <td className="px-4 py-2 text-[var(--text-primary)]">
                    {row.topicLabel}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-[var(--text-primary)]">
                    {Math.round(row.score)}
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                    {row.count}
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                    {(row.influence * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
