import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import "./Dashboard.css";
import { fetchWithAuth, clearAuth } from "../../auth";

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
            {[1, 2, 3, 4, 5, 6].map((n) => (
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

          <section className="dash-grid-bottom">
            {[1, 2, 3, 4, 5].map((n) => (
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

function getApiBase() {
  try {
    const settings = JSON.parse(localStorage.getItem("ems_settings") || "{}");
    return settings?.apiBaseUrl || "http://127.0.0.1:8000";
  } catch {
    return "http://127.0.0.1:8000";
  }
}

const AMBULANCE_BODY_OPTIONS = [
  "PTV 70102",
  "SND 2439",
  "SKA 1130",
  "City Ambu 6651",
];

const MONTH_OPTIONS = [
  { value: 0, label: "January" },
  { value: 1, label: "February" },
  { value: 2, label: "March" },
  { value: 3, label: "April" },
  { value: 4, label: "May" },
  { value: 5, label: "June" },
  { value: 6, label: "July" },
  { value: 7, label: "August" },
  { value: 8, label: "September" },
  { value: 9, label: "October" },
  { value: 10, label: "November" },
  { value: 11, label: "December" },
];

const YEAR_OPTIONS = [2026, 2027, 2028, 2029, 2030];

const DAILY_CASE_TYPE_ORDER = [
  { key: "MEDICAL", label: "Medical", color: "#67e8f9" },
  { key: "TRAUMA", label: "Trauma", color: "#38bdf8" },
  { key: "INTERFACILITY", label: "Interfacility", color: "#14b8a6" },
  { key: "HOSTRAN", label: "Hostran", color: "#818cf8" },
  { key: "STANDBY_MEDICS", label: "Standby Medics", color: "#f59e0b" },
  { key: "BACK_TO_BASE", label: "Back to Base", color: "#ef4444" },
];

function createEmptyDailyCaseTypeCounts() {
  const counts = {};

  DAILY_CASE_TYPE_ORDER.forEach(({ key }) => {
    counts[key] = 0;
  });

  return counts;
}

function getDailyCaseTypeKey(report) {
  const normalized = normalizeCaseType(getCaseTypeRaw(report));

  if (normalized === "MEDICAL") return "MEDICAL";
  if (normalized === "TRAUMA") return "TRAUMA";
  if (normalized === "INTERFACILITY") return "INTERFACILITY";
  if (normalized === "HOST RAN") return "HOSTRAN";
  if (normalized === "STANDBY MEDICS") return "STANDBY_MEDICS";
  if (normalized === "BACK TO BASE") return "BACK_TO_BASE";

  return "";
}

function formatMonthYear(dateValue) {
  const d = parseDateSafe(dateValue);
  if (!d) return "Selected month";

  return d.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function reportDateFromReport(report) {
  return (
    report?.doi ??
    report?.DOI ??
    report?.date_of_incident ??
    report?.dateOfIncident ??
    report?.incident?.doi ??
    report?.incident?.DOI ??
    report?.incident?.date_of_incident ??
    report?.incident?.dateOfIncident ??
    report?.patient?.doi ??
    report?.patient?.DOI ??
    report?.patient?.date_of_incident ??
    report?.patient?.dateOfIncident ??
    report?.patient_details?.doi ??
    report?.patient_details?.DOI ??
    report?.patient_details?.date_of_incident ??
    report?.patient_details?.dateOfIncident ??
    report?.form_data?.doi ??
    report?.form_data?.DOI ??
    report?.form_data?.date_of_incident ??
    report?.form_data?.dateOfIncident ??
    null
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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._-]+/g, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";

  if (text.includes("MEDICAL")) return "MEDICAL";
  if (text.includes("TRAUMA")) return "TRAUMA";

  if (
    text.includes("INTERFACILITY") ||
    text.includes("INTER FACILITY") ||
    text.includes("INTER FACILITY WITHIN THE CITY")
  ) {
    return "INTERFACILITY";
  }

  if (
    text.includes("HOSTRAN") ||
    text.includes("HOST RAN") ||
    text.includes("HOSPITAL TRANSPORT") ||
    text.includes("HOSP TRANSPORT") ||
    text.includes("HOSPITAL TRANSPORT OUTSIDE THE CITY") ||
    text.includes("HOSP TRANSPORT OUTSIDE THE CITY") ||
    text.includes("HOSPITAL TRANSPORT OUTSIDE CITY") ||
    text.includes("HOSP TRANSPORT OUTSIDE CITY")
  ) {
    return "HOST RAN";
  }

  if (
    text.includes("STANDBY MEDICS") ||
    text.includes("STANDBY MEDIC") ||
    text.includes("STANDBY")
  ) {
    return "STANDBY MEDICS";
  }

  if (text.includes("BACK TO BASE") || text.includes("BACK BASE")) {
    return "BACK TO BASE";
  }

  return "";
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

function normalizeComplaintMatchText(value) {
  return String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAmbulanceBodyNo(value) {
  const text = normalizeComplaintMatchText(value);

  if (!text) return "";

  if (text.includes("PTV") && text.includes("70102")) return "PTV 70102";
  if (text.includes("SND") && text.includes("2439")) return "SND 2439";
  if (text.includes("SKA") && text.includes("1130")) return "SKA 1130";

  if (
    text.includes("CITY AMBU 6651") ||
    text.includes("CITY AMBULANCE 6651") ||
    text.includes("AMBU 6651") ||
    text.includes("AMBULANCE 6651") ||
    text === "6651"
  ) {
    return "City Ambu 6651";
  }

  return "";
}

function getAmbulanceBodyNo(report) {
  return (
    getValueByCandidates(report, [
      "ambulance_body_no",
      "ambulance_body_number",
      "ambulanceBodyNo",
      "ambulanceBodyNumber",
      "ambulance",
      "ambulance_no",
      "ambulance_number",
      "unit",
      "unit_no",
      "vehicle",
      "vehicle_no",
      "incident.ambulance_body_no",
      "incident.ambulance_body_number",
      "incident.ambulanceBodyNo",
      "incident.ambulanceBodyNumber",
      "incident.ambulance",
      "incident.ambulance_no",
      "incident.ambulance_number",
      "details.ambulance_body_no",
      "details.ambulance",
      "form_data.ambulance_body_no",
      "form_data.ambulance",
    ]) || ""
  );
}

function getConnectingRunsRaw(report) {
  return getValueByCandidates(report, [
    "connecting_runs",
    "connectingRuns",
    "connecting_run",
    "connectingRun",
    "connected_runs",
    "connectedRuns",
    "is_connecting_run",
    "isConnectingRun",
    "patient.connecting_runs",
    "patient.connectingRuns",
    "patient.connecting_run",
    "patient.connectingRun",
    "incident.connecting_runs",
    "incident.connectingRuns",
    "incident.connecting_run",
    "incident.connectingRun",
    "details.connecting_runs",
    "details.connectingRuns",
    "form_data.connecting_runs",
    "form_data.connectingRuns",
  ]);
}

function isConnectingRun(report) {
  const value = getConnectingRunsRaw(report);

  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;

  const text = normalizeComplaintMatchText(value);

  if (!text || text === "NA" || text === "N A") return false;
  if (text === "NO" || text === "FALSE" || text === "0") return false;

  return (
    text === "YES" ||
    text === "Y" ||
    text === "TRUE" ||
    text === "1" ||
    text.includes("CONNECTING") ||
    text.includes("CONNECTED")
  );
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsNormalizedTerm(normalizedText, normalizedTerm) {
  if (!normalizedText || !normalizedTerm) return false;

  const pattern = new RegExp(`(^|\\s)${escapeRegExp(normalizedTerm)}(\\s|$)`, "i");
  return pattern.test(normalizedText);
}

const MEDICAL_CLASSIFICATIONS = [
  "Abdominal Pain",
  "Alcohol Intoxication",
  "Allergic Reaction",
  "Bronchial Asthma",
  "Bleeding",
  "Body Malaise",
  "Cellulitis",
  "Cyanosis",
  "Chest Pain",
  "Cough and Colds",
  "Difficult Urination",
  "Dizziness",
  "Difficulty of Breathing",
  "Edema",
  "Epigastric Pain",
  "Epistaxis",
  "Fainting",
  "Fever",
  "Hemoptysis",
  "Hypertension",
  "Loose Bowel Movement",
  "Loss of Consciousness",
  "Muscle Rigidity",
  "Numbness",
  "Obstetrics",
  "Pain",
  "Poisoning",
  "Seizure",
  "Sick Person",
  "Skin Rash",
  "Suicide",
  "Swelling",
  "Tremors",
  "Unconscious",
  "Unresponsive",
  "Vomiting",
];

const MEDICAL_ALIASES = {
  "Abdominal Pain": ["Abdominal P"],
  "Alcohol Intoxication": ["Alcohol Intx"],
  "Allergic Reaction": ["Alergic Reaction", "Allergic Reaction"],
  "Bronchial Asthma": ["BA"],
  Cellulitis: ["Cellulities", "Cellulitis"],
  "Difficult Urination": ["Dif. Urination"],
  "Difficulty of Breathing": [
    "DOB",
    "Difficult of Breathing",
    "Difficulty of Breathing",
    "Difficulty Breathing",
  ],
  "Epigastric Pain": ["Epigastric P"],
  Hemoptysis: ["Hemoptisis", "Hemoptysis"],
  Hypertension: ["HPN"],
  "Loose Bowel Movement": ["LBM"],
  "Loss of Consciousness": [
    "LOC",
    "Lost of Consciousness",
    "Loss of Consciousness",
  ],
  "Muscle Rigidity": ["Muscle Regidity", "Muscle Rigidity"],
  Obstetrics: ["OB"],
};

const TRAUMA_CLASSIFICATIONS = [
  "2X2 V/A or 2X2 Vehicle Accident",
  "4X2 V/A or 4X2 Vehicle Accident",
  "4X4 V/A or 4X4 Vehicle Accident",
  "Burn",
  "Domestic Violence",
  "Drowning",
  "Electrocuted",
  "Fall",
  "Hacking",
  "Hit and Run",
  "Insect and Animal Bites",
  "Mauling",
  "Pedestrian Accident",
  "Possible Breath of Alcohol",
  "Traumatic Injury",
  "Shooting",
  "Side Swipe",
  "Single Accident",
  "Sprain",
  "Stabbing",
  "Stoning",
  "Suicide",
];

const TRAUMA_ALIASES = {
  "2X2 V/A or 2X2 Vehicle Accident": [
    "2X2 V/A",
    "2X2 Vehicle Accident",
    "2X2 VA",
    "2X2 Vehicular Accident",
  ],
  "4X2 V/A or 4X2 Vehicle Accident": [
    "4X2 V/A",
    "4X2 Vehicle Accident",
    "4X2 VA",
    "4X2 Vehicular Accident",
  ],
  "4X4 V/A or 4X4 Vehicle Accident": [
    "4X4 V/A",
    "4X4 Vehicle Accident",
    "4X4 VA",
    "4X4 Vehicular Accident",
  ],
  "Possible Breath of Alcohol": [
    "Possible Breath of Alcohol",
    "Breath of Alcohol",
    "Possible Alcohol Breath",
    "Alcohol Breath",
    "PBOA",
  ],
  Electrocuted: ["Electricuted", "Electrocuted"],
  "Hit and Run": ["Hit & Run"],
  "Insect and Animal Bites": ["I & A Bites"],
  "Pedestrian Accident": [
    "Pedistrian Accident",
    "Pedestrian Accident",
    "Pedestrian Acc",
  ],
  "Single Accident": ["Single Acc"],
  Stoning: ["Stonning", "Stoning"],
};

const POSSIBLE_BREATH_OF_ALCOHOL_LABEL = "Possible Breath of Alcohol";

function getCanonicalMedicalComplaint(rawValue) {
  const normalizedRaw = normalizeComplaintMatchText(rawValue);
  if (!normalizedRaw) return "";

  const matchers = MEDICAL_CLASSIFICATIONS.map((label) => ({
    label,
    names: [label, ...(MEDICAL_ALIASES[label] || [])].map(normalizeComplaintMatchText),
  })).sort((a, b) => {
    const aLongest = Math.max(...a.names.map((name) => name.length));
    const bLongest = Math.max(...b.names.map((name) => name.length));
    return bLongest - aLongest;
  });

  const found = matchers.find((item) =>
    item.names.some((name) => {
      if (!name) return false;
      if (normalizedRaw === name) return true;
      return containsNormalizedTerm(normalizedRaw, name);
    })
  );

  return found?.label || normalizeLabel(rawValue);
}

function getCanonicalTraumaMechanism(rawValue) {
  const normalizedRaw = normalizeComplaintMatchText(rawValue);
  if (!normalizedRaw) return "";

  const matchers = TRAUMA_CLASSIFICATIONS.map((label) => ({
    label,
    names: [label, ...(TRAUMA_ALIASES[label] || [])].map(normalizeComplaintMatchText),
  })).sort((a, b) => {
    const aLongest = Math.max(...a.names.map((name) => name.length));
    const bLongest = Math.max(...b.names.map((name) => name.length));
    return bLongest - aLongest;
  });

  const found = matchers.find((item) =>
    item.names.some((name) => {
      if (!name) return false;
      if (normalizedRaw === name) return true;
      return containsNormalizedTerm(normalizedRaw, name);
    })
  );

  return found?.label || normalizeLabel(rawValue);
}

function isPossibleBreathOfAlcohol(value) {
  return getCanonicalTraumaMechanism(value) === POSSIBLE_BREATH_OF_ALCOHOL_LABEL;
}

function getAddress(report) {
  return (
    report?.patient_location ||
    report?.incident?.patient_location ||
    report?.location ||
    report?.incident?.location ||
    report?.poi ||
    report?.incident?.poi ||
    report?.patient?.address ||
    report?.address ||
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
    .replace(/_/g, " ")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedAddress) return "OTHERS";

  const allBarangays = [
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
    "AGLAYAN",
    "APO MACOTE",
    "BANGCUD",
    "CABANGAHAN",
    "CANAYA",
    "CAPITOL",
    "CASISANG",
    "DALWANGAN",
    "KALASUNGAY",
    "LAGUITAS",
    "LALAWAN",
    "LINABO",
    "MAGSAYSAY",
    "MALIGAYA",
    "MANAGOK",
    "MIGLAMIN",
    "PAT-PAT",
    "SAN JOSE",
    "SAN MARTIN",
    "SIMAYA",
    "SINANGLANAN",
    "STO. NINO",
    "SUMPONG",
    "VIOLETA",
  ];

  const aliases = {
    B1: [
      "B 1",
      "B-1",
      "B01",
      "B 01",
      "B-01",
      "BARANGAY 1",
      "BARANGAY 01",
      "BRGY 1",
      "BRGY 01",
      "BRGY. 1",
      "BRGY. 01",
      "POBLACION 1",
      "POBLACION 01",
    ],
    B2: [
      "B 2",
      "B-2",
      "B02",
      "B 02",
      "B-02",
      "BARANGAY 2",
      "BARANGAY 02",
      "BRGY 2",
      "BRGY 02",
      "BRGY. 2",
      "BRGY. 02",
      "POBLACION 2",
      "POBLACION 02",
    ],
    B3: [
      "B 3",
      "B-3",
      "B03",
      "B 03",
      "B-03",
      "BARANGAY 3",
      "BARANGAY 03",
      "BRGY 3",
      "BRGY 03",
      "BRGY. 3",
      "BRGY. 03",
      "POBLACION 3",
      "POBLACION 03",
    ],
    B4: [
      "B 4",
      "B-4",
      "B04",
      "B 04",
      "B-04",
      "BARANGAY 4",
      "BARANGAY 04",
      "BRGY 4",
      "BRGY 04",
      "BRGY. 4",
      "BRGY. 04",
      "POBLACION 4",
      "POBLACION 04",
    ],
    B5: [
      "B 5",
      "B-5",
      "B05",
      "B 05",
      "B-05",
      "BARANGAY 5",
      "BARANGAY 05",
      "BRGY 5",
      "BRGY 05",
      "BRGY. 5",
      "BRGY. 05",
      "POBLACION 5",
      "POBLACION 05",
    ],
    B6: [
      "B 6",
      "B-6",
      "B06",
      "B 06",
      "B-06",
      "BARANGAY 6",
      "BARANGAY 06",
      "BRGY 6",
      "BRGY 06",
      "BRGY. 6",
      "BRGY. 06",
      "POBLACION 6",
      "POBLACION 06",
    ],
    B7: [
      "B 7",
      "B-7",
      "B07",
      "B 07",
      "B-07",
      "BARANGAY 7",
      "BARANGAY 07",
      "BRGY 7",
      "BRGY 07",
      "BRGY. 7",
      "BRGY. 07",
      "POBLACION 7",
      "POBLACION 07",
    ],
    B8: [
      "B 8",
      "B-8",
      "B08",
      "B 08",
      "B-08",
      "BARANGAY 8",
      "BARANGAY 08",
      "BRGY 8",
      "BRGY 08",
      "BRGY. 8",
      "BRGY. 08",
      "POBLACION 8",
      "POBLACION 08",
    ],
    B9: [
      "B 9",
      "B-9",
      "B09",
      "B 09",
      "B-09",
      "BARANGAY 9",
      "BARANGAY 09",
      "BRGY 9",
      "BRGY 09",
      "BRGY. 9",
      "BRGY. 09",
      "POBLACION 9",
      "POBLACION 09",
    ],
    B10: ["B 10", "B-10", "BARANGAY 10", "BRGY 10", "BRGY. 10", "POBLACION 10"],
    B11: ["B 11", "B-11", "BARANGAY 11", "BRGY 11", "BRGY. 11", "POBLACION 11"],
    B12: ["B 12", "B-12", "BARANGAY 12", "BRGY 12", "BRGY. 12", "POBLACION 12"],
    "APO MACOTE": ["APO MACOTE", "APOMACOTE"],
    "PAT-PAT": ["PAT PAT", "PATPAT"],
    "STO. NINO": ["STO NINO", "SANTO NINO", "STO. NINO"],
    "SAN JOSE": ["SAN JOSE"],
    "SAN MARTIN": ["SAN MARTIN"],
  };

  for (const barangay of allBarangays) {
    const possibleNames = [barangay, ...(aliases[barangay] || [])]
      .map((name) =>
        String(name)
          .toUpperCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\./g, "")
          .replace(/-/g, " ")
          .replace(/_/g, " ")
          .replace(/[^A-Z0-9 ]+/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      )
      .sort((a, b) => b.length - a.length);

    const found = possibleNames.some((name) => {
      if (!name) return false;
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, "i");
      return regex.test(normalizedAddress);
    });

    if (found) return barangay;
  }

  return "OTHERS";
}

function normalizeFacilityName(value) {
  const raw = String(value || "").trim();

  const text = raw
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";

  const stJudeAliases = [
    "SJTGH",
    "ST JUDE",
    "ST JUDE HOSPITAL",
    "ST JUDE THADDEUS GENERAL HOSPITAL",
    "SAINT JUDE",
    "SAINT JUDE HOSPITAL",
    "SAINT JUDE THADDEUS GENERAL HOSPITAL",
  ];

  if (stJudeAliases.includes(text)) {
    return "St. Jude";
  }

  const hospitalToHomeAliases = [
    "HOME",
    "HOSPITAL TO HOME",
    "HOSPITAL HOME",
    "TRANSPORT TO HOME",
    "DISCHARGE TO HOME",
    "FROM HOSPITAL TO HOME",
  ];

  if (hospitalToHomeAliases.includes(text)) {
    return "Hospital to Home";
  }

  return raw;
}

function getHospital(report) {
  const facility = getValueByCandidates(report, [
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

  return normalizeFacilityName(facility);
}

function getMechanismOfIncident(report) {
  return (
    getValueByCandidates(report, [
      "moi",
      "incident.moi",
      "mechanism_of_incident",
      "incident.mechanism_of_incident",
      "mechanismOfIncident",
      "incident.mechanismOfIncident",
      "details.moi",
      "details.mechanism_of_incident",
      "form_data.moi",
      "form_data.mechanism_of_incident",
    ]) || ""
  );
}

function getAssessment(report) {
  return (
    getValueByCandidates(report, [
      "patient.assessment",
      "assessment",
      "patient_assessment",
      "incident.assessment",
      "details.assessment",
      "form_data.assessment",
    ]) || ""
  );
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

function getDaysInMonth(baseDate = new Date()) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
}

function buildDailyRuns(reports, baseDate = new Date()) {
  const daysInMonth = getDaysInMonth(baseDate);

  const daily = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    label: `${i + 1}`,
    count: 0,
    caseTypeCounts: createEmptyDailyCaseTypeCounts(),
  }));

  reports.forEach((report) => {
    const d = parseDateSafe(reportDateFromReport(report));
    if (!d) return;

    if (d.getFullYear() !== baseDate.getFullYear() || d.getMonth() !== baseDate.getMonth()) {
      return;
    }

    const index = d.getDate() - 1;
    if (!daily[index]) return;

    daily[index].count += 1;

    const caseTypeKey = getDailyCaseTypeKey(report);
    if (caseTypeKey && daily[index].caseTypeCounts[caseTypeKey] !== undefined) {
      daily[index].caseTypeCounts[caseTypeKey] += 1;
    }
  });

  return daily.map((item) => ({
    ...item,
    segments: DAILY_CASE_TYPE_ORDER.map((type) => ({
      key: type.key,
      label: type.label,
      color: type.color,
      value: item.caseTypeCounts[type.key] || 0,
    })).filter((segment) => segment.value > 0),
  }));
}

function isWithin5Km(address, caseType = "") {
  const normalizedCaseType = normalizeCaseType(caseType);

  if (
    normalizedCaseType === "HOST RAN" ||
    normalizedCaseType === "STANDBY MEDICS" ||
    normalizedCaseType === "BACK TO BASE"
  ) {
    return false;
  }

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

  return within5KmBarangays.includes(getBarangayFromAddress(address));
}

function computeResponseMinutes(report) {
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
}

function getAverageRespondTimeMinutes(reportsForPeriod = []) {
  const within5KmResponseTimes = reportsForPeriod
    .filter((report) => isWithin5Km(getAddress(report), getCaseTypeRaw(report)))
    .map((report) => computeResponseMinutes(report))
    .filter((value) => value !== null);

  if (!within5KmResponseTimes.length) return null;

  const total = within5KmResponseTimes.reduce((sum, value) => sum + value, 0);
  return (total / within5KmResponseTimes.length).toFixed(2);
}

function formatPercent(count, total) {
  if (!total) return "0%";
  return `${((Number(count) / Number(total)) * 100).toFixed(2)}%`;
}

function mapToRowsFromCountMap(countMap, baseTotal, limit = null) {
  const sorted = [...countMap.entries()].sort((a, b) => b[1] - a[1]);
  const sliced = limit ? sorted.slice(0, limit) : sorted;

  const rows = sliced.map(([label, count]) => [label, count, formatPercent(count, baseTotal)]);

  return {
    rows,
  };
}

function dashboardRowsToTopItems(rows = []) {
  return rows.map(([label, count]) => ({ label, count }));
}

function getDashboardBarangayKeyForReport(report) {
  const caseType = normalizeCaseType(getCaseTypeRaw(report));

  if (
    caseType === "HOST RAN" ||
    caseType === "STANDBY MEDICS" ||
    caseType === "BACK TO BASE"
  ) {
    return "OTHERS";
  }

  return getBarangayFromAddress(getAddress(report));
}

function getDashboardCaseTypeLabel(caseType) {
  const value = normalizeCaseType(caseType);

  if (value === "MEDICAL") return "Medical";
  if (value === "TRAUMA") return "Trauma";
  if (value === "INTERFACILITY") return "Inter-Facility within the City";
  if (value === "HOST RAN") return "Hospital Transport outside the City";
  if (value === "STANDBY MEDICS") return "Standby Medics";
  if (value === "BACK TO BASE") return "Back to Base";

  return null;
}

function buildDashboardReportData(reports = [], baseDate = new Date()) {
  const filteredReports = reports.filter((report) =>
    isSameMonth(reportDateFromReport(report), baseDate)
  );

  const totalResponses = filteredReports.length;
  const daysInMonth = getDaysInMonth(baseDate);
  const averagePerDay =
    totalResponses > 0 && daysInMonth > 0 ? (totalResponses / daysInMonth).toFixed(2) : "0.00";

  const averageResponseValue = getAverageRespondTimeMinutes(filteredReports);
  const averageResponseTime = averageResponseValue !== null ? `${averageResponseValue} mins` : "—";
  const connectingRunsCount = filteredReports.filter((report) => isConnectingRun(report)).length;

  const responseTypeCounts = new Map();
  const medicalCaseCounts = new Map();
  const traumaCaseCounts = new Map();
  const requestingFacilityCounts = new Map();
  const barangayCounts = new Map();
  const ambulanceCounts = new Map(AMBULANCE_BODY_OPTIONS.map((label) => [label, 0]));

  filteredReports.forEach((report) => {
    const caseType = normalizeCaseType(getCaseTypeRaw(report));
    const caseTypeLabel = getDashboardCaseTypeLabel(caseType);
    const barangayKey = getDashboardBarangayKeyForReport(report);
    const ambulanceBodyNo = normalizeAmbulanceBodyNo(getAmbulanceBodyNo(report));

    if (caseTypeLabel) {
      responseTypeCounts.set(caseTypeLabel, (responseTypeCounts.get(caseTypeLabel) || 0) + 1);
    }

    if (barangayKey && barangayKey !== "OTHERS") {
      barangayCounts.set(barangayKey, (barangayCounts.get(barangayKey) || 0) + 1);
    }

    if (ambulanceBodyNo) {
      ambulanceCounts.set(ambulanceBodyNo, (ambulanceCounts.get(ambulanceBodyNo) || 0) + 1);
    }

    if (caseType === "MEDICAL") {
      const chiefComplaint = getComplaintOrCaseName(report);
      if (chiefComplaint) {
        const displayLabel = getCanonicalMedicalComplaint(chiefComplaint) || chiefComplaint;
        medicalCaseCounts.set(displayLabel, (medicalCaseCounts.get(displayLabel) || 0) + 1);
      }
    }

    if (caseType === "TRAUMA") {
      const moi = getMechanismOfIncident(report);
      const assessment = getAssessment(report);

      const moiHasPossibleBreathOfAlcohol = isPossibleBreathOfAlcohol(moi);
      const assessmentHasPossibleBreathOfAlcohol = isPossibleBreathOfAlcohol(assessment);

      if (moi) {
        const displayLabel = getCanonicalTraumaMechanism(moi) || moi;
        traumaCaseCounts.set(displayLabel, (traumaCaseCounts.get(displayLabel) || 0) + 1);
      }

      if (assessmentHasPossibleBreathOfAlcohol && !moiHasPossibleBreathOfAlcohol) {
        traumaCaseCounts.set(
          POSSIBLE_BREATH_OF_ALCOHOL_LABEL,
          (traumaCaseCounts.get(POSSIBLE_BREATH_OF_ALCOHOL_LABEL) || 0) + 1
        );
      }
    }

    if (caseType === "INTERFACILITY" || caseType === "HOST RAN") {
      const facility = getHospital(report);
      if (facility) {
        requestingFacilityCounts.set(facility, (requestingFacilityCounts.get(facility) || 0) + 1);
      }
    }
  });

  const responseTypeRows = [
    "Medical",
    "Trauma",
    "Inter-Facility within the City",
    "Hospital Transport outside the City",
    "Standby Medics",
    "Back to Base",
  ].map((label) => [
    label,
    responseTypeCounts.get(label) || 0,
    formatPercent(responseTypeCounts.get(label) || 0, totalResponses),
  ]);

  const ambulanceRows = AMBULANCE_BODY_OPTIONS.map((label, index) => ({
    label,
    count: ambulanceCounts.get(label) || 0,
    percent: formatPercent(ambulanceCounts.get(label) || 0, totalResponses),
    originalIndex: index,
  }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.originalIndex - b.originalIndex;
    })
    .map((item) => [item.label, item.count, item.percent]);

  const medicalMapped = mapToRowsFromCountMap(medicalCaseCounts, totalResponses, 5);
  const traumaMapped = mapToRowsFromCountMap(traumaCaseCounts, totalResponses, 5);
  const facilityMapped = mapToRowsFromCountMap(requestingFacilityCounts, totalResponses, 5);
  const barangayMapped = mapToRowsFromCountMap(barangayCounts, totalResponses, 5);

  return {
    filteredReports,
    totals: {
      responses: totalResponses,
      averagePerDay,
      averageResponseTime,
      connectingRuns: connectingRunsCount,
    },
    responseTypes: responseTypeRows,
    ambulanceRuns: ambulanceRows,
    medicalCases: medicalMapped.rows,
    traumaCases: traumaMapped.rows,
    requestingFacilities: facilityMapped.rows,
    barangays: barangayMapped.rows,
  };
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
            const hasSegments = item.segments && item.segments.length > 0;

            return (
              <div className="dash-trend-col" key={item.day}>
                <div className="dash-trend-bar-wrap">
                  <div className="dash-trend-bar-hitbox">
                    <div className="dash-trend-tooltip">
                      <div className="dash-trend-tooltip-title">
                        Day {item.day}: {item.count} {item.count === 1 ? "run" : "runs"}
                      </div>

                      {hasSegments ? (
                        <div className="dash-trend-tooltip-list">
                          {item.segments.map((segment) => (
                            <div key={segment.key} className="dash-trend-tooltip-row">
                              <span
                                className="dash-trend-tooltip-dot"
                                style={{ background: segment.color }}
                              />
                              <span className="dash-trend-tooltip-type">{segment.label}</span>
                              <span className="dash-trend-tooltip-value">{segment.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="dash-trend-tooltip-empty">No runs</div>
                      )}
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
                      style={{ height }}
                      aria-label={`Day ${item.day}: ${item.count} ${
                        item.count === 1 ? "run" : "runs"
                      }`}
                    >
                      {hasSegments && (
                        <div className="dash-trend-bar-stack">
                          {item.segments.map((segment) => (
                            <div
                              key={segment.key}
                              className="dash-trend-segment"
                              style={{
                                height: `${(segment.value / item.count) * 100}%`,
                                background: segment.color,
                              }}
                              title={`${segment.label}: ${segment.value}`}
                            />
                          ))}
                        </div>
                      )}

                      {labelInsideBar && (
                        <span className="dash-trend-bar-count">
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

  const currentDate = useMemo(() => new Date(), []);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(() => {
    const year = currentDate.getFullYear();
    return YEAR_OPTIONS.includes(year) ? year : 2026;
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);

        const API_BASE = getApiBase();

        const res = await fetchWithAuth(
          `${API_BASE}/api/reports/`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          },
          API_BASE
        );

        if (!res.ok) {
          if (res.status === 401) {
            clearAuth();
            throw new Error("Session expired. Please login again.");
          }

          throw new Error(`API error: ${res.status}`);
        }

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

  const dashboardBaseDate = useMemo(() => {
    return new Date(Number(selectedYear), Number(selectedMonth), 1);
  }, [selectedMonth, selectedYear]);

  const selectedMonthLabel = useMemo(() => {
    return formatMonthYear(dashboardBaseDate);
  }, [dashboardBaseDate]);

  const dashboardData = useMemo(() => {
    return buildDashboardReportData(reports, dashboardBaseDate);
  }, [reports, dashboardBaseDate]);

  const selectedMonthReports = dashboardData.filteredReports;

  const todaysReports = useMemo(() => {
    return reports.filter((r) => isSameLocalDay(reportDateFromReport(r), currentDate)).length;
  }, [reports, currentDate]);

  const selectedMonthRuns = dashboardData.totals.responses;
  const avgRunsPerDay = dashboardData.totals.averagePerDay;
  const avgRespondTime = dashboardData.totals.averageResponseTime;
  const connectingRuns = dashboardData.totals.connectingRuns;

  const caseTypeChartData = useMemo(
    () => [
      { label: "Medical", value: Number(dashboardData.responseTypes[0]?.[1] || 0) },
      { label: "Trauma", value: Number(dashboardData.responseTypes[1]?.[1] || 0) },
      { label: "Interfacility", value: Number(dashboardData.responseTypes[2]?.[1] || 0) },
      { label: "Hostran", value: Number(dashboardData.responseTypes[3]?.[1] || 0) },
      { label: "Standby Medics", value: Number(dashboardData.responseTypes[4]?.[1] || 0) },
      { label: "Back to Base", value: Number(dashboardData.responseTypes[5]?.[1] || 0) },
    ],
    [dashboardData]
  );

  const dailyRuns = useMemo(
    () => buildDailyRuns(selectedMonthReports, dashboardBaseDate),
    [selectedMonthReports, dashboardBaseDate]
  );

  const ambulanceRuns = useMemo(
    () => dashboardRowsToTopItems(dashboardData.ambulanceRuns),
    [dashboardData]
  );

  const topBarangays = useMemo(
    () => dashboardRowsToTopItems(dashboardData.barangays),
    [dashboardData]
  );

  const topHospitals = useMemo(
    () => dashboardRowsToTopItems(dashboardData.requestingFacilities),
    [dashboardData]
  );

  const topMedicalCases = useMemo(
    () => dashboardRowsToTopItems(dashboardData.medicalCases),
    [dashboardData]
  );

  const topTraumaCases = useMemo(
    () => dashboardRowsToTopItems(dashboardData.traumaCases),
    [dashboardData]
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
              <div className="dash-month-filter" aria-label="Dashboard month filter">
                <div className="dash-filter-field">
                  <label htmlFor="dashboard-month">Month</label>
                  <select
                    id="dashboard-month"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(Number(event.target.value))}
                  >
                    {MONTH_OPTIONS.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="dash-filter-field">
                  <label htmlFor="dashboard-year">Year</label>
                  <select
                    id="dashboard-year"
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(Number(event.target.value))}
                  >
                    {YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
              <div className="dash-card-sub">Based on selected month DOI</div>
            </div>

            <div className="dash-card">
              <div className="dash-card-top">
                <div className="dash-card-label">Average Respond Time</div>
              </div>

              <div className="dash-card-value">{avgRespondTime}</div>
              <div className="dash-card-sub">Within 5km radius, in minutes</div>
            </div>

            <div className="dash-card">
              <div className="dash-card-top">
                <div className="dash-card-label">Connecting Runs</div>
              </div>

              <div className="dash-card-value">{connectingRuns}</div>
              <div className="dash-card-sub">Based on selected month DOI</div>
            </div>

            <div className="dash-card">
              <div className="dash-card-top">
                <div className="dash-card-label">Selected Month’s Runs</div>
              </div>

              <div className="dash-card-value">{selectedMonthRuns}</div>
              <div className="dash-card-sub">Based on DOI — {selectedMonthLabel}</div>
            </div>
          </section>

          <section className="dash-grid-2">
            <div className="dash-panel dash-panel-trend">
              <div className="dash-panel-head">
                <div>
                  <h3 className="dash-panel-title">Daily Runs Trend</h3>
                  <p className="dash-panel-sub">
                    Runs recorded per day in {selectedMonthLabel} based on DOI
                  </p>
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

          <section className="dash-grid-bottom">
            <div className="dash-panel">
              <div className="dash-panel-head">
                <div>
                  <h3 className="dash-panel-title">Ambulance Runs</h3>
                  <p className="dash-panel-sub">
                    Runs per ambulance in {selectedMonthLabel} based on DOI
                  </p>
                </div>
              </div>

              <TopList items={ambulanceRuns} emptyText="No ambulance run data available." />
            </div>

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
                  <p className="dash-panel-sub">Most common destination facilities</p>
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