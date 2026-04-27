import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import "./Patients.css";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { fetchWithAuth, clearAuth } from "../../auth";
import Toast from "../ui/Toast";

const NA = "na";

const CASE_TYPE_OPTIONS = [
  { label: "Medical", value: "medical" },
  { label: "Trauma", value: "trauma" },
  { label: "Interfacility", value: "interfacility" },
  { label: "Hostran", value: "hostran" },
  { label: "Standby Medics", value: "standby_medics" },
  { label: "Back to Base", value: "back_to_base" },
];

const SEX_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

const LOC_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "Awake", value: "awake" },
  { label: "Verbal", value: "verbal" },
  { label: "Pain", value: "pain" },
  { label: "Unconscious", value: "unconscious" },
];

const PULSE_STATUS_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "Regular (Wide)", value: "regular_wide" },
  { label: "Irregular (Absent)", value: "irregular_absent" },
];

const RESP_QUALITY_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "normal", value: "normal" },
  { label: "shallow", value: "shallow" },
  { label: "labored", value: "labored" },
  { label: "clear", value: "clear" },
  { label: "diminished", value: "diminished" },
  { label: "rales", value: "rales" },
  { label: "wheeze", value: "wheeze" },
];

const TEMP_STATE_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "normal", value: "normal" },
  { label: "warm", value: "warm" },
  { label: "hot", value: "hot" },
  { label: "cool", value: "cool" },
  { label: "cold", value: "cold" },
];

const SKIN_COLOR_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "normal", value: "normal" },
  { label: "pale", value: "pale" },
  { label: "flushed", value: "flushed" },
  { label: "jaundiced", value: "jaundiced" },
  { label: "cyanotic", value: "cyanotic" },
];

const PUPILS_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "normal", value: "normal" },
  { label: "unreactive", value: "unreactive" },
  { label: "dilated", value: "dilated" },
  { label: "constricted", value: "constricted" },
];

const CAP_REFILL_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "normal", value: "normal" },
  { label: "delayed", value: "delayed" },
  { label: "absent", value: "absent" },
];

const GCS_EYE_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "Spontaneously (4)", value: "spontaneously" },
  { label: "To verbal (3)", value: "verbal" },
  { label: "To pain (2)", value: "pain" },
  { label: "None (1)", value: "none" },
];

const GCS_VERBAL_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "Oriented (5)", value: "oriented" },
  { label: "Confused (4)", value: "confused" },
  { label: "Inappropriate words (3)", value: "inappropriate_words" },
  { label: "Incomprehensible sounds (2)", value: "incomprehensible_sounds" },
  { label: "None (1)", value: "none" },
];

const GCS_MOTOR_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "Obeys commands (6)", value: "obeys" },
  { label: "Localizes pain (5)", value: "localize" },
  { label: "Withdraws (4)", value: "withdrawn" },
  { label: "Flexion (3)", value: "flexion" },
  { label: "Extension (2)", value: "extension" },
  { label: "None (1)", value: "none" },
];

const APGAR_APPEARANCE_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "Pink (2)", value: "pink" },
  { label: "Peripheral cyanosis only (1)", value: "peripheral_cyanosis_only" },
  { label: "Cyanotic / pale all over (0)", value: "cyanotic_pale_all_over" },
];

const APGAR_PULSE_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "100–140 (2)", value: "100_140" },
  { label: "< 100 (1)", value: "lt_100" },
  { label: "0 (0)", value: "zero" },
];

const APGAR_GRIMACE_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "Cries when stimulated (2)", value: "cry" },
  { label: "Weak cry when stimulated (1)", value: "weak_cry" },
  { label: "No response (0)", value: "none" },
];

const APGAR_ACTIVITY_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "Well flexed / resists extension (2)", value: "well_flexed" },
  { label: "Some flexion (1)", value: "some_flexion" },
  { label: "Floppy (0)", value: "floppy" },
];

const APGAR_RESP_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "Strong cry (2)", value: "strong_cry" },
  { label: "Slow / irregular breathing (1)", value: "slow_irregular" },
  { label: "Apnoeic (0)", value: "apnoeic" },
];

const NON_TRANSPORT_REASON_OPTIONS = [
  { label: "N/A", value: NA },
  { label: "cancelled before arrival", value: "cancelled_before_arrival" },
  { label: "cancelled after arrival", value: "cancelled_after_arrival" },
  { label: "false call", value: "false_call" },
  { label: "patient refusal treatment", value: "patient_refusal_treatment" },
  { label: "patient refusal transport", value: "patient_refusal_transport" },
  { label: "dead on arrival", value: "dead_on_arrival" },
  { label: "medical clearance not granted", value: "medical_clearance_not_granted" },
];

const EMPTY_VITALS_ROW = {
  time: "",
  bp: "",
  pulse_rate: "",
  pulse_status: NA,
  resp_rate: "",
  resp_quality: NA,
  temperature_value: "",
  temperature_state: NA,
  spo2: "",
  skin_color: NA,
  pupils: NA,
  cap_refill: NA,
};

const INCIDENT_TIME_FIELDS = [
  { key: "call_received_time", label: "Call Received", placeholder: "0000" },
  { key: "responded_time", label: "Responded", placeholder: "0100" },
  { key: "arrived_scene_time", label: "Arrived Scene", placeholder: "0200" },
  { key: "left_scene_time", label: "Left Scene", placeholder: "0300" },
  { key: "arrived_hospital_time", label: "Arrived Hospital", placeholder: "0400" },
  { key: "back_in_service_time", label: "Back In Service", placeholder: "0500" },
];

function Skeleton({ className = "", style }) {
  return <div className={`skel ${className}`} style={style} aria-hidden="true" />;
}

function SkeletonRow() {
  return (
    <tr>
      <td><Skeleton className="skel-line skel-sm" style={{ width: 140 }} /></td>
      <td><Skeleton className="skel-line skel-md" style={{ width: 220 }} /></td>
      <td><Skeleton className="skel-line skel-sm" style={{ width: 70 }} /></td>
      <td><Skeleton className="skel-line skel-md" style={{ width: 260 }} /></td>
      <td><Skeleton className="skel-line skel-sm" style={{ width: 120 }} /></td>
      <td><Skeleton className="skel-line skel-sm" style={{ width: 160 }} /></td>
      <td><Skeleton className="skel-line skel-sm" style={{ width: 120 }} /></td>
      <td><Skeleton className="skel-line skel-sm" style={{ width: 120 }} /></td>
      <td className="rp-actions">
        <Skeleton className="skel-pill" style={{ width: 56, height: 28 }} />
        <Skeleton className="skel-pill" style={{ width: 56, height: 28 }} />
        <Skeleton className="skel-pill" style={{ width: 56, height: 28 }} />
      </td>
    </tr>
  );
}

