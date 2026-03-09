import { apiFetch } from "@/shared/api/client";
import type { InsightResponse } from "@/shared/types/api";

// ─── Query payload ──────────────────────────────────────────────────────────

export interface InsightQueryPayload {
  question: string;
  context?: Record<string, unknown>;
}

// ─── Insight Agent API ──────────────────────────────────────────────────────

export function queryInsightAgent(
  projectId: string,
  data: InsightQueryPayload,
): Promise<InsightResponse> {
  return apiFetch<InsightResponse>(
    `/api/v1/projects/${projectId}/insight-agent/query`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export function fetchInsightHistory(
  projectId: string,
  reportId: string,
): Promise<InsightResponse[]> {
  return apiFetch<InsightResponse[]>(
    `/api/v1/projects/${projectId}/insight-agent/history?reportId=${encodeURIComponent(reportId)}`,
  );
}
