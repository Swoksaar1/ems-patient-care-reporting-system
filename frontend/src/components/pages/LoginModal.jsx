import React, { useState } from "react";
import "./LoginModal.css";
import { setAuth } from "../../auth";

const API_BASE = "http://127.0.0.1:8000";

export default function LoginModal({ open, onClose, onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();

    if (loading) return;
    setErr("");

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setErr("Please enter your username.");
      return;
    }

    if (!password) {
      setErr("Please enter your password.");
      return;
    }

    setLoading(true);

    const payload = {
      username: cleanUsername,
      password, // do NOT trim password
    };

    try {
      const res = await fetch(`${API_BASE}/api/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(
          data?.detail ||
            data?.non_field_errors?.[0] ||
            "Login failed. Check your credentials."
        );
        return;
      }

      setAuth({
        token: data.access,
        refresh: data.refresh,
        user: { username: cleanUsername },
      });

      setUsername("");
      setPassword("");
      setErr("");

      onClose?.();
      onSuccess?.();
    } catch (e2) {
      console.error("Login network error:", e2);
      setErr("Network error. Make sure Django is running.");
    } finally {
      setLoading(false);
    }
  }

  function closeOnBackdrop(e) {
    if (loading) return;
    if (e.target.classList.contains("lm-backdrop")) onClose?.();
  }

  return (
    <div
      className="lm-backdrop"
      onMouseDown={closeOnBackdrop}
      role="dialog"
      aria-modal="true"
    >
      <div className="lm-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="lm-glow lm-glow-1" aria-hidden="true" />
        <div className="lm-glow lm-glow-2" aria-hidden="true" />

        <div className="lm-head">
          <div className="lm-brand">
            <div className="lm-brand-badge">
              <img
                src="./img_ems.png"
                alt="EMS Logo"
                className="lm-brand-logo"
              />
            </div>

            <div>
              <h2 className="lm-title">EMS Login</h2>
              <p className="lm-sub">Sign in to continue to the reporting system</p>
            </div>
          </div>

          <button
            className="lm-x"
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {err ? <div className="lm-error">{err}</div> : null}

        <form className="lm-form" onSubmit={submit}>
          <div className="lm-field">
            <label className="lm-label" htmlFor="lm-username">
              Username
            </label>
            <input
              id="lm-username"
              className="lm-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              disabled={loading}
              autoComplete="username"
              spellCheck={false}
              placeholder="Enter your username"
            />
          </div>

          <div className="lm-field">
            <label className="lm-label" htmlFor="lm-password">
              Password
            </label>
            <input
              id="lm-password"
              className="lm-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </div>

          <button className="lm-btn" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
            {!loading && (
              <span className="lm-btn-arrow" aria-hidden="true">
                →
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}