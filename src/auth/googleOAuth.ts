import type { SupabaseClient } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

/** Dev-only preview: never log access_token / refresh_token / provider_token. */
function oauthCallbackUrlForLog(url: string): string {
  const q = url.indexOf("?");
  const h = url.indexOf("#");
  const baseEnd = [q, h].filter((i) => i >= 0).reduce((a, b) => Math.min(a, b), url.length);
  const base = url.slice(0, baseEnd);
  if (h >= 0) return `${base}#<redacted>`;
  if (url.includes("code=")) return `${base}?<redacted>`;
  return base;
}

async function finishOAuthFromCallbackUrl(supabase: SupabaseClient, callbackUrl: string): Promise<void> {
  const hasCodeInQuery = /[?&]code=/.test(callbackUrl.split("#")[0] ?? "");
  if (hasCodeInQuery) {
    const { error } = await supabase.auth.exchangeCodeForSession(callbackUrl);
    if (error) {
      throw error;
    }
    return;
  }
  const hashIdx = callbackUrl.indexOf("#");
  if (hashIdx !== -1) {
    const params = new URLSearchParams(callbackUrl.slice(hashIdx + 1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token") ?? "";
    if (access_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        throw error;
      }
      return;
    }
  }
  throw new Error("OAuth callback had no authorization code or access_token");
}

/** Deep link the app receives after OAuth (Expo Go = exp://…, dev build = finflow://…). */
function resolveAppOAuthDeepLink(): string {
  const explicit = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim();
  if (explicit && explicit.length > 0) {
    return explicit;
  }
  return makeRedirectUri({
    scheme: "finflow",
    path: "auth/callback",
    preferLocalhost: false,
  });
}

/**
 * Supabase → HTTPS on your API → 302 → `exp://` / `finflow://`.
 *
 * On **iOS**, a direct Supabase → `exp://` redirect often makes Safari show “cannot open the
 * page because the address is invalid” (Safari does not load custom schemes like a URL).
 * Default: bridge is **on** for iOS when `EXPO_PUBLIC_API_BASE_URL` is `https://…` (deploy
 * `GET /api/v1/auth/oauth-bridge`). Set `EXPO_PUBLIC_OAUTH_USE_HTTPS_BRIDGE=0` to force the
 * old direct `exp://` redirect_to (e.g. local API only).
 */
function supabaseRedirectToFromAppDeepLink(appDeepLink: string): string {
  const api = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";
  if (!api.startsWith("https://")) {
    return appDeepLink;
  }
  const flag = process.env.EXPO_PUBLIC_OAUTH_USE_HTTPS_BRIDGE?.trim()?.toLowerCase();
  if (flag === "0" || flag === "false") {
    return appDeepLink;
  }
  const explicitOn = flag === "1" || flag === "true";
  const defaultIosBridge = Platform.OS === "ios" && !flag;
  const bridgeOn = explicitOn || defaultIosBridge;
  if (!bridgeOn) {
    return appDeepLink;
  }
  return `${api}/auth/oauth-bridge?next=${encodeURIComponent(appDeepLink)}`;
}

/**
 * Opens Google OAuth via Supabase.
 *
 * **Redirect URL:** must match an entry in Supabase → Authentication → URL Configuration
 * → **Redirect URLs**. Use `preferLocalhost: false` so physical devices never get
 * `http://localhost` from `makeRedirectUri`.
 *
 * Typical allowlist entries:
 * - `finflow://auth/callback` (custom scheme from app.json)
 * - Expo Go: exact `exp://192.168.x.x:8081/--/auth/callback` from Metro log
 * - HTTPS bridge (default on **iOS** when API base is `https://`): allowlist
 *   `https://<your-api>/api/v1/auth/oauth-bridge**` — see `.env.example` to opt out (`=0`).
 */
export async function signInWithGoogleOAuth(supabase: SupabaseClient): Promise<void> {
  const appDeepLink = resolveAppOAuthDeepLink();
  const redirectTo = supabaseRedirectToFromAppDeepLink(appDeepLink);

  if (__DEV__) {
    console.log("[FinFlow] OAuth app deep link (WebBrowser return URL):\n", appDeepLink);
    if (redirectTo !== appDeepLink) {
      console.log(
        "[FinFlow] OAuth redirect_to for Supabase (HTTPS bridge) — allowlist this in Supabase:\n",
        redirectTo.split("?")[0] + "**",
      );
    } else {
      const explicit = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim();
      if (explicit) {
        console.log("[FinFlow] OAuth redirectTo from EXPO_PUBLIC_AUTH_REDIRECT_URL (Supabase):\n", redirectTo);
      } else {
        console.log("[FinFlow] OAuth redirectTo → copy into Supabase Redirect URLs:\n", redirectTo);
      }
    }
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) {
    throw error;
  }
  if (!data?.url) {
    throw new Error("No OAuth URL returned");
  }

  if (__DEV__) {
    if (data.url.toLowerCase().includes("localhost")) {
      console.warn("[FinFlow] Supabase authorize URL still mentions localhost — check Site URL / env.");
    }
    try {
      const u = new URL(data.url);
      const rt = u.searchParams.get("redirect_to");
      if (rt) {
        console.log(
          "[FinFlow] redirect_to inside Supabase authorize URL:\n",
          decodeURIComponent(rt),
        );
      }
    } catch {
      /* ignore parse errors */
    }
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, appDeepLink);

  if (__DEV__) {
    const err = "error" in result ? (result as { error?: unknown }).error : undefined;
    const rawUrl =
      "url" in result && typeof (result as { url?: string }).url === "string" ? (result as { url: string }).url : "";
    console.log("[FinFlow] openAuthSessionAsync result:", result.type, err ?? "", rawUrl ? oauthCallbackUrlForLog(rawUrl) : "");
  }

  if (result.type !== "success" || !("url" in result) || !result.url) {
    throw new Error("Sign-in was cancelled");
  }
  await finishOAuthFromCallbackUrl(supabase, result.url);
}
