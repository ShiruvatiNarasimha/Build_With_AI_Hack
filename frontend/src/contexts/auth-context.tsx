"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type AuthSessionPayload,
  type AuthUser,
  exchangeGoogleIdToken,
  logoutAuthSession,
  refreshAuthSession,
} from "@/lib/auth-client";

type AuthStatus = "authenticated" | "loading" | "unauthenticated";

interface AuthContextValue {
  accessToken: string | null;
  isAuthenticated: boolean;
  signInWithGoogle: (idToken: string) => Promise<AuthSessionPayload>;
  signOut: () => Promise<void>;
  status: AuthStatus;
  user: AuthUser | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const applySession = useCallback((session: AuthSessionPayload) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const session = await refreshAuthSession();
      applySession(session);
    } catch {
      clearSession();
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      const session = await exchangeGoogleIdToken(idToken);
      applySession(session);
      return session;
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    try {
      await logoutAuthSession();
    } finally {
      if (typeof window !== "undefined") {
        window.google?.accounts.id.disableAutoSelect();
      }

      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      isAuthenticated: status === "authenticated",
      signInWithGoogle,
      signOut,
      status,
      user,
    }),
    [accessToken, signInWithGoogle, signOut, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
