import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import "./Reports.css";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { fetchWithAuth, clearAuth } from "../../auth";
import Toast from "../ui/Toast";

const STATUS_OPTIONS = ["draft", "submitted", "reviewed", "closed"];
const NA = "na";

function Skeleton({ className = "", style }) {
  return <div className={`skel ${className}`} style={style} aria-hidden="true" />;
}

function SkeletonRow() {
  return (
    <tr>
      <td><Skeleton className="skel-line skel-sm" style={{ width: 140 }} /></td>
      <td><Skeleton className="skel-line skel-md" style={{ width: 220 }} /></td>
      <td><Skeleton className="skel-line skel-md" style={{ width: 260 }} /></td>
      <td><Skeleton className="skel-line skel-sm" style={{ width: 120 }} /></td>
      <td><Skeleton className="skel-line skel-sm" style={{ width: 120 }} /></td>
      <td><Skeleton className="skel-line skel-sm" style={{ width: 100 }} /></td>
      <td><Skeleton className="skel-pill" style={{ width: 90, height: 26 }} /></td>
      <td className="rp-actions">
        <Skeleton className="skel-pill" style={{ width: 56, height: 28 }} />
        <Skeleton className="skel-pill" style={{ width: 56, height: 28 }} />
        <Skeleton className="skel-pill" style={{ width: 56, height: 28 }} />
      </td>
    </tr>
  );
}

function ReportsSkeleton() {
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
              <Skeleton className="skel-input" style={{ width: 170, height: 42 }} />
            </div>
          </div>

          <div className="rp-card">
            <table className="rp-table">
              <thead>
                <tr>
                  <th><Skeleton className="skel-line skel-sm" style={{ width: 90 }} /></th>
                  <th><Skeleton className="skel-line skel-sm" style={{ width: 80 }} /></th>
                  <th><Skeleton className="skel-line skel-sm" style={{ width: 120 }} /></th>
                  <th><Skeleton className="skel-line skel-sm" style={{ width: 70 }} /></th>
                  <th><Skeleton className="skel-line skel-sm" style={{ width: 70 }} /></th>
                  <th><Skeleton className="skel-line skel-sm" style={{ width: 50 }} /></th>
                  <th><Skeleton className="skel-line skel-sm" style={{ width: 60 }} /></th>
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

function getCaseNo(r) {
  return r?.case_no || r?.incident?.case_no || "";
}

function showVal(v) {
  if (v === NA) return "N/A";
  if (v === null) return "null";
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
    return r.patient;
  }

  const first =
    r.first_name ??
    r.patient_first_name ??
    r.patientFirstName ??
    r.patient_first ??
    "";

  const middle =
    r.middle_name ??
    r.patient_middle_name ??
    r.patientMiddleName ??
    "";

  const last =
    r.last_name ??
    r.patient_last_name ??
    r.patientLastName ??
    r.patient_last ??
    "";

  const sex = r.sex ?? r.patient_sex ?? "";
  const weight = r.weight ?? r.patient_weight ?? "";
  const contact = r.contact_number ?? r.patient_contact_number ?? "";
  const address = r.address ?? r.patient_address ?? "";
  const chief = r.chief_complaint ?? r.patient_chief_complaint ?? "";
  const assessment = r.assessment ?? r.patient_assessment ?? "";

  return {
    first_name: first,
    middle_name: middle,
    last_name: last,
    sex,
    weight,
    contact_number: contact,
    address,
    chief_complaint: chief,
    assessment,
  };
}

