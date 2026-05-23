import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import "./Reports.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { fetchWithAuth, clearAuth } from "../../auth";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const QUARTERS = [
  { label: "Quarter 1", value: "Q1", months: [0, 1, 2] },
  { label: "Quarter 2", value: "Q2", months: [3, 4, 5] },
  { label: "Quarter 3", value: "Q3", months: [6, 7, 8] },
  { label: "Quarter 4", value: "Q4", months: [9, 10, 11] },
];

const AMBULANCE_BODY_OPTIONS = [
  "PTV 70102",
  "SND 2439",
  "SKA 1130",
  "City Ambu 6651",
];

const DAILY_TREND_CASE_TYPES = [
  { key: "medical", label: "Medical", color: "#67e8f9" },
  { key: "trauma", label: "Trauma", color: "#38bdf8" },
  { key: "interfacility", label: "Interfacility", color: "#14b8a6" },
  { key: "hostran", label: "Hostran", color: "#818cf8" },
  { key: "standby_medics", label: "Standby Medics", color: "#f59e0b" },
  { key: "back_to_base", label: "Back to Base", color: "#ef4444" },
];

function createEmptyDailyTrendCounts() {
  return DAILY_TREND_CASE_TYPES.reduce((acc, item) => {
    acc[item.key] = 0;
    return acc;
  }, {});
}

function buildDailyTrendSegments(caseTypeCounts = {}) {
  return DAILY_TREND_CASE_TYPES.map((item) => ({
    ...item,
    value: Number(caseTypeCounts[item.key] || 0),
  })).filter((item) => item.value > 0);
}

function getDailyTrendCaseTypeKey(report) {
  const caseType = normalizeCaseType(getCaseTypeRaw(report));

  if (DAILY_TREND_CASE_TYPES.some((item) => item.key === caseType)) {
    return caseType;
  }

  return "";
}

const BARANGAYS = [
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
  "OTHERS",
];

