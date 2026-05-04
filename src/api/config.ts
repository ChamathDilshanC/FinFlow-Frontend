/** Public API base, e.g. https://host/api/v1 — no trailing slash. */
export function getApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!raw || typeof raw !== "string") {
    throw new Error("Set EXPO_PUBLIC_API_BASE_URL in .env (see .env.example)");
  }
  return raw.replace(/\/+$/, "");
}
