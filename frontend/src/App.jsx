import React, { useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Login from "./components/pages/Login";
import LoginModal from "./components/pages/LoginModal";
import ProtectedRoute from "./ProtectedRoute";
import "./App.css";

const Dashboard = lazy(() => import("./components/pages/Dashboard"));
const NewReport = lazy(() => import("./components/pages/NewReport"));
const Patients = lazy(() => import("./components/pages/Patients"));
const Reports = lazy(() => import("./components/pages/Reports"));
const Settings = lazy(() => import("./components/pages/Settings"));

function Skeleton({ className = "", style }) {
  return (
    <div
      className={`app-skel ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

function PageSkeleton() {
  return (
    <div className="page-skel-wrap">
      <div className="page-skel-top">
        <Skeleton className="skel-line" style={{ width: 260, height: 18 }} />
        <Skeleton className="skel-line" style={{ width: 180, height: 14 }} />
      </div>

      <div className="page-skel-grid">
        <div className="page-skel-card">
          <Skeleton className="skel-block" style={{ height: 120 }} />
          <Skeleton className="skel-line" style={{ width: "75%", height: 14 }} />
          <Skeleton className="skel-line" style={{ width: "55%", height: 14 }} />
        </div>

        <div className="page-skel-card">
          <Skeleton className="skel-block" style={{ height: 120 }} />
          <Skeleton className="skel-line" style={{ width: "70%", height: 14 }} />
          <Skeleton className="skel-line" style={{ width: "52%", height: 14 }} />
        </div>

        <div className="page-skel-card">
          <Skeleton className="skel-block" style={{ height: 120 }} />
          <Skeleton className="skel-line" style={{ width: "68%", height: 14 }} />
          <Skeleton className="skel-line" style={{ width: "46%", height: 14 }} />
        </div>
      </div>

      <div className="page-skel-table">
        <Skeleton className="skel-line" style={{ width: "90%", height: 14 }} />
        <Skeleton className="skel-line" style={{ width: "95%", height: 14 }} />
        <Skeleton className="skel-line" style={{ width: "92%", height: 14 }} />
        <Skeleton className="skel-line" style={{ width: "88%", height: 14 }} />
      </div>
    </div>
  );
}

function WelcomePage() {
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  return (
    <div
      className="welcome"
      style={{
        backgroundImage:
          "linear-gradient(rgba(3, 10, 18, 0.72), rgba(3, 10, 18, 0.78)), url('./cdrrmo_building.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="welcome-overlay" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />
      <div className="ambient ambient-1" aria-hidden="true" />
      <div className="ambient ambient-2" aria-hidden="true" />

      <main className="welcome-shell">
        <section className="hero-card">
          <div className="hero-content">
            <div className="hero-left">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                Emergency Medical Services
              </div>

              <div className="brand-row">
                <div className="brand-badge">
                  <img
                    src="./img_ems.png"
                    alt="EMS Logo"
                    className="brand-badge-logo"
                  />
                </div>

                <div className="brand-text">
                  <h1>EMS Patient Care Reporting System</h1>
                  <p className="subtitle">
                    Modern patient care documentation for EMS CDRRMO
                  </p>
                </div>
              </div>

              <h2 className="headline">Fast reporting. Clear patient documentation.</h2>

              <p className="lead">
                Record patient details, timelines, vitals, and incident notes in a
                clean and organized workflow built for emergency response teams.
              </p>

              <div className="actions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setShowLogin(true)}
                >
                  Login to System
                  <span className="arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              </div>

              <div className="trust-row">
                <div className="trust-item">
                  <span className="dot" />
                  Secure access
                </div>
                <div className="trust-item">
                  <span className="dot" />
                  Organized reporting
                </div>
                <div className="trust-item">
                  <span className="dot" />
                  Faster documentation
                </div>
              </div>
            </div>
          </div>

          <footer className="hero-foot">
            <span>EMS Patient Care Reporting System</span>
            <span className="sep">•</span>
            <span>CDRRMO</span>
            <span className="sep">•</span>
            <span>© 2026</span>
          </footer>

          <LoginModal
            open={showLogin}
            onClose={() => setShowLogin(false)}
            onSuccess={() => {
              setShowLogin(false);
              navigate("/dashboard", { replace: true });
            }}
          />
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patients"
          element={
            <ProtectedRoute>
              <Patients />
            </ProtectedRoute>
          }
        />

        <Route
          path="/new-report"
          element={
            <ProtectedRoute>
              <NewReport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}