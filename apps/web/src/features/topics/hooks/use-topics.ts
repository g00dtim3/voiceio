import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchRows,
  reviewRows,
  fetchCollection,
  fetchQualityScore,
  assignTopics,
  createCategory,
  createTopic,
  type FetchRowsParams,
} from "../api/topics-api";

// ─── Query keys ──────────────────────────────────────────────────────────────

const keys = {
  rows: (projectId: string, params: FetchRowsParams) =>
    ["projects", projectId, "rows", params] as const,
  collection: (projectId: string, collectionId: string) =>
    ["projects", projectId, "collections", collectionId] as const,
  qualityScore: (projectId: string, collectionId: string) =>
    ["projects", projectId, "collections", collectionId, "quality-score"] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useRows(projectId: string, params: FetchRowsParams = {}) {
  return useQuery({
    queryKey: keys.rows(projectId, params),
    queryFn: () => fetchRows(projectId, params),
    enabled: !!projectId,
  });
}

export function useCollection(projectId: string, collectionId: string) {
  return useQuery({
    queryKey: keys.collection(projectId, collectionId),
    queryFn: () => fetchCollection(projectId, collectionId),
    enabled: !!projectId && !!collectionId,
  });
}

export function useQualityScore(projectId: string, collectionId: string) {
  return useQuery({
    queryKey: keys.qualityScore(projectId, collectionId),
    queryFn: () => fetchQualityScore(projectId, collectionId),
    enabled: !!projectId && !!collectionId,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useReviewRows(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rowIds, reviewed }: { rowIds: string[]; reviewed: boolean }) =>
      reviewRows(projectId, rowIds, reviewed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "rows"] });
    },
  });
}

export function useAssignTopics(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { rowIds: string[]; topicIds: string[] }) =>
      assignTopics(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "rows"] });
    },
  });
}

export function useCreateCategory(projectId: string, collectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (label: string) => createCategory(projectId, collectionId, label),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keys.collection(projectId, collectionId),
      });
    },
  });
}

export function useCreateTopic(projectId: string, categoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { label: string; description?: string; sentimentEnabled?: boolean }) =>
      createTopic(projectId, categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "collections"] });
    },
  });
}
