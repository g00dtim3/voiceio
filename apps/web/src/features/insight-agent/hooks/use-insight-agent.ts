import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  queryInsightAgent,
  fetchInsightHistory,
  type InsightQueryPayload,
} from "../api/insight-agent-api";

// ─── Query keys ─────────────────────────────────────────────────────────────

const keys = {
  history: (projectId: string, reportId: string) =>
    ["projects", projectId, "insight-agent", "history", reportId] as const,
};

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useInsightQuery(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsightQueryPayload) =>
      queryInsightAgent(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "insight-agent", "history"],
      });
    },
  });
}

// ─── Queries ────────────────────────────────────────────────────────────────

export function useInsightHistory(projectId: string, reportId: string) {
  return useQuery({
    queryKey: keys.history(projectId, reportId),
    queryFn: () => fetchInsightHistory(projectId, reportId),
    enabled: !!projectId && !!reportId,
  });
}
