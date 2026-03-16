// src/auth.js

// ✅ Preferred (new) keys
export const TOKEN_KEY = "ems_token"; // access token
export const REFRESH_KEY = "ems_refresh"; // refresh token
export const USER_KEY = "ems_user";

// ✅ Legacy keys (older code compatibility)
export const LEGACY_TOKEN_KEY = "access_token";
export const LEGACY_REFRESH_KEY = "refresh_token";

/** =========================
 *  Storage helpers
 *  ========================= */

export function setAuthTokens(access, refresh) {
  if (access != null) {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(LEGACY_TOKEN_KEY, access);

    // common older keys
    localStorage.setItem("access", access);
  }

  if (refresh != null) {
    localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.setItem(LEGACY_REFRESH_KEY, refresh);

    // common older keys
    localStorage.setItem("refresh", refresh);
  }
}

/**
 * Save auth state (token = access token)
 * Example: setAuth({ token: access, refresh, user })
 */
export function setAuth({ token, refresh, user } = {}) {
  if (token != null) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
    localStorage.setItem("access", token);
  }

  if (refresh != null) {
    localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.setItem(LEGACY_REFRESH_KEY, refresh);
    localStorage.setItem("refresh", refresh);
  }

  if (typeof user !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user || null));
  }
}

export function getAccessToken() {
  return (
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem("access") ||
    localStorage.getItem(LEGACY_TOKEN_KEY) ||
    localStorage.getItem("token") ||
    ""
  );
}

export function getToken() {
  // alias for older code
  return getAccessToken();
}

export function getRefreshToken() {
  return (
    localStorage.getItem(REFRESH_KEY) ||
    localStorage.getItem("refresh") ||
    localStorage.getItem(LEGACY_REFRESH_KEY) ||
    ""
  );
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAuth() {
  [
    TOKEN_KEY,
    REFRESH_KEY,
    USER_KEY,
    LEGACY_TOKEN_KEY,
    LEGACY_REFRESH_KEY,
    "access",
    "refresh",
    "token",
  ].forEach((k) => localStorage.removeItem(k));
}

export function isLoggedIn() {
  return !!getAccessToken();
}

/** =========================
 *  Response body helper (optional)
 *  ========================= */
export async function readResponseBody(res) {
  const ct = res.headers?.get?.("content-type") || "";
  if (ct.includes("application/json")) return res.json().catch(() => ({}));
  const text = await res.text().catch(() => "");
  return { detail: text };
}

/** =========================
 *  ✅ SimpleJWT refresh helpers
 *  ========================= */

/**
 * POST {apiBase}/api/token/refresh/
 * Body: { refresh: "<refresh_token>" }
 * Returns new access token string, or null on failure.
 */
export async function refreshAccessToken(apiBase) {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  const res = await fetch(`${apiBase}/api/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.access) return null;

  // keep same refresh, update access
  setAuthTokens(data.access, refresh);
  return data.access;
}

/** =========================
 *  Fetch wrapper
 *  - attaches Bearer token
 *  - if 401 and apiBase provided -> refresh -> retry once
 *  - does NOT force Content-Type for FormData
 *  ========================= */

/**
 * Usage:
 *   const res = await fetchWithAuth(`${API_BASE}/api/reports/`, { method:"GET" }, API_BASE);
 */
export async function fetchWithAuth(url, options = {}, apiBase) {
  const doFetch = (tok) => {
    const headers = {
      ...(options.headers || {}),
      ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
    };

    const isFormData = options.body instanceof FormData;

    // ✅ Only set JSON content-type if body exists AND it's not FormData
    if (options.body && !isFormData) {
      if (!("Content-Type" in headers)) headers["Content-Type"] = "application/json";
    }

    // ✅ If FormData, ensure we don't send a manual Content-Type
    // browser will set correct boundary automatically
    if (isFormData && "Content-Type" in headers) {
      delete headers["Content-Type"];
    }

    return fetch(url, { ...options, headers });
  };

  // 1) try current access token
  let res = await doFetch(getAccessToken());

  // 2) refresh on 401 then retry once (only if apiBase provided)
  if (res.status === 401 && apiBase) {
    const newAccess = await refreshAccessToken(apiBase);
    if (newAccess) res = await doFetch(newAccess);
  }

  return res;
}
