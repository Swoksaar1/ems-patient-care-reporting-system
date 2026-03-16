// src/api.js
import { getAccessToken } from "./auth";

const API_BASE = "http://192.168.136.90:8000";

export async function apiFetch(path, options = {}) {
  const token = getAccessToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.detail || data?.message || "Request failed";
    throw new Error(msg);
  }
  return data;
}
