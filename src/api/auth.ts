import { getApiBaseUrl } from "./config";
import { ApiError, type AuthSessionResponse } from "./types";

function parseErrorBody(data: unknown): { message: string; code?: string } {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const detail = o.detail;
    const code = o.code;
    if (typeof detail === "string") {
      return { message: detail, code: typeof code === "string" ? code : undefined };
    }
  }
  return { message: "Request failed" };
}

async function postAuth(path: "login" | "register", email: string, password: string): Promise<AuthSessionResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    const { message, code } = parseErrorBody(data);
    throw new ApiError(message, res.status, code);
  }
  return data as AuthSessionResponse;
}

export function loginWithEmail(email: string, password: string): Promise<AuthSessionResponse> {
  return postAuth("login", email, password);
}

export function registerWithEmail(email: string, password: string): Promise<AuthSessionResponse> {
  return postAuth("register", email, password);
}
