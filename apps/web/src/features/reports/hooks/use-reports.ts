import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchReport,
  createReport,
  createSection,
} from "../api/reports-api";

// ─── Query keys ─────────────────────────────────────────────────────────────

const keys = {
  report: (projectId: string, reportId: string) =>
    ["projects", projectId, "reports", reportId] as const,
  reports: (projectId: string) =>
    ["projects", projectId, "reports"] as const,
};

// ─── Queries ────────────────────────────────────────────────────────────────

export function useReport(projectId: string, reportId: string) {
  return useQuery({
    queryKey: keys.report(projectId, reportId),
    queryFn: () => fetchReport(projectId, reportId),
    enabled: !!projectId && !!reportId,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useCreateReport(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createReport(projectId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.reports(projectId) });
    },
  });
}

export function useCreateSection(projectId: string, reportId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createSection(projectId, reportId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keys.report(projectId, reportId),
      });
    },
  });
}
