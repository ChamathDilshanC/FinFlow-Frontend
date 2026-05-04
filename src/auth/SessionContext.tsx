import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { loginWithEmail, registerWithEmail } from "../api/auth";
import { getSupabase } from "../lib/supabase";
import { signInWithGoogleOAuth } from "./googleOAuth";

const K_ACCESS = "finflow_access_token";
const K_REFRESH = "finflow_refresh_token";

type SessionContextValue = {
  hydrated: boolean;
  accessToken: string | null;
  lastError: string | null;
  clearError: () => void;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const a = await AsyncStorage.getItem(K_ACCESS);
        if (alive) {
          setAccessToken(a);
        }
      } finally {
        if (alive) {
          setHydrated(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persistTokens = useCallback(async (access: string | null, refresh: string | null) => {
    if (access) {
      await AsyncStorage.setItem(K_ACCESS, access);
    } else {
      await AsyncStorage.removeItem(K_ACCESS);
    }
    if (refresh) {
      await AsyncStorage.setItem(K_REFRESH, refresh);
    } else {
      await AsyncStorage.removeItem(K_REFRESH);
    }
    setAccessToken(access);
  }, []);

  const clearError = useCallback(() => setLastError(null), []);

  const signInEmail = useCallback(
    async (email: string, password: string) => {
      setLastError(null);
      const s = await loginWithEmail(email.trim(), password);
      if (!s.access_token) {
        const msg = s.requires_email_confirmation
          ? "Confirm your email, then sign in."
          : "No access token returned.";
        setLastError(msg);
        throw new Error(msg);
      }
      await persistTokens(s.access_token, s.refresh_token);
    },
    [persistTokens],
  );

  const signUpEmail = useCallback(
    async (email: string, password: string) => {
      setLastError(null);
      const s = await registerWithEmail(email.trim(), password);
      if (!s.access_token) {
        const msg = s.requires_email_confirmation
          ? "Check your inbox to confirm your email, then sign in."
          : "Account created but no session yet — try signing in.";
        setLastError(msg);
        throw new Error(msg);
      }
      await persistTokens(s.access_token, s.refresh_token);
    },
    [persistTokens],
  );

  const signInGoogle = useCallback(async () => {
    setLastError(null);
    const supabase = getSupabase();
    if (!supabase) {
      const msg = "Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env for Google.";
      setLastError(msg);
      throw new Error(msg);
    }
    await signInWithGoogleOAuth(supabase);
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    const tok = data.session?.access_token;
    const ref = data.session?.refresh_token ?? null;
    if (!tok) {
      throw new Error("No session after Google sign-in");
    }
    await persistTokens(tok, ref);
  }, [persistTokens]);

  const signOut = useCallback(async () => {
    setLastError(null);
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    await persistTokens(null, null);
  }, [persistTokens]);

  const value = useMemo(
    () => ({
      hydrated,
      accessToken,
      lastError,
      clearError,
      signInEmail,
      signUpEmail,
      signInGoogle,
      signOut,
    }),
    [hydrated, accessToken, lastError, clearError, signInEmail, signUpEmail, signInGoogle, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return ctx;
}
