import { apiFetch } from "@/shared/api/client";
import type {
  DatasetRow,
  TopicCollection,
  QualityScore,
  TopicGenerationResult,
  Job,
  PaginatedResponse,
  Topic,
} from "@/shared/types/api";

// ─── Query params ────────────────────────────────────────────────────────────

export interface FetchRowsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  reviewed?: boolean;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  focusMode?: boolean;
}

// ─── Rows ────────────────────────────────────────────────────────────────────

export function fetchRows(
  projectId: string,
  params: FetchRowsParams = {},
): Promise<PaginatedResponse<DatasetRow>> {
  const searchParams = new URLSearchParams();
  if (params.page != null) searchParams.set("page", String(params.page));
  if (params.pageSize != null) searchParams.set("pageSize", String(params.pageSize));
  if (params.search) searchParams.set("search", params.search);
  if (params.reviewed != null) searchParams.set("reviewed", String(params.reviewed));
  if (params.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params.sortDir) searchParams.set("sortDir", params.sortDir);
  if (params.focusMode) searchParams.set("focusMode", "true");

  const qs = searchParams.toString();
  return apiFetch<PaginatedResponse<DatasetRow>>(
    `/api/v1/projects/${projectId}/rows${qs ? `?${qs}` : ""}`,
  );
}

export function reviewRows(
  projectId: string,
  rowIds: string[],
  reviewed: boolean,
): Promise<void> {
  return apiFetch<void>(`/api/v1/projects/${projectId}/rows/review`, {
    method: "PATCH",
    body: JSON.stringify({ rowIds, reviewed }),
  });
}

// ─── Collections ─────────────────────────────────────────────────────────────

export function fetchCollection(
  projectId: string,
  collectionId: string,
): Promise<TopicCollection> {
  return apiFetch<TopicCollection>(
    `/api/v1/projects/${projectId}/topics/collections/${collectionId}`,
  );
}

// ─── Categories ──────────────────────────────────────────────────────────────

export function createCategory(
  projectId: string,
  collectionId: string,
  label: string,
): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(
    `/api/v1/projects/${projectId}/topics/collections/${collectionId}/categories`,
    {
      method: "POST",
      body: JSON.stringify({ label }),
    },
  );
}

// ─── Topics ──────────────────────────────────────────────────────────────────

export function createTopic(
  projectId: string,
  categoryId: string,
  data: { label: string; description?: string; sentimentEnabled?: boolean },
): Promise<Topic> {
  return apiFetch<Topic>(
    `/api/v1/projects/${projectId}/topics/categories/${categoryId}/topics`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export function updateTopic(
  projectId: string,
  topicId: string,
  data: Partial<{ label: string; description: string; sentimentEnabled: boolean }>,
): Promise<Topic> {
  return apiFetch<Topic>(
    `/api/v1/projects/${projectId}/topics/${topicId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export function deleteTopic(
  projectId: string,
  topicId: string,
): Promise<void> {
  return apiFetch<void>(
    `/api/v1/projects/${projectId}/topics/${topicId}`,
    { method: "DELETE" },
  );
}

// ─── Assignments ─────────────────────────────────────────────────────────────

export function assignTopics(
  projectId: string,
  data: { rowIds: string[]; topicIds: string[] },
): Promise<void> {
  return apiFetch<void>(
    `/api/v1/projects/${projectId}/topics/assignments`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

// ─── Generation ──────────────────────────────────────────────────────────────

export function generateTopics(
  projectId: string,
  collectionId: string,
  prompt: string,
): Promise<Job> {
  return apiFetch<Job>(
    `/api/v1/projects/${projectId}/topics/collections/${collectionId}/generate`,
    {
      method: "POST",
      body: JSON.stringify({ prompt }),
    },
  );
}

export function fetchGenerationResult(
  projectId: string,
  jobId: string,
): Promise<TopicGenerationResult> {
  return apiFetch<TopicGenerationResult>(
    `/api/v1/projects/${projectId}/topics/generate/${jobId}`,
  );
}

// ─── Quality ─────────────────────────────────────────────────────────────────

export function fetchQualityScore(
  projectId: string,
  collectionId: string,
): Promise<QualityScore> {
  return apiFetch<QualityScore>(
    `/api/v1/projects/${projectId}/topics/collections/${collectionId}/quality-score`,
  );
}
