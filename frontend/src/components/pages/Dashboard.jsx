import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import "./Dashboard.css";

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
            {[1, 2, 3, 4, 5].map((n) => (
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

          <section className="dash-grid-2">
            <div className="dash-panel dash-panel-trend">
              <div className="dash-panel-head">
                <Skeleton className="skel-line skel-md" style={{ width: 180 }} />
                <Skeleton className="skel-line skel-sm" style={{ width: 260, marginTop: 10 }} />
              </div>

              <div className="dash-chart-pad">
                <Skeleton className="skel" style={{ width: "100%", height: 220 }} />
              </div>
            </div>

            <div className="dash-panel dash-panel-distribution">
              <div className="dash-panel-head">
                <Skeleton className="skel-line skel-md" style={{ width: 200 }} />
                <Skeleton className="skel-line skel-sm" style={{ width: 240, marginTop: 10 }} />
              </div>

              <div className="dash-chart-pad">
                <Skeleton className="skel" style={{ width: "100%", height: 220 }} />
              </div>
            </div>
          </section>

          <section className="dash-grid-4">
            {[1, 2, 3, 4].map((n) => (
              <div className="dash-panel" key={n}>
                <div className="dash-panel-head">
                  <Skeleton className="skel-line skel-md" style={{ width: 180 }} />
                  <Skeleton className="skel-line skel-sm" style={{ width: 220, marginTop: 10 }} />
                </div>

                <div className="dash-list">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div className="dash-list-item" key={i}>
                      <Skeleton className="skel-line skel-sm" style={{ width: "42%" }} />
                      <Skeleton className="skel-line skel-sm" style={{ width: 40 }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

const API_BASE = "http://127.0.0.1:8000";

function reportDateFromReport(r) {
  return (
    r?.doi ??
    r?.incident?.doi ??
    r?.date_of_incident ??
    r?.incident?.date_of_incident ??
    r?.incident_date ??
    r?.incident?.incident_date ??
    r?.date ??
    r?.created_at ??
    r?.created ??
    r?.timestamp ??
    r?.datetime ??
    r?.incident_datetime ??
    r?.updated_at
  );
}

function parseDateSafe(value) {
  if (!value) return null;

  const text = String(value).trim();

  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);

    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSameLocalDay(dateValue, baseDate = new Date()) {
  const d = parseDateSafe(dateValue);
  if (!d) return false;

  return (
    d.getFullYear() === baseDate.getFullYear() &&
    d.getMonth() === baseDate.getMonth() &&
    d.getDate() === baseDate.getDate()
  );
}

function isSameMonth(dateValue, baseDate = new Date()) {
  const d = parseDateSafe(dateValue);
  if (!d) return false;

  return d.getFullYear() === baseDate.getFullYear() && d.getMonth() === baseDate.getMonth();
}

function formatShortDate(dateValue) {
  const d = parseDateSafe(dateValue);
  if (!d) return "—";

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCaseTypeRaw(report) {
  return (
    report?.case_type ??
    report?.caseType ??
    report?.type ??
    report?.category ??
    report?.classification ??
    report?.patient_case_type ??
    report?.patient?.case_type ??
    report?.patient?.caseType ??
    report?.patient?.type ??
    report?.patient?.category ??
    report?.patient?.classification ??
    report?.patient_details?.case_type ??
    report?.patient_details?.caseType ??
    report?.details?.case_type ??
    report?.details?.caseType ??
    report?.form_data?.case_type ??
    report?.form_data?.caseType ??
    ""
  );
}

function normalizeCaseType(value) {
  const text = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!text) return "";

  if (text.includes("MEDICAL")) return "MEDICAL";
  if (text.includes("TRAUMA")) return "TRAUMA";
  if (text.includes("INTERFACILITY")) return "INTERFACILITY";
  if (text.includes("HOSTRAN") || text.includes("HOST RAN")) return "HOST RAN";

  if (
    text.includes("STANDBY MEDICS") ||
    text.includes("STANDBY MEDIC") ||
    text.includes("STANDBY")
  ) {
    return "STANDBY MEDICS";
  }

  if (text.includes("BACK TO BASE")) return "BACK TO BASE";

  return "";
}

function getCaseTypeCounts(reports) {
  const counts = {
    MEDICAL: 0,
    TRAUMA: 0,
    INTERFACILITY: 0,
    "HOST RAN": 0,
    "STANDBY MEDICS": 0,
    "BACK TO BASE": 0,
  };

  reports.forEach((report) => {
    const raw = getCaseTypeRaw(report);
    const normalized = normalizeCaseType(raw);

    if (normalized && counts[normalized] !== undefined) {
      counts[normalized] += 1;
    }
  });

  return counts;
}

function getValueByCandidates(obj, candidates = []) {
  for (const path of candidates) {
    const parts = path.split(".");
    let current = obj;

    for (const part of parts) {
      current = current?.[part];
      if (current === undefined || current === null) break;
    }

    if (current !== undefined && current !== null && String(current).trim() !== "") {
      return String(current).trim();
    }
  }

  return "";
}

function normalizeLabel(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeNameKey(value) {
  return normalizeLabel(value).toUpperCase();
}

function getAddress(report) {
  return (
    report?.patient?.address ||
    report?.address ||
    report?.patient_location ||
    report?.location ||
    ""
  );
}

function getBarangayFromAddress(address) {
  const normalizedAddress = String(address || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedAddress) return "OTHERS";

  const within5KmBarangays = [
    "B1",
    "B2",
    "B3",
    "B4",
    "B5",
    "B6",
    "B7",
    "B8",
    "B9",
    "B10",
    "B11",
    "B12",
    "CAPITOL",
    "CASISANG",
    "KALASUNGAY",
  ];

  const aliases = {
    B1: ["B 1", "BARANGAY 1", "BRGY 1", "BRGY. 1", "POBLACION 1"],
    B2: ["B 2", "BARANGAY 2", "BRGY 2", "BRGY. 2", "POBLACION 2"],
    B3: ["B 3", "BARANGAY 3", "BRGY 3", "BRGY. 3", "POBLACION 3"],
    B4: ["B 4", "BARANGAY 4", "BRGY 4", "BRGY. 4", "POBLACION 4"],
    B5: ["B 5", "BARANGAY 5", "BRGY 5", "BRGY. 5", "POBLACION 5"],
    B6: ["B 6", "BARANGAY 6", "BRGY 6", "BRGY. 6", "POBLACION 6"],
    B7: ["B 7", "BARANGAY 7", "BRGY 7", "BRGY. 7", "POBLACION 7"],
    B8: ["B 8", "BARANGAY 8", "BRGY 8", "BRGY. 8", "POBLACION 8"],
    B9: ["B 9", "BARANGAY 9", "BRGY 9", "BRGY. 9", "POBLACION 9"],
    B10: ["B 10", "BARANGAY 10", "BRGY 10", "BRGY. 10", "POBLACION 10"],
    B11: ["B 11", "BARANGAY 11", "BRGY 11", "BRGY. 11", "POBLACION 11"],
    B12: ["B 12", "BARANGAY 12", "BRGY 12", "BRGY. 12", "POBLACION 12"],
    CAPITOL: ["CAPITOL"],
    CASISANG: ["CASISANG"],
    KALASUNGAY: ["KALASUNGAY"],
  };

  for (const barangay of within5KmBarangays) {
    const possibleNames = [barangay, ...(aliases[barangay] || [])].map((name) =>
      String(name)
        .toUpperCase()
        .replace(/\./g, "")
        .replace(/-/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    );

    const found = possibleNames.some((name) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, "i");
      return regex.test(normalizedAddress);
    });

    if (found) {
      return barangay;
    }
  }

  return "OTHERS";
}

function getBarangay(report) {
  const explicitBarangay = getValueByCandidates(report, [
    "barangay",
    "address.barangay",
    "location.barangay",
    "incident_location.barangay",
    "incident.barangay",
    "patient.barangay",
    "patient.address.barangay",
    "details.barangay",
    "form_data.barangay",
  ]);

  const resolvedBarangay = explicitBarangay || getBarangayFromAddress(getAddress(report));

  if (!resolvedBarangay || resolvedBarangay.toUpperCase() === "OTHERS") {
    return "";
  }

  return resolvedBarangay;
}

function getHospital(report) {
  return getValueByCandidates(report, [
    "transported_to",
    "destination_hospital",
    "hospital_name",
    "facility",
    "facility_name",
    "destination_facility",
    "transport_facility",
    "destination.name",
    "hospital.name",
    "details.hospital",
    "details.facility",
    "form_data.hospital",
    "form_data.facility",
  ]);
}

function getComplaintOrCaseName(report) {
  return (
    getValueByCandidates(report, [
      "patient.chief_complaint",
      "chief_complaint",
      "complaint",
      "chiefComplaint",
      "medical_case",
      "trauma_case",
      "case_name",
      "details.chief_complaint",
      "details.complaint",
      "form_data.chief_complaint",
      "form_data.complaint",
    ]) || ""
  );
}

function countTopValues(reports, getter, limit = 5) {
  const map = new Map();

  reports.forEach((report) => {
    const raw = getter(report);
    const label = normalizeLabel(raw);

    if (!label) return;
    if (label.toUpperCase() === "OTHERS") return;

    const key = normalizeNameKey(label);
    const existing = map.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { label, count: 1 });
    }
  });

  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function getDaysInMonth(baseDate = new Date()) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
}

function buildDailyRuns(reports, baseDate = new Date()) {
  const daysInMonth = getDaysInMonth(baseDate);

  const daily = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    label: `${i + 1}`,
    count: 0,
  }));

  reports.forEach((report) => {
    const d = parseDateSafe(reportDateFromReport(report));
    if (!d) return;

    if (d.getFullYear() !== baseDate.getFullYear() || d.getMonth() !== baseDate.getMonth()) {
      return;
    }

    const index = d.getDate() - 1;
    if (daily[index]) daily[index].count += 1;
  });

  return daily;
}

function getThisMonthRuns(reports, baseDate = new Date()) {
  return reports.filter((r) => isSameMonth(reportDateFromReport(r), baseDate)).length;
}

function getAverageRunsPerDay(reports, baseDate = new Date()) {
  const monthRuns = getThisMonthRuns(reports, baseDate);
  const currentDay = baseDate.getDate() || 1;

  return currentDay > 0 ? (monthRuns / currentDay).toFixed(1) : "0.0";
}

function getTopCasesByType(reports, caseType, limit = 5) {
  const filtered = reports.filter((report) => {
    const type = normalizeCaseType(getCaseTypeRaw(report));
    return type === caseType;
  });

  return countTopValues(filtered, getComplaintOrCaseName, limit);
}

function isWithin5Km(address) {
  return getBarangayFromAddress(address) !== "OTHERS";
}

function getAverageRespondTimeMinutes(reports) {
  const validDiffs = reports
    .filter((report) => isWithin5Km(getAddress(report)))
    .map((report) => {
      const responded = parseDateSafe(report?.responded_time);

      const arrivedScene = parseDateSafe(
        report?.arrived_scene_time ||
          report?.arrived_at_scene_time ||
          report?.scene_arrival_time
      );

      if (!responded || !arrivedScene) return null;

      const diffMinutes = (arrivedScene.getTime() - responded.getTime()) / 60000;
      if (diffMinutes < 0) return null;

      return diffMinutes;
    })
    .filter((value) => typeof value === "number");

  if (!validDiffs.length) return null;

  const total = validDiffs.reduce((sum, value) => sum + value, 0);
  return (total / validDiffs.length).toFixed(2);
}

function MiniBarChart({ data = [] }) {
  const max = Math.max(...data.map((d) => d.count), 35);
  const yAxisLabels = [35, 30, 25, 20, 15, 10, 5, 0];

  return (
    <div className="dash-trend-chart">
      <div className="dash-trend-y-axis">
        {yAxisLabels.map((label) => (
          <div key={label} className="dash-trend-y-label">
            {label}
          </div>
        ))}
      </div>

      <div className="dash-trend-scroll">
        <div
          className="dash-trend-bars"
          style={{ gridTemplateColumns: `repeat(${data.length}, minmax(22px, 22px))` }}
        >
          {data.map((item) => {
            const barPercent = Math.max((item.count / max) * 100, item.count > 0 ? 8 : 2);
            const height = `${barPercent}%`;
            const labelInsideBar = barPercent >= 18 && item.count > 0;

            return (
              <div className="dash-trend-col" key={item.day}>
                <div className="dash-trend-bar-wrap">
                  <div className="dash-trend-bar-hitbox">
                    <div className="dash-trend-tooltip">
                      Day {item.day}: {item.count} {item.count === 1 ? "run" : "runs"}
                    </div>

                    {!labelInsideBar && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: `calc(${height} + 6px)`,
                          left: "50%",
                          transform: "translateX(-50%)",
                          fontSize: "11px",
                          fontWeight: 800,
                          color: "#eaf8ff",
                          background: "rgba(7, 17, 29, 0.88)",
                          border: "1px solid rgba(103, 232, 249, 0.18)",
                          borderRadius: "6px",
                          padding: "2px 5px",
                          lineHeight: 1,
                          whiteSpace: "nowrap",
                          zIndex: 3,
                          pointerEvents: "none",
                        }}
                      >
                        {item.count}
                      </div>
                    )}

                    <div
                      className="dash-trend-bar"
                      style={{
                        height,
                        position: "relative",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        overflow: "visible",
                      }}
                      aria-label={`Day ${item.day}: ${item.count} ${
                        item.count === 1 ? "run" : "runs"
                      }`}
                    >
                      {labelInsideBar && (
                        <span
                          style={{
                            marginTop: "4px",
                            fontSize: "11px",
                            fontWeight: 900,
                            color: "#03111d",
                            lineHeight: 1,
                            pointerEvents: "none",
                            userSelect: "none",
                          }}
                        >
                          {item.count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="dash-trend-label">{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DonutChart({ data = [] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 62;
  const stroke = 18;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const colors = ["#67e8f9", "#38bdf8", "#14b8a6", "#818cf8", "#f59e0b", "#ef4444"];

  let cumulative = 0;

  return (
    <div className="dash-donut-wrap">
      <svg width="170" height="170" viewBox="0 0 170 170" className="dash-donut">
        <circle
          cx="85"
          cy="85"
          r={normalizedRadius}
          fill="transparent"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />

        {total > 0 &&
          data.map((item, index) => {
            const value = item.value;
            const pct = value / total;
            const dash = pct * circumference;
            const gap = circumference - dash;
            const offset = -cumulative * circumference;
            cumulative += pct;

            return (
              <circle
                key={item.label}
                cx="85"
                cy="85"
                r={normalizedRadius}
                fill="transparent"
                stroke={colors[index % colors.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                transform="rotate(-90 85 85)"
              />
            );
          })}

        <text x="85" y="80" textAnchor="middle" className="dash-donut-total">
          {total}
        </text>
        <text x="85" y="100" textAnchor="middle" className="dash-donut-sub">
          TOTAL
        </text>
      </svg>

      <div className="dash-legend">
        {data.map((item, index) => {
          const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;

          return (
            <div className="dash-legend-item" key={item.label}>
              <span
                className="dash-legend-dot"
                style={{ background: colors[index % colors.length] }}
              />
              <span className="dash-legend-text">{item.label}</span>
              <span className="dash-legend-value">
                {item.value} ({percent}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopList({ items = [], emptyText = "No data available." }) {
  if (!items.length) {
    return <div className="dash-list-empty">{emptyText}</div>;
  }

  return (
    <div className="dash-list">
      {items.map((item, index) => (
        <div className="dash-list-item" key={`${item.label}-${index}`}>
          <div className="dash-list-left">
            <span className="dash-list-rank">#{index + 1}</span>
            <span className="dash-list-name">{item.label}</span>
          </div>

          <div className="dash-list-right">{item.count}</div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`${API_BASE}/api/reports/`, {
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

        if (alive) {
          setReports(list);
        }
      } catch (e) {
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

  const todaysReports = useMemo(() => {
    const today = new Date();
    return reports.filter((r) => isSameLocalDay(reportDateFromReport(r), today)).length;
  }, [reports]);

  const thisMonthRuns = useMemo(() => getThisMonthRuns(reports, new Date()), [reports]);

  const avgRunsPerDay = useMemo(() => getAverageRunsPerDay(reports, new Date()), [reports]);

  const avgRespondTime = useMemo(() => {
    const value = getAverageRespondTimeMinutes(reports);
    return value !== null ? `${value} mins` : "—";
  }, [reports]);

  const caseTypeCounts = useMemo(() => getCaseTypeCounts(reports), [reports]);

  const dailyRuns = useMemo(() => buildDailyRuns(reports, new Date()), [reports]);

  const caseTypeChartData = useMemo(
    () => [
      { label: "Medical", value: caseTypeCounts["MEDICAL"] },
      { label: "Trauma", value: caseTypeCounts["TRAUMA"] },
      { label: "Interfacility", value: caseTypeCounts["INTERFACILITY"] },
      { label: "Hostran", value: caseTypeCounts["HOST RAN"] },
      { label: "Standby Medics", value: caseTypeCounts["STANDBY MEDICS"] },
      { label: "Back to Base", value: caseTypeCounts["BACK TO BASE"] },
    ],
    [caseTypeCounts]
  );

  const topBarangays = useMemo(() => countTopValues(reports, getBarangay, 5), [reports]);

  const topHospitals = useMemo(() => {
    const interfacilityReports = reports.filter((report) => {
      const type = normalizeCaseType(getCaseTypeRaw(report));
      return type === "INTERFACILITY";
    });

    return countTopValues(interfacilityReports, getHospital, 5);
  }, [reports]);

  const topMedicalCases = useMemo(
    () => getTopCasesByType(reports, "MEDICAL", 5),
    [reports]
  );

  const topTraumaCases = useMemo(
    () => getTopCasesByType(reports, "TRAUMA", 5),
    [reports]
  );

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
              <div className="dash-card-sub">Based on today’s DOI</div>
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
                <div className="dash-card-label">Average Runs / Day</div>
              </div>

              <div className="dash-card-value">{avgRunsPerDay}</div>
              <div className="dash-card-sub">Based on current month DOI</div>
            </div>

            <div className="dash-card">
              <div className="dash-card-top">
                <div className="dash-card-label">Average Respond Time</div>
              </div>

              <div className="dash-card-value">{avgRespondTime}</div>
              <div className="dash-card-sub">Within 5 km, in minutes</div>
            </div>

            <div className="dash-card">
              <div className="dash-card-top">
                <div className="dash-card-label">This Month’s Runs</div>
              </div>

              <div className="dash-card-value">{thisMonthRuns}</div>
              <div className="dash-card-sub">Based on DOI — {formatShortDate(new Date())}</div>
            </div>
          </section>

          <section className="dash-grid-2">
            <div className="dash-panel dash-panel-trend">
              <div className="dash-panel-head">
                <div>
                  <h3 className="dash-panel-title">Daily Runs Trend</h3>
                  <p className="dash-panel-sub">Runs recorded per day this month based on DOI</p>
                </div>
              </div>

              <div className="dash-chart-pad">
                <MiniBarChart data={dailyRuns} />
              </div>
            </div>

            <div className="dash-panel dash-panel-distribution">
              <div className="dash-panel-head">
                <div>
                  <h3 className="dash-panel-title">Case Type Distribution</h3>
                  <p className="dash-panel-sub">Auto-counted from each report’s case type</p>
                </div>
              </div>

              <div className="dash-chart-pad">
                <DonutChart data={caseTypeChartData} />
              </div>
            </div>
          </section>

          <section className="dash-grid-4">
            <div className="dash-panel">
              <div className="dash-panel-head">
                <div>
                  <h3 className="dash-panel-title">Top 5 Barangays</h3>
                  <p className="dash-panel-sub">Most frequent request locations</p>
                </div>
              </div>

              <TopList items={topBarangays} emptyText="No barangay data available." />
            </div>

            <div className="dash-panel">
              <div className="dash-panel-head">
                <div>
                  <h3 className="dash-panel-title">Top 5 Facilities</h3>
                  <p className="dash-panel-sub">
                    Most common destination facilities
                  </p>
                </div>
              </div>

              <TopList items={topHospitals} emptyText="No interfacility facility data available." />
            </div>

            <div className="dash-panel">
              <div className="dash-panel-head">
                <div>
                  <h3 className="dash-panel-title">Top 5 Medical Cases</h3>
                  <p className="dash-panel-sub">Most frequent medical case entries</p>
                </div>
              </div>

              <TopList items={topMedicalCases} emptyText="No medical case data available." />
            </div>

            <div className="dash-panel">
              <div className="dash-panel-head">
                <div>
                  <h3 className="dash-panel-title">Top 5 Trauma Cases</h3>
                  <p className="dash-panel-sub">Most frequent trauma case entries</p>
                </div>
              </div>

              <TopList items={topTraumaCases} emptyText="No trauma case data available." />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}