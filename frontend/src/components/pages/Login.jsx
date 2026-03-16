// src/components/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setAuthTokens } from "../../auth";

const API_BASE = "http://127.0.0.1:8000";

export default function Login() {
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      // ✅ FIX: your Django token URL is /api/token/ (WITH trailing slash)
      const res = await fetch(`${API_BASE}/api/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.detail || "Invalid credentials");
      }

      // ✅ Save tokens (access + refresh)
      setAuthTokens(data.access, data.refresh);

      // ✅ Go to dashboard
      nav("/dashboard", { replace: true });
    } catch (ex) {
      setErr(ex?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <form
        onSubmit={submit}
        style={{
          width: 380,
          padding: 18,
          border: "1px solid #ddd",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <h2 style={{ margin: 0, marginBottom: 6 }}>EMS Login</h2>
        <p style={{ marginTop: 0, opacity: 0.7 }}>Sign in to continue</p>

        {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}

        <label>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", padding: 10, marginBottom: 12 }}
        />

        <button disabled={loading} style={{ width: "100%", padding: 10 }}>
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
