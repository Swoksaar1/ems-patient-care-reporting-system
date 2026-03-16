import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import "./NewReport.css";

import { fetchWithAuth, clearAuth } from "../../auth";
import Toast from "../ui/Toast";

const RESP_QUALITY = ["normal", "shallow", "labored", "clear", "diminished", "rales", "wheeze"];
const TEMP_STATE = ["normal", "warm", "hot", "cool", "cold"];
const SKIN_COLOR = ["normal", "pale", "flushed", "jaundiced", "cyanotic"];
const PUPILS = ["normal", "unreactive", "dilated", "constricted"];
const CAP_REFILL = ["normal", "delayed", "absent"];

const LOC_OPTIONS = [
  { label: "Awake", value: "awake" },
  { label: "Verbal", value: "verbal" },
  { label: "Pain", value: "pain" },
  { label: "Unconscious", value: "unconscious" },
];

const GCS_EYE = [
  { label: "Spontaneously", value: "spontaneously", score: 4 },
  { label: "To verbal", value: "verbal", score: 3 },
  { label: "To pain", value: "pain", score: 2 },
  { label: "None", value: "none", score: 1 },
];

const GCS_VERBAL = [
  { label: "Oriented", value: "oriented", score: 5 },
  { label: "Confused", value: "confused", score: 4 },
  { label: "Inappropriate words", value: "inappropriate_words", score: 3 },
  { label: "Incomprehensible sounds", value: "incomprehensible_sounds", score: 2 },
  { label: "None", value: "none", score: 1 },
];

const GCS_MOTOR = [
  { label: "Obeys commands", value: "obeys", score: 6 },
  { label: "Localizes pain", value: "localize", score: 5 },
  { label: "Withdraws", value: "withdrawn", score: 4 },
  { label: "Flexion", value: "flexion", score: 3 },
  { label: "Extension", value: "extension", score: 2 },
  { label: "None", value: "none", score: 1 },
];

const APGAR_APPEARANCE = [
  { label: "Pink", value: "pink", score: 2 },
  { label: "Peripheral cyanosis only", value: "peripheral_cyanosis_only", score: 1 },
  { label: "Cyanotic / pale all over", value: "cyanotic_pale_all_over", score: 0 },
];

const APGAR_PULSE = [
  { label: "100–140", value: "100_140", score: 2 },
  { label: "< 100", value: "lt_100", score: 1 },
  { label: "0", value: "zero", score: 0 },
];

const APGAR_GRIMACE = [
  { label: "Cries when stimulated", value: "cry", score: 2 },
  { label: "Weak cry when stimulated", value: "weak_cry", score: 1 },
  { label: "No response", value: "none", score: 0 },
];

const APGAR_ACTIVITY = [
  { label: "Well flexed / resists extension", value: "well_flexed", score: 2 },
  { label: "Some flexion", value: "some_flexion", score: 1 },
  { label: "Floppy", value: "floppy", score: 0 },
];

const APGAR_RESP = [
  { label: "Strong cry", value: "strong_cry", score: 2 },
  { label: "Slow / irregular breathing", value: "slow_irregular", score: 1 },
  { label: "Apnoeic", value: "apnoeic", score: 0 },
];

const NON_TRANSPORT_REASONS = [
  "cancelled_before_arrival",
  "cancelled_after_arrival",
  "false_call",
  "patient_refusal_treatment",
  "patient_refusal_transport",
  "dead_on_arrival",
  "medical_clearance_not_granted",
];

const NA = "na";
const API_BASE = "http://127.0.0.1:8000";

function Skeleton({ className = "", style }) {
  return <div className={`skel ${className}`} style={style} aria-hidden="true" />;
}

