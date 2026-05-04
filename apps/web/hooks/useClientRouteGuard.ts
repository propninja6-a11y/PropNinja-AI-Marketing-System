"use client";

import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { canAccessRoute } from "../lib/auth/permissions";

export function useClientRouteGuard(pathname: string) {
  const { isAuthReady, isAuthenticated, role } = useAuth();

  useEffect(() => {
    if (!isAuthReady) return;
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    if (!canAccessRoute(role, pathname)) {
      window.location.href = "/403";
    }
  }, [isAuthReady, isAuthenticated, pathname, role]);

  return { isAuthReady, isAuthenticated };
}