function formatNameFromReport(r) {
  if (!r) return "";

  if (r.patient_name && String(r.patient_name).trim()) {
    return String(r.patient_name).trim();
  }

  const p = getPatientObj(r);
  if (!p) return "";

  return [p.first_name, p.middle_name, p.last_name]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function getChiefComplaintFromReport(r) {
  if (!r) return "";
  if (r.chief_complaint && String(r.chief_complaint).trim()) {
    return String(r.chief_complaint).trim();
  }
  const p = getPatientObj(r);
  return p?.chief_complaint || "";
}

function StatusBadge({ status }) {
  const s = String(status || "draft").toLowerCase();
  return <span className={`rp-badge rp-badge-${s}`}>{s}</span>;
}

function KeyValue({ label, value }) {
  return (
    <div className="rp-kv">
      <div className="rp-k">{label}</div>
      <div className="rp-v">{showVal(value)}</div>
    </div>
  );
}

function InputKV({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="rp-kv">
      <div className="rp-k">{label}</div>
      <div className="rp-v">
        <input
          className="rp-input"
          type={type}
          value={value === undefined || value === null ? "" : value}
          placeholder={placeholder || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function SelectKV({ label, value, onChange, options }) {
  const optionStyle = {
    color: "#0f172a",
    backgroundColor: "#ffffff",
  };

  return (
    <div className="rp-kv">
      <div className="rp-k">{label}</div>
      <div className="rp-v">
        <select
          className="rp-input rp-select"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((o) =>
            typeof o === "string" ? (
              <option key={o} value={o} style={optionStyle}>
                {o === NA ? "N/A" : o}
              </option>
            ) : (
              <option key={o.value} value={o.value} style={optionStyle}>
                {o.label}
              </option>
            )
          )}
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
      resp_rate: v?.resp_rate ?? "",
      resp_quality: v?.resp_quality ?? "",
      temperature_value: v?.temperature_value ?? "",
      temperature_state: v?.temperature_state ?? "",
      spo2: v?.spo2 ?? "",
      skin_color: v?.skin_color ?? "",
      pupils: v?.pupils ?? "",
      cap_refill: v?.cap_refill ?? "",
      location: v?.location ?? "",
    }))
    .map((v) => cleanObject(v));
}

function buildReportPatchPayload(selected) {
  const inc = safeObj(selected?.incident);
  const p = safeObj(getPatientObj(selected));

  const payload = {
    status: selected?.status ?? "draft",
    date: normalizeDateForDRF(selected?.date),

    ambulance_body_no: selected?.ambulance_body_no ?? "",
    call_no: selected?.call_no ?? inc.call_no ?? "",

    first_name: p.first_name ?? "",
    middle_name: p.middle_name ?? "",
    last_name: p.last_name ?? "",
    sex: p.sex ?? "",
    weight: p.weight ?? "",
    contact_number: p.contact_number ?? "",
    address: p.address ?? "",
    chief_complaint: p.chief_complaint ?? "",
    assessment: p.assessment ?? "",

    patient_location: selected?.patient_location ?? inc.patient_location ?? "",
    transported_to: selected?.transported_to ?? inc.transported_to ?? "",

    doi: normalizeDateForDRF(inc.doi ?? selected?.doi),
    toi: normalizeTimeForDRF(inc.toi ?? selected?.toi),

    poi: inc.poi ?? selected?.poi ?? "",
    moi: selected?.moi ?? inc.moi ?? "",

    call_received_time: inc.call_received_time ?? null,
    responded_time: inc.responded_time ?? null,
    arrived_scene_time: inc.arrived_scene_time ?? null,
    left_scene_time: inc.left_scene_time ?? null,
    arrived_hospital_time: inc.arrived_hospital_time ?? null,
    back_in_service_time: inc.back_in_service_time ?? null,

    intervention_notes: inc.intervention_notes ?? "",

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

export default function Reports() {
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
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("view");
  const isEdit = mode === "edit";
  const [modalLoading, setModalLoading] = useState(false);

  const [newAttachment, setNewAttachment] = useState(null);
  const [newAttachmentPreview, setNewAttachmentPreview] = useState(null);

  const onPickNewAttachment = (file) => {
    setNewAttachment(file || null);
    if (!file) {
      setNewAttachmentPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setNewAttachmentPreview(url);
  };

  useEffect(() => {
    return () => {
      if (newAttachmentPreview) URL.revokeObjectURL(newAttachmentPreview);
    };
  }, [newAttachmentPreview]);

  const pdfRef = useRef(null);
  const [pdfBusy, setPdfBusy] = useState(false);

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
          setError(e?.message || "Failed to load reports.");
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
    if (selected) {
      const body = document.querySelector(".rp-modal-body");
      if (body) body.scrollTop = 0;
    }
  }, [selected, mode]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    return (reports || []).filter((r) => {
      const matchStatus =
        status === "all" ? true : String(r.status || "").toLowerCase() === status;

      const caseNoDisplay = String(getCaseNo(r)).toLowerCase();
      const patientName = String(formatNameFromReport(r)).toLowerCase();

      const caseNo = String(r.case_no || r.incident?.case_no || "").toLowerCase();
      const callNo = String(r.call_no || r.incident?.call_no || "").toLowerCase();
      const amb = String(r.ambulance_body_no || "").toLowerCase();

      const chief = String(getChiefComplaintFromReport(r) || "").toLowerCase();

      const pObj = safeObj(getPatientObj(r));
      const assessment = String(pObj.assessment || "").toLowerCase();

      const matchSearch =
        !s ||
        caseNoDisplay.includes(s) ||
        patientName.includes(s) ||
        caseNo.includes(s) ||
        callNo.includes(s) ||
        amb.includes(s) ||
        chief.includes(s) ||
        assessment.includes(s);

      return matchStatus && matchSearch;
    });
  }, [reports, search, status]);

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

  const openModal = async (report, nextMode) => {
    setMode(nextMode);
    setModalLoading(true);
    setSelected({ id: report.id });

    setNewAttachment(null);
    setNewAttachmentPreview(null);

    try {
      const full = await fetchReportDetail(report.id);
      setSelected(full || report);
    } catch (e) {
      console.error(e);
      setSelected(report);
      showToast("error", e?.message || "Failed to load full report.");
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setModalLoading(false);
    setNewAttachment(null);
    setNewAttachmentPreview(null);
  };

  const updateSelected = (key, value) => {
    setSelected((prev) => ({ ...prev, [key]: value }));
  };

  const updatePatient = (key, value) => {
    setSelected((prev) => {
      const hasNested = prev?.patient && typeof prev.patient === "object";
      if (hasNested) return { ...prev, patient: { ...prev.patient, [key]: value } };

      const map = {
        first_name: "first_name",
        middle_name: "middle_name",
        last_name: "last_name",
        address: "address",
        sex: "sex",
        weight: "weight",
        contact_number: "contact_number",
        chief_complaint: "chief_complaint",
        assessment: "assessment",
      };
      return { ...prev, [map[key] || key]: value };
    });
  };

  const updateIncident = (key, value) => {
    setSelected((prev) => {
      const hasNested = prev?.incident && typeof prev.incident === "object";
      const next = { ...prev };

      if (hasNested) {
        next.incident = { ...prev.incident, [key]: value };
      } else {
        next[key] = value;
      }

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
        ].includes(key)
      ) {
        next[key] = value;
      }

      return next;
    });
  };

  const updateVitals = (idx, key, value) => {
    setSelected((prev) => {
      const arr = safeArr(prev?.vitals);
      const next = arr.map((v, i) => (i === idx ? { ...v, [key]: value } : v));
      return { ...prev, vitals: next };
    });
  };

  const addVitalsRow = () => {
    setSelected((prev) => {
      const arr = safeArr(prev?.vitals);
      return {
        ...prev,
        vitals: [
          ...arr,
          {
            time: "",
            bp: "",
            pulse_rate: "",
            resp_rate: "",
            resp_quality: NA,
            temperature_value: "",
            temperature_state: NA,
            spo2: "",
            skin_color: NA,
            pupils: NA,
            cap_refill: NA,
            location: "",
          },
        ],
      };
    });
  };

  const removeVitalsRow = (idx) => {
    setSelected((prev) => {
      const arr = safeArr(prev?.vitals);
      if (arr.length <= 1) return prev;
      return { ...prev, vitals: arr.filter((_, i) => i !== idx) };
    });
  };

  const updateGcs = (key, value) => {
    setSelected((prev) => ({ ...prev, gcs: { ...safeObj(prev?.gcs), [key]: value } }));
  };

  const updateApgar = (key, value) => {
    setSelected((prev) => ({ ...prev, apgar: { ...safeObj(prev?.apgar), [key]: value } }));
  };

  const updateNonTransport = (key, value) => {
    setSelected((prev) => ({
      ...prev,
      non_transport: { ...safeObj(prev?.non_transport), [key]: value },
    }));
  };

  const updateBelongings = (key, value) => {
    setSelected((prev) => ({
      ...prev,
      belongings: { ...safeObj(prev?.belongings), [key]: value },
    }));
  };

  const updateCrew = (key, value) => {
    setSelected((prev) => ({ ...prev, ems_crew: { ...safeObj(prev?.ems_crew), [key]: value } }));
  };

  const updateReceiving = (value) => {
    setSelected((prev) => ({
      ...prev,
      receiving_physician_nod: {
        ...(safeObj(prev?.receiving_physician_nod) || {}),
        physician_nod: value,
      },
    }));
  };

  const saveEdit = async () => {
    if (!selected?.id) return;

    const ok = await askConfirm({
      title: "Save changes?",
      message: "Do you want to save changes to this report?",
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
              : JSON.stringify(attachmentData)) || `Failed to upload attachment: ${attachRes.status}`
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
      title: "Delete report?",
      message: "This action cannot be undone. Delete this report?",
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

    pdf.setDrawColor(210, 214, 220);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, y, w, h, 2, 2, "FD");

    const pad = 3.5;
    const topRowH = 20;
    const stripGap = 1.4;
    const stripY = y + topRowH + stripGap;
    const stripH = h - (topRowH + stripGap + 1.0);

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

    const createOffscreenClone = () => {
      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-100000px";
      wrapper.style.top = "0";
      wrapper.style.width = `${originalPaper.offsetWidth}px`;
      wrapper.style.zIndex = "-1";
      wrapper.style.pointerEvents = "none";
      wrapper.style.opacity = "1";
      wrapper.style.background = "#ffffff";

      const clone = originalPaper.cloneNode(true);
      clone.classList.add("rp-printing", "rp-pdf-mode");
      clone.style.width = `${originalPaper.offsetWidth}px`;
      clone.style.maxWidth = "none";
      clone.style.height = "auto";
      clone.style.minHeight = "0";
      clone.style.maxHeight = "none";
      clone.style.overflow = "visible";
      clone.style.margin = "0";
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

      const trimmedHeight = Math.max(1, lastNonWhiteRow + 6);
      if (trimmedHeight >= height) return srcCanvas;

      const trimmed = document.createElement("canvas");
      trimmed.width = width;
      trimmed.height = trimmedHeight;

      const tctx = trimmed.getContext("2d");
      if (!tctx) return srcCanvas;

      tctx.drawImage(srcCanvas, 0, 0, width, trimmedHeight, 0, 0, width, trimmedHeight);
      return trimmed;
    };

    try {
      setPdfBusy(true);

      const { wrapper, clone } = createOffscreenClone();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const marginX = 8;
      const marginTop = 8;
      const marginBottom = 8;
      const printableWidth = pageWidth - marginX * 2;

      const firstHeaderHeight = 34;
      const firstBodyTopY = marginTop + firstHeaderHeight + 2.5;
      const nextBodyTopY = marginTop;
      const gapMm = 2.5;

      const sections = Array.from(clone.querySelectorAll(".rp-section")).filter(
        (section) => !section.classList.contains("rp-pdf-hide")
      );

      let firstPage = true;
      let yCursor = 0;
      let hasPrintedAnything = false;

      const startNewPage = async () => {
        if (hasPrintedAnything) {
          pdf.addPage();
        }
        if (firstPage) {
          await drawPdfHeader(pdf, marginX, marginTop, printableWidth, firstHeaderHeight);
        }
        yCursor = firstPage ? firstBodyTopY : nextBodyTopY;
        firstPage = false;
        hasPrintedAnything = true;
      };

      for (const section of sections) {
        const canvas = await html2canvas(section, {
          scale: SCALE,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
        });

        const trimmedCanvas = trimCanvasBottom(canvas);
        const imgWidthPx = trimmedCanvas.width;
        const imgHeightPx = trimmedCanvas.height;

        if (!imgWidthPx || !imgHeightPx) continue;

        const sectionHeightMm = (imgHeightPx * printableWidth) / imgWidthPx;

        if (!hasPrintedAnything) {
          await startNewPage();
        }

        const currentMaxY = pageHeight - marginBottom;
        const remainingMm = currentMaxY - yCursor;

        if (sectionHeightMm > remainingMm && yCursor > (firstPage ? firstBodyTopY : nextBodyTopY)) {
          await startNewPage();
        }

        const drawRemainingMm = (pageHeight - marginBottom) - yCursor;

        if (sectionHeightMm <= drawRemainingMm) {
          const imgData = trimmedCanvas.toDataURL("image/png");
          pdf.addImage(imgData, "PNG", marginX, yCursor, printableWidth, sectionHeightMm);
          yCursor += sectionHeightMm + gapMm;
          continue;
        }

        let offsetPx = 0;
        const pxPerMm = imgHeightPx / sectionHeightMm;

        while (offsetPx < imgHeightPx) {
          const availableMm = (pageHeight - marginBottom) - yCursor;
          const sliceHeightPx = Math.floor(availableMm * pxPerMm);

          if (sliceHeightPx < 20) {
            await startNewPage();
            continue;
          }

          const actualSlicePx = Math.min(sliceHeightPx, imgHeightPx - offsetPx);

          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = imgWidthPx;
          sliceCanvas.height = actualSlicePx;

          const sctx = sliceCanvas.getContext("2d");
          if (!sctx) break;

          sctx.drawImage(
            trimmedCanvas,
            0,
            offsetPx,
            imgWidthPx,
            actualSlicePx,
            0,
            0,
            imgWidthPx,
            actualSlicePx
          );

          const sliceMm = (actualSlicePx * printableWidth) / imgWidthPx;
          const sliceData = sliceCanvas.toDataURL("image/png");

          pdf.addImage(sliceData, "PNG", marginX, yCursor, printableWidth, sliceMm);

          offsetPx += actualSlicePx;

          if (offsetPx < imgHeightPx) {
            await startNewPage();
          } else {
            yCursor += sliceMm + gapMm;
          }
        }
      }

      document.body.removeChild(wrapper);

      if (!hasPrintedAnything) {
        showToast("error", "Nothing to export.");
        return;
      }

      pdf.save(`${getCaseNo(selected) || "case-report"}.pdf`);
    } catch (e) {
      console.error(e);
      showToast("error", "PDF export failed. Check console.");
    } finally {
      setPdfBusy(false);
    }
  };

  if (loading) return <ReportsSkeleton />;

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
              <div className="rp-crumbs">Reports</div>
              <h2 className="rp-title">Reports</h2>
              <p className="rp-subtitle">Search, filter, review, and export patient care reports.</p>
            </div>

            <div className="rp-filters">
              <input
                className="rp-input"
                placeholder="Search case no., patient, call no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className="rp-input rp-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ maxWidth: 170 }}
              >
                <option
                  value="all"
                  style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
                >
                  All Status
                </option>
                {STATUS_OPTIONS.map((s) => (
                  <option
                    key={s}
                    value={s}
                    style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
                  >
                    {s}
                  </option>
                ))}
              </select>
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
                    <th>Chief Complaint</th>
                    <th>Call No.</th>
                    <th>Ambulance</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="rp-th-actions">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="rp-empty">No reports found.</td>
                    </tr>
                  ) : (
                    filtered.map((r) => {
                      const patientName = formatNameFromReport(r);
                      const chiefComplaint = getChiefComplaintFromReport(r);

                      return (
                        <tr key={r.id}>
                          <td className="rp-mono">{getCaseNo(r) || "—"}</td>
                          <td>{patientName || "—"}</td>
                          <td className="rp-complaint">{chiefComplaint || "—"}</td>
                          <td className="rp-mono">{r.call_no || r.incident?.call_no || "—"}</td>
                          <td className="rp-mono">{r.ambulance_body_no || "—"}</td>
                          <td>{formatDateTimeReadable(r.date || r.created_at || r.call_received_time) || "—"}</td>
                          <td><StatusBadge status={r.status} /></td>
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
              Showing <b>{filtered.length}</b> report{filtered.length !== 1 ? "s" : ""}
              {status !== "all" ? (
                <>
                  {" "}with status <b>{status}</b>
                </>
              ) : null}
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
                <Skeleton className="skel-block" style={{ width: "100%", height: 160, borderRadius: 14 }} />
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

          const receivingObj =
            safeObj(selected?.receiving_physician_nod) ||
            safeObj(safeArr(selected?.receiving_physician_nod)?.[0]);

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
                      Case {getCaseNo(selected) || "—"} ({isEdit ? "Edit" : "View"})
                    </h3>
                    <div className="rp-modal-sub">
                      Patient: <strong>{formatNameFromReport(selected) || "—"}</strong>
                    </div>
                  </div>

                  <button className="rp-xbtn" onClick={closeModal} aria-label="Close">✕</button>
                </div>

                <div className="rp-modal-body" ref={pdfRef}>
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
                            accept="image/*"
                            onChange={(e) => onPickNewAttachment(e.target.files?.[0])}
                          />

                          {newAttachmentPreview ? (
                            <div style={{ marginTop: 12 }}>
                              <div className="rp-attachment-label">New Image Preview</div>
                              <img
                                src={newAttachmentPreview}
                                alt="New preview"
                                className="rp-attachment-image"
                              />

                              <div style={{ marginTop: 10 }}>
                                <button
                                  type="button"
                                  className="btn btn-soft"
                                  onClick={() => {
                                    setNewAttachment(null);
                                    setNewAttachmentPreview(null);
                                  }}
                                  disabled={savingEdit}
                                >
                                  Remove Selected Image
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="rp-section">
                      <div className="rp-section-head">
                        <h4 className="rp-section-title">Report Info</h4>
                      </div>

                      <div className="rp-modal-grid">
                        <div className="rp-modal-col">
                          <KeyValue label="Case No." value={getCaseNo(selected) || "—"} />

                          {isEdit ? (
                            <>
                              <SelectKV
                                label="Status"
                                value={String(selected.status || "draft")}
                                onChange={(v) => updateSelected("status", v)}
                                options={STATUS_OPTIONS}
                              />
                              <InputKV
                                label="Date"
                                type="date"
                                value={toDateInputValue(selected.date ?? "")}
                                onChange={(v) => updateSelected("date", fromDateInputToISO(v))}
                              />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Status" value={selected.status} />
                              <KeyValue
                                label="Date"
                                value={formatDateTimeReadable(
                                  selected.date || selected.created_at || selected.call_received_time
                                )}
                              />
                            </>
                          )}
                        </div>

                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              <InputKV
                                label="Ambulance Body No."
                                value={selected.ambulance_body_no ?? ""}
                                onChange={(v) => updateSelected("ambulance_body_no", v)}
                              />
                              <InputKV
                                label="Call No."
                                value={selected.call_no ?? inc.call_no ?? ""}
                                onChange={(v) => updateSelected("call_no", v)}
                              />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Ambulance Body No." value={selected.ambulance_body_no} />
                              <KeyValue label="Call No." value={selected.call_no || inc.call_no} />
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
                                label="First Name"
                                value={p.first_name}
                                onChange={(v) => updatePatient("first_name", v)}
                              />
                              <InputKV
                                label="Middle Name"
                                value={p.middle_name}
                                onChange={(v) => updatePatient("middle_name", v)}
                              />
                              <InputKV
                                label="Last Name"
                                value={p.last_name}
                                onChange={(v) => updatePatient("last_name", v)}
                              />
                            </>
                          ) : (
                            <>
                              <KeyValue label="First Name" value={p.first_name} />
                              <KeyValue label="Middle Name" value={p.middle_name} />
                              <KeyValue label="Last Name" value={p.last_name} />
                            </>
                          )}
                        </div>

                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              <InputKV
                                label="Sex"
                                value={p.sex}
                                onChange={(v) => updatePatient("sex", v)}
                              />
                              <TextareaKV
                                label="Address"
                                value={p.address}
                                onChange={(v) => updatePatient("address", v)}
                              />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Sex" value={p.sex} />
                              <KeyValue label="Address" value={p.address} />
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        {isEdit ? (
                          <>
                            <TextareaKV
                              label="Chief Complaint"
                              value={p.chief_complaint}
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
                                value={selected.patient_location ?? inc.patient_location ?? ""}
                                onChange={(v) => updateIncident("patient_location", v)}
                              />

                              <TextareaKV
                                label="Transported To"
                                value={selected.transported_to ?? inc.transported_to ?? ""}
                                onChange={(v) => updateIncident("transported_to", v)}
                              />

                              <InputKV
                                label="DOI"
                                type="date"
                                value={toDateInputValue(inc.doi ?? selected.doi ?? "")}
                                onChange={(v) => updateIncident("doi", fromDateInputToISO(v))}
                              />

                              <InputKV
                                label="TOI"
                                type="time"
                                value={normalizeTimeForDRF(inc.toi ?? selected.toi ?? "") || ""}
                                onChange={(v) => updateIncident("toi", v)}
                              />

                              <InputKV
                                label="POI"
                                value={inc.poi ?? selected.poi ?? ""}
                                onChange={(v) => updateIncident("poi", v)}
                              />

                              <InputKV
                                label="MOI"
                                value={selected.moi ?? inc.moi ?? ""}
                                onChange={(v) => updateIncident("moi", v)}
                              />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Patient Location" value={selected.patient_location || inc.patient_location} />
                              <KeyValue label="Transported To" value={selected.transported_to || inc.transported_to} />
                              <KeyValue label="DOI" value={formatDateReadable(inc.doi || selected.doi)} />
                              <KeyValue label="TOI" value={normalizeTimeForDRF(inc.toi || selected.toi) || ""} />
                              <KeyValue label="POI" value={inc.poi || selected.poi} />
                              <KeyValue label="MOI" value={selected.moi || inc.moi} />
                            </>
                          )}
                        </div>

                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              <InputKV
                                label="Call Received Time"
                                type="datetime-local"
                                value={toDateTimeLocalValue(inc.call_received_time ?? "")}
                                onChange={(v) => updateIncident("call_received_time", fromDateTimeLocalToISO(v))}
                              />
                              <InputKV
                                label="Responded Time"
                                type="datetime-local"
                                value={toDateTimeLocalValue(inc.responded_time ?? "")}
                                onChange={(v) => updateIncident("responded_time", fromDateTimeLocalToISO(v))}
                              />
                              <InputKV
                                label="Arrived Scene Time"
                                type="datetime-local"
                                value={toDateTimeLocalValue(inc.arrived_scene_time ?? "")}
                                onChange={(v) => updateIncident("arrived_scene_time", fromDateTimeLocalToISO(v))}
                              />
                              <InputKV
                                label="Left Scene Time"
                                type="datetime-local"
                                value={toDateTimeLocalValue(inc.left_scene_time ?? "")}
                                onChange={(v) => updateIncident("left_scene_time", fromDateTimeLocalToISO(v))}
                              />
                              <InputKV
                                label="Arrived Hospital Time"
                                type="datetime-local"
                                value={toDateTimeLocalValue(inc.arrived_hospital_time ?? "")}
                                onChange={(v) => updateIncident("arrived_hospital_time", fromDateTimeLocalToISO(v))}
                              />
                              <InputKV
                                label="Back In Service Time"
                                type="datetime-local"
                                value={toDateTimeLocalValue(inc.back_in_service_time ?? "")}
                                onChange={(v) => updateIncident("back_in_service_time", fromDateTimeLocalToISO(v))}
                              />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Call Received Time" value={formatDateTimeReadable(inc.call_received_time)} />
                              <KeyValue label="Responded Time" value={formatDateTimeReadable(inc.responded_time)} />
                              <KeyValue label="Arrived Scene Time" value={formatDateTimeReadable(inc.arrived_scene_time)} />
                              <KeyValue label="Left Scene Time" value={formatDateTimeReadable(inc.left_scene_time)} />
                              <KeyValue label="Arrived Hospital Time" value={formatDateTimeReadable(inc.arrived_hospital_time)} />
                              <KeyValue label="Back In Service Time" value={formatDateTimeReadable(inc.back_in_service_time)} />
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        {isEdit ? (
                          <TextareaKV
                            label="Intervention Notes"
                            value={inc.intervention_notes ?? ""}
                            onChange={(v) => updateIncident("intervention_notes", v)}
                          />
                        ) : (
                          <KeyValue label="Intervention Notes" value={inc.intervention_notes} />
                        )}
                      </div>
                    </div>

                    <div className="rp-section">
                      <div className="rp-section-head" style={{ justifyContent: "space-between" }}>
                        <h4 className="rp-section-title">Vitals</h4>
                        {isEdit ? (
                          <button type="button" className="btn btn-soft" onClick={addVitalsRow} disabled={savingEdit}>
                            + Add Vitals
                          </button>
                        ) : null}
                      </div>

                      {vitals.length > 0 ? (
                        vitals.map((v, idx) => (
                          <div
                            key={idx}
                            style={{
                              marginBottom: 14,
                              paddingBottom: 14,
                              borderBottom: "1px solid rgba(15,23,42,0.08)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 10,
                              }}
                            >
                              <div style={{ fontWeight: 900 }}>Vitals Entry #{idx + 1}</div>
                              {isEdit ? (
                                <button
                                  type="button"
                                  className="btn btn-soft"
                                  onClick={() => removeVitalsRow(idx)}
                                  disabled={vitals.length <= 1 || savingEdit}
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>

                            <div className="rp-modal-grid">
                              <div className="rp-modal-col">
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
                                      placeholder="120/80"
                                    />
                                    <InputKV
                                      label="Pulse Rate"
                                      value={v.pulse_rate ?? ""}
                                      onChange={(val) => updateVitals(idx, "pulse_rate", val)}
                                    />
                                    <InputKV
                                      label="Resp Rate"
                                      value={v.resp_rate ?? ""}
                                      onChange={(val) => updateVitals(idx, "resp_rate", val)}
                                    />
                                    <InputKV
                                      label="Resp Quality"
                                      value={v.resp_quality ?? ""}
                                      onChange={(val) => updateVitals(idx, "resp_quality", val)}
                                      placeholder="normal / na"
                                    />
                                    <InputKV
                                      label="Temperature Value"
                                      value={v.temperature_value ?? ""}
                                      onChange={(val) => updateVitals(idx, "temperature_value", val)}
                                      placeholder="°C"
                                    />
                                  </>
                                ) : (
                                  <>
                                    <KeyValue label="Time" value={formatDateTimeReadable(v.time)} />
                                    <KeyValue label="BP" value={v.bp} />
                                    <KeyValue label="Pulse Rate" value={v.pulse_rate} />
                                    <KeyValue label="Resp Rate" value={v.resp_rate} />
                                    <KeyValue label="Resp Quality" value={v.resp_quality} />
                                    <KeyValue label="Temperature Value" value={v.temperature_value} />
                                  </>
                                )}
                              </div>

                              <div className="rp-modal-col">
                                {isEdit ? (
                                  <>
                                    <InputKV
                                      label="Temperature State"
                                      value={v.temperature_state ?? ""}
                                      onChange={(val) => updateVitals(idx, "temperature_state", val)}
                                      placeholder="normal / na"
                                    />
                                    <InputKV
                                      label="SpO2"
                                      value={v.spo2 ?? ""}
                                      onChange={(val) => updateVitals(idx, "spo2", val)}
                                      placeholder="%"
                                    />
                                    <InputKV
                                      label="Skin Color"
                                      value={v.skin_color ?? ""}
                                      onChange={(val) => updateVitals(idx, "skin_color", val)}
                                      placeholder="normal / na"
                                    />
                                    <InputKV
                                      label="Pupils"
                                      value={v.pupils ?? ""}
                                      onChange={(val) => updateVitals(idx, "pupils", val)}
                                      placeholder="normal / na"
                                    />
                                    <InputKV
                                      label="Cap Refill"
                                      value={v.cap_refill ?? ""}
                                      onChange={(val) => updateVitals(idx, "cap_refill", val)}
                                      placeholder="normal / na"
                                    />
                                    <InputKV
                                      label="Location"
                                      value={v.location ?? ""}
                                      onChange={(val) => updateVitals(idx, "location", val)}
                                      placeholder="Scene / En route / ER"
                                    />
                                  </>
                                ) : (
                                  <>
                                    <KeyValue label="Temperature State" value={v.temperature_state} />
                                    <KeyValue label="SpO2" value={v.spo2} />
                                    <KeyValue label="Skin Color" value={v.skin_color} />
                                    <KeyValue label="Pupils" value={v.pupils} />
                                    <KeyValue label="Cap Refill" value={v.cap_refill} />
                                    <KeyValue label="Location" value={v.location} />
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rp-empty" style={{ padding: 12 }}>No vitals.</div>
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
                              <InputKV label="Eye Score" value={gcs.eye_score ?? ""} onChange={(v) => updateGcs("eye_score", v)} />
                              <InputKV label="Verbal Score" value={gcs.verbal_score ?? ""} onChange={(v) => updateGcs("verbal_score", v)} />
                              <InputKV label="Motor Score" value={gcs.motor_score ?? ""} onChange={(v) => updateGcs("motor_score", v)} />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Eye Score" value={gcs.eye_score} />
                              <KeyValue label="Verbal Score" value={gcs.verbal_score} />
                              <KeyValue label="Motor Score" value={gcs.motor_score} />
                            </>
                          )}
                        </div>

                        <div className="rp-modal-col">
                          {isEdit ? (
                            <InputKV label="Total Score" value={gcs.total_score ?? ""} onChange={(v) => updateGcs("total_score", v)} />
                          ) : (
                            <KeyValue label="Total Score" value={gcs.total_score} />
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
                              <InputKV label="Appearance" value={apgar.appearance ?? ""} onChange={(v) => updateApgar("appearance", v)} />
                              <InputKV label="Pulse" value={apgar.pulse ?? ""} onChange={(v) => updateApgar("pulse", v)} />
                              <InputKV label="Grimace" value={apgar.grimace ?? ""} onChange={(v) => updateApgar("grimace", v)} />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Appearance" value={apgar.appearance} />
                              <KeyValue label="Pulse" value={apgar.pulse} />
                              <KeyValue label="Grimace" value={apgar.grimace} />
                            </>
                          )}
                        </div>

                        <div className="rp-modal-col">
                          {isEdit ? (
                            <>
                              <InputKV label="Activity" value={apgar.activity ?? ""} onChange={(v) => updateApgar("activity", v)} />
                              <InputKV label="Respiration" value={apgar.respiration ?? ""} onChange={(v) => updateApgar("respiration", v)} />
                              <InputKV label="Total Score" value={apgar.total_score ?? ""} onChange={(v) => updateApgar("total_score", v)} />
                            </>
                          ) : (
                            <>
                              <KeyValue label="Activity" value={apgar.activity} />
                              <KeyValue label="Respiration" value={apgar.respiration} />
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
                        <InputKV
                          label="Reason"
                          value={nonTransport.reason ?? ""}
                          onChange={(v) => updateNonTransport("reason", v)}
                        />
                      ) : (
                        <KeyValue label="Reason" value={nonTransport.reason} />
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
                              <InputKV
                                label="Turned Over To"
                                value={belongings.turned_over_to ?? ""}
                                onChange={(v) => updateBelongings("turned_over_to", v)}
                              />
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
                              <InputKV
                                label="Received By"
                                value={belongings.received_by ?? ""}
                                onChange={(v) => updateBelongings("received_by", v)}
                              />
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
                              <InputKV
                                label="EMS In Charge"
                                value={crew.ems_in_charge ?? ""}
                                onChange={(v) => updateCrew("ems_in_charge", v)}
                              />
                              <InputKV
                                label="EMS Assistant 1"
                                value={crew.ems_assistant_1 ?? ""}
                                onChange={(v) => updateCrew("ems_assistant_1", v)}
                              />
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
                              <InputKV
                                label="EMS Assistant 2"
                                value={crew.ems_assistant_2 ?? ""}
                                onChange={(v) => updateCrew("ems_assistant_2", v)}
                              />
                              <InputKV
                                label="EMS Operator"
                                value={crew.ems_operator ?? ""}
                                onChange={(v) => updateCrew("ems_operator", v)}
                              />
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
                          value={receivingObj?.physician_nod ?? ""}
                          onChange={(v) => updateReceiving(v)}
                        />
                      ) : (
                        <KeyValue label="Physician / NOD" value={receivingObj?.physician_nod} />
                      )}
                    </div>
                  </div>
                </div>

                <div className="rp-modal-actions">
                  <button className="btn btn-soft" type="button" onClick={exportPDF} disabled={pdfBusy}>
                    {pdfBusy ? "Generating PDF..." : "PDF"}
                  </button>

                  {isEdit ? (
                    <>
                      <button className="btn btn-soft" type="button" onClick={() => setMode("view")} disabled={savingEdit}>
                        Cancel Edit
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