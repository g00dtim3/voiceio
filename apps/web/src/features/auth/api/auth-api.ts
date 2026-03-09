import { apiFetch, setAuthToken } from "@/shared/api/client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "viewer" | "external_view_only";
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const result = await apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(result.token);
  return result;
}

export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  const result = await apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
  setAuthToken(result.token);
  return result;
}

export async function forgotPassword(email: string): Promise<void> {
  await apiFetch<void>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiFetch<void>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function acceptInvite(inviteToken: string, password: string, name: string): Promise<AuthResponse> {
  const result = await apiFetch<AuthResponse>("/api/auth/accept-invite", {
    method: "POST",
    body: JSON.stringify({ inviteToken, password, name }),
  });
  setAuthToken(result.token);
  return result;
}
