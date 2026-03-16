import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import "./Dashboard.css";

/* =========================
   Skeleton helpers
========================= */
function Skeleton({ className = "", style }) {
  return <div className={`skel ${className}`} style={style} aria-hidden="true" />;
}

function DashboardSkeleton() {
  return (
    <div className="dash-layout">
      <Sidebar />

      <div className="dash-main">
        <div className="dash-page">
          <div className="dash-head">
            <div style={{ width: "100%" }}>
              <Skeleton className="skel-line skel-sm" style={{ width: 120 }} />
              <Skeleton className="skel-line skel-lg" style={{ width: 320, marginTop: 10 }} />
              <Skeleton className="skel-line skel-md" style={{ width: 420, marginTop: 10 }} />
            </div>

            <div className="dash-actions">
              <Skeleton className="skel-btn" />
              <Skeleton className="skel-btn" />
            </div>
          </div>

          <section className="dash-stats">
            {[1, 2, 3, 4].map((n) => (
              <div className="dash-card" key={n}>
                <div className="dash-card-top">
                  <Skeleton className="skel-line skel-sm" style={{ width: 120 }} />
                  {n === 1 ? (
                    <Skeleton className="skel-pill" style={{ width: 52, height: 24 }} />
                  ) : null}
                </div>

                <div className="dash-card-value">
                  <Skeleton className="skel-line skel-lg" style={{ width: 90 }} />
                </div>

                <div className="dash-card-sub">
                  <Skeleton className="skel-line skel-sm" style={{ width: 150 }} />
                </div>
              </div>
            ))}
          </section>

          <section className="dash-panel">
            <div className="dash-panel-head">
              <div style={{ width: "100%" }}>
                <Skeleton className="skel-line skel-md" style={{ width: 220 }} />
                <Skeleton className="skel-line skel-sm" style={{ width: 320, marginTop: 10 }} />
              </div>
            </div>

            <div className="dash-complaint-grid dash-complaint-grid-skeleton">
              {Array.from({ length: 5 }).map((_, i) => (
                <div className="dash-card dash-complaint-card" key={i}>
                  <div className="dash-card-top">
                    <Skeleton className="skel-line skel-sm" style={{ width: 120 }} />
                  </div>

                  <div className="dash-card-value">
                    <Skeleton className="skel-line skel-lg" style={{ width: 60 }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="dash-panel">
            <div className="dash-panel-head">
              <div style={{ width: "100%" }}>
                <Skeleton className="skel-line skel-md" style={{ width: 180 }} />
                <Skeleton className="skel-line skel-sm" style={{ width: 300, marginTop: 10 }} />
              </div>
            </div>

            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th><Skeleton className="skel-line skel-sm" style={{ width: 90 }} /></th>
                    <th><Skeleton className="skel-line skel-sm" style={{ width: 120 }} /></th>
                    <th><Skeleton className="skel-line skel-sm" style={{ width: 150 }} /></th>
                    <th className="col-sm"><Skeleton className="skel-line skel-sm" style={{ width: 60 }} /></th>
                    <th><Skeleton className="skel-line skel-sm" style={{ width: 110 }} /></th>
                    <th><Skeleton className="skel-line skel-sm" style={{ width: 80 }} /></th>
                  </tr>
                </thead>

                <tbody>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <tr key={i}>
                      <td><Skeleton className="skel-line skel-md" style={{ width: 110 }} /></td>
                      <td><Skeleton className="skel-line skel-md" style={{ width: 180 }} /></td>
                      <td><Skeleton className="skel-line skel-md" style={{ width: 220 }} /></td>
                      <td className="col-sm"><Skeleton className="skel-line skel-sm" style={{ width: 55 }} /></td>
                      <td><Skeleton className="skel-line skel-sm" style={{ width: 140 }} /></td>
                      <td><Skeleton className="skel-pill" style={{ width: 84, height: 28 }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="dash-table-foot">
                <Skeleton className="skel-line skel-sm" style={{ width: 220 }} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Helpers
========================= */
const API_BASE = "http://127.0.0.1:8000";

const COMPLAINT_KEYWORDS = [
  "MEDICAL",
  "TRAUMA",
  "INTERFACILITY",
  "HOST RAN",
  "STANDBY MEDICS",
];

function caseNoFromReport(r) {
  return r?.case_no ?? r?.incident?.case_no ?? "—";
}

function patientNameFromReport(r) {
  const p = r?.patient;
  if (!p) return "—";

  if (p.name) return p.name;

  const parts = [p.first_name, p.middle_name, p.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

function chiefComplaintFromReport(r) {
  const direct =
    r?.chief_complaint ??
    r?.chiefComplaint ??
    r?.complaint ??
    r?.chief_complaint_text ??
    r?.primary_complaint ??
    r?.presenting_complaint;

  if (direct) return String(direct);

  const p = r?.patient;
  const fromPatient =
    p?.chief_complaint ?? p?.chiefComplaint ?? p?.complaint ?? p?.presenting_complaint;

  if (fromPatient) return String(fromPatient);

  return "—";
}

function reportDateFromReport(r) {
  return (
    r?.date ??
    r?.created_at ??
    r?.created ??
    r?.timestamp ??
    r?.datetime ??
    r?.incident_date ??
    r?.incident_datetime ??
    r?.updated_at
  );
}

function formatDateSafe(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function isSameLocalDay(dateValue, baseDate = new Date()) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === baseDate.getFullYear() &&
    d.getMonth() === baseDate.getMonth() &&
    d.getDate() === baseDate.getDate()
  );
}

function badgeClass(status) {
  const s = String(status ?? "").toLowerCase();
  if (s === "completed" || s === "done" || s === "submitted") return "dash-badge success";
  if (s === "draft") return "dash-badge warning";
  if (s === "pending") return "dash-badge info";
  return "dash-badge";
}

function getComplaintCategoryCounts(reports) {
  const counts = {
    MEDICAL: 0,
    TRAUMA: 0,
    INTERFACILITY: 0,
    "HOST RAN": 0,
    "STANDBY MEDICS": 0,
  };

  reports.forEach((report) => {
    const complaint = chiefComplaintFromReport(report).toUpperCase();

    COMPLAINT_KEYWORDS.forEach((keyword) => {
      if (complaint.includes(keyword)) {
        counts[keyword] += 1;
      }
    });
  });

  return counts;
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/api/reports/`, {
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

        if (alive) setReports(list);
      } catch (e) {
        if (alive) setError("Failed to load reports. Check API and try again.");
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const recentReports = useMemo(() => reports.slice(0, 8), [reports]);

  const todaysReports = useMemo(() => {
    const today = new Date();
    return reports.filter((r) => isSameLocalDay(reportDateFromReport(r), today)).length;
  }, [reports]);

  const draftCount = useMemo(
    () => reports.filter((r) => String(r?.status ?? "").toLowerCase() === "draft").length,
    [reports]
  );

  const complaintCounts = useMemo(() => getComplaintCategoryCounts(reports), [reports]);

  const [lastSync, setLastSync] = useState(() => new Date().toLocaleString());
  useEffect(() => {
    const t = setInterval(() => setLastSync(new Date().toLocaleString()), 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="dash-layout">
      <Sidebar />

      <div className="dash-main">
        <div className="dash-page">
          <div className="dash-head">
            <div>
              <div className="dash-crumbs">Dashboard</div>
              <h2 className="dash-title">EMS Patient Care Overview</h2>
              <p className="dash-subtitle">
                Monitor reports, latest activity, and response documentation in one view.
              </p>
            </div>

            <div className="dash-actions">
              <button className="dash-btn dash-btn-primary" onClick={() => navigate("/new-report")}>
                New Report
              </button>
              <button className="dash-btn dash-btn-ghost" onClick={() => navigate("/reports")}>
                View Reports
              </button>
            </div>
          </div>

          <section className="dash-stats">
            <div className="dash-card">
              <div className="dash-card-top">
                <div className="dash-card-label">Today’s Reports</div>
                <div className="dash-pill">Live</div>
              </div>
              <div className="dash-card-value">{todaysReports}</div>
              <div className="dash-card-sub">Created today</div>
            </div>

            <div className="dash-card">
              <div className="dash-card-top">
                <div className="dash-card-label">Total Reports</div>
              </div>
              <div className="dash-card-value">{reports.length}</div>
              <div className="dash-card-sub">All recorded reports</div>
            </div>

            <div className="dash-card">
              <div className="dash-card-top">
                <div className="dash-card-label">Draft Reports</div>
              </div>
              <div className="dash-card-value">{draftCount}</div>
              <div className="dash-card-sub">Needs completion</div>
            </div>

            <div className="dash-card">
              <div className="dash-card-top">
                <div className="dash-card-label">Last Sync</div>
              </div>
              <div className="dash-card-value dash-card-small">{lastSync}</div>
              <div className="dash-card-sub">Local device time</div>
            </div>
          </section>

          <section className="dash-panel">
            <div className="dash-panel-head">
              <div>
                <h3 className="dash-panel-title">Chief Complaint Categories</h3>
                <p className="dash-panel-sub">
                  Auto-counted by matching words from chief complaint text
                </p>
              </div>
            </div>

            <div className="dash-complaint-grid">
              <div className="dash-card dash-complaint-card">
                <div className="dash-card-top">
                  <div className="dash-card-label">Medical</div>
                </div>
                <div className="dash-card-value">{complaintCounts["MEDICAL"]}</div>
              </div>

              <div className="dash-card dash-complaint-card">
                <div className="dash-card-top">
                  <div className="dash-card-label">Trauma</div>
                </div>
                <div className="dash-card-value">{complaintCounts["TRAUMA"]}</div>
              </div>

              <div className="dash-card dash-complaint-card">
                <div className="dash-card-top">
                  <div className="dash-card-label">Interfacility</div>
                </div>
                <div className="dash-card-value">{complaintCounts["INTERFACILITY"]}</div>
              </div>

              <div className="dash-card dash-complaint-card">
                <div className="dash-card-top">
                  <div className="dash-card-label">HostRan</div>
                </div>
                <div className="dash-card-value">{complaintCounts["HOST RAN"]}</div>
              </div>

              <div className="dash-card dash-complaint-card dash-complaint-card-accent">
                <div className="dash-card-top">
                  <div className="dash-card-label">Standby Medics</div>
                </div>
                <div className="dash-card-value">{complaintCounts["STANDBY MEDICS"]}</div>
              </div>
            </div>
          </section>

          <section className="dash-panel">
            <div className="dash-panel-head">
              <div>
                <h3 className="dash-panel-title">Recent Reports</h3>
                <p className="dash-panel-sub">
                  Quick view of the latest patient care reports and statuses
                </p>
              </div>
            </div>

            {error ? (
              <div className="dash-alert">
                <div className="dash-alert-title">Couldn’t load reports</div>
                <div className="dash-alert-text">{error}</div>
              </div>
            ) : (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Case No.</th>
                      <th>Patient</th>
                      <th>Chief Complaint</th>
                      <th className="col-sm">Call</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentReports.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="dash-empty">
                          No reports yet.
                        </td>
                      </tr>
                    ) : (
                      recentReports.map((r) => (
                        <tr key={r?.id ?? caseNoFromReport(r)}>
                          <td>
                            <strong>{caseNoFromReport(r)}</strong>
                          </td>
                          <td>{patientNameFromReport(r)}</td>
                          <td>{chiefComplaintFromReport(r)}</td>
                          <td className="col-sm">{r?.call_no ?? "—"}</td>
                          <td>{formatDateSafe(reportDateFromReport(r))}</td>
                          <td>
                            <span className={badgeClass(r?.status)}>{r?.status ?? "—"}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <div className="dash-table-foot">
                  Showing <b>{recentReports.length}</b> of <b>{reports.length}</b> results
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}