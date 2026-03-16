// src/components/ui/Toast.jsx
import React, { useEffect, useState } from "react";
import "./Toast.css";

export default function Toast({ open, message, type = "success", onClose, duration = 2400 }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!open) return;

    // mount + play enter animation
    setShow(true);

    const t = setTimeout(() => {
      // play exit animation
      setShow(false);

      // unmount after animation
      const t2 = setTimeout(() => {
        onClose?.();
      }, 220);

      return () => clearTimeout(t2);
    }, duration);

    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div className={`toast-wrap ${show ? "toast-in" : "toast-out"}`}>
      <div className={`toast toast-${type}`} role="status" aria-live="polite">
        <div className="toast-dot" />
        <div className="toast-msg">{message}</div>
        <button className="toast-x" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
    </div>
  );
}
