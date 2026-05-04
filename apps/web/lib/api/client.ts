import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getSessionMeta,
  loadSessionFromStorage,
  setSession
} from "../auth/token-store";

type ApiEnvelope<T = unknown> = {
  success: boolean;
  data: T;
  error: null | { message?: string; details?: unknown };
};

export class ApiError extends Error {
  status: number;
  details?: unknown;
  requestId?: string | null;

  constructor({
    status,
    message,
    details,
    requestId
  }: {
    status: number;
    message: string;
    details?: unknown;
    requestId?: string | null;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.requestId = requestId ?? null;
  }
}

const isBrowser = () => typeof window !== "undefined";
let refreshPromise: Promise<string | null> | null = null;

async function parseResponse(res: Response): Promise<ApiEnvelope> {
  try {
    return (await res.json()) as ApiEnvelope;
  } catch (_error) {
    return {
      success: false,
      data: {},
      error: { message: "Invalid server response format" }
    };
  }
}

function apiBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  return base.replace(/\/$/, "");
}

function buildUrl(path: string) {
  return `${apiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function redirectToLogin() {
  if (isBrowser()) window.location.href = "/login";
}

async function requestRefreshToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new ApiError({ status: 401, message: "Missing refresh token" });

  const res = await fetch(buildUrl("/api/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });
  const body = await parseResponse(res);
  const refreshData = body.data as { token?: string };
  if (!res.ok || !body.success || !refreshData?.token) {
    throw new ApiError({
      status: res.status || 401,
      message: body.error?.message || "Refresh failed",
      details: body.error?.details,
      requestId: res.headers.get("x-request-id")
    });
  }

  setSession({
    accessToken: refreshData.token,
    refreshToken,
    role: getSessionMeta().role ?? undefined,
    email: getSessionMeta().email ?? undefined,
    expiresAt: getSessionMeta().expiresAt ?? undefined
  });
  return refreshData.token;
}

async function getFreshAccessToken() {
  // Queue all concurrent 401 handlers behind a single refresh request.
  if (!refreshPromise) {
    refreshPromise = requestRefreshToken()
      .catch((error) => {
        clearSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

type ApiOptions = RequestInit & { skipAuth?: boolean };

export async function apiJson<T = unknown>(path: string, options: ApiOptions = {}, retry = true): Promise<T> {
  if (!getAccessToken()) loadSessionFromStorage();

  const headers = new Headers(options.headers || {});
  const isAuthRoute = path.includes("/api/auth/login") || path.includes("/api/auth/refresh");
  const isFormData = isBrowser() && options.body instanceof FormData;
  const skipAuth = Boolean(options.skipAuth) || isAuthRoute;

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && options.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (isBrowser() && !headers.has("X-Request-ID") && "randomUUID" in crypto) {
    headers.set("X-Request-ID", crypto.randomUUID());
  }

  const { skipAuth: _skipAuth, ...requestInit } = options;
  const res = await fetch(buildUrl(path), {
    ...requestInit,
    headers
  });
  const body = await parseResponse(res);

  if (res.status === 401 && retry && !skipAuth) {
    try {
      await getFreshAccessToken();
      // Retry exactly once after shared refresh promise resolves.
      return apiJson<T>(path, options, false);
    } catch (_error) {
      redirectToLogin();
      throw new ApiError({ status: 401, message: "Session expired" });
    }
  }

  if (!res.ok || !body.success) {
    throw new ApiError({
      status: res.status,
      message: body.error?.message || `Request failed (${res.status})`,
      details: body.error?.details,
      requestId: res.headers.get("x-request-id")
    });
  }

  return body.data as T;
}
