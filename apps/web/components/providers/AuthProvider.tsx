"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import {
  clearSession,
  getAccessToken,
  getSessionMeta,
  loadSessionFromStorage,
  setSession
} from "../../lib/auth/token-store";

type LoginInput = {
  accessToken: string;
  refreshToken: string;
  role?: string;
  email?: string;
  expiresAt?: string;
};

type AuthContextValue = {
  user: { email: string | null } | null;
  role: string | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  isAdmin: boolean;
  isManager: boolean;
  canManageCampaigns: boolean;
  login: (payload: LoginInput) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadSessionFromStorage();
    const token = getAccessToken();
    const meta = getSessionMeta();
    setRole(meta.role);
    setEmail(meta.email);
    setIsAuthenticated(Boolean(token));
    setIsAuthReady(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== "accessToken" && event.key !== "refreshToken" && event.key !== null) return;
      loadSessionFromStorage();
      const currentMeta = getSessionMeta();
      setRole(currentMeta.role);
      setEmail(currentMeta.email);
      setIsAuthenticated(Boolean(getAccessToken()));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: { email },
      role,
      isAuthenticated,
      isAuthReady,
      isAdmin: role === "Admin",
      isManager: role === "Manager",
      canManageCampaigns: role === "Admin" || role === "Manager",
      login(payload) {
        setSession(payload);
        setRole(payload.role ?? null);
        setEmail(payload.email ?? null);
        setIsAuthenticated(true);
      },
      logout() {
        clearSession();
        setRole(null);
        setEmail(null);
        setIsAuthenticated(false);
      }
    }),
    [email, isAuthReady, isAuthenticated, role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
