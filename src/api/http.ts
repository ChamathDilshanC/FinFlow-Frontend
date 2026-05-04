import { getApiBaseUrl } from "./config";
import { ApiError } from "./types";

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

/** Authenticated JSON request (Bearer access token). */
export async function apiJson<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    method: init?.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(init?.headers as Record<string, string>),
      Authorization: `Bearer ${accessToken}`,
    },
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
  return data as T;
}

/** POST / PUT / PATCH / DELETE with optional JSON body (Content-Type set when body is sent). */
export async function apiMutateJson<T>(
  path: string,
  accessToken: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(body !== undefined && method !== "DELETE" ? { "Content-Type": "application/json" } : {}),
  };
  return apiJson<T>(path, accessToken, {
    method,
    headers,
    ...(body !== undefined && method !== "DELETE" ? { body: JSON.stringify(body) } : {}),
  });
}
