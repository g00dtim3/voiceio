import { apiFetch } from "@/shared/api/client";
import type {
  SmartColumnOverview,
  SmartColumnDetail,
  SmartColumnPreviewItem,
  SmartColumnComputationType,
  Job,
} from "@/shared/types/api";

// ─── Request types ──────────────────────────────────────────────────────────

export interface CreateSmartColumnData {
  name: string;
  outputType: string;
  computationType: SmartColumnComputationType;
  config: {
    prompt: string;
    inputVariables: { key: string; sourceColumn: string }[];
    fallbackValue?: string;
  };
  applyToFutureUploads?: boolean;
}

export interface PreviewSmartColumnParams {
  sampleSize?: number;
  randomSample?: boolean;
}

export type ComputeScope = "all" | "empty" | "outdated";

// ─── Queries ────────────────────────────────────────────────────────────────

export function fetchSmartColumns(
  projectId: string,
): Promise<SmartColumnOverview> {
  return apiFetch<SmartColumnOverview>(
    `/api/v1/projects/${projectId}/smart-columns`,
  );
}

export function fetchSmartColumn(
  projectId: string,
  smartColumnId: string,
): Promise<SmartColumnDetail> {
  return apiFetch<SmartColumnDetail>(
    `/api/v1/projects/${projectId}/smart-columns/${smartColumnId}`,
  );
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function createSmartColumn(
  projectId: string,
  data: CreateSmartColumnData,
): Promise<SmartColumnDetail> {
  return apiFetch<SmartColumnDetail>(
    `/api/v1/projects/${projectId}/smart-columns`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export function previewSmartColumn(
  projectId: string,
  smartColumnId: string,
  params: PreviewSmartColumnParams = {},
): Promise<SmartColumnPreviewItem[]> {
  return apiFetch<SmartColumnPreviewItem[]>(
    `/api/v1/projects/${projectId}/smart-columns/${smartColumnId}/preview`,
    {
      method: "POST",
      body: JSON.stringify(params),
    },
  );
}

export function computeSmartColumn(
  projectId: string,
  smartColumnId: string,
  scope: ComputeScope = "all",
): Promise<Job> {
  return apiFetch<Job>(
    `/api/v1/projects/${projectId}/smart-columns/${smartColumnId}/compute`,
    {
      method: "POST",
      body: JSON.stringify({ scope }),
    },
  );
}

export function reapplySmartColumn(
  projectId: string,
  smartColumnId: string,
  scope: ComputeScope = "all",
): Promise<Job> {
  return apiFetch<Job>(
    `/api/v1/projects/${projectId}/smart-columns/${smartColumnId}/reapply`,
    {
      method: "POST",
      body: JSON.stringify({ scope }),
    },
  );
}

export function deleteSmartColumn(
  projectId: string,
  smartColumnId: string,
): Promise<void> {
  return apiFetch<void>(
    `/api/v1/projects/${projectId}/smart-columns/${smartColumnId}`,
    { method: "DELETE" },
  );
}