const WITHIN_5KM_BARANGAYS = [
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

const BARANGAY_NUMBER_ALIASES = Array.from({ length: 12 }, (_, index) => {
  const number = index + 1;
  const padded = String(number).padStart(2, "0");

  return {
    key: `B${number}`,
    aliases: [
      `B${number}`,
      `B ${number}`,
      `B-${number}`,
      `B${padded}`,
      `B ${padded}`,
      `B-${padded}`,
      `BARANGAY ${number}`,
      `BARANGAY ${padded}`,
      `BRGY ${number}`,
      `BRGY ${padded}`,
      `BRG ${number}`,
      `BRG ${padded}`,
      `POBLACION ${number}`,
      `POBLACION ${padded}`,
    ],
  };
});

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

const INTERFACILITY_CLASSIFICATIONS = [
  "MPGH or Malaybalay Polymedic General Hospital",
  "BBH or Bethel Baptist Hospital",
  "BPMC or Bukidnon Provincial Medical Center",
  "St. Jude",
  "MIDWAY CLINIC or MIDWAY DOCTORS CLINIC",
  "MMHC or Malaybalay Medical Hospital Clinic",
  "Hospital to Home",
  "Follow-up Checkup",
  "School Clinic",
  "Lying-in",
  "Walk-In",
  "Police Station",
  "City Health Office",
  "Dialysis",
  "St. Marina",
];

function getApiBase() {
  try {
    const settings = JSON.parse(localStorage.getItem("ems_settings") || "{}");
    return settings?.apiBaseUrl || "http://127.0.0.1:8000";
  } catch {
    return "http://127.0.0.1:8000";
  }
}

const chunkArray = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

function normalizeText(value) {
  return String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFacilityName(value) {
  const raw = String(value || "").trim();

  const text = raw
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsNormalizedTerm(normalizedText, normalizedTerm) {
  if (!normalizedText || !normalizedTerm) return false;

  const pattern = new RegExp(`(^|\\s)${escapeRegExp(normalizedTerm)}(\\s|$)`);
  return pattern.test(normalizedText);
}

function buildCountMap(labels = []) {
  return new Map(labels.map((label) => [label, 0]));
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

function normalizeAmbulanceBodyNo(value) {
  const text = normalizeText(value);

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

  const text = normalizeText(value);

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

function isPossibleBreathOfAlcohol(value) {
  return (
    getCanonicalMappedLabel(
      value,
      new Map([[POSSIBLE_BREATH_OF_ALCOHOL_LABEL, 0]]),
      TRAUMA_ALIASES
    ) === POSSIBLE_BREATH_OF_ALCOHOL_LABEL
  );
}

const INTERFACILITY_ALIASES = {
  "MPGH or Malaybalay Polymedic General Hospital": [
    "MPGH",
    "Malaybalay Polymedic General Hospital",
  ],
  "BBH or Bethel Baptist Hospital": ["BBH", "Bethel Baptist Hospital"],
  "BPMC or Bukidnon Provincial Medical Center": [
    "BPMC",
    "Bukidnon Provincial Medical Center",
  ],
  "St. Jude": [
    "SJTGH",
    "ST JUDE",
    "ST. JUDE",
    "St Jude",
    "St. Jude",
    "St. Jude Hospital",
    "St Jude Hospital",
    "St. Jude Thaddeus General Hospital",
    "St Jude Thaddeus General Hospital",
  ],
  "MIDWAY CLINIC or MIDWAY DOCTORS CLINIC": [
    "MIDWAY",
    "MIDWAY CLINIC",
    "MIDWAY DOCTOR CLINIC",
    "MIDWAY DOCTORS CLINIC",
    "MIDWAY Hospital",
  ],
  "BBH or Barangay Health Center": ["Barangay Health Center", "BHC"],
  "MMHC or Malaybalay Medical Hospital Clinic": [
    "MMHC",
    "Malaybalay Medical Hospital Clinic",
  ],
  "Hospital to Home": [
    "Home",
    "HOME",
    "home",
    "Hospital to Home",
    "Hospital-to-Home",
    "Hospital Home",
    "Transport to Home",
    "Discharge to Home",
    "From Hospital to Home",
  ],
  "Follow-up Checkup": [
    "Follow Up Check Up",
    "Follow Up Checkup",
    "Follow-up Check Up",
    "Follow-up Check-up",
    "Follow-up Checkup",
  ],
  "Lying-in": ["Lying In", "Lying-in", "Lying In Clinic"],
  "Police Station": ["Police station", "Police Station"],
};

function getCanonicalMappedLabel(rawValue, map, aliases = {}) {
  const normalizedRaw = normalizeText(rawValue);
  if (!normalizedRaw) return "";

  const matchers = [...map.keys()]
    .map((label) => ({
      label,
      names: [label, ...(aliases[label] || [])].map(normalizeText),
    }))
    .sort((a, b) => {
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

  return found?.label || "";
}

function incrementMappedCount(map, rawValue, aliases = {}) {
  const label = getCanonicalMappedLabel(rawValue, map, aliases);

  if (!label) return;

  map.set(label, (map.get(label) || 0) + 1);
}

function getBarangayFromAddress(address) {
  const normalizedAddress = normalizeText(address);

  if (!normalizedAddress) return null;

  const aliases = {
    "STO. NINO": ["STO NINO", "SANTO NINO", "STO. NINO"],
    "PAT-PAT": ["PAT PAT", "PATPAT"],
    "APO MACOTE": ["APO MACOTE", "APOMACOTE"],
    "SAN JOSE": ["SAN JOSE"],
    "SAN MARTIN": ["SAN MARTIN"],
  };

  BARANGAY_NUMBER_ALIASES.forEach((item) => {
    aliases[item.key] = item.aliases;
  });

  for (const barangay of BARANGAYS.filter((b) => b !== "OTHERS")) {
    const base = normalizeText(barangay);
    const possible = [base, ...(aliases[barangay] || []).map(normalizeText)];

    if (possible.some((name) => containsNormalizedTerm(normalizedAddress, name))) {
      return barangay;
    }
  }

  return null;
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

function normalizeCaseType(caseType) {
  const value = String(caseType || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._-]+/g, "_")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!value) return "";

  if (value.includes("medical")) return "medical";
  if (value.includes("trauma")) return "trauma";
  if (value.includes("interfacility") || value.includes("inter_facility")) {
    return "interfacility";
  }
  if (
    value.includes("hostran") ||
    value.includes("host_ran") ||
    value.includes("hospital_transport") ||
    value.includes("hosp_transport")
  ) {
    return "hostran";
  }
  if (value.includes("standby")) return "standby_medics";
  if (value.includes("back_to_base") || value.includes("back_base")) {
    return "back_to_base";
  }

  return value;
}

function getBarangayKeyForReport(report) {
  const caseType = normalizeCaseType(getCaseTypeRaw(report));

  if (
    caseType === "hostran" ||
    caseType === "standby_medics" ||
    caseType === "back_to_base"
  ) {
    return "OTHERS";
  }

  return getBarangayFromAddress(getAddress(report));
}

function isWithin5Km(address, caseType = "") {
  const normalizedCaseType = normalizeCaseType(caseType);

  if (
    normalizedCaseType === "hostran" ||
    normalizedCaseType === "standby_medics" ||
    normalizedCaseType === "back_to_base"
  ) {
    return false;
  }

  const barangay = getBarangayFromAddress(address);

  return WITHIN_5KM_BARANGAYS.includes(barangay);
}

function formatPercent(count, total) {
  if (!total) return "0%";
  return `${((Number(count) / Number(total)) * 100).toFixed(2)}%`;
}

function getMonthIndex(monthName) {
  return MONTHS.indexOf(monthName);
}

function getQuarterMonths(selectedQuarter) {
  return QUARTERS.find((q) => q.value === selectedQuarter)?.months || [];
}

function getQuarterLabel(selectedQuarter) {
  return QUARTERS.find((q) => q.value === selectedQuarter)?.label || "Quarter 1";
}

function getDateLabel(summaryType, selectedMonth, selectedQuarter, selectedYear) {
  if (summaryType === "Monthly") {
    const monthIndex = getMonthIndex(selectedMonth);
    const lastDay = new Date(Number(selectedYear), monthIndex + 1, 0).getDate();
    return `${selectedMonth} 1-${lastDay}, ${selectedYear}`;
  }

  if (summaryType === "Quarterly") {
    const quarterMonths = getQuarterMonths(selectedQuarter);
    const firstMonth = MONTHS[quarterMonths[0]];
    const lastMonth = MONTHS[quarterMonths[quarterMonths.length - 1]];
    return `${firstMonth} - ${lastMonth} ${selectedYear}`;
  }

  return `January - December ${selectedYear}`;
}

function safeDate(value) {
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

function formatLocalDateKey(date) {
  if (!date) return "";

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function getReportDate(report) {
  return (
    safeDate(report?.doi) ||
    safeDate(report?.DOI) ||
    safeDate(report?.date_of_incident) ||
    safeDate(report?.dateOfIncident) ||
    safeDate(report?.incident?.doi) ||
    safeDate(report?.incident?.DOI) ||
    safeDate(report?.incident?.date_of_incident) ||
    safeDate(report?.incident?.dateOfIncident) ||
    safeDate(report?.patient?.doi) ||
    safeDate(report?.patient?.DOI) ||
    safeDate(report?.patient?.date_of_incident) ||
    safeDate(report?.patient?.dateOfIncident) ||
    safeDate(report?.patient_details?.doi) ||
    safeDate(report?.patient_details?.DOI) ||
    safeDate(report?.patient_details?.date_of_incident) ||
    safeDate(report?.patient_details?.dateOfIncident) ||
    safeDate(report?.form_data?.doi) ||
    safeDate(report?.form_data?.DOI) ||
    safeDate(report?.form_data?.date_of_incident) ||
    safeDate(report?.form_data?.dateOfIncident) ||
    null
  );
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
    report?.patient_details?.address ||
    report?.details?.address ||
    report?.form_data?.address ||
    report?.address ||
    ""
  );
}

function getTransportedToRaw(report) {
  return getValueByCandidates(report, [
    "transported_to",
    "transportedTo",
    "destination",
    "hospital",
    "facility",
    "receiving_facility",
    "receivingFacility",
    "patient.transported_to",
    "patient.transportedTo",
    "incident.transported_to",
    "incident.transportedTo",
    "details.transported_to",
    "details.transportedTo",
    "form_data.transported_to",
    "form_data.transportedTo",
  ]);
}

function getChiefComplaint(report) {
  return report?.patient?.chief_complaint || report?.chief_complaint || "";
}

function getAssessment(report) {
  return (
    report?.patient?.assessment ||
    report?.assessment ||
    report?.patient_assessment ||
    report?.incident?.assessment ||
    report?.details?.assessment ||
    report?.form_data?.assessment ||
    ""
  );
}

function getMechanismOfIncident(report) {
  return (
    report?.moi ||
    report?.incident?.moi ||
    report?.mechanism_of_incident ||
    report?.incident?.mechanism_of_incident ||
    report?.mechanismOfIncident ||
    report?.incident?.mechanismOfIncident ||
    report?.details?.moi ||
    report?.details?.mechanism_of_incident ||
    report?.form_data?.moi ||
    report?.form_data?.mechanism_of_incident ||
    ""
  );
}

function getFacility(report) {
  return normalizeFacilityName(getTransportedToRaw(report));
}

function getCaseTypeLabel(caseType) {
  const value = normalizeCaseType(caseType);

  if (value === "medical") return "Medical";
  if (value === "trauma") return "Trauma";
  if (value === "interfacility") return "Inter-Facility within the City";
  if (value === "hostran") return "Hospital Transport outside the City";
  if (value === "standby_medics") return "Standby Medics";
  if (value === "back_to_base") return "Back to Base";

  return null;
}

function matchesSelectedPeriod(report, summaryType, selectedMonth, selectedQuarter, selectedYear) {
  const date = getReportDate(report);
  if (!date) return false;

  const reportYear = date.getFullYear();
  const reportMonth = date.getMonth();

  if (summaryType === "Monthly") {
    return reportYear === Number(selectedYear) && reportMonth === getMonthIndex(selectedMonth);
  }

  if (summaryType === "Quarterly") {
    return (
      reportYear === Number(selectedYear) &&
      getQuarterMonths(selectedQuarter).includes(reportMonth)
    );
  }

  return reportYear === Number(selectedYear);
}

function computeResponseMinutes(report) {
  const responded = safeDate(report?.responded_time);
  const arrivedScene = safeDate(
    report?.arrived_scene_time ||
      report?.arrived_at_scene_time ||
      report?.scene_arrival_time
  );

  if (!responded || !arrivedScene) return null;

  const diffMs = arrivedScene.getTime() - responded.getTime();
  if (diffMs < 0) return null;

  return diffMs / 60000;
}

function buildEmptyBarangaySummary() {
  return BARANGAYS.map((barangay) => ({
    barangay,
    medical: 0,
    trauma: 0,
    interFacilityWithinCity: 0,
    hospitalTransportOutsideCity: 0,
    covidTransport: 0,
    total: 0,
  }));
}

function mapToRowsFromCountMap(countMap, baseTotal, limit = null) {
  const sorted = [...countMap.entries()].sort((a, b) => b[1] - a[1]);
  const sliced = limit ? sorted.slice(0, limit) : sorted;

  const rows = sliced.map(([label, count]) => [label, count, formatPercent(count, baseTotal)]);

  const totalCount = sliced.reduce((sum, [, count]) => sum + Number(count), 0);

  return {
    rows,
    total: rows.length ? [totalCount, formatPercent(totalCount, baseTotal)] : null,
  };
}

function mapAllRowsFromFixedList(countMap, labels, baseTotal) {
  const rows = labels.map((label) => [
    label,
    countMap.get(label) || 0,
    formatPercent(countMap.get(label) || 0, baseTotal),
  ]);

  const totalCount = rows.reduce((sum, [, count]) => sum + Number(count), 0);

  return {
    rows,
    total: [totalCount, formatPercent(totalCount, baseTotal)],
  };
}

function buildClassificationPages(reportData) {
  const rowsPerPage = 24;

  const sections = [
    {
      key: "medical",
      title: "MEDICAL",
      rows: reportData.classificationSummary?.medical || [],
      total: reportData.classificationSummary?.medicalTotal || [0, "0%"],
    },
    {
      key: "trauma",
      title: "TRAUMA",
      rows: reportData.classificationSummary?.trauma || [],
      total: reportData.classificationSummary?.traumaTotal || [0, "0%"],
    },
    {
      key: "interfacility",
      title: "INTERFACILITY",
      rows: reportData.classificationSummary?.interfacility || [],
      total: reportData.classificationSummary?.interfacilityTotal || [0, "0%"],
    },
  ];

  const pages = [];

  sections.forEach((section) => {
    const chunks = chunkArray(section.rows, rowsPerPage);

    if (!chunks.length) {
      pages.push({
        sectionTitle: section.title,
        rows: [],
        total: section.total,
        isLastChunk: true,
      });
      return;
    }

    chunks.forEach((chunkRows, index) => {
      pages.push({
        sectionTitle: section.title,
        rows: chunkRows,
        total: section.total,
        isLastChunk: index === chunks.length - 1,
      });
    });
  });

  return pages;
}

function buildDailyTrendData(filteredReports, summaryType, selectedMonth, selectedQuarter, selectedYear) {
  const reportsList = Array.isArray(filteredReports) ? filteredReports : [];

  if (summaryType === "Monthly") {
    const monthIndex = getMonthIndex(selectedMonth);
    const year = Number(selectedYear);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const daily = Array.from({ length: daysInMonth }, (_, index) => ({
      label: String(index + 1),
      count: 0,
      caseTypeCounts: createEmptyDailyTrendCounts(),
    }));

    reportsList.forEach((report) => {
      const date = getReportDate(report);
      if (!date) return;

      if (date.getFullYear() !== year || date.getMonth() !== monthIndex) return;

      const index = date.getDate() - 1;
      if (!daily[index]) return;

      daily[index].count += 1;

      const caseTypeKey = getDailyTrendCaseTypeKey(report);
      if (caseTypeKey) {
        daily[index].caseTypeCounts[caseTypeKey] += 1;
      }
    });

    return {
      title: "DAILY RUNS TREND",
      subtitle: `Runs recorded per day in ${selectedMonth} ${selectedYear} based on DOI.`,
      rows: daily.map((item) => ({
        ...item,
        segments: buildDailyTrendSegments(item.caseTypeCounts),
      })),
      legend: DAILY_TREND_CASE_TYPES,
      xLabel: "Day",
    };
  }

  if (summaryType === "Quarterly") {
    const quarterMonths = getQuarterMonths(selectedQuarter);

    const monthly = quarterMonths.map((monthIndex) => ({
      label: MONTHS[monthIndex].slice(0, 3),
      count: 0,
      caseTypeCounts: createEmptyDailyTrendCounts(),
    }));

    reportsList.forEach((report) => {
      const date = getReportDate(report);
      if (!date) return;

      const monthPosition = quarterMonths.indexOf(date.getMonth());
      if (monthPosition < 0 || !monthly[monthPosition]) return;

      monthly[monthPosition].count += 1;

      const caseTypeKey = getDailyTrendCaseTypeKey(report);
      if (caseTypeKey) {
        monthly[monthPosition].caseTypeCounts[caseTypeKey] += 1;
      }
    });

    return {
      title: "RUNS TREND",
      subtitle: `Runs recorded per month in ${getQuarterLabel(selectedQuarter)} ${selectedYear} based on DOI.`,
      rows: monthly.map((item) => ({
        ...item,
        segments: buildDailyTrendSegments(item.caseTypeCounts),
      })),
      legend: DAILY_TREND_CASE_TYPES,
      xLabel: "Month",
    };
  }

  const annual = MONTHS.map((monthName) => ({
    label: monthName.slice(0, 3),
    count: 0,
    caseTypeCounts: createEmptyDailyTrendCounts(),
  }));

  reportsList.forEach((report) => {
    const date = getReportDate(report);
    if (!date) return;

    const monthIndex = date.getMonth();
    if (!annual[monthIndex]) return;

    annual[monthIndex].count += 1;

    const caseTypeKey = getDailyTrendCaseTypeKey(report);
    if (caseTypeKey) {
      annual[monthIndex].caseTypeCounts[caseTypeKey] += 1;
    }
  });

  return {
    title: "RUNS TREND",
    subtitle: `Runs recorded per month in ${selectedYear} based on DOI.`,
    rows: annual.map((item) => ({
      ...item,
      segments: buildDailyTrendSegments(item.caseTypeCounts),
    })),
    legend: DAILY_TREND_CASE_TYPES,
    xLabel: "Month",
  };
}

function buildReportData(reports, summaryType, selectedMonth, selectedQuarter, selectedYear) {
  const filteredReports = (reports || []).filter((report) =>
    matchesSelectedPeriod(report, summaryType, selectedMonth, selectedQuarter, selectedYear)
  );

  const totalResponses = filteredReports.length;
  const connectingRunsCount = filteredReports.filter((report) => isConnectingRun(report)).length;
  const dailyTrend = buildDailyTrendData(
    filteredReports,
    summaryType,
    selectedMonth,
    selectedQuarter,
    selectedYear
  );

  const averagePerDay =
    totalResponses > 0
      ? summaryType === "Monthly"
        ? (() => {
            const monthIndex = getMonthIndex(selectedMonth);
            const daysInMonth = new Date(Number(selectedYear), monthIndex + 1, 0).getDate();
            return (totalResponses / daysInMonth).toFixed(2);
          })()
        : summaryType === "Quarterly"
        ? (() => {
            const quarterMonths = getQuarterMonths(selectedQuarter);
            const daysInQuarter = quarterMonths.reduce((sum, monthIndex) => {
              return sum + new Date(Number(selectedYear), monthIndex + 1, 0).getDate();
            }, 0);
            return (totalResponses / daysInQuarter).toFixed(2);
          })()
        : (totalResponses / 365).toFixed(2)
      : "—";

  const within5KmResponseTimes = filteredReports
    .filter((report) => isWithin5Km(getAddress(report), getCaseTypeRaw(report)))
    .map((report) => computeResponseMinutes(report))
    .filter((v) => v !== null);

  const averageResponseTime =
    within5KmResponseTimes.length > 0
      ? `${(
          within5KmResponseTimes.reduce((sum, v) => sum + v, 0) /
          within5KmResponseTimes.length
        ).toFixed(2)} mins`
      : "—";

  const responseTypeCounts = new Map();
  const medicalCaseCounts = new Map();
  const traumaCaseCounts = new Map();
  const requestingFacilityCounts = new Map();
  const barangayCounts = new Map();
  const standbyMedicsCounts = new Map();
  const ambulanceCounts = new Map(AMBULANCE_BODY_OPTIONS.map((label) => [label, 0]));

  const classificationMedicalCounts = buildCountMap(MEDICAL_CLASSIFICATIONS);
  const classificationTraumaCounts = buildCountMap(TRAUMA_CLASSIFICATIONS);
  const classificationInterfacilityCounts = buildCountMap(INTERFACILITY_CLASSIFICATIONS);

  const barangaySummaryMap = new Map(
    buildEmptyBarangaySummary().map((row) => [row.barangay, row])
  );

  const dailyMap = new Map();

  filteredReports.forEach((report) => {
    const caseType = normalizeCaseType(getCaseTypeRaw(report));
    const caseTypeLabel = getCaseTypeLabel(caseType);
    const address = getAddress(report);
    const barangayKey = getBarangayKeyForReport(report);
    const reportDate = getReportDate(report);
    const ambulanceBodyNo = normalizeAmbulanceBodyNo(getAmbulanceBodyNo(report));

    if (caseTypeLabel) {
      responseTypeCounts.set(caseTypeLabel, (responseTypeCounts.get(caseTypeLabel) || 0) + 1);
    }

    if (ambulanceBodyNo) {
      ambulanceCounts.set(ambulanceBodyNo, (ambulanceCounts.get(ambulanceBodyNo) || 0) + 1);
    }

    if (barangayKey) {
      barangayCounts.set(barangayKey, (barangayCounts.get(barangayKey) || 0) + 1);

      const barangayRow = barangaySummaryMap.get(barangayKey);

      if (barangayRow) {
        if (caseType === "medical") barangayRow.medical += 1;
        if (caseType === "trauma") barangayRow.trauma += 1;
        if (caseType === "interfacility") barangayRow.interFacilityWithinCity += 1;
        if (caseType === "hostran") barangayRow.hospitalTransportOutsideCity += 1;
        barangayRow.total += 1;
      }
    }

    if (caseType === "medical") {
      const chiefComplaint = getChiefComplaint(report);

      if (chiefComplaint) {
        const medicalLabel = getCanonicalMappedLabel(
          chiefComplaint,
          classificationMedicalCounts,
          MEDICAL_ALIASES
        );

        const displayLabel = medicalLabel || chiefComplaint;

        medicalCaseCounts.set(
          displayLabel,
          (medicalCaseCounts.get(displayLabel) || 0) + 1
        );

        incrementMappedCount(
          classificationMedicalCounts,
          chiefComplaint,
          MEDICAL_ALIASES
        );
      }
    }

    if (caseType === "trauma") {
      const moi = getMechanismOfIncident(report);
      const assessment = getAssessment(report);

      const moiHasPossibleBreathOfAlcohol = isPossibleBreathOfAlcohol(moi);
      const assessmentHasPossibleBreathOfAlcohol = isPossibleBreathOfAlcohol(assessment);

      if (moi) {
        const traumaLabel = getCanonicalMappedLabel(
          moi,
          classificationTraumaCounts,
          TRAUMA_ALIASES
        );

        const displayLabel = traumaLabel || moi;

        traumaCaseCounts.set(
          displayLabel,
          (traumaCaseCounts.get(displayLabel) || 0) + 1
        );

        incrementMappedCount(classificationTraumaCounts, moi, TRAUMA_ALIASES);
      }

      if (assessmentHasPossibleBreathOfAlcohol && !moiHasPossibleBreathOfAlcohol) {
        traumaCaseCounts.set(
          POSSIBLE_BREATH_OF_ALCOHOL_LABEL,
          (traumaCaseCounts.get(POSSIBLE_BREATH_OF_ALCOHOL_LABEL) || 0) + 1
        );

        classificationTraumaCounts.set(
          POSSIBLE_BREATH_OF_ALCOHOL_LABEL,
          (classificationTraumaCounts.get(POSSIBLE_BREATH_OF_ALCOHOL_LABEL) || 0) + 1
        );
      }
    }

    if (caseType === "interfacility") {
      const transportedTo = getFacility(report);
      if (transportedTo) {
        requestingFacilityCounts.set(
          transportedTo,
          (requestingFacilityCounts.get(transportedTo) || 0) + 1
        );
        incrementMappedCount(
          classificationInterfacilityCounts,
          transportedTo,
          INTERFACILITY_ALIASES
        );
      }
    }

    if (caseType === "hostran") {
      const facility = getFacility(report);
      if (facility) {
        requestingFacilityCounts.set(
          facility,
          (requestingFacilityCounts.get(facility) || 0) + 1
        );
      }
    }

    if (caseType === "standby_medics") {
      standbyMedicsCounts.set(
        "Standby Medics",
        (standbyMedicsCounts.get("Standby Medics") || 0) + 1
      );
    }

    if (reportDate) {
      const dayKey = formatLocalDateKey(reportDate);

      if (!dailyMap.has(dayKey)) {
        dailyMap.set(dayKey, {
          date: reportDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          medicalIn: 0,
          medicalOut: 0,
          traumaIn: 0,
          traumaOut: 0,
          averageResponseTime: "—",
          responseTimes: [],
          interFacilityWithinCity: 0,
          hospitalTransportOutsideCity: 0,
          backToBase: 0,
          total: 0,
        });
      }

      const row = dailyMap.get(dayKey);
      const within5Km = isWithin5Km(address, caseType);

      if (caseType === "medical") {
        if (within5Km) row.medicalIn += 1;
        else row.medicalOut += 1;
      }

      if (caseType === "trauma") {
        if (within5Km) row.traumaIn += 1;
        else row.traumaOut += 1;
      }

      if (caseType === "interfacility") row.interFacilityWithinCity += 1;
      if (caseType === "hostran") row.hospitalTransportOutsideCity += 1;
      if (caseType === "back_to_base") row.backToBase += 1;

      const responseMinutes = computeResponseMinutes(report);
      if (within5Km && responseMinutes !== null) {
        row.responseTimes.push(responseMinutes);
      }

      row.total += 1;
    }
  });

  const dailyRuns = [...dailyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, row]) => ({
      ...row,
      averageResponseTime:
        row.responseTimes.length > 0
          ? (
              row.responseTimes.reduce((sum, v) => sum + v, 0) / row.responseTimes.length
            ).toFixed(2)
          : "—",
    }));

  const responseTypeMapped = mapToRowsFromCountMap(responseTypeCounts, totalResponses);
  const medicalMapped = mapToRowsFromCountMap(medicalCaseCounts, totalResponses, 5);
  const traumaMapped = mapToRowsFromCountMap(traumaCaseCounts, totalResponses, 5);
  const facilityMapped = mapToRowsFromCountMap(requestingFacilityCounts, totalResponses, 5);

  const filteredBarangayCounts = new Map(
    [...barangayCounts.entries()].filter(([label]) => label !== "OTHERS")
  );

  const barangayMapped = mapToRowsFromCountMap(filteredBarangayCounts, totalResponses, 5);

  const classificationMedicalMapped = mapAllRowsFromFixedList(
    classificationMedicalCounts,
    MEDICAL_CLASSIFICATIONS,
    totalResponses
  );

  const classificationTraumaMapped = mapAllRowsFromFixedList(
    classificationTraumaCounts,
    TRAUMA_CLASSIFICATIONS,
    totalResponses
  );

  const classificationInterfacilityMapped = mapAllRowsFromFixedList(
    classificationInterfacilityCounts,
    INTERFACILITY_CLASSIFICATIONS,
    totalResponses
  );

  const standbyMedics = [...standbyMedicsCounts.entries()].map(([label, count]) => [
    label,
    count,
    formatPercent(count, totalResponses),
  ]);

  const ambulanceRuns = AMBULANCE_BODY_OPTIONS.map((label, index) => ({
    label,
    count: ambulanceCounts.get(label) || 0,
    percent: formatPercent(ambulanceCounts.get(label) || 0, totalResponses),
    originalIndex: index,
  })).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.originalIndex - b.originalIndex;
  });

  const ambulanceRunsTotal = ambulanceRuns.reduce(
    (sum, item) => sum + Number(item.count || 0),
    0
  );

  return {
    totals: {
      responses: totalResponses || "—",
      averagePerDay,
      averageResponseTime,
      connectingRuns: connectingRunsCount,
    },
    responseTypes: responseTypeMapped.rows,
    responseTypesTotal: responseTypeMapped.total,
    medicalCases: medicalMapped.rows,
    medicalCasesTotal: medicalMapped.total,
    traumaCases: traumaMapped.rows,
    traumaCasesTotal: traumaMapped.total,
    requestingFacilities: facilityMapped.rows,
    requestingFacilitiesTotal: facilityMapped.total,
    barangays: barangayMapped.rows,
    barangaysTotal: barangayMapped.total,
    standbyMedics,
    ambulanceRuns,
    ambulanceRunsTotal: [ambulanceRunsTotal, formatPercent(ambulanceRunsTotal, totalResponses)],
    dailyRuns,
    dailyTrend,
    barangaySummary: BARANGAYS.map((b) => barangaySummaryMap.get(b)),
    classificationSummary: {
      medical: classificationMedicalMapped.rows,
      medicalTotal: classificationMedicalMapped.total,
      trauma: classificationTraumaMapped.rows,
      traumaTotal: classificationTraumaMapped.total,
      interfacility: classificationInterfacilityMapped.rows,
      interfacilityTotal: classificationInterfacilityMapped.total,
    },
  };
}

function SectionTable({ title, rows = [], total, sectionClass = "" }) {
  return (
    <table className={`report-table ${sectionClass}`.trim()}>
      <thead>
        <tr>
          <th>{title}</th>
          <th>No. of Runs</th>
          <th>%</th>
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? (
          <>
            {rows.map(([label, runs, percent], index) => (
              <tr key={`${label}-${index}`}>
                <td>{label}</td>
                <td>{runs}</td>
                <td>{percent}</td>
              </tr>
            ))}
            {total ? (
              <tr className="total-row">
                <td>TOTAL</td>
                <td>{total[0]}</td>
                <td>{total[1]}</td>
              </tr>
            ) : null}
          </>
        ) : (
          <tr>
            <td colSpan="3" className="empty-cell">
              No data available.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function DailyRunsTable({ rows = [], showTotal = false, allRows = [] }) {
  const sourceRows = allRows.length ? allRows : rows;

  const totals = sourceRows.reduce(
    (acc, row) => {
      acc.medicalIn += Number(row.medicalIn || 0);
      acc.medicalOut += Number(row.medicalOut || 0);
      acc.traumaIn += Number(row.traumaIn || 0);
      acc.traumaOut += Number(row.traumaOut || 0);
      acc.interFacilityWithinCity += Number(row.interFacilityWithinCity || 0);
      acc.hospitalTransportOutsideCity += Number(row.hospitalTransportOutsideCity || 0);
      acc.backToBase += Number(row.backToBase || 0);
      acc.total += Number(row.total || 0);

      if (Array.isArray(row.responseTimes)) {
        row.responseTimes.forEach((value) => {
          const minutes = Number(value);
          if (Number.isFinite(minutes)) acc.responseTimes.push(minutes);
        });
      }

      return acc;
    },
    {
      medicalIn: 0,
      medicalOut: 0,
      traumaIn: 0,
      traumaOut: 0,
      interFacilityWithinCity: 0,
      hospitalTransportOutsideCity: 0,
      backToBase: 0,
      total: 0,
      responseTimes: [],
    }
  );

  const totalAverageResponseTime = totals.responseTimes.length
    ? (
        totals.responseTimes.reduce((sum, value) => sum + value, 0) /
        totals.responseTimes.length
      ).toFixed(2)
    : "—";

  return (
    <table className="report-table report-table-sm report-daily-table">
      <thead>
        <tr>
          <th rowSpan="2">DATE</th>
          <th colSpan="2">MEDICAL</th>
          <th colSpan="2">TRAUMA</th>
          <th rowSpan="2">AVERAGE RESPOND TIME within 5km radius (minute)</th>
          <th rowSpan="2">INTER-FACILITY within the City</th>
          <th rowSpan="2">HOSPITAL TRANSPORT outside the City</th>
          <th rowSpan="2">Back to base</th>
          <th rowSpan="2">TOTAL</th>
        </tr>
        <tr>
          <th>IN</th>
          <th>OUT</th>
          <th>IN</th>
          <th>OUT</th>
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? (
          <>
            {rows.map((row, index) => (
              <tr key={index}>
                <td>{row.date}</td>
                <td>{row.medicalIn}</td>
                <td>{row.medicalOut}</td>
                <td>{row.traumaIn}</td>
                <td>{row.traumaOut}</td>
                <td>{row.averageResponseTime}</td>
                <td>{row.interFacilityWithinCity}</td>
                <td>{row.hospitalTransportOutsideCity}</td>
                <td>{row.backToBase}</td>
                <td>{row.total}</td>
              </tr>
            ))}

            {showTotal && (
              <tr className="total-row">
                <td>TOTAL</td>
                <td>{totals.medicalIn}</td>
                <td>{totals.medicalOut}</td>
                <td>{totals.traumaIn}</td>
                <td>{totals.traumaOut}</td>
                <td>{totalAverageResponseTime}</td>
                <td>{totals.interFacilityWithinCity}</td>
                <td>{totals.hospitalTransportOutsideCity}</td>
                <td>{totals.backToBase}</td>
                <td>{totals.total}</td>
              </tr>
            )}
          </>
        ) : (
          <tr>
            <td colSpan="10" className="empty-cell">
              No data available.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function BarangaySummaryTable({ rows = [], showTotals = true, allRows = [] }) {
  const sourceRows = allRows.length ? allRows : rows;

  const totals = sourceRows.reduce(
    (acc, row) => {
      acc.medical += Number(row.medical || 0);
      acc.trauma += Number(row.trauma || 0);
      acc.interFacilityWithinCity += Number(row.interFacilityWithinCity || 0);
      acc.hospitalTransportOutsideCity += Number(row.hospitalTransportOutsideCity || 0);
      acc.covidTransport += Number(row.covidTransport || 0);
      acc.total += Number(row.total || 0);
      return acc;
    },
    {
      medical: 0,
      trauma: 0,
      interFacilityWithinCity: 0,
      hospitalTransportOutsideCity: 0,
      covidTransport: 0,
      total: 0,
    }
  );

  return (
    <table className="report-table report-table-sm report-barangay-table">
      <thead>
        <tr>
          <th>BARANGAY</th>
          <th>MEDICAL</th>
          <th>TRAUMA</th>
          <th>INTER-FACILITY within the City</th>
          <th>Hosp. transport Outside the City</th>
          <th>Covid Transport</th>
          <th>TOTAL</th>
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? (
          <>
            {rows.map((row, index) => (
              <tr key={`${row.barangay}-${index}`}>
                <td>{row.barangay}</td>
                <td>{row.medical}</td>
                <td>{row.trauma}</td>
                <td>{row.interFacilityWithinCity}</td>
                <td>{row.hospitalTransportOutsideCity}</td>
                <td>{row.covidTransport}</td>
                <td>{row.total}</td>
              </tr>
            ))}

            {showTotals && (
              <tr className="total-row">
                <td>TOTAL</td>
                <td>{totals.medical}</td>
                <td>{totals.trauma}</td>
                <td>{totals.interFacilityWithinCity}</td>
                <td>{totals.hospitalTransportOutsideCity}</td>
                <td>{totals.covidTransport}</td>
                <td>{totals.total}</td>
              </tr>
            )}
          </>
        ) : (
          <tr>
            <td colSpan="7" className="empty-cell">
              No data available.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function ClassificationSummaryTable({ title, rows = [], total, showTotal = true }) {
  return (
    <table className="report-table report-table-sm classification-table">
      <thead>
        <tr>
          <th>{title}</th>
          <th>No. of Runs</th>
          <th>%</th>
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? (
          <>
            {rows.map(([label, runs, percent], index) => (
              <tr key={`${title}-${label}-${index}`}>
                <td>{label}</td>
                <td>{runs}</td>
                <td>{percent}</td>
              </tr>
            ))}

            {showTotal && total ? (
              <tr className="total-row">
                <td>OVERALL TOTAL</td>
                <td>{total[0]}</td>
                <td>{total[1]}</td>
              </tr>
            ) : null}
          </>
        ) : (
          <tr>
            <td colSpan="3" className="empty-cell">
              No data available.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function AmbulanceRunsBarGraph({ rows = [], total = [0, "0%"] }) {
  const data = Array.isArray(rows) ? rows : [];
  const maxCount = Math.max(...data.map((item) => Number(item.count || 0)), 1);
  const totalRuns = Number(total?.[0] || 0);

  return (
    <div className="report-ambulance-graph-card">
      <div className="report-ambulance-graph-title-row">
        <div>
          <h4>AMBULANCE RUNS BAR GRAPH</h4>
          <p>Runs per ambulance based on the selected DOI period.</p>
        </div>
        <div className="report-ambulance-total-card">
          <span>Total Runs</span>
          <strong>{totalRuns}</strong>
        </div>
      </div>

      <div className="report-ambulance-chart">
        <div className="report-ambulance-y-axis">
          {[100, 75, 50, 25, 0].map((tick) => (
            <span key={tick}>{Math.round((maxCount * tick) / 100)}</span>
          ))}
        </div>

        <div className="report-ambulance-bars">
          {data.map((item) => {
            const count = Number(item.count || 0);
            const height = maxCount > 0 ? Math.max((count / maxCount) * 100, count > 0 ? 8 : 2) : 2;

            return (
              <div className="report-ambulance-bar-col" key={item.label}>
                <div className="report-ambulance-bar-wrap">
                  <div
                    className="report-ambulance-bar"
                    style={{ height: `${height}%` }}
                    aria-label={`${item.label}: ${count} runs`}
                  >
                    <span>{count}</span>
                  </div>
                </div>
                <div className="report-ambulance-bar-label">{item.label}</div>
                <div className="report-ambulance-bar-percent">{item.percent}</div>
              </div>
            );
          })}
        </div>
      </div>

      <table className="report-table report-table-sm report-ambulance-summary-table">
        <thead>
          <tr>
            <th>AMBULANCE</th>
            <th>NO. OF RUNS</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            <>
              {data.map((item) => (
                <tr key={`ambulance-row-${item.label}`}>
                  <td>{item.label}</td>
                  <td>{item.count}</td>
                  <td>{item.percent}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>TOTAL</td>
                <td>{total?.[0] ?? 0}</td>
                <td>{total?.[1] ?? "0%"}</td>
              </tr>
            </>
          ) : (
            <tr>
              <td colSpan="3" className="empty-cell">
                No data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DailyRunsTrendBarGraph({ trend = {} }) {
  const rows = Array.isArray(trend?.rows) ? trend.rows : [];
  const legend = Array.isArray(trend?.legend) && trend.legend.length ? trend.legend : DAILY_TREND_CASE_TYPES;
  const highestCount = Math.max(...rows.map((item) => Number(item.count || 0)), 0);
  const maxCount = Math.max(35, Math.ceil(highestCount / 5) * 5 || 0);
  const yTicks = [];

  for (let tick = maxCount; tick >= 0; tick -= 5) {
    yTicks.push(tick);
  }

  if (!yTicks.includes(0)) {
    yTicks.push(0);
  }

  const totalRuns = rows.reduce((sum, item) => sum + Number(item.count || 0), 0);

  return (
    <div className="report-daily-trend-card">
      <div className="report-daily-trend-title-row">
        <div>
          <h4>{trend?.title || "DAILY RUNS TREND"}</h4>
          <p>{trend?.subtitle || "Runs recorded based on DOI."}</p>
        </div>
        <div className="report-daily-trend-total-card">
          <span>Total Runs</span>
          <strong>{totalRuns}</strong>
        </div>
      </div>

      <div className="report-daily-trend-legend" aria-label="Daily runs trend legend">
        {legend.map((item) => (
          <div className="report-daily-trend-legend-item" key={item.key}>
            <span
              className="report-daily-trend-legend-dot"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="report-daily-trend-chart">
        <div className="report-daily-trend-y-axis">
          {yTicks.map((tick, index) => (
            <span key={`${tick}-${index}`}>{tick}</span>
          ))}
        </div>

        <div
          className="report-daily-trend-bars"
          style={{ gridTemplateColumns: `repeat(${Math.max(rows.length, 1)}, minmax(0, 1fr))` }}
        >
          {rows.map((item, index) => {
            const count = Number(item.count || 0);
            const height = maxCount > 0 ? Math.max((count / maxCount) * 100, count > 0 ? 8 : 2) : 2;
            const segments = Array.isArray(item.segments) ? item.segments : [];
            const ariaSegments = segments.length
              ? segments.map((segment) => `${segment.label}: ${segment.value}`).join(", ")
              : "No runs";

            return (
              <div className="report-daily-trend-bar-col" key={`${item.label}-${index}`}>
                <div className="report-daily-trend-bar-wrap">
                  <div
                    className="report-daily-trend-bar"
                    style={{ height: `${height}%` }}
                    aria-label={`${trend?.xLabel || "Day"} ${item.label}: ${count} runs. ${ariaSegments}`}
                  >
                    {segments.length > 0 && (
                      <div className="report-daily-trend-bar-stack">
                        {segments.map((segment) => (
                          <div
                            className="report-daily-trend-bar-segment"
                            key={segment.key}
                            style={{
                              height: `${(Number(segment.value || 0) / count) * 100}%`,
                              backgroundColor: segment.color,
                            }}
                            title={`${segment.label}: ${segment.value}`}
                          />
                        ))}
                      </div>
                    )}
                    <span>{count}</span>
                  </div>
                </div>
                <div className="report-daily-trend-bar-label">{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function getDailyTrendCountValue(row, key) {
  if (!row || !key) return 0;

  if (row.caseTypeCounts && row.caseTypeCounts[key] !== undefined) {
    return Number(row.caseTypeCounts[key] || 0);
  }

  const segment = Array.isArray(row.segments)
    ? row.segments.find((item) => item.key === key)
    : null;

  return Number(segment?.value || 0);
}

function getDailyTrendDistributionRows(trend = {}) {
  const rows = Array.isArray(trend?.rows) ? trend.rows : [];
  const totalRuns = rows.reduce((sum, row) => sum + Number(row?.count || 0), 0);

  return DAILY_TREND_CASE_TYPES.map((item) => {
    const count = rows.reduce((sum, row) => {
      return sum + getDailyTrendCountValue(row, item.key);
    }, 0);

    const percent = totalRuns > 0 ? `${Math.round((count / totalRuns) * 100)}%` : "0%";

    return {
      ...item,
      count,
      percent,
    };
  });
}

function DailyTrendCaseTypePieChart({ trend = {} }) {
  const rows = getDailyTrendDistributionRows(trend);
  const totalRuns = rows.reduce((sum, row) => sum + Number(row.count || 0), 0);
  const radius = 46;
  const stroke = 18;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  let cumulative = 0;

  return (
    <div className="report-daily-trend-pie-card">
      <div className="report-daily-trend-pie-head">
        <div>
          <h4>CASE TYPE DISTRIBUTION</h4>
          <p>Auto-counted from each report&apos;s case type.</p>
        </div>
        <div className="report-daily-trend-pie-total">
          <span>Total Runs</span>
          <strong>{totalRuns}</strong>
        </div>
      </div>

      <div className="report-daily-trend-pie-content">
        <div className="report-daily-trend-pie-wrap">
          <svg viewBox="0 0 120 120" className="report-daily-trend-pie-svg" aria-label="Case type distribution pie chart">
            <circle
              cx="60"
              cy="60"
              r={normalizedRadius}
              fill="transparent"
              stroke="#e2e8f0"
              strokeWidth={stroke}
            />

            {totalRuns > 0 &&
              rows.map((item) => {
                const value = Number(item.count || 0);
                const pct = value / totalRuns;
                const dash = pct * circumference;
                const gap = circumference - dash;
                const offset = -cumulative * circumference;
                cumulative += pct;

                return (
                  <circle
                    key={item.key}
                    cx="60"
                    cy="60"
                    r={normalizedRadius}
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth={stroke}
                    strokeDasharray={`${dash} ${gap}`}
                    strokeDashoffset={offset}
                    strokeLinecap="butt"
                    transform="rotate(-90 60 60)"
                  />
                );
              })}

            <text x="60" y="56" textAnchor="middle" className="report-daily-trend-pie-total-text">
              {totalRuns}
            </text>
            <text x="60" y="72" textAnchor="middle" className="report-daily-trend-pie-total-label">
              TOTAL
            </text>
          </svg>
        </div>

        <div className="report-daily-trend-pie-legend">
          {rows.map((item) => (
            <div className="report-daily-trend-pie-legend-item" key={item.key}>
              <span
                className="report-daily-trend-pie-legend-dot"
                style={{ backgroundColor: item.color }}
              />
              <span className="report-daily-trend-pie-legend-label">{item.label}</span>
              <span className="report-daily-trend-pie-legend-value">
                {item.count} ({item.percent})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DailyTrendCaseTypeDistributionTable({ trend = {} }) {
  const rows = getDailyTrendDistributionRows(trend);
  const totalRuns = rows.reduce((sum, row) => sum + Number(row.count || 0), 0);

  return (
    <div className="report-daily-trend-distribution-card">
      <div className="report-daily-trend-distribution-head">
        <div>
          <h4>CASE TYPE DISTRIBUTION</h4>
          <p>Summary of runs by case type for the selected period.</p>
        </div>
        <div className="report-daily-trend-distribution-total">
          <span>Total Runs</span>
          <strong>{totalRuns}</strong>
        </div>
      </div>

      <table className="report-table report-table-sm report-daily-trend-distribution-table">
        <thead>
          <tr>
            <th>CASE TYPE</th>
            <th>NO. OF RUNS</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>
                <span className="report-daily-trend-case-name">
                  <span
                    className="report-daily-trend-case-dot"
                    style={{ backgroundColor: row.color }}
                  />
                  {row.label}
                </span>
              </td>
              <td>{row.count}</td>
              <td>{row.percent}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td>TOTAL</td>
            <td>{totalRuns}</td>
            <td>{totalRuns > 0 ? "100%" : "0%"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DailyTrendSummaryTable({ rows = [], allRows = [], showTotal = false, xLabel = "Day" }) {
  const sourceRows = Array.isArray(allRows) && allRows.length ? allRows : rows;

  const totals = DAILY_TREND_CASE_TYPES.reduce((acc, item) => {
    acc[item.key] = sourceRows.reduce((sum, row) => {
      return sum + getDailyTrendCountValue(row, item.key);
    }, 0);
    return acc;
  }, {});

  const grandTotal = sourceRows.reduce((sum, row) => {
    return sum + Number(row?.count || 0);
  }, 0);

  const firstColumnLabel = String(xLabel || "Day").toUpperCase();

  return (
    <table className="report-table report-table-sm report-daily-trend-summary-table">
      <thead>
        <tr>
          <th>{firstColumnLabel}</th>
          {DAILY_TREND_CASE_TYPES.map((item) => (
            <th key={item.key} style={{ borderTop: `1.2mm solid ${item.color}` }}>
              {item.label}
            </th>
          ))}
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? (
          <>
            {rows.map((row, index) => (
              <tr key={`${row?.label || "period"}-${index}`}>
                <td>{row?.label || "—"}</td>
                {DAILY_TREND_CASE_TYPES.map((item) => (
                  <td key={item.key}>{getDailyTrendCountValue(row, item.key)}</td>
                ))}
                <td>{Number(row?.count || 0)}</td>
              </tr>
            ))}

            {showTotal && (
              <tr className="total-row">
                <td>TOTAL</td>
                {DAILY_TREND_CASE_TYPES.map((item) => (
                  <td key={item.key}>{totals[item.key] || 0}</td>
                ))}
                <td>{grandTotal}</td>
              </tr>
            )}
          </>
        ) : (
          <tr>
            <td colSpan={DAILY_TREND_CASE_TYPES.length + 2} className="empty-cell">
              No data available.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function buildDailyTrendTablePages(rows = []) {
  const list = Array.isArray(rows) ? rows : [];

  if (!list.length) return [[]];

  const firstPageRows = list.slice(0, 18);
  const remainingRows = list.slice(18);

  return [firstPageRows, ...chunkArray(remainingRows, 18)];
}

function HeaderPreview() {
  const mcSeal = "cdrrmo_mc_seal.png";
  const mainSeal = "cdrrmo_seal.png";
  const wordmark = "cdrrmo_word.png";
  const details = "cdrrmo_details.png";
  const ems = "cdrrmo_ems.png";

  return (
    <div className="report-pdf-header-preview report-pdf-header-built">
      <div className="report-pdf-header-top">
        <div className="report-pdf-header-left">
          <img src={mcSeal} alt="" className="report-pdf-seal report-pdf-seal-mc" />
          <img src={mainSeal} alt="" className="report-pdf-seal report-pdf-seal-main" />
        </div>

        <div className="report-pdf-header-center">
          <img src={wordmark} alt="CDRRMO" className="report-pdf-wordmark" />
        </div>

        <div className="report-pdf-header-right">
          <img src={details} alt="CDRRMO details" />
        </div>
      </div>

      <div className="report-pdf-header-bottom">
        <img src={ems} alt="EMS Section" />
      </div>
    </div>
  );
}

function ApprovalFooter() {
  return (
    <div className="report-approval-footer">
      <div className="approval-grid">
        <div className="approval-row">
          <div className="approval-label">Prepared by:</div>
          <div className="approval-person">
            <div className="approval-signature-space" />
            <div className="approval-name">ALEXANDER S. DIMAGIBA, RN.</div>
            <div className="approval-title">EMS OPERATION SECTION CHIEF</div>
          </div>
        </div>

        <div className="approval-row">
          <div className="approval-label">Noted by:</div>
          <div className="approval-person">
            <div className="approval-signature-space" />
            <div className="approval-name">ARIAN JOHNSON B. CAGA-ANAN</div>
            <div className="approval-title">OPERATIONS AND WARNING DIVISION CHIEF</div>
          </div>
        </div>

        <div className="approval-row">
          <div className="approval-label">Approved by:</div>
          <div className="approval-person">
            <div className="approval-signature-space" />
            <div className="approval-name">ALAN J. COMISO</div>
            <div className="approval-title">CGDH-1 CDRRMO</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildDetailedRunPages(rows = []) {
  const list = Array.isArray(rows) ? rows : [];

  if (!list.length) return [[]];

  const regularRowsPerPage = 10;
  const finalRowsPerPage = 6;
  const pages = [];
  let index = 0;

  while (list.length - index > finalRowsPerPage) {
    const remaining = list.length - index;
    const take = remaining - regularRowsPerPage <= finalRowsPerPage
      ? Math.max(1, remaining - finalRowsPerPage)
      : regularRowsPerPage;

    pages.push(list.slice(index, index + take));
    index += take;
  }

  pages.push(list.slice(index));
  return pages;
}

function ReportSheet({
  summaryType,
  selectedMonth,
  selectedQuarter,
  selectedYear,
  reportData,
  reportView,
}) {
  const dateLabel = getDateLabel(summaryType, selectedMonth, selectedQuarter, selectedYear);

  const showSummary = reportView === "summary";
  const showDetailed = reportView === "detailed";
  const showBarangay = reportView === "barangay";
  const showClassification = reportView === "classification";
  const showAmbulance = reportView === "ambulance";
  const showDailyTrend = reportView === "dailyTrend";

  const barangayRows = (reportData.barangaySummary || []).filter(
    (row) => row?.barangay !== "OTHERS"
  );

  const rowsPerPage = 24;
  const barangayPages = chunkArray(barangayRows, rowsPerPage);
  const detailedPages = buildDetailedRunPages(reportData.dailyRuns);
  const classificationPages = buildClassificationPages(reportData);
  const dailyTrendTablePages = buildDailyTrendTablePages(reportData.dailyTrend?.rows);
  const firstDailyTrendTablePage = dailyTrendTablePages[0] || [];
  const remainingDailyTrendTablePages = dailyTrendTablePages.slice(1);

  return (
    <>
      {showSummary && (
        <>
          <div className="report-sheet">
            <HeaderPreview />

            <div className="report-sheet-header">
              <div>
                <h3>SUMMARY OF AMBULANCE RUNS</h3>
                <p>{dateLabel} — Page 1 of 2</p>
              </div>
            </div>

            <table className="report-table report-main-table">
              <tbody>
                <tr>
                  <td>TOTAL NUMBER OF RESPONSE</td>
                  <td className="text-right">{reportData.totals.responses ?? "—"}</td>
                </tr>
                <tr>
                  <td>AVERAGE RESPONSE PER DAY</td>
                  <td className="text-right">{reportData.totals.averagePerDay ?? "—"}</td>
                </tr>
                <tr>
                  <td>AVERAGE RESPOND TIME within 5km radius</td>
                  <td className="text-right">{reportData.totals.averageResponseTime ?? "—"}</td>
                </tr>
                <tr>
                  <td>CONNECTING RUNS</td>
                  <td className="text-right">{reportData.totals.connectingRuns ?? 0}</td>
                </tr>
              </tbody>
            </table>

            <SectionTable
              title="TYPE OF RESPONSE"
              rows={reportData.responseTypes}
              total={reportData.responseTypesTotal}
              sectionClass="section-response"
            />

            <SectionTable
              title="TOP 5 MEDICAL CASES"
              rows={reportData.medicalCases}
              total={reportData.medicalCasesTotal}
              sectionClass="section-medical"
            />

            <SectionTable
              title="TOP 5 TRAUMA CASES"
              rows={reportData.traumaCases}
              total={reportData.traumaCasesTotal}
              sectionClass="section-trauma"
            />
          </div>

          <div className="report-sheet">
            <div className="report-sheet-header">
              <div>
                <h3>SUMMARY OF AMBULANCE RUNS</h3>
                <p>{dateLabel} — Page 2 of 2</p>
              </div>
            </div>

            <SectionTable
              title="TOP 5 REQUESTING HOSPITAL TRANSPORT/FACILITY"
              rows={reportData.requestingFacilities}
              total={reportData.requestingFacilitiesTotal}
              sectionClass="section-facility"
            />

            <SectionTable
              title="TOP 5 BARANGAYS"
              rows={reportData.barangays}
              total={reportData.barangaysTotal}
              sectionClass="section-barangay"
            />

            <table className="report-table section-standby">
              <thead>
                <tr>
                  <th>STANDBY MEDICS</th>
                  <th>NO. OF STANDBY MEDICS</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {reportData.standbyMedics.length > 0 ? (
                  reportData.standbyMedics.map(([label, runs, percent], index) => (
                    <tr key={`${label}-${index}`}>
                      <td>{label}</td>
                      <td>{runs}</td>
                      <td>{percent}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="empty-cell">
                      No data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <ApprovalFooter />
          </div>
        </>
      )}

      {showDetailed && (
        <>
          {detailedPages.map((pageRows, pageIndex) => {
            const isLastDetailedPage = pageIndex === detailedPages.length - 1;

            return (
              <div
                className={`report-sheet ${
                  isLastDetailedPage ? "report-sheet-detailed-final" : ""
                }`}
                key={`detailed-page-${pageIndex}`}
              >
                {pageIndex === 0 && <HeaderPreview />}

                <div className="report-sheet-header">
                  <div>
                    <h3>DETAILED AMBULANCE RUNS</h3>
                    <p>
                      {dateLabel} — Page {pageIndex + 1} of {detailedPages.length}
                    </p>
                  </div>
                </div>

                <DailyRunsTable
                  rows={pageRows}
                  showTotal={isLastDetailedPage}
                  allRows={reportData.dailyRuns}
                />

                {isLastDetailedPage && <ApprovalFooter />}
              </div>
            );
          })}
        </>
      )}

      {showDailyTrend && (
        <>
          <div className="report-sheet report-sheet-daily-trend report-sheet-daily-trend-combined">
            <HeaderPreview />

            <div className="report-sheet-header">
              <div>
                <h3>DAILY RUNS TREND</h3>
                <p>{dateLabel}</p>
              </div>
            </div>

            <div className="report-daily-trend-first-page-stack">
              <DailyRunsTrendBarGraph trend={reportData.dailyTrend} />
              <DailyTrendCaseTypePieChart trend={reportData.dailyTrend} />
            </div>
          </div>

          <div
            className={`report-sheet report-sheet-daily-trend-distribution-page ${
              dailyTrendTablePages.length === 1 ? "report-sheet-daily-trend-table-final" : ""
            }`}
          >
            <HeaderPreview />

            <div className="report-sheet-header">
              <div>
                <h3>CASE TYPE DISTRIBUTION</h3>
                <p>{dateLabel} — Case Type Summary</p>
              </div>
            </div>

            <DailyTrendCaseTypeDistributionTable trend={reportData.dailyTrend} />

            <div className="report-daily-trend-table-under-distribution">
              <div className="report-daily-trend-table-section-head">
                <h4>DAILY RUNS TREND TABLE</h4>
                <p>
                  {dateLabel} — Table Page 1 of {dailyTrendTablePages.length}
                </p>
              </div>

              <DailyTrendSummaryTable
                rows={firstDailyTrendTablePage}
                allRows={reportData.dailyTrend?.rows}
                showTotal={dailyTrendTablePages.length === 1}
                xLabel={reportData.dailyTrend?.xLabel}
              />
            </div>

            {dailyTrendTablePages.length === 1 && <ApprovalFooter />}
          </div>

          {remainingDailyTrendTablePages.map((pageRows, pageIndex) => {
            const actualPageIndex = pageIndex + 1;
            const isLastTablePage = actualPageIndex === dailyTrendTablePages.length - 1;

            return (
              <div
                className={`report-sheet report-sheet-daily-trend-table ${
                  isLastTablePage ? "report-sheet-daily-trend-table-final" : ""
                }`}
                key={`daily-trend-table-page-${actualPageIndex}`}
              >
                <HeaderPreview />

                <div className="report-sheet-header">
                  <div>
                    <h3>DAILY RUNS TREND TABLE</h3>
                    <p>{dateLabel}</p>
                  </div>
                </div>

                <div className="report-daily-trend-table-under-distribution report-daily-trend-table-under-distribution-standalone">
                  <div className="report-daily-trend-table-section-head">
                    <h4>DAILY RUNS TREND TABLE</h4>
                    <p>
                      {dateLabel} — Table Page {actualPageIndex + 1} of{" "}
                      {dailyTrendTablePages.length}
                    </p>
                  </div>

                  <DailyTrendSummaryTable
                    rows={pageRows}
                    allRows={reportData.dailyTrend?.rows}
                    showTotal={isLastTablePage}
                    xLabel={reportData.dailyTrend?.xLabel}
                  />
                </div>

                {isLastTablePage && <ApprovalFooter />}
              </div>
            );
          })}
        </>
      )}

      {showAmbulance && (
        <div className="report-sheet report-sheet-ambulance-graph">
          <HeaderPreview />

          <div className="report-sheet-header">
            <div>
              <h3>AMBULANCE RUNS</h3>
              <p>{dateLabel}</p>
            </div>
          </div>

          <AmbulanceRunsBarGraph
            rows={reportData.ambulanceRuns}
            total={reportData.ambulanceRunsTotal}
          />

          <ApprovalFooter />
        </div>
      )}

      {showBarangay &&
        barangayPages.map((pageRows, pageIndex) => (
          <div className="report-sheet" key={`barangay-page-${pageIndex}`}>
            {pageIndex === 0 && <HeaderPreview />}

            <div className="report-sheet-header">
              <div>
                <h3>BARANGAY SUMMARY</h3>
                <p>
                  {dateLabel}
                  {barangayPages.length > 1
                    ? ` — Page ${pageIndex + 1} of ${barangayPages.length}`
                    : ""}
                </p>
              </div>
            </div>

            <BarangaySummaryTable
              rows={pageRows}
              showTotals={pageIndex === barangayPages.length - 1}
              allRows={barangayRows}
            />

            {pageIndex === barangayPages.length - 1 && <ApprovalFooter />}
          </div>
        ))}

      {showClassification &&
        classificationPages.map((page, pageIndex) => (
          <div className="report-sheet" key={`classification-page-${pageIndex}`}>
            {pageIndex === 0 && <HeaderPreview />}

            <div className="report-sheet-header">
              <div>
                <h3>CLASSIFICATION SUMMARY</h3>
                <p>
                  {dateLabel}
                  {classificationPages.length > 1
                    ? ` — Page ${pageIndex + 1} of ${classificationPages.length}`
                    : ""}
                </p>
              </div>
            </div>

            <ClassificationSummaryTable
              title={page.sectionTitle}
              rows={page.rows}
              total={page.total}
              showTotal={page.isLastChunk}
            />

            {pageIndex === classificationPages.length - 1 && <ApprovalFooter />}
          </div>
        ))}
    </>
  );
}

function getReportFileBase(reportView, summaryType, selectedMonth, selectedQuarter, selectedYear) {
  const viewLabel =
    reportView === "summary"
      ? "summary-of-ambulance-runs"
      : reportView === "detailed"
      ? "detailed-ambulance-runs"
      : reportView === "ambulance"
      ? "ambulance-runs-bar-graph"
      : reportView === "dailyTrend"
      ? "daily-runs-trend-bar-graph"
      : reportView === "barangay"
      ? "barangay-summary"
      : "classification-summary";

  if (summaryType === "Monthly") {
    return `${viewLabel}-${selectedMonth}-${selectedYear}`;
  }

  if (summaryType === "Quarterly") {
    return `${viewLabel}-${getQuarterLabel(selectedQuarter)
      .replace(/\s+/g, "-")
      .toLowerCase()}-${selectedYear}`;
  }

  return `${viewLabel}-annual-${selectedYear}`;
}

function Reports() {
  const [summaryType, setSummaryType] = useState("Monthly");
  const [selectedMonth, setSelectedMonth] = useState("January");
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [reportView, setReportView] = useState("summary");
  const [showPreview, setShowPreview] = useState(false);
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState("");

  const pdfRef = useRef(null);

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

    console.log("[Reports] API_BASE:", API_BASE);
    console.log("[Reports] /api/reports/ response:", data);

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
    let mounted = true;

    async function run() {
      try {
        setLoadingReports(true);
        setReportsError("");

        const list = await fetchReports();
        console.log("[Reports] fetched list:", list);

        if (mounted) {
          setReports(list);
        }
      } catch (error) {
        console.error("Failed to fetch reports:", error);

        if (mounted) {
          setReports([]);
          setReportsError(error.message || "Failed to load reports.");
        }
      } finally {
        if (mounted) setLoadingReports(false);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, []);

  const reportData = useMemo(() => {
    return buildReportData(reports, summaryType, selectedMonth, selectedQuarter, selectedYear);
  }, [reports, summaryType, selectedMonth, selectedQuarter, selectedYear]);

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
        await Promise.race([document.fonts.ready, wait(timeoutMs)]);
      }
    } catch {
    }
  };

  const assetUrl = (fileName) => {
    const cleanName = String(fileName || "").replace(/^\/+/, "");
    return cleanName;
  };

  const toDataUrl = (src, timeoutMs = 8000) =>
    new Promise((resolve) => {
      if (!src) {
        resolve(null);
        return;
      }

      const img = new Image();
      let done = false;

      const finish = (value) => {
        if (done) return;
        done = true;
        resolve(value);
      };

      const timer = setTimeout(() => finish(null), timeoutMs);

      img.onload = () => {
        clearTimeout(timer);

        try {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth || img.width || 1;
          c.height = img.naturalHeight || img.height || 1;

          const ctx = c.getContext("2d");
          if (!ctx) {
            finish(null);
            return;
          }

          ctx.drawImage(img, 0, 0);
          finish(c.toDataURL("image/png"));
        } catch {
          finish(null);
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        finish(null);
      };

      try {
        if (/^https?:/i.test(src)) {
          img.crossOrigin = "anonymous";
        }

        img.src = src;
      } catch {
        clearTimeout(timer);
        finish(null);
      }
    });

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

  const getHeaderAssets = async () => {
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

    const [seal1Trimmed, seal2Trimmed] = await Promise.all([
      trimTransparent(seal1),
      trimTransparent(seal2),
    ]);

    console.log("[Reports] Header assets:", {
      seal1: !!seal1,
      seal2: !!seal2,
      word: !!word,
      details: !!details,
      ems: !!ems,
    });

    return {
      seal1: seal1Trimmed || seal1,
      seal2: seal2Trimmed || seal2,
      word,
      details,
      ems,
    };
  };

  const drawImageContainedOnCanvas = (ctx, img, boxX, boxY, boxW, boxH = boxW) => {
    if (!img) return;

    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;
    const ratio = iw / ih;

    let drawW = boxW;
    let drawH = boxH;

    if (ratio > boxW / boxH) {
      drawH = drawW / ratio;
    } else {
      drawW = drawH * ratio;
    }

    const dx = boxX + (boxW - drawW) / 2;
    const dy = boxY + (boxH - drawH) / 2;

    ctx.drawImage(img, dx, dy, drawW, drawH);
  };

  const loadImageElement = (dataUrl, timeoutMs = 8000) =>
    new Promise((resolve) => {
      if (!dataUrl) {
        resolve(null);
        return;
      }

      const img = new Image();
      let done = false;

      const finish = (value) => {
        if (done) return;
        done = true;
        resolve(value);
      };

      const timer = setTimeout(() => finish(null), timeoutMs);

      img.onload = () => {
        clearTimeout(timer);
        finish(img);
      };

      img.onerror = () => {
        clearTimeout(timer);
        finish(null);
      };

      img.src = dataUrl;
    });

  const createHeaderCanvas = async (widthPx, heightPx) => {
    const assets = await getHeaderAssets();

    const [seal1Img, seal2Img, wordImg, detailsImg, emsImg] = await Promise.all([
      loadImageElement(assets.seal1),
      loadImageElement(assets.seal2),
      loadImageElement(assets.word),
      loadImageElement(assets.details),
      loadImageElement(assets.ems),
    ]);

    const canvas = document.createElement("canvas");
    canvas.width = widthPx;
    canvas.height = heightPx;

    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    const scaleX = widthPx / 1820;
    const scaleY = heightPx / 312;
    const sx = (v) => v * scaleX;
    const sy = (v) => v * scaleY;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, widthPx, heightPx);

    ctx.strokeStyle = "rgba(15,23,42,0.12)";
    ctx.lineWidth = 2;

    const rx = sx(4);
    const ry = sy(4);
    const rw = widthPx - sx(8);
    const rh = heightPx - sy(8);
    const r = sx(12);

    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
    ctx.lineTo(rx + rw, ry + rh - r);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
    ctx.lineTo(rx + r, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
    ctx.lineTo(rx, ry + r);
    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
    ctx.closePath();
    ctx.stroke();

    const sealBox = sx(178);
    const stripX = sx(24);
    const stripW = widthPx - sx(48);
    const stripH = sy(124);
    const stripY = sy(176);

    const topZoneY = sy(2);
    const topZoneH = sy(168);

    let currentX = sx(28);
    const sealsY = topZoneY + (topZoneH - sealBox) / 2 + sy(4);

    drawImageContainedOnCanvas(ctx, seal1Img, currentX, sealsY, sealBox, sealBox);
    currentX += sealBox + sx(12);

    drawImageContainedOnCanvas(ctx, seal2Img, currentX, sealsY, sealBox, sealBox);
    currentX += sealBox + sx(18);

    const detailsAreaW = sx(820);
    const detailsAreaX = widthPx - sx(18) - detailsAreaW;
    const detailsAreaY = topZoneY;
    const detailsAreaH = topZoneH;

    const detailsW = detailsAreaW;
    const detailsH = sy(155);
    const detailsX = detailsAreaX;
    const detailsY = detailsAreaY + (detailsAreaH - detailsH);

    if (detailsImg) {
      ctx.drawImage(detailsImg, detailsX, detailsY, detailsW, detailsH);
    }

    const leftBoundary = currentX + sx(18);
    const rightBoundary = detailsAreaX - sx(12);
    const availableCenterW = Math.max(sx(220), rightBoundary - leftBoundary);
    const wordW = Math.min(sx(1040), availableCenterW);
    const wordH = sy(170);
    const wordX = leftBoundary + (availableCenterW - wordW) / 2;
    const wordY = topZoneY + (topZoneH - wordH) / 2;

    if (wordImg) {
      drawImageContainedOnCanvas(ctx, wordImg, wordX, wordY, wordW, wordH);
    }

    if (emsImg) {
      ctx.drawImage(emsImg, stripX, stripY, stripW, stripH);
    }

    return canvas;
  };

  const renderSheetsToImages = async () => {
    if (!pdfRef.current) return [];

    const sheets = Array.from(pdfRef.current.querySelectorAll(".report-sheet"));
    if (!sheets.length) return [];

    await waitForImages(pdfRef.current);

    const images = [];

    for (let index = 0; index < sheets.length; index++) {
      const sheet = sheets[index];

      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-100000px";
      wrapper.style.top = "0";
      wrapper.style.width = `${sheet.offsetWidth}px`;
      wrapper.style.pointerEvents = "none";
      wrapper.style.opacity = "1";
      wrapper.style.zIndex = "-1";
      wrapper.style.background = "#ffffff";

      const clone = sheet.cloneNode(true);
      clone.style.width = `${sheet.offsetWidth}px`;
      clone.style.height = `${sheet.offsetHeight}px`;
      clone.style.margin = "0";
      clone.style.background = "#ffffff";
      clone.style.boxShadow = "none";

      const header = clone.querySelector(".report-pdf-header-preview");
      if (header) header.remove();

      clone.style.paddingTop = index === 0 ? "52mm" : "12mm";

      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      try {
        await waitForImages(wrapper);

        const bodyCanvas = await html2canvas(clone, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: clone.scrollWidth || clone.offsetWidth || 794,
          windowHeight: clone.scrollHeight || clone.offsetHeight || 1123,
          imageTimeout: 8000,
        });

        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = bodyCanvas.width;
        finalCanvas.height = bodyCanvas.height;

        const ctx = finalCanvas.getContext("2d");
        if (!ctx) continue;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        ctx.drawImage(bodyCanvas, 0, 0);

        if (index === 0) {
          const headerHeight = Math.round(finalCanvas.height * (40 / 297));
          const headerTop = Math.round(finalCanvas.height * (8 / 297));
          const headerLeft = Math.round(finalCanvas.width * (12 / 210));
          const headerWidth = finalCanvas.width - headerLeft * 2;

          const headerCanvas = await createHeaderCanvas(headerWidth, headerHeight);
          ctx.drawImage(headerCanvas, headerLeft, headerTop, headerWidth, headerHeight);
        }

        images.push({
          dataUrl: finalCanvas.toDataURL("image/png", 1.0),
          width: finalCanvas.width,
          height: finalCanvas.height,
        });
      } finally {
        if (wrapper.parentNode) {
          wrapper.parentNode.removeChild(wrapper);
        }
      }
    }

    return images;
  };

  const handleOpenPreview = async () => {
    if (isRenderingPreview) return;

    setShowPreview(true);
    setPreviewImages([]);
    setIsRenderingPreview(true);

    try {
      const images = await Promise.race([
        renderSheetsToImages(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Preview rendering timed out.")), 20000)
        ),
      ]);

      console.log("[Reports] preview images:", images);
      setPreviewImages(images);

      if (!images.length) {
        throw new Error("No preview images were generated.");
      }
    } catch (error) {
      console.error("Preview render failed:", error);
      setReportsError(error.message || "Failed to render preview.");
      setShowPreview(false);
    } finally {
      setIsRenderingPreview(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewImages([]);
  };
  const handleDownloadPDF = async () => {
    if (isDownloading) return;

    setIsDownloading(true);

    try {
      let images = previewImages;

      if (!images.length) {
        images = await renderSheetsToImages();
        setPreviewImages(images);
      }

      if (!images.length) {
        throw new Error("No preview images were generated.");
      }

      const filename = `${getReportFileBase(
        reportView,
        summaryType,
        selectedMonth,
        selectedQuarter,
        selectedYear
      )}.pdf`;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      images.forEach((image, index) => {
        if (index > 0) pdf.addPage();

        const ratio = Math.min(pageWidth / image.width, pageHeight / image.height);

        const renderWidth = image.width * ratio;
        const renderHeight = image.height * ratio;
        const x = (pageWidth - renderWidth) / 2;
        const y = (pageHeight - renderHeight) / 2;

        pdf.addImage(
          image.dataUrl,
          "PNG",
          x,
          y,
          renderWidth,
          renderHeight,
          undefined,
          "FAST"
        );
      });

      pdf.save(filename);
    } catch (error) {
      console.error("PDF download failed:", error);
      setReportsError(error.message || "Failed to generate PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="reports-layout">
      <Sidebar />

      <div className="reports-main">
        <div className="reports-page">
          <div className="reports-head">
            <div>
              <div className="reports-crumbs">Reports</div>
              <h2 className="reports-title">Report Summary</h2>
              <p className="reports-subtitle">
                View monthly, quarterly and annual EMS patient care report summaries.
              </p>
            </div>
          </div>

          {reportsError ? (
            <div className="reports-debug-panel reports-debug-error">
              <strong>Error:</strong> {reportsError}
            </div>
          ) : null}

          <section className="reports-filters-panel">
            <div className="reports-filters">
              <div className="reports-field">
                <label>Summary Type</label>
                <select
                  value={summaryType}
                  onChange={(e) => setSummaryType(e.target.value)}
                  className="reports-select"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Annually">Annually</option>
                </select>
              </div>

              <div className="reports-field reports-field-report-type">
                <label>Report Type</label>
                <select
                  value={reportView}
                  onChange={(e) => setReportView(e.target.value)}
                  className="reports-select"
                >
                  <option value="summary">Summary of Ambulance Runs</option>
                  <option value="detailed">Detailed Ambulance Runs</option>
                  <option value="dailyTrend">Daily Runs Trend Bar Graph</option>
                  <option value="ambulance">Ambulance Runs Bar Graph</option>
                  <option value="barangay">Barangay Summary</option>
                  <option value="classification">Classification Summary</option>
                </select>
              </div>

              <div className="reports-field">
                <label>Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="reports-select"
                  disabled={summaryType !== "Monthly"}
                >
                  {MONTHS.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div className="reports-field">
                <label>Quarter</label>
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  className="reports-select"
                  disabled={summaryType !== "Quarterly"}
                >
                  {QUARTERS.map((quarter) => (
                    <option key={quarter.value} value={quarter.value}>
                      {quarter.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="reports-field">
                <label>Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="reports-select"
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029</option>
                  <option value="2030">2030</option>
                </select>
              </div>

              <div className="reports-actions">
                <button
                  type="button"
                  className="reports-btn reports-btn-secondary"
                  onClick={handleOpenPreview}
                  disabled={isRenderingPreview || loadingReports}
                >
                  {isRenderingPreview
                    ? "Rendering..."
                    : loadingReports
                    ? "Loading..."
                    : "Preview PDF"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="report-render-root" aria-hidden="true">
        <div ref={pdfRef} className="a4-document a4-document-print">
          <ReportSheet
            summaryType={summaryType}
            selectedMonth={selectedMonth}
            selectedQuarter={selectedQuarter}
            selectedYear={selectedYear}
            reportData={reportData}
            reportView={reportView}
          />
        </div>
      </div>

      {showPreview && (
        <div className="pdf-preview-overlay">
          <div className="pdf-preview-modal">
            <div className="pdf-preview-header">
              <h3>PDF Preview</h3>

              <div className="pdf-preview-buttons">
                <button
                  type="button"
                  className="reports-btn reports-btn-secondary"
                  onClick={handleClosePreview}
                >
                  Close
                </button>

                <button
                  type="button"
                  className="reports-btn reports-btn-primary"
                  onClick={handleDownloadPDF}
                  disabled={isDownloading || isRenderingPreview || !previewImages.length}
                >
                  {isDownloading ? "Downloading..." : "Download PDF"}
                </button>
              </div>
            </div>

            <div className="pdf-preview-body pdf-preview-body-images">
              {isRenderingPreview ? (
                <div className="pdf-preview-loading">Rendering preview...</div>
              ) : previewImages.length ? (
                previewImages.map((image, index) => (
                  <img
                    key={index}
                    src={image.dataUrl}
                    alt={`PDF Preview Page ${index + 1}`}
                    className="pdf-preview-page-image"
                  />
                ))
              ) : (
                <div className="pdf-preview-loading">No preview generated.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