function NewReportSkeleton() {
  return (
    <div className="nr-layout">
      <Sidebar />
      <div className="nr-main">
        <div className="nr-page">
          <div className="nr-head">
            <div style={{ width: "100%" }}>
              <Skeleton className="skel-line skel-sm" style={{ width: 120 }} />
              <Skeleton className="skel-line skel-lg" style={{ width: 360, marginTop: 10 }} />
              <Skeleton className="skel-line skel-md" style={{ width: 520, marginTop: 10 }} />
            </div>
          </div>

          <div className="nr-card">
            {[1, 2, 3, 4, 5].map((n) => (
              <div className="nr-section" key={n}>
                <div className="nr-section-head">
                  <div style={{ width: "100%" }}>
                    <Skeleton className="skel-line skel-md" style={{ width: 260 }} />
                    <Skeleton className="skel-line skel-sm" style={{ width: 420, marginTop: 10 }} />
                  </div>
                  <Skeleton className="skel-pill" />
                </div>

                <div className="nr-grid">
                  <div className="nr-field">
                    <Skeleton className="skel-line skel-xs" style={{ width: 110, marginBottom: 10 }} />
                    <Skeleton className="skel-input" />
                  </div>
                  <div className="nr-field">
                    <Skeleton className="skel-line skel-xs" style={{ width: 90, marginBottom: 10 }} />
                    <Skeleton className="skel-input" />
                  </div>
                  <div className="nr-field">
                    <Skeleton className="skel-line skel-xs" style={{ width: 130, marginBottom: 10 }} />
                    <Skeleton className="skel-input" />
                  </div>

                  <div className="nr-field nr-full">
                    <Skeleton className="skel-line skel-xs" style={{ width: 160, marginBottom: 10 }} />
                    <Skeleton className="skel-textarea" />
                  </div>

                  <div className="nr-field">
                    <Skeleton className="skel-line skel-xs" style={{ width: 80, marginBottom: 10 }} />
                    <Skeleton className="skel-input" />
                  </div>
                  <div className="nr-field">
                    <Skeleton className="skel-line skel-xs" style={{ width: 140, marginBottom: 10 }} />
                    <Skeleton className="skel-input" />
                  </div>
                </div>
              </div>
            ))}

            <div className="nr-actions">
              <Skeleton className="skel-btn skel-btn-wide" />
              <Skeleton className="skel-btn" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function toApiDateTime(val) {
  if (!val || val === NA) return null;

  if (typeof val === "string" && (val.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(val))) {
    return val;
  }

  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function readResponseBody(res) {
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await res.json().catch(() => ({}));
    return { kind: "json", data };
  }

  const text = await res.text().catch(() => "");
  try {
    const data = JSON.parse(text);
    return { kind: "json", data };
  } catch {
    return { kind: "text", data: text };
  }
}

function extractErrorMessage(body) {
  if (!body) return "Save failed";
  if (typeof body === "string") return body;
  if (body.detail) return String(body.detail);

  if (Array.isArray(body.non_field_errors) && body.non_field_errors[0]) {
    return String(body.non_field_errors[0]);
  }

  if (typeof body === "object") {
    const firstKey = Object.keys(body)[0];
    if (firstKey) {
      const v = body[firstKey];

      if (Array.isArray(v) && v[0]) {
        return `${firstKey}: ${v[0]}`;
      }

      if (v && typeof v === "object" && !Array.isArray(v)) {
        const nestedKey = Object.keys(v)[0];
        if (nestedKey) {
          const nestedVal = v[nestedKey];
          if (Array.isArray(nestedVal) && nestedVal[0]) {
            return `${firstKey}: ${nestedKey} - ${nestedVal[0]}`;
          }
          return `${firstKey}: ${nestedKey} - ${typeof nestedVal === "string" ? nestedVal : JSON.stringify(nestedVal)}`;
        }
      }

      return `${firstKey}: ${typeof v === "string" ? v : JSON.stringify(v)}`;
    }
  }

  return "Save failed";
}

async function saveReportMultipart({ payload, attachment }) {
  const form = new FormData();
  form.append("payload", JSON.stringify(payload));
  if (attachment) form.append("attachment", attachment);

  const res = await fetchWithAuth(
    `${API_BASE}/api/reports/`,
    {
      method: "POST",
      body: form,
    },
    API_BASE
  );

  const body = await readResponseBody(res);

  if (!res.ok) {
    console.error("SAVE FAILED:", {
      status: res.status,
      statusText: res.statusText,
      body,
    });

    if (res.status === 401) {
      clearAuth();
      throw new Error("Your session expired. Please log in again.");
    }

    const msg =
      body.kind === "json"
        ? extractErrorMessage(body.data)
        : body.data || `Save failed (${res.status})`;

    throw new Error(msg);
  }

  return body.kind === "json" ? body.data : body.data;
}

function NewReport() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  const [toast, setToast] = useState({
    open: false,
    type: "success",
    message: "",
  });

  const showToast = (type, message) => setToast({ open: true, type, message });
  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  const [saving, setSaving] = useState(false);
  const [generatedCaseNo, setGeneratedCaseNo] = useState("");

  const [patient, setPatient] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    address: "",
    sex: "male",
    chief_complaint: "",
    assessment: "",
  });

  const [incident, setIncident] = useState({
    ambulance_body_no: "",
    call_no: "",
    patient_location: "",
    transported_to: "",
    level_of_consciousness: "awake",
    doi: "",
    toi: "",
    poi: "",
    moi: "",
    call_received_time: "",
    responded_time: "",
    arrived_scene_time: "",
    left_scene_time: "",
    arrived_hospital_time: "",
    back_in_service_time: "",
    intervention_notes: "",
  });

  const [vitals, setVitals] = useState([
    {
      time: "",
      bp: "",
      pulse_rate: "",
      resp_rate: "",
      resp_quality: "normal",
      temperature_value: "",
      temperature_state: "normal",
      spo2: "",
      skin_color: "normal",
      pupils: "normal",
      cap_refill: "normal",
      location: "",
    },
  ]);

  const [gcsEnabled, setGcsEnabled] = useState(false);
  const [gcs, setGcs] = useState({
    eye_score: "spontaneously",
    verbal_score: "oriented",
    motor_score: "obeys",
  });

  const [apgarEnabled, setApgarEnabled] = useState(false);
  const [apgar, setApgar] = useState({
    appearance: "pink",
    pulse: "100_140",
    grimace: "cry",
    activity: "well_flexed",
    respiration: "strong_cry",
  });

  const [nonTransportEnabled, setNonTransportEnabled] = useState(false);
  const [nonTransport, setNonTransport] = useState({
    reason: "cancelled_before_arrival",
  });

  const [belongings, setBelongings] = useState({
    items: "",
    turned_over_to: "",
    received_by: "",
    notes: "",
  });

  const [emsCrew, setEmsCrew] = useState({
    ems_in_charge: "",
    ems_assistant_1: "",
    ems_assistant_2: "",
    ems_operator: "",
  });

  const [receiving, setReceiving] = useState({
    physician_nod: "",
  });

  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);

  const onPickAttachment = (file) => {
    setAttachment(file || null);

    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
    }

    if (!file) {
      setAttachmentPreview(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setAttachmentPreview(url);
  };

  useEffect(() => {
    return () => {
      if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    };
  }, [attachmentPreview]);

  const getScore = (list, value) => {
    if (!value || value === NA) return 0;
    return list.find((x) => x.value === value)?.score ?? 0;
  };

  const gcsTotal = useMemo(() => {
    return (
      getScore(GCS_EYE, gcs.eye_score) +
      getScore(GCS_VERBAL, gcs.verbal_score) +
      getScore(GCS_MOTOR, gcs.motor_score)
    );
  }, [gcs.eye_score, gcs.verbal_score, gcs.motor_score]);

  const apgarTotal = useMemo(() => {
    return (
      getScore(APGAR_APPEARANCE, apgar.appearance) +
      getScore(APGAR_PULSE, apgar.pulse) +
      getScore(APGAR_GRIMACE, apgar.grimace) +
      getScore(APGAR_ACTIVITY, apgar.activity) +
      getScore(APGAR_RESP, apgar.respiration)
    );
  }, [apgar.appearance, apgar.pulse, apgar.grimace, apgar.activity, apgar.respiration]);

  const updatePatient = (e) => setPatient({ ...patient, [e.target.name]: e.target.value });
  const updateIncident = (e) => setIncident({ ...incident, [e.target.name]: e.target.value });

  const updateVital = (idx, key, value) => {
    setVitals((prev) => prev.map((v, i) => (i === idx ? { ...v, [key]: value } : v)));
  };

  const addVitalRow = () => {
    setVitals((prev) => [
      ...prev,
      {
        time: "",
        bp: "",
        pulse_rate: "",
        resp_rate: "",
        resp_quality: "normal",
        temperature_value: "",
        temperature_state: "normal",
        spo2: "",
        skin_color: "normal",
        pupils: "normal",
        cap_refill: "normal",
        location: "",
      },
    ]);
  };

  const removeVitalRow = (idx) => {
    setVitals((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const resetForm = () => {
    setPatient({
      first_name: "",
      middle_name: "",
      last_name: "",
      address: "",
      sex: "male",
      chief_complaint: "",
      assessment: "",
    });

    setIncident({
      ambulance_body_no: "",
      call_no: "",
      patient_location: "",
      transported_to: "",
      level_of_consciousness: "awake",
      doi: "",
      toi: "",
      poi: "",
      moi: "",
      call_received_time: "",
      responded_time: "",
      arrived_scene_time: "",
      left_scene_time: "",
      arrived_hospital_time: "",
      back_in_service_time: "",
      intervention_notes: "",
    });

    setVitals([
      {
        time: "",
        bp: "",
        pulse_rate: "",
        resp_rate: "",
        resp_quality: "normal",
        temperature_value: "",
        temperature_state: "normal",
        spo2: "",
        skin_color: "normal",
        pupils: "normal",
        cap_refill: "normal",
        location: "",
      },
    ]);

    setGcsEnabled(false);
    setGcs({
      eye_score: "spontaneously",
      verbal_score: "oriented",
      motor_score: "obeys",
    });

    setApgarEnabled(false);
    setApgar({
      appearance: "pink",
      pulse: "100_140",
      grimace: "cry",
      activity: "well_flexed",
      respiration: "strong_cry",
    });

    setNonTransportEnabled(false);
    setNonTransport({
      reason: "cancelled_before_arrival",
    });

    setBelongings({
      items: "",
      turned_over_to: "",
      received_by: "",
      notes: "",
    });

    setEmsCrew({
      ems_in_charge: "",
      ems_assistant_1: "",
      ems_assistant_2: "",
      ems_operator: "",
    });

    setReceiving({
      physician_nod: "",
    });

    setAttachment(null);
    setAttachmentPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;

    if (!patient.first_name.trim()) {
      showToast("error", "Please enter the first name.");
      return;
    }

    if (!patient.chief_complaint.trim()) {
      showToast("error", "Please enter the chief complaint.");
      return;
    }

    if (!incident.ambulance_body_no.trim()) {
      showToast("error", "Please enter the ambulance body number.");
      return;
    }

    if (!incident.call_no.trim()) {
      showToast("error", "Please enter the call number.");
      return;
    }

    setSaving(true);

    const incidentForApi = {
      ...incident,
      ambulance_body_no: incident.ambulance_body_no?.trim() || "",
      call_no: incident.call_no?.trim() || "",
      patient_location: incident.patient_location?.trim() || "",
      transported_to: incident.transported_to?.trim() || "",
      poi: incident.poi?.trim() || "",
      moi: incident.moi?.trim() || "",
      intervention_notes: incident.intervention_notes?.trim() || "",
      call_received_time: toApiDateTime(incident.call_received_time),
      responded_time: toApiDateTime(incident.responded_time),
      arrived_scene_time: toApiDateTime(incident.arrived_scene_time),
      left_scene_time: toApiDateTime(incident.left_scene_time),
      arrived_hospital_time: toApiDateTime(incident.arrived_hospital_time),
      back_in_service_time: toApiDateTime(incident.back_in_service_time),
    };

    const vitalsForApi = vitals.map((v) => ({
      ...v,
      time: toApiDateTime(v.time),
      bp: v.bp?.trim() || "",
      pulse_rate: v.pulse_rate?.trim() || "",
      resp_rate: v.resp_rate?.trim() || "",
      resp_quality: v.resp_quality === NA ? "" : (v.resp_quality || "normal"),
      temperature_value: v.temperature_value?.trim() || "",
      temperature_state: v.temperature_state === NA ? "" : (v.temperature_state || "normal"),
      spo2: v.spo2?.trim() || "",
      skin_color: v.skin_color === NA ? "" : (v.skin_color || "normal"),
      pupils: v.pupils === NA ? "" : (v.pupils || "normal"),
      cap_refill: v.cap_refill === NA ? "" : (v.cap_refill || "normal"),
      location: v.location?.trim() || "",
    }));

    const payload = {
      patient: {
        first_name: patient.first_name?.trim() || "",
        middle_name: patient.middle_name?.trim() || "",
        last_name: patient.last_name?.trim() || "",
        address: patient.address?.trim() || "",
        sex: patient.sex || "male",
        chief_complaint: patient.chief_complaint?.trim() || "",
        assessment: patient.assessment?.trim() || "",
      },

      ambulance_body_no: incidentForApi.ambulance_body_no,
      call_no: incidentForApi.call_no,
      patient_location: incidentForApi.patient_location,
      transported_to: incidentForApi.transported_to,
      doi: incidentForApi.doi || null,
      toi: incidentForApi.toi || null,
      poi: incidentForApi.poi,
      moi: incidentForApi.moi,
      call_received_time: incidentForApi.call_received_time,
      responded_time: incidentForApi.responded_time,
      arrived_scene_time: incidentForApi.arrived_scene_time,
      left_scene_time: incidentForApi.left_scene_time,
      arrived_hospital_time: incidentForApi.arrived_hospital_time,
      back_in_service_time: incidentForApi.back_in_service_time,
      intervention_notes: incidentForApi.intervention_notes,

      incident: {
        level_of_consciousness: incidentForApi.level_of_consciousness || "awake",
      },

      vitals: vitalsForApi,
      gcs: gcsEnabled
        ? {
            eye_score: gcs.eye_score === NA ? "" : (gcs.eye_score || ""),
            verbal_score: gcs.verbal_score === NA ? "" : (gcs.verbal_score || ""),
            motor_score: gcs.motor_score === NA ? "" : (gcs.motor_score || ""),
            total_score: gcsTotal,
          }
        : null,
      apgar: apgarEnabled
        ? {
            appearance: apgar.appearance === NA ? "" : (apgar.appearance || ""),
            pulse: apgar.pulse === NA ? "" : (apgar.pulse || ""),
            grimace: apgar.grimace === NA ? "" : (apgar.grimace || ""),
            activity: apgar.activity === NA ? "" : (apgar.activity || ""),
            respiration: apgar.respiration === NA ? "" : (apgar.respiration || ""),
            total_score: apgarTotal,
          }
        : null,
      non_transport: nonTransportEnabled
        ? {
            reason: nonTransport.reason === NA ? "" : (nonTransport.reason || ""),
          }
        : null,
      belongings: {
        items: belongings.items?.trim() || "",
        turned_over_to: belongings.turned_over_to?.trim() || "",
        received_by: belongings.received_by?.trim() || "",
        notes: belongings.notes?.trim() || "",
      },
      ems_crew: {
        ems_in_charge: emsCrew.ems_in_charge?.trim() || "",
        ems_assistant_1: emsCrew.ems_assistant_1?.trim() || "",
        ems_assistant_2: emsCrew.ems_assistant_2?.trim() || "",
        ems_operator: emsCrew.ems_operator?.trim() || "",
      },
      receiving_physician_nod: {
        physician_nod: receiving.physician_nod?.trim() || "",
      },
    };

    try {
      const data = await saveReportMultipart({ payload, attachment });

      console.log("SAVED:", data);

      const savedCaseNo = data?.case_no || "";
      setGeneratedCaseNo(savedCaseNo);

      showToast(
        "success",
        savedCaseNo
          ? `Saved successfully! Case No.: ${savedCaseNo}`
          : "Saved successfully!"
      );

      resetForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("SAVE ERROR:", err);
      showToast("error", err?.message || "Network / server error while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <NewReportSkeleton />;

  return (
    <div className="nr-layout">
      <Sidebar />

      <div className="nr-main">
        <Toast
          open={toast.open}
          type={toast.type}
          message={toast.message}
          onClose={closeToast}
          duration={toast.type === "success" ? 2600 : 3500}
        />

        <div className="nr-page">
          <div className="nr-head">
            <div>
              <div className="nr-crumbs">New Report</div>
              <h1 className="nr-title">Create New Patient Report</h1>
              <p className="nr-subtitle">Complete the form below. Fields are grouped for faster entry.</p>
            </div>
          </div>

          {generatedCaseNo && (
            <div
              className="nr-card"
              style={{ marginBottom: 18, padding: "16px 18px" }}
            >
              <div className="nr-section-head" style={{ marginBottom: 0 }}>
                <div>
                  <h3>Last Saved Case No.</h3>
                  <p>The most recently generated case number from the server.</p>
                </div>
                <span className="nr-tag">{generatedCaseNo}</span>
              </div>
            </div>
          )}

          <form className="nr-card" onSubmit={handleSubmit} noValidate>
            <div className="nr-section">
              <div className="nr-section-head">
                <div>
                  <h3>Patient Information</h3>
                  <p>Basic patient details and chief complaint.</p>
                </div>
                <span className="nr-tag">Patients</span>
              </div>

              <div className="nr-grid">
                <div className="nr-field">
                  <label>First Name</label>
                  <input
                    name="first_name"
                    value={patient.first_name}
                    onChange={updatePatient}
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>Middle Name</label>
                  <input
                    name="middle_name"
                    value={patient.middle_name}
                    onChange={updatePatient}
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>Last Name</label>
                  <input
                    name="last_name"
                    value={patient.last_name}
                    onChange={updatePatient}
                    placeholder="Leave blank if unknown"
                    disabled={saving}
                  />
                </div>

                <div className="nr-field nr-full">
                  <label>Address</label>
                  <input
                    name="address"
                    value={patient.address}
                    onChange={updatePatient}
                    placeholder="Barangay / City"
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>Sex</label>
                  <select name="sex" value={patient.sex} onChange={updatePatient} disabled={saving}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div className="nr-field nr-full">
                  <div className="nr-subhead">
                    <h4>Chief Complaint</h4>
                    <span className="nr-tag ghost">Patients</span>
                  </div>

                  <textarea
                    name="chief_complaint"
                    value={patient.chief_complaint}
                    onChange={updatePatient}
                    rows={3}
                    placeholder="e.g. Chest pain, difficulty breathing, trauma due to vehicular accident..."
                    disabled={saving}
                  />
                </div>

                <div className="nr-field nr-full">
                  <div className="nr-subhead">
                    <h4>Assessment</h4>
                    <span className="nr-tag ghost">Patients</span>
                  </div>

                  <textarea
                    name="assessment"
                    value={patient.assessment}
                    onChange={updatePatient}
                    rows={4}
                    placeholder="e.g. Initial findings, impression, working diagnosis, notes..."
                    disabled={saving}
                  />
                </div>

                <div className="nr-field nr-full">
                  <label>Attachment (Image)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onPickAttachment(e.target.files?.[0])}
                    disabled={saving}
                  />
                  {attachmentPreview && (
                    <div style={{ marginTop: 10 }}>
                      <img
                        src={attachmentPreview}
                        alt="Preview"
                        style={{ maxWidth: "260px", borderRadius: 10 }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="nr-section">
              <div className="nr-section-head">
                <div>
                  <h3>Incident Details</h3>
                  <p>Dispatch, location, and timeline fields.</p>
                </div>
                <span className="nr-tag">Incidents</span>
              </div>

              <div className="nr-grid">
                <div className="nr-field">
                  <label>Ambulance Body No</label>
                  <input
                    name="ambulance_body_no"
                    value={incident.ambulance_body_no}
                    onChange={updateIncident}
                    placeholder="e.g. EMS-01"
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>Call No.</label>
                  <input
                    name="call_no"
                    value={incident.call_no}
                    onChange={updateIncident}
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>Case No.</label>
                  <input
                    value={generatedCaseNo || "Auto-generated after save"}
                    readOnly
                    disabled
                  />
                </div>

                <div className="nr-field nr-full">
                  <label>Patient Location</label>
                  <input
                    name="patient_location"
                    value={incident.patient_location}
                    onChange={updateIncident}
                    placeholder="Exact address / landmark"
                    disabled={saving}
                  />
                </div>

                <div className="nr-field nr-full">
                  <label>Transported To</label>
                  <input
                    name="transported_to"
                    value={incident.transported_to}
                    onChange={updateIncident}
                    placeholder="Hospital / Facility"
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>Level of Consciousness</label>
                  <select
                    name="level_of_consciousness"
                    value={incident.level_of_consciousness}
                    onChange={updateIncident}
                    disabled={saving}
                  >
                    {LOC_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="nr-field">
                  <label>DOI (Date)</label>
                  <input
                    type="date"
                    name="doi"
                    value={incident.doi}
                    onChange={updateIncident}
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>TOI (Time)</label>
                  <input
                    type="time"
                    name="toi"
                    value={incident.toi}
                    onChange={updateIncident}
                    disabled={saving}
                  />
                </div>

                <div className="nr-field nr-full">
                  <label>POI (Place)</label>
                  <input
                    name="poi"
                    value={incident.poi}
                    onChange={updateIncident}
                    disabled={saving}
                  />
                </div>

                <div className="nr-field nr-full">
                  <label>MOI (Mechanism of Injury)</label>
                  <input
                    name="moi"
                    value={incident.moi}
                    onChange={updateIncident}
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>Call Received</label>
                  <input
                    type="datetime-local"
                    name="call_received_time"
                    value={incident.call_received_time}
                    onChange={updateIncident}
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>Responded</label>
                  <input
                    type="datetime-local"
                    name="responded_time"
                    value={incident.responded_time}
                    onChange={updateIncident}
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>Arrived Scene</label>
                  <input
                    type="datetime-local"
                    name="arrived_scene_time"
                    value={incident.arrived_scene_time}
                    onChange={updateIncident}
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>Left Scene</label>
                  <input
                    type="datetime-local"
                    name="left_scene_time"
                    value={incident.left_scene_time}
                    onChange={updateIncident}
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>Arrived Hospital</label>
                  <input
                    type="datetime-local"
                    name="arrived_hospital_time"
                    value={incident.arrived_hospital_time}
                    onChange={updateIncident}
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>Back In Service</label>
                  <input
                    type="datetime-local"
                    name="back_in_service_time"
                    value={incident.back_in_service_time}
                    onChange={updateIncident}
                    disabled={saving}
                  />
                </div>

                <div className="nr-field nr-full">
                  <label>Intervention Notes</label>
                  <textarea
                    name="intervention_notes"
                    value={incident.intervention_notes}
                    onChange={updateIncident}
                    rows={4}
                    placeholder="Describe interventions performed..."
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div className="nr-section">
              <div className="nr-section-head">
                <div>
                  <h3>Vitals</h3>
                  <p>Record multiple vital entries (scene, en route, ER).</p>
                </div>
                <span className="nr-tag">Vitals</span>
              </div>

              {vitals.map((v, idx) => (
                <div className="nr-vital" key={idx}>
                  <div className="nr-vital-head">
                    <div className="nr-vital-title">Vitals Entry #{idx + 1}</div>
                    <div className="nr-vital-actions">
                      <button
                        type="button"
                        className="nr-btn nr-btn-soft"
                        onClick={() => removeVitalRow(idx)}
                        disabled={vitals.length <= 1 || saving}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="nr-grid">
                    <div className="nr-field">
                      <label>Time</label>
                      <input
                        type="datetime-local"
                        value={v.time}
                        onChange={(e) => updateVital(idx, "time", e.target.value)}
                        disabled={saving}
                      />
                    </div>

                    <div className="nr-field">
                      <label>BP</label>
                      <input
                        value={v.bp}
                        onChange={(e) => updateVital(idx, "bp", e.target.value)}
                        placeholder="120/80"
                        disabled={saving}
                      />
                    </div>

                    <div className="nr-field">
                      <label>Pulse</label>
                      <input
                        value={v.pulse_rate}
                        onChange={(e) => updateVital(idx, "pulse_rate", e.target.value)}
                        placeholder="bpm"
                        disabled={saving}
                      />
                    </div>

                    <div className="nr-field">
                      <label>Respiration</label>
                      <input
                        value={v.resp_rate}
                        onChange={(e) => updateVital(idx, "resp_rate", e.target.value)}
                        placeholder="rpm"
                        disabled={saving}
                      />
                    </div>

                    <div className="nr-field">
                      <label>Resp. Quality</label>
                      <select
                        value={v.resp_quality}
                        onChange={(e) => updateVital(idx, "resp_quality", e.target.value)}
                        disabled={saving}
                      >
                        <option value={NA}>N/A</option>
                        {RESP_QUALITY.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="nr-field">
                      <label>Temperature</label>
                      <input
                        value={v.temperature_value}
                        onChange={(e) => updateVital(idx, "temperature_value", e.target.value)}
                        placeholder="°C"
                        disabled={saving}
                      />
                    </div>

                    <div className="nr-field">
                      <label>Temp State</label>
                      <select
                        value={v.temperature_state}
                        onChange={(e) => updateVital(idx, "temperature_state", e.target.value)}
                        disabled={saving}
                      >
                        <option value={NA}>N/A</option>
                        {TEMP_STATE.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="nr-field">
                      <label>SpO2</label>
                      <input
                        value={v.spo2}
                        onChange={(e) => updateVital(idx, "spo2", e.target.value)}
                        placeholder="%"
                        disabled={saving}
                      />
                    </div>

                    <div className="nr-field">
                      <label>Skin Color</label>
                      <select
                        value={v.skin_color}
                        onChange={(e) => updateVital(idx, "skin_color", e.target.value)}
                        disabled={saving}
                      >
                        <option value={NA}>N/A</option>
                        {SKIN_COLOR.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="nr-field">
                      <label>Pupils</label>
                      <select
                        value={v.pupils}
                        onChange={(e) => updateVital(idx, "pupils", e.target.value)}
                        disabled={saving}
                      >
                        <option value={NA}>N/A</option>
                        {PUPILS.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="nr-field">
                      <label>Cap Refill</label>
                      <select
                        value={v.cap_refill}
                        onChange={(e) => updateVital(idx, "cap_refill", e.target.value)}
                        disabled={saving}
                      >
                        <option value={NA}>N/A</option>
                        {CAP_REFILL.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="nr-field">
                      <label>Location</label>
                      <input
                        value={v.location}
                        onChange={(e) => updateVital(idx, "location", e.target.value)}
                        placeholder="Scene / En route / ER"
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="nr-row-end">
                <button
                  type="button"
                  className="nr-btn nr-btn-primary"
                  onClick={addVitalRow}
                  disabled={saving}
                >
                  + Add Vitals Entry
                </button>
              </div>
            </div>

            <div className="nr-section">
              <div className="nr-section-head">
                <div>
                  <h3>GCS Score</h3>
                  <p>Enable when applicable.</p>
                </div>

                <label className="nr-toggle">
                  <input
                    type="checkbox"
                    checked={gcsEnabled}
                    onChange={(e) => setGcsEnabled(e.target.checked)}
                    disabled={saving}
                  />
                  <span>Enable GCS</span>
                </label>
              </div>

              {gcsEnabled && (
                <div className="nr-grid">
                  <div className="nr-field">
                    <label>Eye Score</label>
                    <select
                      value={gcs.eye_score}
                      onChange={(e) => setGcs({ ...gcs, eye_score: e.target.value })}
                      disabled={saving}
                    >
                      <option value={NA}>N/A</option>
                      {GCS_EYE.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label} ({o.score})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="nr-field">
                    <label>Verbal Score</label>
                    <select
                      value={gcs.verbal_score}
                      onChange={(e) => setGcs({ ...gcs, verbal_score: e.target.value })}
                      disabled={saving}
                    >
                      <option value={NA}>N/A</option>
                      {GCS_VERBAL.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label} ({o.score})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="nr-field">
                    <label>Motor Score</label>
                    <select
                      value={gcs.motor_score}
                      onChange={(e) => setGcs({ ...gcs, motor_score: e.target.value })}
                      disabled={saving}
                    >
                      <option value={NA}>N/A</option>
                      {GCS_MOTOR.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label} ({o.score})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="nr-field">
                    <label>Total Score</label>
                    <input value={gcsTotal} readOnly />
                  </div>
                </div>
              )}
            </div>

            <div className="nr-section">
              <div className="nr-section-head">
                <div>
                  <h3>APGAR Score</h3>
                  <p>Enable when applicable (newborn assessment).</p>
                </div>

                <label className="nr-toggle">
                  <input
                    type="checkbox"
                    checked={apgarEnabled}
                    onChange={(e) => setApgarEnabled(e.target.checked)}
                    disabled={saving}
                  />
                  <span>Enable APGAR</span>
                </label>
              </div>

              {apgarEnabled && (
                <div className="nr-grid">
                  <div className="nr-field">
                    <label>Appearance</label>
                    <select
                      value={apgar.appearance}
                      onChange={(e) => setApgar({ ...apgar, appearance: e.target.value })}
                      disabled={saving}
                    >
                      <option value={NA}>N/A</option>
                      {APGAR_APPEARANCE.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label} ({o.score})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="nr-field">
                    <label>Pulse</label>
                    <select
                      value={apgar.pulse}
                      onChange={(e) => setApgar({ ...apgar, pulse: e.target.value })}
                      disabled={saving}
                    >
                      <option value={NA}>N/A</option>
                      {APGAR_PULSE.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label} ({o.score})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="nr-field">
                    <label>Grimace</label>
                    <select
                      value={apgar.grimace}
                      onChange={(e) => setApgar({ ...apgar, grimace: e.target.value })}
                      disabled={saving}
                    >
                      <option value={NA}>N/A</option>
                      {APGAR_GRIMACE.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label} ({o.score})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="nr-field">
                    <label>Activity</label>
                    <select
                      value={apgar.activity}
                      onChange={(e) => setApgar({ ...apgar, activity: e.target.value })}
                      disabled={saving}
                    >
                      <option value={NA}>N/A</option>
                      {APGAR_ACTIVITY.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label} ({o.score})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="nr-field">
                    <label>Respiration</label>
                    <select
                      value={apgar.respiration}
                      onChange={(e) => setApgar({ ...apgar, respiration: e.target.value })}
                      disabled={saving}
                    >
                      <option value={NA}>N/A</option>
                      {APGAR_RESP.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label} ({o.score})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="nr-field">
                    <label>Total Score</label>
                    <input value={apgarTotal} readOnly />
                  </div>
                </div>
              )}
            </div>

            <div className="nr-section">
              <div className="nr-section-head">
                <div>
                  <h3>Non-Transport Reasons</h3>
                  <p>Enable only if patient was not transported.</p>
                </div>

                <label className="nr-toggle">
                  <input
                    type="checkbox"
                    checked={nonTransportEnabled}
                    onChange={(e) => setNonTransportEnabled(e.target.checked)}
                    disabled={saving}
                  />
                  <span>Enable Non-Transport</span>
                </label>
              </div>

              {nonTransportEnabled && (
                <div className="nr-grid">
                  <div className="nr-field nr-full">
                    <label>Reason</label>
                    <select
                      value={nonTransport.reason}
                      onChange={(e) => setNonTransport({ ...nonTransport, reason: e.target.value })}
                      disabled={saving}
                    >
                      <option value={NA}>N/A</option>
                      {NON_TRANSPORT_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="nr-section">
              <div className="nr-section-head">
                <div>
                  <h3>Patient Personal Belongings</h3>
                  <p>Record valuables / items (optional).</p>
                </div>
                <span className="nr-tag ghost">Optional</span>
              </div>

              <div className="nr-grid">
                <div className="nr-field nr-full">
                  <label>Items / Description</label>
                  <textarea
                    rows={3}
                    value={belongings.items}
                    onChange={(e) => setBelongings({ ...belongings, items: e.target.value })}
                    placeholder="e.g. Wallet, Phone, Watch, Bag, IDs..."
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>Turned Over To</label>
                  <input
                    value={belongings.turned_over_to}
                    onChange={(e) => setBelongings({ ...belongings, turned_over_to: e.target.value })}
                    placeholder="Hospital staff / Relative"
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>Received By</label>
                  <input
                    value={belongings.received_by}
                    onChange={(e) => setBelongings({ ...belongings, received_by: e.target.value })}
                    placeholder="Printed name"
                    disabled={saving}
                  />
                </div>

                <div className="nr-field nr-full">
                  <label>Notes</label>
                  <textarea
                    rows={2}
                    value={belongings.notes}
                    onChange={(e) => setBelongings({ ...belongings, notes: e.target.value })}
                    placeholder="Optional notes"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div className="nr-section">
              <div className="nr-section-head">
                <div>
                  <h3>EMS Crew</h3>
                  <p>Personnel fields (optional).</p>
                </div>
                <span className="nr-tag ghost">Optional</span>
              </div>

              <div className="nr-grid">
                <div className="nr-field nr-full">
                  <label>EMS In Charge</label>
                  <input
                    value={emsCrew.ems_in_charge}
                    onChange={(e) => setEmsCrew({ ...emsCrew, ems_in_charge: e.target.value })}
                    placeholder="Full name"
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>EMS Assistant</label>
                  <input
                    value={emsCrew.ems_assistant_1}
                    onChange={(e) => setEmsCrew({ ...emsCrew, ems_assistant_1: e.target.value })}
                    placeholder="Full name"
                    disabled={saving}
                  />
                </div>

                <div className="nr-field">
                  <label>EMS Assistant</label>
                  <input
                    value={emsCrew.ems_assistant_2}
                    onChange={(e) => setEmsCrew({ ...emsCrew, ems_assistant_2: e.target.value })}
                    placeholder="Full name"
                    disabled={saving}
                  />
                </div>

                <div className="nr-field nr-full">
                  <label>EMS Operator</label>
                  <input
                    value={emsCrew.ems_operator}
                    onChange={(e) => setEmsCrew({ ...emsCrew, ems_operator: e.target.value })}
                    placeholder="Full name"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div className="nr-section">
              <div className="nr-section-head">
                <div>
                  <h3>Receiving Physician / NOD</h3>
                  <p>Optional depending on transport.</p>
                </div>
                <span className="nr-tag">Receiving</span>
              </div>

              <div className="nr-grid">
                <div className="nr-field nr-full">
                  <label>Receiving Physician / NOD</label>
                  <input
                    value={receiving.physician_nod}
                    onChange={(e) => setReceiving({ ...receiving, physician_nod: e.target.value })}
                    placeholder="Full name"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div className="nr-actions">
              <button type="submit" className="nr-btn nr-btn-primary" disabled={saving}>
                {saving ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span className="nr-spinner" aria-hidden="true" />
                    Saving...
                  </span>
                ) : (
                  "Save Patient Report"
                )}
              </button>

              <button
                type="button"
                className="nr-btn nr-btn-soft"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                disabled={saving}
              >
                Back to Top
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default NewReport;