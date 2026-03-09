import { apiFetch } from "@/shared/api/client";
import type { ShareSettings, ShareRole, PublicAccess } from "@/shared/types/api";

// ─── Sharing API ─────────────────────────────────────────────────────────────

const base = (projectId: string, reportId: string) =>
  `/api/v1/projects/${projectId}/reports/${reportId}/sharing`;

export function fetchShareSettings(
  projectId: string,
  reportId: string,
): Promise<ShareSettings> {
  return apiFetch<ShareSettings>(base(projectId, reportId));
}

export function updateTeamAccess(
  projectId: string,
  reportId: string,
  userId: string,
  role: ShareRole,
): Promise<void> {
  return apiFetch<void>(`${base(projectId, reportId)}/team`, {
    method: "PATCH",
    body: JSON.stringify({ userId, role }),
  });
}

export interface UpdatePublicAccessPayload {
  enabled?: boolean;
  passwordEnabled?: boolean;
  embedEnabled?: boolean;
}

export function updatePublicAccess(
  projectId: string,
  reportId: string,
  data: UpdatePublicAccessPayload,
): Promise<PublicAccess> {
  return apiFetch<PublicAccess>(`${base(projectId, reportId)}/public`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
