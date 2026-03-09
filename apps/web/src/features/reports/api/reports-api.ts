import { apiFetch } from "@/shared/api/client";
import type {
  Report,
  ReportSection,
  ReportView,
  InsightElement,
  InsightElementType,
} from "@/shared/types/api";

// ─── Payloads ────────────────────────────────────────────────────────────────

export interface CreateElementPayload {
  type: InsightElementType;
  config: Record<string, unknown>;
}

export interface CreateViewPayload {
  name: string;
  filters?: { field: string; operator: string; value: unknown }[];
  segments?: { id: string; label: string; filter: { field: string; operator: string; value: unknown } }[];
}

// ─── Reports API ─────────────────────────────────────────────────────────────

const base = (projectId: string) => `/api/v1/projects/${projectId}/reports`;

export function fetchReport(
  projectId: string,
  reportId: string,
): Promise<Report> {
  return apiFetch<Report>(`${base(projectId)}/${reportId}`);
}

export function createReport(
  projectId: string,
  name: string,
): Promise<Report> {
  return apiFetch<Report>(base(projectId), {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function createSection(
  projectId: string,
  reportId: string,
  name: string,
): Promise<ReportSection> {
  return apiFetch<ReportSection>(`${base(projectId)}/${reportId}/sections`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function createElement(
  projectId: string,
  reportId: string,
  sectionId: string,
  data: CreateElementPayload,
): Promise<InsightElement> {
  return apiFetch<InsightElement>(
    `${base(projectId)}/${reportId}/sections/${sectionId}/elements`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export function updateLayout(
  projectId: string,
  reportId: string,
  sections: { id: string; order: number }[],
): Promise<void> {
  return apiFetch<void>(`${base(projectId)}/${reportId}/layout`, {
    method: "PATCH",
    body: JSON.stringify({ sections }),
  });
}

export function updateElement(
  projectId: string,
  reportId: string,
  elementId: string,
  config: Record<string, unknown>,
): Promise<InsightElement> {
  return apiFetch<InsightElement>(
    `${base(projectId)}/${reportId}/elements/${elementId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ config }),
    },
  );
}

export function deleteElement(
  projectId: string,
  reportId: string,
  elementId: string,
): Promise<void> {
  return apiFetch<void>(
    `${base(projectId)}/${reportId}/elements/${elementId}`,
    { method: "DELETE" },
  );
}

export function createView(
  projectId: string,
  reportId: string,
  data: CreateViewPayload,
): Promise<ReportView> {
  return apiFetch<ReportView>(`${base(projectId)}/${reportId}/views`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
