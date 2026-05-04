export type SessionInput = {
  accessToken: string;
  refreshToken: string;
  role?: string;
  email?: string;
  expiresAt?: string;
};

type SessionMeta = {
  role: string | null;
  email: string | null;
  expiresAt: string | null;
};

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
const ROLE_KEY = "role";
const EMAIL_KEY = "email";
const EXPIRES_KEY = "expiresAt";
const SESSION_COOKIE = "pn_session=1; path=/; SameSite=Lax";
const SESSION_CLEAR_COOKIE = "pn_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let sessionMeta: SessionMeta = { role: null, email: null, expiresAt: null };

const isBrowser = () => typeof window !== "undefined";

export function setSession(input: SessionInput) {
  accessToken = input.accessToken;
  refreshToken = input.refreshToken;
  sessionMeta = {
    role: input.role ?? null,
    email: input.email ?? null,
    expiresAt: input.expiresAt ?? null
  };

  if (!isBrowser()) return;
  localStorage.setItem(ACCESS_KEY, input.accessToken);
  localStorage.setItem(REFRESH_KEY, input.refreshToken);
  if (input.role) localStorage.setItem(ROLE_KEY, input.role);
  if (input.email) localStorage.setItem(EMAIL_KEY, input.email);
  if (input.expiresAt) localStorage.setItem(EXPIRES_KEY, input.expiresAt);
  document.cookie = SESSION_COOKIE;
}

export function loadSessionFromStorage() {
  if (!isBrowser()) return;
  accessToken = localStorage.getItem(ACCESS_KEY);
  refreshToken = localStorage.getItem(REFRESH_KEY);
  sessionMeta = {
    role: localStorage.getItem(ROLE_KEY),
    email: localStorage.getItem(EMAIL_KEY),
    expiresAt: localStorage.getItem(EXPIRES_KEY)
  };
  if (accessToken || refreshToken) {
    document.cookie = SESSION_COOKIE;
  }
}

export function clearSession() {
  accessToken = null;
  refreshToken = null;
  sessionMeta = { role: null, email: null, expiresAt: null };

  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(EXPIRES_KEY);
  document.cookie = SESSION_CLEAR_COOKIE;
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function getSessionMeta(): SessionMeta {
  return sessionMeta;
}