function PatientsSkeleton() {
  return (
    <div className="rp-layout">
      <Sidebar />
      <div className="rp-main">
        <div className="rp-page">
          <div className="rp-head">
            <div style={{ width: "100%" }}>
              <Skeleton className="skel-line skel-sm" style={{ width: 90 }} />
              <Skeleton className="skel-line skel-lg" style={{ width: 240, marginTop: 10 }} />
              <Skeleton className="skel-line skel-md" style={{ width: 520, marginTop: 10 }} />
            </div>

            <div className="rp-filters" style={{ alignItems: "center" }}>
              <Skeleton className="skel-input" style={{ width: 320, height: 42 }} />
              <Skeleton className="skel-input" style={{ width: 220, height: 42 }} />
            </div>
          </div>

          <div className="rp-card">
            <table className="rp-table">
              <thead>
                <tr>
                  <th><Skeleton className="skel-line skel-sm" style={{ width: 90 }} /></th>
                  <th><Skeleton className="skel-line skel-sm" style={{ width: 80 }} /></th>
                  <th><Skeleton className="skel-line skel-sm" style={{ width: 60 }} /></th>
                  <th><Skeleton className="skel-line skel-sm" style={{ width: 120 }} /></th>
                  <th><Skeleton className="skel-line skel-sm" style={{ width: 90 }} /></th>
                  <th><Skeleton className="skel-line skel-sm" style={{ width: 100 }} /></th>
                  <th><Skeleton className="skel-line skel-sm" style={{ width: 70 }} /></th>
                  <th><Skeleton className="skel-line skel-sm" style={{ width: 70 }} /></th>
                  <th className="rp-th-actions">
                    <Skeleton className="skel-line skel-sm" style={{ width: 70 }} />
                  </th>
                </tr>
              </thead>
              <tbody>{Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
            </table>

            <div className="rp-foot">
              <Skeleton className="skel-line skel-sm" style={{ width: 260 }} />
            </div>
          </div>
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

function formatDateTimeReadable(val) {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateReadable(val) {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function toDateInputValue(val) {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val).slice(0, 10);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toDateTimeLocalValue(val) {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val).slice(0, 16);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromDateInputToISO(dateStr) {
  if (!dateStr) return "";
  return dateStr;
}

function fromDateTimeLocalToISO(dtLocalStr) {
  if (!dtLocalStr) return "";
  const d = new Date(dtLocalStr);
  if (Number.isNaN(d.getTime())) return dtLocalStr;
  return d.toISOString();
}

function normalizeAgeInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 3);
}

function normalizeMilitaryTimeInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 4);
}

function isValidMilitaryTime(value) {
  if (!value) return true;
  return /^(?:[01]\d|2[0-3])[0-5]\d$/.test(value);
}

function timeFromApiToMilitary(val) {
  if (!val) return "";

  const s = String(val).trim();

  if (/^\d{0,4}$/.test(s)) {
    return normalizeMilitaryTimeInput(s);
  }

  const plainTime = s.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (plainTime) {
    return `${plainTime[1]}${plainTime[2]}`;
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}${mm}`;
  }

  const isoLike = s.match(/T(\d{2}):(\d{2})/);
  if (isoLike) {
    return `${isoLike[1]}${isoLike[2]}`;
  }

  return "";
}

function militaryToApiDateTime(timeValue, dateValue) {
  if (!timeValue || timeValue === NA) return null;

  const clean = normalizeMilitaryTimeInput(timeValue);

  if (!isValidMilitaryTime(clean)) return null;

  const hh = clean.slice(0, 2);
  const mm = clean.slice(2, 4);

  const baseDate = normalizeDateForDRF(dateValue) || new Date().toISOString().slice(0, 10);
  const dateTimeValue = `${baseDate}T${hh}:${mm}:00`;

  const d = new Date(dateTimeValue);
  if (Number.isNaN(d.getTime())) return null;

  return d.toISOString();
}

function reportTimeToPayload(value, dateValue) {
  if (value === null || value === undefined || value === "") return null;

  const s = String(value).trim();

  if (/^\d{1,4}$/.test(s)) {
    const clean = normalizeMilitaryTimeInput(s);

    if (!isValidMilitaryTime(clean)) return null;

    return militaryToApiDateTime(clean, dateValue);
  }

  return s;
}

function getCaseNo(r) {
  return r?.case_no || r?.incident?.case_no || "";
}

function showVal(v) {
  if (v === NA) return "N/A";
  if (v === null) return "";
  if (v === undefined) return "";
  return String(v);
}

function safeObj(o) {
  return o && typeof o === "object" && !Array.isArray(o) ? o : {};
}

function safeArr(a) {
  return Array.isArray(a) ? a : [];
}

function getPatientObj(r) {
  if (!r) return null;

  if (r.patient && typeof r.patient === "object") {
    return {
      ...r.patient,
      age: r.patient.age ?? r.age ?? "",
    };
  }

  return {
    full_name: r.full_name ?? "",
    age: r.age ?? "",
    sex: r.sex ?? "",
    contact_number: r.contact_number ?? "",
    address: r.address ?? "",
    chief_complaint: r.chief_complaint ?? "",
    assessment: r.assessment ?? "",
  };
}

function formatNameFromPatient(p) {
  if (!p) return "";
  return String(p.full_name || "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatNameFromReport(r) {
  if (!r) return "";

  if (r.patient_name && String(r.patient_name).trim()) {
    return String(r.patient_name).trim();
  }

  const p = getPatientObj(r);
  return formatNameFromPatient(p);
}

function getChiefComplaintFromReport(r) {
  if (!r) return "";
  if (r.chief_complaint && String(r.chief_complaint).trim()) {
    return String(r.chief_complaint).trim();
  }
  const p = getPatientObj(r);
  return p?.chief_complaint || "";
}

function formatCaseTypeLabel(value) {
  if (!value) return "—";

  const map = {
    medical: "Medical",
    trauma: "Trauma",
    interfacility: "Interfacility",
    hostran: "Hostran",
    standby_medics: "Standby Medics",
    back_to_base: "Back to Base",
  };

  const key = String(value).trim().toLowerCase();
  return map[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

function formatSexDisplay(value) {
  if (!value || value === NA) return "";
  const s = String(value);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function capitalizeFirstLetter(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  if (s.toUpperCase() === "N/A") return "N/A";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function prettifyStoredValue(value) {
  if (value === null || value === undefined || value === "") return "";
  if (value === NA) return "N/A";
  return capitalizeFirstLetter(String(value).replace(/_/g, " "));
}

function getOptionLabel(options, value) {
  if (value === null || value === undefined || value === "" || value === NA) return "";
  const found = options.find((opt) => opt.value === value);
  if (found?.label) return capitalizeFirstLetter(found.label);
  return prettifyStoredValue(value);
}

function KeyValue({ label, value }) {
  return (
    <div className="rp-kv">
      <div className="rp-k">{label}</div>
      <div className="rp-v">{showVal(value)}</div>
    </div>
  );
}

function InputKV({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  maxLength,
}) {
  return (
    <div className="rp-kv">
      <div className="rp-k">{label}</div>
      <div className="rp-v">
        <input
          className="rp-input"
          type={type}
          inputMode={inputMode}
          maxLength={maxLength}
          value={value === undefined || value === null ? "" : value}
          placeholder={placeholder || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function SelectKV({ label, value, onChange, options }) {
  return (
    <div className="rp-kv">
      <div className="rp-k">{label}</div>
      <div className="rp-v">
        <select className="rp-input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function TextareaKV({ label, value, onChange, placeholder }) {
  return (
    <div className="rp-kv">
      <div className="rp-k">{label}</div>
      <div className="rp-v">
        <textarea
          className="rp-input"
          style={{ minHeight: 90, resize: "vertical" }}
          value={value === undefined || value === null ? "" : value}
          placeholder={placeholder || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function resolveMediaUrl(urlOrPath) {
  if (!urlOrPath) return "";
  const s = String(urlOrPath);
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  const API_BASE = getApiBase().replace(/\/$/, "");
  if (s.startsWith("/")) return `${API_BASE}${s}`;
  return `${API_BASE}/${s}`;
}

function isImageAttachment(path) {
  if (!path) return false;
  const s = String(path).toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/.test(s)) return true;
  if (s.includes("/media/")) return true;
  if (s.includes("image/")) return true;
  return false;
}

function getAttachmentFileName(path) {
  if (!path) return "Attachment";
  try {
    const clean = String(path).split("?")[0];
    return clean.split("/").pop() || "Attachment";
  } catch {
    return "Attachment";
  }
}

function normalizeTimeForDRF(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s) return null;

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(s)) return s;

  const isoLike = s.match(/^(\d{2}:\d{2}:\d{2})/);
  if (isoLike) return isoLike[1];

  const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m) {
    let hh = parseInt(m[1], 10);
    const mm = m[2];
    const ap = m[3].toUpperCase();

    if (ap === "AM") {
      if (hh === 12) hh = 0;
    } else {
      if (hh !== 12) hh += 12;
    }
    return `${String(hh).padStart(2, "0")}:${mm}`;
  }

  return null;
}

function normalizeDateForDRF(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.includes("T")) return s.slice(0, 10);

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function cleanObject(obj) {
  const out = {};
  Object.entries(safeObj(obj)).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    out[k] = v;
  });
  return out;
}

function cleanVitals(arr) {
  return safeArr(arr)
    .map((v) => ({
      id: v?.id,
      time: v?.time || null,
      bp: v?.bp ?? "",
      pulse_rate: v?.pulse_rate ?? "",
      pulse_status: v?.pulse_status ?? "",
      resp_rate: v?.resp_rate ?? "",
      resp_quality: v?.resp_quality ?? "",
      temperature_value: v?.temperature_value ?? "",
      temperature_state: v?.temperature_state ?? "",
      spo2: v?.spo2 ?? "",
      skin_color: v?.skin_color ?? "",
      pupils: v?.pupils ?? "",
      cap_refill: v?.cap_refill ?? "",
    }))
    .map((v) => cleanObject(v));
}

function buildReportPatchPayload(selected) {
  const inc = safeObj(selected?.incident);
  const p = safeObj(getPatientObj(selected));
  const incidentDate = selected?.doi ?? inc?.doi;

  const payload = {
    case_no: selected?.case_no ?? "",
    case_type: selected?.case_type ?? "",

    patient: {
      full_name: p.full_name ?? "",
      age: normalizeAgeInput(p.age ?? selected?.age ?? ""),
      sex: p.sex ?? NA,
      contact_number: p.contact_number ?? "",
      address: p.address ?? "",
      chief_complaint: p.chief_complaint ?? "",
      assessment: p.assessment ?? "",
      case_type: selected?.case_type ?? "",
    },

    ambulance_body_no: selected?.ambulance_body_no ?? "",
    patient_location: selected?.patient_location ?? "",
    transported_to: selected?.transported_to ?? "",

    doi: normalizeDateForDRF(selected?.doi ?? inc?.doi),
    toi: normalizeTimeForDRF(selected?.toi ?? inc?.toi),

    poi: selected?.poi ?? "",
    moi: selected?.moi ?? "",

    call_received_time: reportTimeToPayload(selected?.call_received_time, incidentDate),
    responded_time: reportTimeToPayload(selected?.responded_time, incidentDate),
    arrived_scene_time: reportTimeToPayload(selected?.arrived_scene_time, incidentDate),
    left_scene_time: reportTimeToPayload(selected?.left_scene_time, incidentDate),
    arrived_hospital_time: reportTimeToPayload(selected?.arrived_hospital_time, incidentDate),
    back_in_service_time: reportTimeToPayload(selected?.back_in_service_time, incidentDate),

    intervention_notes: selected?.intervention_notes ?? "",

    incident: cleanObject({
      level_of_consciousness:
        selected?.level_of_consciousness ?? inc?.level_of_consciousness ?? NA,
    }),

    vitals: cleanVitals(selected?.vitals),
    gcs: cleanObject(selected?.gcs),
    apgar: cleanObject(selected?.apgar),
    non_transport: cleanObject(selected?.non_transport),
    belongings: cleanObject(selected?.belongings),
    ems_crew: cleanObject(selected?.ems_crew),
    receiving_physician_nod: cleanObject(selected?.receiving_physician_nod),
  };

  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined || payload[k] === null) delete payload[k];
  });

  return payload;
}

function normalizeExcelKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getExcelValue(row, aliases = []) {
  const wanted = aliases.map(normalizeExcelKey);

  for (const key of Object.keys(row || {})) {
    if (wanted.includes(normalizeExcelKey(key))) {
      return row[key];
    }
  }

  return "";
}

function normalizeCaseTypeForPayload(value) {
  const text = String(value || "").trim().toLowerCase();

  if (text.includes("trauma")) return "trauma";
  if (text.includes("inter")) return "interfacility";
  if (text.includes("hostran") || text.includes("hospital transport")) return "hostran";
  if (text.includes("standby")) return "standby_medics";
  if (text.includes("back")) return "back_to_base";

  return "medical";
}

function normalizeSexForPayload(value) {
  const text = String(value || "").trim().toLowerCase();

  if (text === "m" || text === "male") return "male";
  if (text === "f" || text === "female") return "female";

  return NA;
}

function normalizeExcelDate(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return null;
}

function excelTimeToApiDateTime(value, dateValue) {
  if (value === null || value === undefined || value === "") return null;

  const baseDate = normalizeExcelDate(dateValue) || new Date().toISOString().slice(0, 10);

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const hh = String(value.getHours()).padStart(2, "0");
    const mm = String(value.getMinutes()).padStart(2, "0");
    return militaryToApiDateTime(`${hh}${mm}`, baseDate);
  }

  const text = String(value).trim();
  if (!text) return null;

  const military = normalizeMilitaryTimeInput(text);
  if (/^\d{4}$/.test(military) && isValidMilitaryTime(military)) {
    return militaryToApiDateTime(military, baseDate);
  }

  const timeMatch = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (timeMatch) {
    let hour = Number(timeMatch[1]);
    const minute = timeMatch[2];
    const ampm = timeMatch[3]?.toUpperCase();

    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;

    const militaryTime = `${String(hour).padStart(2, "0")}${minute}`;
    if (isValidMilitaryTime(militaryTime)) {
      return militaryToApiDateTime(militaryTime, baseDate);
    }
  }

  return null;
}

function buildExcelImportPayload(row) {
  const caseType = normalizeCaseTypeForPayload(
    getExcelValue(row, ["Case Type", "CaseType", "Type"])
  );

  const doi = normalizeExcelDate(
    getExcelValue(row, ["DOI", "Date of Incident", "Date Incident", "Date"])
  );

  const toi = normalizeTimeForDRF(
    getExcelValue(row, ["TOI", "Time of Incident", "Time Incident"])
  );

  return {
    case_no: String(getExcelValue(row, ["Case No", "Case Number", "Case #"]) || "").trim(),
    case_type: caseType,
    ambulance_body_no: String(
      getExcelValue(row, ["Ambulance", "Ambulance Body No", "Ambulance Body Number"]) || ""
    ).trim(),

    patient: {
      full_name: String(
        getExcelValue(row, ["Patient", "Patient Name", "Full Name", "Name"]) || ""
      ).trim(),
      age: normalizeAgeInput(getExcelValue(row, ["Age"])),
      sex: normalizeSexForPayload(getExcelValue(row, ["Sex", "Gender"])),
      contact_number: String(
        getExcelValue(row, ["Contact", "Contact Number", "Phone", "Mobile"]) || ""
      ).trim(),
      address: String(getExcelValue(row, ["Address", "Patient Address"]) || "").trim(),
      chief_complaint: String(
        getExcelValue(row, ["Chief Complaint", "Complaint", "Case", "Medical Case", "Trauma Case"]) || ""
      ).trim(),
      assessment: String(getExcelValue(row, ["Assessment", "Remarks", "Notes"]) || "").trim(),
      case_type: caseType,
    },

    patient_location: String(
      getExcelValue(row, ["Location", "Patient Location", "Scene Location"]) || ""
    ).trim(),
    transported_to: String(
      getExcelValue(row, ["Transported To", "Hospital", "Facility"]) || ""
    ).trim(),

    doi,
    toi,
    poi: String(getExcelValue(row, ["POI", "Place of Incident"]) || "").trim(),
    moi: String(getExcelValue(row, ["MOI", "Mechanism of Incident"]) || "").trim(),

    call_received_time: excelTimeToApiDateTime(
      getExcelValue(row, ["Call Received", "Call Received Time"]),
      doi
    ),
    responded_time: excelTimeToApiDateTime(
      getExcelValue(row, ["Responded", "Responded Time"]),
      doi
    ),
    arrived_scene_time: excelTimeToApiDateTime(
      getExcelValue(row, ["Arrived Scene", "Arrived at Scene", "Arrived Scene Time"]),
      doi
    ),
    left_scene_time: excelTimeToApiDateTime(
      getExcelValue(row, ["Left Scene", "Left Scene Time"]),
      doi
    ),
    arrived_hospital_time: excelTimeToApiDateTime(
      getExcelValue(row, ["Arrived Hospital", "Arrived Hospital Time"]),
      doi
    ),
    back_in_service_time: excelTimeToApiDateTime(
      getExcelValue(row, ["Back In Service", "Back in Service Time"]),
      doi
    ),

    intervention_notes: String(
      getExcelValue(row, ["Intervention Notes", "Intervention", "Notes"]) || ""
    ).trim(),

    incident: {
      level_of_consciousness: NA,
    },
  };
}

export default function Patients() {
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("success");
  const showToast = (type, msg) => {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
  };

  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const excelInputRef = useRef(null);

  const confirmResolverRef = useRef(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Confirm");
  const [confirmMsg, setConfirmMsg] = useState("");
  const [confirmTone, setConfirmTone] = useState("default");
  const [confirmOkText, setConfirmOkText] = useState("OK");
  const [confirmCancelText, setConfirmCancelText] = useState("Cancel");

  const askConfirm = ({
    title = "Confirm",
    message = "",
    tone = "default",
    okText = "OK",
    cancelText = "Cancel",
  } = {}) => {
    setConfirmTitle(title);
    setConfirmMsg(message);
    setConfirmTone(tone);
    setConfirmOkText(okText);
    setConfirmCancelText(cancelText);
    setConfirmOpen(true);

    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
    });
  };

  const closeConfirm = (result) => {
    setConfirmOpen(false);
    const resolve = confirmResolverRef.current;
    confirmResolverRef.current = null;
    if (resolve) resolve(result);
  };

  function ConfirmModal() {
    if (!confirmOpen) return null;

    return (
      <div className="rp-confirm-overlay" onMouseDown={() => closeConfirm(false)}>
        <div className="rp-confirm" onMouseDown={(e) => e.stopPropagation()}>
          <div className="rp-confirm-head">
            <div className="rp-confirm-title">{confirmTitle}</div>
          </div>

          <div className="rp-confirm-body">{confirmMsg}</div>

          <div className="rp-confirm-actions">
            <button className="btn btn-soft" type="button" onClick={() => closeConfirm(false)}>
              {confirmCancelText}
            </button>

            <button
              className={`btn ${confirmTone === "danger" ? "btn-danger" : "btn-primary"}`}
              type="button"
              onClick={() => closeConfirm(true)}
              autoFocus
            >
              {confirmOkText}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [caseTypeFilter, setCaseTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("view");
  const isEdit = mode === "edit";
  const [modalLoading, setModalLoading] = useState(false);

  const [newAttachment, setNewAttachment] = useState(null);
  const [newAttachmentPreview, setNewAttachmentPreview] = useState(null);

  const pdfRef = useRef(null);
  const modalBodyRef = useRef(null);
  const pendingScrollTopRef = useRef(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const onPickNewAttachment = (file) => {
    if (newAttachmentPreview) {
      URL.revokeObjectURL(newAttachmentPreview);
    }

    setNewAttachment(file || null);

    if (!file) {
      setNewAttachmentPreview(null);
      return;
    }

    if (file.type && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setNewAttachmentPreview(url);
    } else {
      setNewAttachmentPreview(null);
    }
  };

  useEffect(() => {
    return () => {
      if (newAttachmentPreview) {
        URL.revokeObjectURL(newAttachmentPreview);
      }
    };
  }, [newAttachmentPreview]);

  const preserveModalScroll = () => {
    if (!isEdit) return;
    const body = modalBodyRef.current;
    if (!body) return;
    pendingScrollTopRef.current = body.scrollTop;
  };

  const restoreModalScroll = () => {
    if (pendingScrollTopRef.current === null) return;

    const nextTop = pendingScrollTopRef.current;
    pendingScrollTopRef.current = null;

    requestAnimationFrame(() => {
      const body = modalBodyRef.current;
      if (body) body.scrollTop = nextTop;
    });
  };

  const fetchReports = async () => {
    const API_BASE = getApiBase();

    const res = await fetchWithAuth(
      `${API_BASE}/api/reports/`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
      API_BASE
    );

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 401) {
        clearAuth();
        throw new Error("Session expired. Please login again.");
      }
      const msg = data?.detail || `API error: ${res.status}`;
      throw new Error(msg);
    }

    return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
  };

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setLoading(true);
        setError("");
        const list = await fetchReports();
        if (alive) setReports(list);
      } catch (e) {
        console.error(e);
        if (alive) {
          setError(e?.message || "Failed to load patients.");
          setReports([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;

    if (pendingScrollTopRef.current !== null) {
      restoreModalScroll();
      return;
    }

    const body = modalBodyRef.current;
    if (body) body.scrollTop = 0;
  }, [selected, mode]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    return (reports || []).filter((r) => {
      const reportCaseType = String(r.case_type || "").trim().toLowerCase();

      const matchCaseType =
        caseTypeFilter === "all" ? true : reportCaseType === caseTypeFilter.toLowerCase();

      const caseNoDisplay = String(getCaseNo(r)).toLowerCase();
      const patientName = String(formatNameFromReport(r)).toLowerCase();
      const amb = String(r.ambulance_body_no || "").toLowerCase();
      const chief = String(getChiefComplaintFromReport(r) || "").toLowerCase();
      const location = String(r.patient_location || "").toLowerCase();
      const patientAge = String(getPatientObj(r)?.age || "").toLowerCase();
      const assessment = String(getPatientObj(r)?.assessment || "").toLowerCase();

      const matchSearch =
        !s ||
        caseNoDisplay.includes(s) ||
        patientName.includes(s) ||
        amb.includes(s) ||
        chief.includes(s) ||
        reportCaseType.includes(s) ||
        location.includes(s) ||
        patientAge.includes(s) ||
        assessment.includes(s);

      return matchCaseType && matchSearch;
    });
  }, [reports, search, caseTypeFilter]);

  const fetchReportDetail = async (id) => {
    const API_BASE = getApiBase();

    const res = await fetchWithAuth(
      `${API_BASE}/api/reports/${id}/`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
      API_BASE
    );

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401) {
        clearAuth();
        throw new Error("Session expired. Please login again.");
      }
      return null;
    }
    return data;
  };

  const importExcelFile = async (file) => {
    if (!file) return;

    const API_BASE = getApiBase();

    try {
      setImportingExcel(true);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });

      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        showToast("error", "Excel file has no sheets.");
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];

      const rows = XLSX.utils
        .sheet_to_json(worksheet, {
          defval: "",
          raw: false,
        })
        .filter((row) => {
          return Object.values(row || {}).some((value) => String(value || "").trim() !== "");
        });

      if (!rows.length) {
        showToast("error", "Excel file has no valid rows.");
        return;
      }

      let successCount = 0;
      let failedCount = 0;

      for (const row of rows) {
        const payload = buildExcelImportPayload(row);

        const res = await fetchWithAuth(
          `${API_BASE}/api/reports/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
          API_BASE
        );

        if (res.ok) {
          successCount += 1;
        } else {
          failedCount += 1;
          const errorText = await res.text().catch(() => "");
          console.error("Excel row import failed:", row, errorText);
        }
      }

      const list = await fetchReports();
      setReports(list);

      if (failedCount > 0) {
        showToast("error", `Imported ${successCount} row(s). Failed ${failedCount} row(s).`);
      } else {
        showToast("success", `Imported ${successCount} patient record(s).`);
      }
    } catch (error) {
      console.error(error);
      showToast("error", error?.message || "Failed to import Excel file.");
    } finally {
      setImportingExcel(false);

      if (excelInputRef.current) {
        excelInputRef.current.value = "";
      }
    }
  };

  const openModal = async (report, nextMode) => {
    setMode(nextMode);
    setModalLoading(true);
    setSelected({ id: report.id });

    setNewAttachment(null);
    setNewAttachmentPreview(null);
    pendingScrollTopRef.current = null;

    try {
      const full = await fetchReportDetail(report.id);
      setSelected(full || report);
    } catch (e) {
      console.error(e);
      setSelected(report);
      showToast("error", e?.message || "Failed to load full patient.");
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    if (newAttachmentPreview) {
      URL.revokeObjectURL(newAttachmentPreview);
    }
    setSelected(null);
    setModalLoading(false);
    setNewAttachment(null);
    setNewAttachmentPreview(null);
    pendingScrollTopRef.current = null;
  };

  const updateSelected = (key, value) => {
    preserveModalScroll();
    setSelected((prev) => ({ ...prev, [key]: value }));
  };

  const updatePatient = (key, value) => {
    preserveModalScroll();
    setSelected((prev) => ({
      ...prev,
      patient: { ...safeObj(prev?.patient), [key]: value },
    }));
  };

  const updateIncident = (key, value) => {
    preserveModalScroll();
    setSelected((prev) => {
      const next = { ...prev, incident: { ...safeObj(prev?.incident), [key]: value } };

      if (
        [
          "patient_location",
          "transported_to",
          "moi",
          "doi",
          "toi",
          "poi",
          "call_received_time",
          "responded_time",
          "arrived_scene_time",
          "left_scene_time",
          "arrived_hospital_time",
          "back_in_service_time",
          "intervention_notes",
          "level_of_consciousness",
        ].includes(key)
      ) {
        next[key] = value;
      }

      return next;
    });
  };

  const updateVitals = (idx, key, value) => {
    preserveModalScroll();
    setSelected((prev) => {
      const arr = safeArr(prev?.vitals);
      const baseArr = arr.length === 0 ? [{ ...EMPTY_VITALS_ROW }] : arr;
      const next = baseArr.map((v, i) => (i === idx ? { ...v, [key]: value } : v));
      return { ...prev, vitals: next };
    });
  };

  const addVitalsRow = () => {
    preserveModalScroll();
    setSelected((prev) => {
      const arr = safeArr(prev?.vitals);
      return {
        ...prev,
        vitals: [...arr, { ...EMPTY_VITALS_ROW }],
      };
    });
  };

  const removeVitalsRow = (idx) => {
    preserveModalScroll();
    setSelected((prev) => {
      const arr = safeArr(prev?.vitals);
      if (arr.length <= 1) return prev;
      return { ...prev, vitals: arr.filter((_, i) => i !== idx) };
    });
  };

  const updateGcs = (key, value) => {
    preserveModalScroll();
    setSelected((prev) => ({ ...prev, gcs: { ...safeObj(prev?.gcs), [key]: value } }));
  };

  const updateApgar = (key, value) => {
    preserveModalScroll();
    setSelected((prev) => ({ ...prev, apgar: { ...safeObj(prev?.apgar), [key]: value } }));
  };

  const updateNonTransport = (key, value) => {
    preserveModalScroll();
    setSelected((prev) => ({
      ...prev,
      non_transport: { ...safeObj(prev?.non_transport), [key]: value },
    }));
  };

  const updateBelongings = (key, value) => {
    preserveModalScroll();
    setSelected((prev) => ({
      ...prev,
      belongings: { ...safeObj(prev?.belongings), [key]: value },
    }));
  };

  const updateCrew = (key, value) => {
    preserveModalScroll();
    setSelected((prev) => ({ ...prev, ems_crew: { ...safeObj(prev?.ems_crew), [key]: value } }));
  };

  const updateReceiving = (value) => {
    preserveModalScroll();
    setSelected((prev) => ({
      ...prev,
      receiving_physician_nod: {
        ...(safeObj(prev?.receiving_physician_nod) || {}),
        physician_nod: value,
      },
    }));
  };

  const validateSelectedMilitaryTimes = () => {
    for (const field of INCIDENT_TIME_FIELDS) {
      const raw = selected?.[field.key];

      if (!raw) continue;

      const text = String(raw).trim();

      if (/^\d{1,4}$/.test(text)) {
        const clean = normalizeMilitaryTimeInput(text);

        if (!isValidMilitaryTime(clean)) {
          showToast(
            "error",
            `${field.label} must be valid military time. Example: 0000, 0830, 1430, or 2359.`
          );
          return false;
        }
      }
    }

    return true;
  };

  const saveEdit = async () => {
    if (!selected?.id) return;

    const ok = await askConfirm({
      title: "Save changes?",
      message: "Do you want to save changes to this patient?",
      tone: "default",
      okText: "Save",
      cancelText: "Cancel",
    });

    if (!ok) {
      showToast("info", "Cancelled.");
      return;
    }

    const API_BASE = getApiBase();

    try {
      setSavingEdit(true);

      if (!validateSelectedMilitaryTimes()) {
        setSavingEdit(false);
        return;
      }

      const payload = buildReportPatchPayload(selected);

      const jsonRes = await fetchWithAuth(
        `${API_BASE}/api/reports/${selected.id}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        API_BASE
      );

      let jsonData = null;
      let jsonText = "";
      try {
        jsonText = await jsonRes.text();
        jsonData = jsonText ? JSON.parse(jsonText) : null;
      } catch {
        jsonData = jsonText || null;
      }

      if (!jsonRes.ok) {
        if (jsonRes.status === 401) {
          clearAuth();
          throw new Error("Session expired. Please login again.");
        }
        throw new Error(
          (typeof jsonData === "string" ? jsonData : JSON.stringify(jsonData)) ||
            `Failed to save: ${jsonRes.status}`
        );
      }

      let attachmentData = null;

      if (newAttachment) {
        const form = new FormData();
        form.append("attachment", newAttachment);

        const attachRes = await fetchWithAuth(
          `${API_BASE}/api/reports/${selected.id}/`,
          {
            method: "PATCH",
            body: form,
          },
          API_BASE
        );

        let attachText = "";
        try {
          attachText = await attachRes.text();
          attachmentData = attachText ? JSON.parse(attachText) : null;
        } catch {
          attachmentData = attachText || null;
        }

        if (!attachRes.ok) {
          if (attachRes.status === 401) {
            clearAuth();
            throw new Error("Session expired. Please login again.");
          }
          throw new Error(
            (typeof attachmentData === "string"
              ? attachmentData
              : JSON.stringify(attachmentData)) ||
              `Failed to upload attachment: ${attachRes.status}`
          );
        }
      }

      const list = await fetchReports();
      setReports(list);

      const latestDetail = await fetchReportDetail(selected.id);
      if (latestDetail) {
        setSelected(latestDetail);
      } else if (
        attachmentData &&
        typeof attachmentData === "object" &&
        (attachmentData.attachment || attachmentData.attachment_url)
      ) {
        setSelected((prev) => ({
          ...prev,
          attachment: attachmentData.attachment || attachmentData.attachment_url,
          attachment_url: attachmentData.attachment_url || prev?.attachment_url,
        }));
      }

      if (newAttachmentPreview) {
        URL.revokeObjectURL(newAttachmentPreview);
      }
      setNewAttachment(null);
      setNewAttachmentPreview(null);
      setMode("view");
      showToast("success", "Updated successfully!");
    } catch (e) {
      console.error(e);
      showToast("error", e?.message || "Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteReport = async (id) => {
    const ok = await askConfirm({
      title: "Delete patient?",
      message: "This action cannot be undone. Delete this patient?",
      tone: "danger",
      okText: "Delete",
      cancelText: "Cancel",
    });

    if (!ok) {
      showToast("info", "Delete cancelled.");
      return;
    }

    const API_BASE = getApiBase();

    try {
      setDeletingId(id);

      const res = await fetchWithAuth(`${API_BASE}/api/reports/${id}/`, { method: "DELETE" }, API_BASE);

      if (!res.ok && res.status !== 204) {
        if (res.status === 401) {
          clearAuth();
          throw new Error("Session expired. Please login again.");
        }
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Failed to delete: ${res.status}`);
      }

      const list = await fetchReports();
      setReports(list);

      if (selected?.id === id) setSelected(null);
      showToast("success", "Deleted.");
    } catch (e) {
      console.error(e);
      showToast("error", e?.message || "Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  };

  const drawPdfHeader = async (pdf, x, y, w, h) => {
    const assetUrl = (fileName) => {
      try {
        return new URL(fileName, window.location.href).href;
      } catch {
        return `${window.location.origin}/${fileName}`;
      }
    };

    const toDataUrl = (src) =>
      new Promise((resolve) => {
        const img = new Image();

        if (/^https?:/i.test(src)) {
          img.crossOrigin = "anonymous";
        }

        img.onload = () => {
          try {
            const c = document.createElement("canvas");
            c.width = img.naturalWidth || img.width;
            c.height = img.naturalHeight || img.height;
            const ctx = c.getContext("2d");
            if (!ctx) return resolve(null);
            ctx.drawImage(img, 0, 0);
            resolve(c.toDataURL("image/png"));
          } catch {
            resolve(null);
          }
        };

        img.onerror = () => resolve(null);
        img.src = src;
      });

    const seal1Src = assetUrl("cdrrmo_mc_seal.png");
    const seal2Src = assetUrl("cdrrmo_seal.png");
    const wordSrc = assetUrl("cdrrmo_word.png");
    const detailsSrc = assetUrl("cdrrmo_details.png");
    const emsSrc = assetUrl("cdrrmo_ems.png");

    const [seal1, seal2, word, details, ems] = await Promise.all([
      toDataUrl(seal1Src),
      toDataUrl(seal2Src),
      toDataUrl(wordSrc),
      toDataUrl(detailsSrc),
      toDataUrl(emsSrc),
    ]);

    const trimTransparent = (imgData) =>
      new Promise((resolve) => {
        if (!imgData) return resolve(null);

        const img = new Image();
        img.onload = () => {
          try {
            const c = document.createElement("canvas");
            c.width = img.naturalWidth || img.width;
            c.height = img.naturalHeight || img.height;
            const ctx = c.getContext("2d");
            if (!ctx) return resolve(imgData);

            ctx.drawImage(img, 0, 0);

            const { width, height } = c;
            const data = ctx.getImageData(0, 0, width, height).data;

            let minX = width;
            let minY = height;
            let maxX = -1;
            let maxY = -1;

            for (let yy = 0; yy < height; yy++) {
              for (let xx = 0; xx < width; xx++) {
                const i = (yy * width + xx) * 4;
                const alpha = data[i + 3];
                if (alpha > 8) {
                  if (xx < minX) minX = xx;
                  if (yy < minY) minY = yy;
                  if (xx > maxX) maxX = xx;
                  if (yy > maxY) maxY = yy;
                }
              }
            }

            if (maxX < 0 || maxY < 0) return resolve(imgData);

            const cropW = maxX - minX + 1;
            const cropH = maxY - minY + 1;

            const out = document.createElement("canvas");
            out.width = cropW;
            out.height = cropH;
            const octx = out.getContext("2d");
            if (!octx) return resolve(imgData);

            octx.drawImage(c, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
            resolve(out.toDataURL("image/png"));
          } catch {
            resolve(imgData);
          }
        };
        img.onerror = () => resolve(imgData);
        img.src = imgData;
      });

    const [seal1Trimmed, seal2Trimmed] = await Promise.all([
      trimTransparent(seal1),
      trimTransparent(seal2),
    ]);

    pdf.setDrawColor(210, 214, 220);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, y, w, h, 2, 2, "FD");

    const pad = 3.5;
    const topRowH = 20;
    const stripGap = 1.4;
    const stripY = y + topRowH + stripGap;
    const stripH = h - (topRowH + stripGap + 1.0);

    const addImageContained = (imgData, boxX, boxY, boxSize) => {
      if (!imgData) return;

      try {
        const props = pdf.getImageProperties(imgData);
        const iw = props?.width || 1;
        const ih = props?.height || 1;
        const ratio = iw / ih;

        let drawW = boxSize;
        let drawH = boxSize;

        if (ratio > 1) drawH = boxSize / ratio;
        else if (ratio < 1) drawW = boxSize * ratio;

        const dx = boxX + (boxSize - drawW) / 2;
        const dy = boxY + (boxSize - drawH) / 2;

        pdf.addImage(imgData, "PNG", dx, dy, drawW, drawH);
      } catch {
        try {
          pdf.addImage(imgData, "PNG", boxX, boxY, boxSize, boxSize);
        } catch {
          /* ignore */
        }
      }
    };

    const sealBox = 18.5;
    const sealsY = y + 1.8;
    const leftStartX = x + pad;
    let cx = leftStartX;

    addImageContained(seal1Trimmed, cx, sealsY, sealBox);
    cx += sealBox + 1.2;
    addImageContained(seal2Trimmed, cx, sealsY, sealBox);
    cx += sealBox + 1.2;

    const rightBlockW = 74;
    const detailsW = rightBlockW;
    const detailsH = 19.6;
    const detailsX = x + w - pad - detailsW;
    const detailsY = y + 2.4;

    try {
      if (details) pdf.addImage(details, "PNG", detailsX, detailsY, detailsW, detailsH);
    } catch {
      /* ignore */
    }

    const gapBeforeWord = 1.0;
    const gapAfterWord = 1.0;
    const leftBoundary = cx + gapBeforeWord;
    const rightBoundary = detailsX - gapAfterWord;
    const availableCenterW = Math.max(20, rightBoundary - leftBoundary);

    const wordW = Math.min(66, availableCenterW);
    const wordH = 13.2;
    const wordX = leftBoundary + (availableCenterW - wordW) / 2;
    const wordY = y + 4.2;

    try {
      if (word) pdf.addImage(word, "PNG", wordX, wordY, wordW, wordH);
    } catch {
      /* ignore */
    }

    try {
      if (ems) pdf.addImage(ems, "PNG", x + pad, stripY, w - pad * 2, stripH);
    } catch {
      /* ignore */
    }
  };

  const exportPDF = async () => {
    if (!pdfRef.current || !selected) return;

    const originalPaper = pdfRef.current.querySelector(".rp-paper");
    if (!originalPaper) {
      showToast("error", "PDF source not found.");
      return;
    }

    const SCALE = 2;
    const A4_CSS_WIDTH = 794;

    const waitForImages = async (container, timeoutMs = 8000) => {
      const images = Array.from(container.querySelectorAll("img"));

      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();

          return new Promise((resolve) => {
            let done = false;

            const finish = () => {
              if (done) return;
              done = true;
              img.onload = null;
              img.onerror = null;
              resolve();
            };

            img.onload = finish;
            img.onerror = finish;
            setTimeout(finish, timeoutMs);
          });
        })
      );

      try {
        if (document.fonts?.ready) {
          await Promise.race([
            document.fonts.ready,
            new Promise((resolve) => setTimeout(resolve, timeoutMs)),
          ]);
        }
      } catch {
        // ignore
      }
    };

    const createOffscreenClone = () => {
      const wrapper = document.createElement("div");
      wrapper.className = "rp-offscreen-capture";
      wrapper.style.position = "fixed";
      wrapper.style.left = "-100000px";
      wrapper.style.top = "0";
      wrapper.style.width = A4_CSS_WIDTH + "px";
      wrapper.style.zIndex = "-1";
      wrapper.style.pointerEvents = "none";
      wrapper.style.opacity = "1";
      wrapper.style.background = "#ffffff";

      const clone = originalPaper.cloneNode(true);
      clone.classList.add("rp-printing", "rp-pdf-mode", "rp-a4-export");
      clone.querySelectorAll(".rp-pdf-hide").forEach((node) => node.remove());

      clone.style.width = A4_CSS_WIDTH + "px";
      clone.style.maxWidth = A4_CSS_WIDTH + "px";
      clone.style.height = "auto";
      clone.style.minHeight = "0";
      clone.style.maxHeight = "none";
      clone.style.overflow = "visible";
      clone.style.margin = "0";
      clone.style.padding = "0";
      clone.style.boxShadow = "none";
      clone.style.borderRadius = "0";
      clone.style.border = "0";
      clone.style.background = "#ffffff";

      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      return { wrapper, clone };
    };

    const trimCanvasBottom = (srcCanvas) => {
      const ctx = srcCanvas.getContext("2d");
      if (!ctx) return srcCanvas;

      const { width, height } = srcCanvas;
      const imageData = ctx.getImageData(0, 0, width, height).data;

      let lastNonWhiteRow = -1;

      outer: for (let y = height - 1; y >= 0; y--) {
        for (let x = 10; x < width - 10; x++) {
          const i = (y * width + x) * 4;
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          if (a > 10 && !(r > 248 && g > 248 && b > 248)) {
            lastNonWhiteRow = y;
            break outer;
          }
        }
      }

      if (lastNonWhiteRow < 0) return srcCanvas;

      const trimmedHeight = Math.max(1, lastNonWhiteRow + 12);
      if (trimmedHeight >= height) return srcCanvas;

      const trimmed = document.createElement("canvas");
      trimmed.width = width;
      trimmed.height = trimmedHeight;

      const tctx = trimmed.getContext("2d");
      if (!tctx) return srcCanvas;

      tctx.fillStyle = "#ffffff";
      tctx.fillRect(0, 0, trimmed.width, trimmed.height);
      tctx.drawImage(srcCanvas, 0, 0, width, trimmedHeight, 0, 0, width, trimmedHeight);

      return trimmed;
    };

    const makeSliceCanvas = (sourceCanvas, sourceY, sourceHeight) => {
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = sourceCanvas.width;
      sliceCanvas.height = sourceHeight;

      const ctx = sliceCanvas.getContext("2d");
      if (!ctx) return null;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(
        sourceCanvas,
        0,
        sourceY,
        sourceCanvas.width,
        sourceHeight,
        0,
        0,
        sourceCanvas.width,
        sourceHeight
      );

      return sliceCanvas;
    };

    const getCanvasYForNode = (node, rootRect, canvasScale, canvasHeight) => {
      if (!node) return null;

      const rect = node.getBoundingClientRect();
      const top = rect.top - rootRect.top;
      const px = Math.round(top * canvasScale);

      if (!Number.isFinite(px)) return null;
      if (px <= 0 || px >= canvasHeight) return null;

      return px;
    };

    const getSmartBreakpoints = (clone, canvas) => {
      const rootRect = clone.getBoundingClientRect();
      const canvasScale = canvas.width / (clone.offsetWidth || A4_CSS_WIDTH);
      const points = new Set([0, canvas.height]);

      const addPoint = (value) => {
        if (!Number.isFinite(value)) return;
        const px = Math.round(value * canvasScale);
        if (px > 0 && px < canvas.height) points.add(px);
      };

      const selectors = [
        ".rp-section",
        ".rp-section-head",
        ".rp-vitals-entry",
        ".rp-vitals-grid",
        ".rp-kv",
        ".rp-attachment-box",
      ].join(",");

      clone.querySelectorAll(selectors).forEach((node) => {
        const rect = node.getBoundingClientRect();
        const top = rect.top - rootRect.top;
        const bottom = rect.bottom - rootRect.top;

        addPoint(top);
        addPoint(bottom);
      });

      return Array.from(points).sort((a, b) => a - b);
    };

    const getForcedPageBreaks = (clone, canvas) => {
      const rootRect = clone.getBoundingClientRect();
      const canvasScale = canvas.width / (clone.offsetWidth || A4_CSS_WIDTH);

      return Array.from(clone.querySelectorAll(".rp-pdf-vitals-section"))
        .map((node) => getCanvasYForNode(node, rootRect, canvasScale, canvas.height))
        .filter((point) => Number.isFinite(point))
        .sort((a, b) => a - b);
    };

    const chooseSmartSliceEnd = ({
      breakpoints,
      forcedBreaks,
      offsetPx,
      maxEndPx,
      fullHeightPx,
    }) => {
      const hardEnd = Math.min(maxEndPx, fullHeightPx);
      if (hardEnd >= fullHeightPx) return fullHeightPx;

      const safePaddingPx = 10 * SCALE;
      const minimumForcedGapPx = 24 * SCALE;

      const forcedBreakInPage = forcedBreaks.find((point) => {
        return point > offsetPx + minimumForcedGapPx && point <= hardEnd - safePaddingPx;
      });

      if (forcedBreakInPage) {
        return forcedBreakInPage;
      }

      const minimumUsefulHeight = Math.max(180, Math.floor((hardEnd - offsetPx) * 0.45));
      const minEnd = offsetPx + minimumUsefulHeight;

      const candidates = breakpoints.filter((point) => {
        return point > minEnd && point <= hardEnd - safePaddingPx;
      });

      if (candidates.length) {
        return candidates[candidates.length - 1];
      }

      return hardEnd;
    };

    let wrapper = null;

    try {
      setPdfBusy(true);

      const cloneData = createOffscreenClone();
      wrapper = cloneData.wrapper;
      const clone = cloneData.clone;

      await new Promise((resolve) => requestAnimationFrame(resolve));
      await waitForImages(clone);

      const fullCanvasRaw = await html2canvas(clone, {
        scale: SCALE,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: clone.scrollWidth || A4_CSS_WIDTH,
        windowHeight: clone.scrollHeight || 1123,
        imageTimeout: 8000,
      });

      const fullCanvas = trimCanvasBottom(fullCanvasRaw);
      const breakpoints = getSmartBreakpoints(clone, fullCanvas);
      const forcedBreaks = getForcedPageBreaks(clone, fullCanvas);

      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
        wrapper = null;
      }

      if (!fullCanvas.width || !fullCanvas.height) {
        showToast("error", "Nothing to export.");
        return;
      }

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const marginX = 8;
      const marginTop = 8;
      const marginBottom = 8;
      const printableWidth = pageWidth - marginX * 2;

      const firstHeaderHeight = 34;
      const firstBodyTopY = marginTop + firstHeaderHeight + 3;
      const nextBodyTopY = marginTop;

      const fullHeightMm = (fullCanvas.height * printableWidth) / fullCanvas.width;
      const pxPerMm = fullCanvas.height / fullHeightMm;

      let offsetPx = 0;
      let pageIndex = 0;

      while (offsetPx < fullCanvas.height) {
        if (pageIndex > 0) {
          pdf.addPage("a4", "p");
        }

        const isFirstPage = pageIndex === 0;
        const startY = isFirstPage ? firstBodyTopY : nextBodyTopY;
        const usableHeightMm = pageHeight - startY - marginBottom;
        const maxEndPx = offsetPx + Math.floor(usableHeightMm * pxPerMm);
        const smartEndPx = chooseSmartSliceEnd({
          breakpoints,
          forcedBreaks,
          offsetPx,
          maxEndPx,
          fullHeightPx: fullCanvas.height,
        });

        const sliceHeightPx = Math.min(smartEndPx - offsetPx, fullCanvas.height - offsetPx);
        if (sliceHeightPx <= 0) break;

        if (isFirstPage) {
          await drawPdfHeader(pdf, marginX, marginTop, printableWidth, firstHeaderHeight);
        }

        const sliceCanvas = makeSliceCanvas(fullCanvas, offsetPx, sliceHeightPx);
        if (!sliceCanvas) break;

        const sliceHeightMm = (sliceCanvas.height * printableWidth) / sliceCanvas.width;
        const imgData = sliceCanvas.toDataURL("image/png", 1.0);

        pdf.addImage(
          imgData,
          "PNG",
          marginX,
          startY,
          printableWidth,
          sliceHeightMm,
          undefined,
          "FAST"
        );

        offsetPx += sliceHeightPx;
        pageIndex += 1;
      }

      pdf.save((getCaseNo(selected) || "patient-record") + ".pdf");
    } catch (e) {
      console.error(e);
      showToast("error", "PDF export failed. Check console.");
    } finally {
      if (wrapper?.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
      setPdfBusy(false);
    }
  };

  if (loading) return <PatientsSkeleton />;

  return (
    <div className="rp-layout">
      <Toast
        open={toastOpen}
        type={toastType}
        message={toastMsg}
        onClose={() => setToastOpen(false)}
        duration={2400}
      />

      <ConfirmModal />
      <Sidebar />

      <div className="rp-main">
        <div className="rp-page">
          <div className="rp-head">
            <div>
              <div className="rp-crumbs">Patients</div>
              <h2 className="rp-title">Patients</h2>
              <p className="rp-subtitle">Search, filter, import, and review patients.</p>
            </div>

            <div className="rp-header-tools">
              <div className="rp-import-actions">
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="rp-file-hidden"
                  onChange={(e) => importExcelFile(e.target.files?.[0])}
                />

                <button
                  type="button"
                  className="rp-btn rp-btn-ghost rp-import-btn"
                  onClick={() => excelInputRef.current?.click()}
                  disabled={importingExcel}
                >
                  {importingExcel ? "Importing..." : "Import Excel"}
                </button>
              </div>

              <div className="rp-filters">
                <input
                  className="rp-input"
                  placeholder="Search patient name, case no..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <select
                  className="rp-input"
                  value={caseTypeFilter}
                  onChange={(e) => setCaseTypeFilter(e.target.value)}
                >
                  <option value="all">All Case Types</option>
                  {CASE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rp-card">
            {error ? (
              <div className="rp-empty" style={{ padding: 18 }}>{error}</div>
            ) : (
              <table className="rp-table">
                <thead>
                  <tr>
                    <th>Case No.</th>
                    <th>Patient</th>
                    <th>Age</th>
                    <th>Chief Complaint</th>
                    <th>Case Type</th>
                    <th>Location</th>
                    <th>Ambulance</th>
                    <th>Date</th>
                    <th className="rp-th-actions">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="rp-empty">No patients found.</td>
                    </tr>
                  ) : (
                    filtered.map((r) => {
                      const patientName = formatNameFromReport(r);
                      const chiefComplaint = getChiefComplaintFromReport(r);
                      const pRow = safeObj(getPatientObj(r));

                      return (
                        <tr key={r.id}>
                          <td className="rp-mono">{getCaseNo(r) || "—"}</td>
                          <td>{patientName || "—"}</td>
                          <td>{pRow.age || "—"}</td>
                          <td className="rp-complaint">{chiefComplaint || "—"}</td>
                          <td>{formatCaseTypeLabel(r.case_type)}</td>
                          <td>{r.patient_location || "—"}</td>
                          <td className="rp-mono">{r.ambulance_body_no || "—"}</td>
                          <td>{formatDateTimeReadable(r.created_at || r.call_received_time) || "—"}</td>
                          <td className="rp-actions">
                            <button className="rp-mini rp-view" onClick={() => openModal(r, "view")}>
                              View
                            </button>
                            <button className="rp-mini rp-edit" onClick={() => openModal(r, "edit")}>
                              Edit
                            </button>
                            <button
                              className="rp-mini rp-danger"
                              onClick={() => deleteReport(r.id)}
                              disabled={deletingId === r.id}
                            >
                              {deletingId === r.id ? "Deleting..." : "Delete"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            <div className="rp-foot">
              Showing <b>{filtered.length}</b> patient{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {selected && modalLoading && (
          <div className="rp-overlay" onMouseDown={closeModal}>
            <div className="rp-modal" onMouseDown={(e) => e.stopPropagation()}>
              <div className="rp-modal-head">
                <div style={{ width: "100%" }}>
                  <Skeleton className="skel-line skel-md" style={{ width: 320 }} />
                  <Skeleton className="skel-line skel-sm" style={{ width: 240, marginTop: 10 }} />
                </div>
                <button className="rp-xbtn" onClick={closeModal} aria-label="Close">✕</button>
              </div>
              <div className="rp-modal-body">
                <div className="rp-section">
                  <Skeleton className="skel-line skel-md" style={{ width: 260, marginBottom: 14 }} />
                  <div className="rp-modal-grid">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div className="rp-modal-col" key={i}>
                        <Skeleton className="skel-input" style={{ height: 58, marginBottom: 10 }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selected && !modalLoading && (() => {
          const p = safeObj(getPatientObj(selected));
          const inc = safeObj(selected?.incident);
          const vitals = safeArr(selected?.vitals);
          const gcs = safeObj(selected?.gcs);
          const apgar = safeObj(selected?.apgar);
          const nonTransport = safeObj(selected?.non_transport);
          const belongings = safeObj(selected?.belongings);
          const crew = safeObj(selected?.ems_crew);
          const receivingObj = safeObj(selected?.receiving_physician_nod);

          const existingAttachment =
            selected?.attachment_url || selected?.attachment || selected?.image || "";

          const existingAttachmentUrl = selected?.attachment_url
            ? selected.attachment_url
            : resolveMediaUrl(existingAttachment);

          return (
            <div className="rp-overlay" onMouseDown={closeModal}>
              <div className="rp-modal" onMouseDown={(e) => e.stopPropagation()}>
                <div className="rp-modal-head">
                  <div>
                    <h3 className="rp-modal-title">
                      Patient {getCaseNo(selected) || "—"} ({isEdit ? "Edit" : "View"})
                    </h3>
                    <div className="rp-modal-sub">
                      Patient: <strong>{formatNameFromReport(selected) || "—"}</strong>
                    </div>
                  </div>

                  <button className="rp-xbtn" onClick={closeModal} aria-label="Close">✕</button>
                </div>

                <div
                  className="rp-modal-body"
                  ref={(node) => {
                    modalBodyRef.current = node;
                    pdfRef.current = node;
                  }}
                >
                  <div className="rp-paper rp-print">
                    <div className="rp-section rp-pdf-hide">
                      <div className="rp-section-head" style={{ justifyContent: "space-between" }}>
                        <h4 className="rp-section-title">Attachment</h4>
                      </div>

                      {existingAttachmentUrl ? (
                        <div className="rp-attachment-box">
                          <div className="rp-attachment-label">Current Attachment</div>

                          {isImageAttachment(existingAttachmentUrl || existingAttachment) ? (
                            <a
                              href={existingAttachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rp-attachment-link"
                            >
                              <img
                                src={existingAttachmentUrl}
                                alt="Attachment"
                                className="rp-attachment-image"
                                onError={(e) => {
                                  console.error("Image failed to load:", existingAttachmentUrl);
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            </a>
                          ) : (
                            <a
                              href={existingAttachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rp-file-link"
                            >
                              📎 {getAttachmentFileName(existingAttachment)}
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="rp-empty" style={{ padding: 12, marginBottom: 10 }}>
                          No attachment.
                        </div>
                      )}

                      {isEdit ? (
                        <div className="rp-attachment-box" style={{ marginTop: 14 }}>
                          <div className="rp-attachment-label">Replace / Add Attachment</div>

                          <input
                            className="rp-input"
                            type="file"
                            accept="image/*,.pdf,.doc,.docx"
                            onChange={(e) => onPickNewAttachment(e.target.files?.[0])}
                          />

                          {newAttachment ? (
                            <div style={{ marginTop: 12 }}>
                              <div className="rp-attachment-label">
                                {newAttachmentPreview ? "New Image Preview" : "Selected Attachment"}
                              </div>

                              {newAttachmentPreview ? (
                                <img
                                  src={newAttachmentPreview}
                                  alt="New preview"
                                  className="rp-attachment-image"
                                />
                              ) : (
                                <div className="rp-file-link">
                                  📎 {newAttachment.name}
                                </div>
                              )}

                              <div style={{ marginTop: 10 }}>
                                <button
                                  type="button"
                                  className="btn btn-soft"
                                  onClick={() => {
                                    if (newAttachmentPreview) {
                                      URL.revokeObjectURL(newAttachmentPreview);
                                    }
                                    setNewAttachment(null);
                                    setNewAttachmentPreview(null);
                                  }}
                                  disabled={savingEdit}
                                >
                                  Remove Selected Attachment
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="rp-section">
                      <div className="rp-section-head">
                        <h4 className="rp-section-title">Patient Info</h4>
                      </div>

                      <div className="rp-modal-grid">
                        <div className="rp-modal-col">
                          <KeyValue
                            label="Date"
                            value={formatDateTimeReadable(selected.created_at || selected.call_received_time)}
                          />

                          {isEdit ? (
                            <InputKV
                              label="Case No."
                              value={selected.case_no ?? ""}
                              onChange={(v) => updateSelected("case_no", v)}
                            />
                          ) : (
                            <KeyValue label="Case No." value={getCaseNo(selected)} />
                          )}
                        </div>

                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              <SelectKV
                                label="Case Type"
                                value={selected.case_type ?? "medical"}
                                onChange={(v) => updateSelected("case_type", v)}
                                options={CASE_TYPE_OPTIONS}
                              />
                              <InputKV
                                label="Ambulance Body No."
                                value={selected.ambulance_body_no ?? ""}
                                onChange={(v) => updateSelected("ambulance_body_no", v)}
                              />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Case Type" value={formatCaseTypeLabel(selected.case_type)} />
                              <KeyValue label="Ambulance Body No." value={selected.ambulance_body_no} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rp-section">
                      <div className="rp-section-head">
                        <h4 className="rp-section-title">Patient</h4>
                      </div>

                      <div className="rp-modal-grid">
                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              <InputKV
                                label="Full Name"
                                value={p.full_name ?? ""}
                                onChange={(v) => updatePatient("full_name", v)}
                              />
                              <InputKV
                                label="Age"
                                type="text"
                                inputMode="numeric"
                                maxLength={3}
                                value={p.age ?? ""}
                                placeholder="Enter age"
                                onChange={(v) => updatePatient("age", normalizeAgeInput(v))}
                              />
                              <SelectKV
                                label="Sex"
                                value={p.sex ?? NA}
                                onChange={(v) => updatePatient("sex", v)}
                                options={SEX_OPTIONS}
                              />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Full Name" value={formatNameFromPatient(p)} />
                              <KeyValue label="Age" value={p.age} />
                              <KeyValue label="Sex" value={formatSexDisplay(p.sex)} />
                            </>
                          )}
                        </div>

                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              <TextareaKV
                                label="Address"
                                value={p.address ?? ""}
                                onChange={(v) => updatePatient("address", v)}
                              />
                              <InputKV
                                label="Contact Number"
                                value={p.contact_number ?? ""}
                                onChange={(v) => updatePatient("contact_number", v)}
                              />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Address" value={p.address} />
                              <KeyValue label="Contact Number" value={p.contact_number} />
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        {isEdit ? (
                          <>
                            <TextareaKV
                              label="Chief Complaint"
                              value={p.chief_complaint ?? ""}
                              onChange={(v) => updatePatient("chief_complaint", v)}
                              placeholder="..."
                            />
                            <div style={{ marginTop: 12 }}>
                              <TextareaKV
                                label="Assessment"
                                value={p.assessment ?? ""}
                                onChange={(v) => updatePatient("assessment", v)}
                                placeholder="Initial findings, impression, notes..."
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <KeyValue label="Chief Complaint" value={p.chief_complaint} />
                            <KeyValue label="Assessment" value={p.assessment} />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="rp-section">
                      <div className="rp-section-head">
                        <h4 className="rp-section-title">Incident</h4>
                      </div>

                      <div className="rp-modal-grid">
                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              <TextareaKV
                                label="Patient Location"
                                value={selected.patient_location ?? ""}
                                onChange={(v) => updateIncident("patient_location", v)}
                              />
                              <TextareaKV
                                label="Transported To"
                                value={selected.transported_to ?? ""}
                                onChange={(v) => updateIncident("transported_to", v)}
                              />
                              <SelectKV
                                label="Level of Consciousness"
                                value={selected.level_of_consciousness ?? inc.level_of_consciousness ?? NA}
                                onChange={(v) => updateIncident("level_of_consciousness", v)}
                                options={LOC_OPTIONS}
                              />
                              <InputKV
                                label="DOI"
                                type="date"
                                value={toDateInputValue(selected.doi ?? inc.doi ?? "")}
                                onChange={(v) => updateIncident("doi", fromDateInputToISO(v))}
                              />
                              <InputKV
                                label="TOI"
                                type="time"
                                value={selected.toi ?? inc.toi ?? ""}
                                onChange={(v) => updateIncident("toi", v)}
                              />
                              <InputKV
                                label="POI"
                                value={selected.poi ?? ""}
                                onChange={(v) => updateIncident("poi", v)}
                              />
                              <TextareaKV
                                label="MOI"
                                value={selected.moi ?? ""}
                                onChange={(v) => updateIncident("moi", v)}
                              />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Patient Location" value={selected.patient_location} />
                              <KeyValue label="Transported To" value={selected.transported_to} />
                              <KeyValue
                                label="Level of Consciousness"
                                value={getOptionLabel(
                                  LOC_OPTIONS,
                                  selected.level_of_consciousness || inc.level_of_consciousness
                                )}
                              />
                              <KeyValue label="DOI" value={formatDateReadable(selected.doi || inc.doi)} />
                              <KeyValue label="TOI" value={selected.toi || inc.toi} />
                              <KeyValue label="POI" value={selected.poi} />
                              <KeyValue label="MOI" value={selected.moi} />
                            </>
                          )}
                        </div>

                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              {INCIDENT_TIME_FIELDS.map((field) => (
                                <InputKV
                                  key={field.key}
                                  label={field.label}
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={4}
                                  value={timeFromApiToMilitary(selected?.[field.key] ?? "")}
                                  placeholder={field.placeholder}
                                  onChange={(v) => updateIncident(field.key, normalizeMilitaryTimeInput(v))}
                                />
                              ))}
                            </>
                          ) : (
                            <>
                              {INCIDENT_TIME_FIELDS.map((field) => (
                                <KeyValue
                                  key={field.key}
                                  label={field.label}
                                  value={timeFromApiToMilitary(selected?.[field.key])}
                                />
                              ))}
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        {isEdit ? (
                          <TextareaKV
                            label="Intervention Notes"
                            value={selected.intervention_notes ?? ""}
                            onChange={(v) => updateIncident("intervention_notes", v)}
                          />
                        ) : (
                          <KeyValue label="Intervention Notes" value={selected.intervention_notes} />
                        )}
                      </div>
                    </div>

                    <div className="rp-section rp-pdf-vitals-section">
                      <div className="rp-section-head">
                        <h4 className="rp-section-title">Vitals</h4>
                        {isEdit ? (
                          <button className="btn btn-soft" type="button" onClick={addVitalsRow}>
                            Add Vitals Row
                          </button>
                        ) : null}
                      </div>

                      {vitals.length === 0 && !isEdit ? (
                        <div className="rp-empty" style={{ padding: 10 }}>No vitals recorded.</div>
                      ) : (
                        <div className="rp-vitals-list">
                          {(vitals.length ? vitals : [{ ...EMPTY_VITALS_ROW }]).map((v, idx) => (
                            <div className="rp-vitals-entry" key={v.id ?? idx}>
                              <div className="rp-section-head" style={{ marginBottom: 8 }}>
                                <h5 style={{ margin: 0, color: "#fff" }}>Vitals #{idx + 1}</h5>
                                {isEdit && (vitals.length > 1 || idx > 0) ? (
                                  <button
                                    className="btn btn-danger"
                                    type="button"
                                    onClick={() => removeVitalsRow(idx)}
                                  >
                                    Remove
                                  </button>
                                ) : null}
                              </div>

                              <div className="rp-vitals-grid">
                                {isEdit ? (
                                  <>
                                    <InputKV
                                      label="Time"
                                      type="datetime-local"
                                      value={toDateTimeLocalValue(v.time ?? "")}
                                      onChange={(val) => updateVitals(idx, "time", fromDateTimeLocalToISO(val))}
                                    />
                                    <InputKV
                                      label="BP"
                                      value={v.bp ?? ""}
                                      onChange={(val) => updateVitals(idx, "bp", val)}
                                    />
                                    <InputKV
                                      label="Pulse Rate"
                                      value={v.pulse_rate ?? ""}
                                      onChange={(val) => updateVitals(idx, "pulse_rate", val)}
                                    />
                                    <SelectKV
                                      label="Pulse Status"
                                      value={v.pulse_status || NA}
                                      onChange={(val) => updateVitals(idx, "pulse_status", val)}
                                      options={PULSE_STATUS_OPTIONS}
                                    />
                                    <InputKV
                                      label="Resp Rate"
                                      value={v.resp_rate ?? ""}
                                      onChange={(val) => updateVitals(idx, "resp_rate", val)}
                                    />
                                    <SelectKV
                                      label="Resp Quality"
                                      value={v.resp_quality || NA}
                                      onChange={(val) => updateVitals(idx, "resp_quality", val)}
                                      options={RESP_QUALITY_OPTIONS}
                                    />
                                    <InputKV
                                      label="Temperature"
                                      value={v.temperature_value ?? ""}
                                      onChange={(val) => updateVitals(idx, "temperature_value", val)}
                                    />
                                    <SelectKV
                                      label="Temp State"
                                      value={v.temperature_state || NA}
                                      onChange={(val) => updateVitals(idx, "temperature_state", val)}
                                      options={TEMP_STATE_OPTIONS}
                                    />
                                    <InputKV
                                      label="SpO₂"
                                      value={v.spo2 ?? ""}
                                      onChange={(val) => updateVitals(idx, "spo2", val)}
                                    />
                                    <SelectKV
                                      label="Skin Color"
                                      value={v.skin_color || NA}
                                      onChange={(val) => updateVitals(idx, "skin_color", val)}
                                      options={SKIN_COLOR_OPTIONS}
                                    />
                                    <SelectKV
                                      label="Pupils"
                                      value={v.pupils || NA}
                                      onChange={(val) => updateVitals(idx, "pupils", val)}
                                      options={PUPILS_OPTIONS}
                                    />
                                    <SelectKV
                                      label="Cap Refill"
                                      value={v.cap_refill || NA}
                                      onChange={(val) => updateVitals(idx, "cap_refill", val)}
                                      options={CAP_REFILL_OPTIONS}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <KeyValue label="Time" value={formatDateTimeReadable(v.time)} />
                                    <KeyValue label="BP" value={v.bp} />
                                    <KeyValue label="Pulse Rate" value={v.pulse_rate} />
                                    <KeyValue label="Pulse Status" value={getOptionLabel(PULSE_STATUS_OPTIONS, v.pulse_status)} />
                                    <KeyValue label="Resp Rate" value={v.resp_rate} />
                                    <KeyValue label="Resp Quality" value={getOptionLabel(RESP_QUALITY_OPTIONS, v.resp_quality)} />
                                    <KeyValue label="Temperature" value={v.temperature_value} />
                                    <KeyValue label="Temp State" value={getOptionLabel(TEMP_STATE_OPTIONS, v.temperature_state)} />
                                    <KeyValue label="SpO₂" value={v.spo2} />
                                    <KeyValue label="Skin Color" value={getOptionLabel(SKIN_COLOR_OPTIONS, v.skin_color)} />
                                    <KeyValue label="Pupils" value={getOptionLabel(PUPILS_OPTIONS, v.pupils)} />
                                    <KeyValue label="Cap Refill" value={getOptionLabel(CAP_REFILL_OPTIONS, v.cap_refill)} />
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rp-section">
                      <div className="rp-section-head">
                        <h4 className="rp-section-title">GCS</h4>
                      </div>

                      <div className="rp-modal-grid">
                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              <SelectKV
                                label="Eye"
                                value={gcs.eye_score ?? NA}
                                onChange={(v) => updateGcs("eye_score", v)}
                                options={GCS_EYE_OPTIONS}
                              />
                              <SelectKV
                                label="Verbal"
                                value={gcs.verbal_score ?? NA}
                                onChange={(v) => updateGcs("verbal_score", v)}
                                options={GCS_VERBAL_OPTIONS}
                              />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Eye" value={getOptionLabel(GCS_EYE_OPTIONS, gcs.eye_score)} />
                              <KeyValue label="Verbal" value={getOptionLabel(GCS_VERBAL_OPTIONS, gcs.verbal_score)} />
                            </>
                          )}
                        </div>

                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              <SelectKV
                                label="Motor"
                                value={gcs.motor_score ?? NA}
                                onChange={(v) => updateGcs("motor_score", v)}
                                options={GCS_MOTOR_OPTIONS}
                              />
                              <InputKV
                                label="Total Score"
                                value={gcs.total_score ?? ""}
                                onChange={(v) => updateGcs("total_score", v)}
                              />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Motor" value={getOptionLabel(GCS_MOTOR_OPTIONS, gcs.motor_score)} />
                              <KeyValue label="Total Score" value={gcs.total_score} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rp-section">
                      <div className="rp-section-head">
                        <h4 className="rp-section-title">APGAR</h4>
                      </div>

                      <div className="rp-modal-grid">
                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              <SelectKV
                                label="Appearance"
                                value={apgar.appearance ?? NA}
                                onChange={(v) => updateApgar("appearance", v)}
                                options={APGAR_APPEARANCE_OPTIONS}
                              />
                              <SelectKV
                                label="Pulse"
                                value={apgar.pulse ?? NA}
                                onChange={(v) => updateApgar("pulse", v)}
                                options={APGAR_PULSE_OPTIONS}
                              />
                              <SelectKV
                                label="Grimace"
                                value={apgar.grimace ?? NA}
                                onChange={(v) => updateApgar("grimace", v)}
                                options={APGAR_GRIMACE_OPTIONS}
                              />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Appearance" value={getOptionLabel(APGAR_APPEARANCE_OPTIONS, apgar.appearance)} />
                              <KeyValue label="Pulse" value={getOptionLabel(APGAR_PULSE_OPTIONS, apgar.pulse)} />
                              <KeyValue label="Grimace" value={getOptionLabel(APGAR_GRIMACE_OPTIONS, apgar.grimace)} />
                            </>
                          )}
                        </div>

                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              <SelectKV
                                label="Activity"
                                value={apgar.activity ?? NA}
                                onChange={(v) => updateApgar("activity", v)}
                                options={APGAR_ACTIVITY_OPTIONS}
                              />
                              <SelectKV
                                label="Respiration"
                                value={apgar.respiration ?? NA}
                                onChange={(v) => updateApgar("respiration", v)}
                                options={APGAR_RESP_OPTIONS}
                              />
                              <InputKV
                                label="Total Score"
                                value={apgar.total_score ?? ""}
                                onChange={(v) => updateApgar("total_score", v)}
                              />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Activity" value={getOptionLabel(APGAR_ACTIVITY_OPTIONS, apgar.activity)} />
                              <KeyValue label="Respiration" value={getOptionLabel(APGAR_RESP_OPTIONS, apgar.respiration)} />
                              <KeyValue label="Total Score" value={apgar.total_score} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rp-section">
                      <div className="rp-section-head">
                        <h4 className="rp-section-title">Non-Transport</h4>
                      </div>

                      {isEdit ? (
                        <SelectKV
                          label="Reason"
                          value={nonTransport.reason ?? NA}
                          onChange={(v) => updateNonTransport("reason", v)}
                          options={NON_TRANSPORT_REASON_OPTIONS}
                        />
                      ) : (
                        <KeyValue label="Reason" value={getOptionLabel(NON_TRANSPORT_REASON_OPTIONS, nonTransport.reason)} />
                      )}
                    </div>

                    <div className="rp-section">
                      <div className="rp-section-head">
                        <h4 className="rp-section-title">Belongings</h4>
                      </div>

                      <div className="rp-modal-grid">
                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              <TextareaKV label="Items" value={belongings.items ?? ""} onChange={(v) => updateBelongings("items", v)} />
                              <InputKV label="Turned Over To" value={belongings.turned_over_to ?? ""} onChange={(v) => updateBelongings("turned_over_to", v)} />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Items" value={belongings.items} />
                              <KeyValue label="Turned Over To" value={belongings.turned_over_to} />
                            </>
                          )}
                        </div>

                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              <InputKV label="Received By" value={belongings.received_by ?? ""} onChange={(v) => updateBelongings("received_by", v)} />
                              <TextareaKV label="Notes" value={belongings.notes ?? ""} onChange={(v) => updateBelongings("notes", v)} />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Received By" value={belongings.received_by} />
                              <KeyValue label="Notes" value={belongings.notes} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rp-section">
                      <div className="rp-section-head">
                        <h4 className="rp-section-title">EMS Crew</h4>
                      </div>

                      <div className="rp-modal-grid">
                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              <InputKV label="EMS In Charge" value={crew.ems_in_charge ?? ""} onChange={(v) => updateCrew("ems_in_charge", v)} />
                              <InputKV label="EMS Assistant 1" value={crew.ems_assistant_1 ?? ""} onChange={(v) => updateCrew("ems_assistant_1", v)} />
                            </>
                          ) : (
                            <>
                              <KeyValue label="EMS In Charge" value={crew.ems_in_charge} />
                              <KeyValue label="EMS Assistant 1" value={crew.ems_assistant_1} />
                            </>
                          )}
                        </div>

                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              <InputKV label="EMS Assistant 2" value={crew.ems_assistant_2 ?? ""} onChange={(v) => updateCrew("ems_assistant_2", v)} />
                              <InputKV label="EMS Operator" value={crew.ems_operator ?? ""} onChange={(v) => updateCrew("ems_operator", v)} />
                            </>
                          ) : (
                            <>
                              <KeyValue label="EMS Assistant 2" value={crew.ems_assistant_2} />
                              <KeyValue label="EMS Operator" value={crew.ems_operator} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rp-section">
                      <div className="rp-section-head">
                        <h4 className="rp-section-title">Receiving Physician / NOD</h4>
                      </div>

                      {isEdit ? (
                        <InputKV
                          label="Physician / NOD"
                          value={receivingObj.physician_nod ?? ""}
                          onChange={(v) => updateReceiving(v)}
                        />
                      ) : (
                        <KeyValue label="Physician / NOD" value={receivingObj.physician_nod} />
                      )}
                    </div>
                  </div>
                </div>

                <div className="rp-modal-actions">
                  {isEdit ? (
                    <>
                      <button className="btn btn-soft" type="button" onClick={() => setMode("view")} disabled={savingEdit}>
                        Cancel
                      </button>
                      <button className="btn btn-primary" type="button" onClick={saveEdit} disabled={savingEdit}>
                        {savingEdit ? "Saving..." : "Save Changes"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-soft" type="button" onClick={closeModal}>
                        Close
                      </button>
                      <button className="btn btn-soft" type="button" onClick={exportPDF} disabled={pdfBusy}>
                        {pdfBusy ? "Generating PDF..." : "Export PDF"}
                      </button>
                      <button className="btn btn-primary" type="button" onClick={() => setMode("edit")}>
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}