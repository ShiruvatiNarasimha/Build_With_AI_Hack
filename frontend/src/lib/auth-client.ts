import { clientEnv } from "@/lib/env";

export interface AuthUser {
  avatarUrl: string | null;
  createdAt: string;
  email: string;
  emailVerified: boolean;
  id: string;
  lastLoginAt: string | null;
  name: string | null;
  updatedAt: string;
}

interface ApiEnvelope<T> {
  data: T;
  details?: unknown;
  message?: string;
  success: boolean;
}

export interface AuthSessionPayload {
  accessToken: string;
  user: AuthUser;
}

export class AuthApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${clientEnv.apiBaseUrl}${path}`, {
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    ...init,
  });

  const payload = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw new AuthApiError(
      payload?.message || "Authentication request failed.",
      response.status,
      payload?.details,
    );
  }

  return payload?.data as T;
}

export async function exchangeGoogleIdToken(idToken: string) {
  return request<AuthSessionPayload>("/auth/google", {
    body: JSON.stringify({ idToken }),
    method: "POST",
  });
}

export async function refreshAuthSession() {
  return request<AuthSessionPayload>("/auth/refresh", {
    method: "POST",
  });
}

export async function logoutAuthSession() {
  return request<Record<string, never>>("/auth/logout", {
    method: "POST",
  });
}
