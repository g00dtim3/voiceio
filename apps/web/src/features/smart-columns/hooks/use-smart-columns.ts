import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSmartColumns,
  fetchSmartColumn,
  createSmartColumn,
  previewSmartColumn,
  computeSmartColumn,
  type CreateSmartColumnData,
  type PreviewSmartColumnParams,
  type ComputeScope,
} from "../api/smart-columns-api";

// ─── Query keys ──────────────────────────────────────────────────────────────

const keys = {
  all: (projectId: string) =>
    ["projects", projectId, "smart-columns"] as const,
  detail: (projectId: string, id: string) =>
    ["projects", projectId, "smart-columns", id] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useSmartColumns(projectId: string) {
  return useQuery({
    queryKey: keys.all(projectId),
    queryFn: () => fetchSmartColumns(projectId),
    enabled: !!projectId,
  });
}

export function useSmartColumn(projectId: string, id: string) {
  return useQuery({
    queryKey: keys.detail(projectId, id),
    queryFn: () => fetchSmartColumn(projectId, id),
    enabled: !!projectId && !!id,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateSmartColumn(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSmartColumnData) =>
      createSmartColumn(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.all(projectId) });
    },
  });
}

export function usePreviewSmartColumn(projectId: string, id: string) {
  return useMutation({
    mutationFn: (params: PreviewSmartColumnParams) =>
      previewSmartColumn(projectId, id, params),
  });
}

export function useComputeSmartColumn(projectId: string, id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scope: ComputeScope = "all") =>
      computeSmartColumn(projectId, id, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.detail(projectId, id) });
      queryClient.invalidateQueries({ queryKey: keys.all(projectId) });
    },
  });
}
