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
  "Alergic Reaction",
  "Bronchial Asthma",
  "Bleeding",
  "Body Malaise",
  "Cellulities",
  "Cyanosis",
  "Chest Pain",
  "Cough and Colds",
  "Difficult Urination",
  "Dizziness",
  "Difficult of Breathing",
  "Edema",
  "Epigastric Pain",
  "Epistaxis",
  "Fainting",
  "Fever",
  "Hemoptisis",
  "Hypertension",
  "Loose Bowel Movement",
  "Lost of Consciousness",
  "Muscle Regidity",
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
  "Electricuted",
  "Fall",
  "Hacking",
  "Hit and Run",
  "Insect and Animal Bites",
  "Mauling",
  "Pedistrian Accident",
  "Traumatic Injury",
  "Shooting",
  "Side Swipe",
  "Single Accident",
  "Sprain",
  "Stabbing",
  "Stonning",
  "Suicide",
];

const INTERFACILITY_CLASSIFICATIONS = [
  "MPGH or Malaybalay Polymedic General Hospital",
  "BBH or Bethel Baptist Hospital",
  "BPMC or Bukidnon Provincial Medical Center",
  "St. Jude",
  "MIDWAY CLINIC or MIDWAY DOCTORS CLINIC",
  "BBH or Barangay Health Center",
  "MMHC or Malaybalay Medical Hospital Clinic",
  "Hospital to Home",
  "Follow Up Check Up",
  "School Clinic",
  "Lying In",
  "Walk-In",
  "Police station",
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
    .replace(/\s+/g, " ")
    .trim();
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

const MEDICAL_ALIASES = {
  "Alergic Reaction": ["Allergic Reaction"],
  Cellulities: ["Cellulitis"],
  Hemoptisis: ["Hemoptysis"],
  "Lost of Consciousness": ["Loss of Consciousness"],
  "Muscle Regidity": ["Muscle Rigidity"],
  "Difficult of Breathing": ["Difficulty of Breathing", "Difficulty Breathing"],
};

const TRAUMA_ALIASES = {
  "2X2 V/A or 2X2 Vehicle Accident": ["2X2 V/A", "2X2 Vehicle Accident"],
  "4X2 V/A or 4X2 Vehicle Accident": ["4X2 V/A", "4X2 Vehicle Accident"],
  "4X4 V/A or 4X4 Vehicle Accident": ["4X4 V/A", "4X4 Vehicle Accident"],
  Electricuted: ["Electrocuted"],
  "Pedistrian Accident": ["Pedestrian Accident"],
  Stonning: ["Stoning"],
};

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
  "MIDWAY CLINIC or MIDWAY DOCTOR CLINIC": [
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
};

function incrementMappedCount(map, rawValue, aliases = {}) {
  const normalizedRaw = normalizeText(rawValue);
  if (!normalizedRaw) return;

  for (const [label, aliasList] of Object.entries(aliases)) {
    const allNames = [label, ...(aliasList || [])].map(normalizeText);
    if (allNames.includes(normalizedRaw)) {
      map.set(label, (map.get(label) || 0) + 1);
      return;
    }
  }

  for (const key of map.keys()) {
    if (normalizeText(key) === normalizedRaw) {
      map.set(key, (map.get(key) || 0) + 1);
      return;
    }
  }
}

function getBarangayFromAddress(address) {
  const normalizedAddress = normalizeText(address);

  if (!normalizedAddress) return null;

  const aliases = {
    "STO. NINO": ["STO NINO", "SANTO NINO"],
    "PAT-PAT": ["PAT PAT", "PATPAT"],
    "APO MACOTE": ["APO MACOTE"],
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
    .replace(/[\s-]+/g, "_");

  if (!value) return "";

  if (value.includes("medical")) return "medical";
  if (value.includes("trauma")) return "trauma";
  if (value.includes("interfacility") || value.includes("inter_facility")) {
    return "interfacility";
  }
  if (value.includes("hostran") || value.includes("host_ran")) return "hostran";
  if (value.includes("hospital_transport")) return "hostran";
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
    safeDate(report?.incident?.doi) ||
    safeDate(report?.date_of_incident) ||
    safeDate(report?.incident?.date_of_incident) ||
    safeDate(report?.incident_date) ||
    safeDate(report?.incident?.incident_date) ||
    safeDate(report?.date) ||
    safeDate(report?.created_at) ||
    safeDate(report?.created) ||
    safeDate(report?.timestamp) ||
    safeDate(report?.datetime) ||
    safeDate(report?.incident_datetime) ||
    safeDate(report?.updated_at) ||
    null
  );
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

function getChiefComplaint(report) {
  return report?.patient?.chief_complaint || report?.chief_complaint || "";
}

function getFacility(report) {
  return report?.transported_to || "";
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

function buildReportData(reports, summaryType, selectedMonth, selectedQuarter, selectedYear) {
  const filteredReports = (reports || []).filter((report) =>
    matchesSelectedPeriod(report, summaryType, selectedMonth, selectedQuarter, selectedYear)
  );

  const totalResponses = filteredReports.length;

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

    if (caseTypeLabel) {
      responseTypeCounts.set(caseTypeLabel, (responseTypeCounts.get(caseTypeLabel) || 0) + 1);
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
        medicalCaseCounts.set(chiefComplaint, (medicalCaseCounts.get(chiefComplaint) || 0) + 1);
        incrementMappedCount(classificationMedicalCounts, chiefComplaint, MEDICAL_ALIASES);
      }
    }

    if (caseType === "trauma") {
      const chiefComplaint = getChiefComplaint(report);
      if (chiefComplaint) {
        traumaCaseCounts.set(chiefComplaint, (traumaCaseCounts.get(chiefComplaint) || 0) + 1);
        incrementMappedCount(classificationTraumaCounts, chiefComplaint, TRAUMA_ALIASES);
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
              row.responseTimes.reduce((sum, v) => sum + v, 0) /
              row.responseTimes.length
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

  return {
    totals: {
      responses: totalResponses || "—",
      averagePerDay,
      averageResponseTime,
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
    dailyRuns,
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

function DailyRunsTable({ rows = [] }) {
  return (
    <table className="report-table report-table-sm report-daily-table">
      <thead>
        <tr>
          <th rowSpan="2">DATE</th>
          <th colSpan="2">MEDICAL</th>
          <th colSpan="2">TRAUMA</th>
          <th rowSpan="2">AVERAGE RESPONSE TIME within 5 km. radius (minute)</th>
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
          rows.map((row, index) => (
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
          ))
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

  const rowsPerPage = 15;
  return chunkArray(list, rowsPerPage);
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

  const barangayRows = (reportData.barangaySummary || []).filter(
    (row) => row?.barangay !== "OTHERS"
  );

  const rowsPerPage = 24;
  const barangayPages = chunkArray(barangayRows, rowsPerPage);
  const detailedPages = buildDetailedRunPages(reportData.dailyRuns);
  const classificationPages = buildClassificationPages(reportData);

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
                  <td>AVERAGE RESPONSE TIME within 5 km radius</td>
                  <td className="text-right">{reportData.totals.averageResponseTime ?? "—"}</td>
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

                <DailyRunsTable rows={pageRows} />

                {isLastDetailedPage && <ApprovalFooter />}
              </div>
            );
          })}
        </>
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
      // ignore
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

      const viewLabel =
        reportView === "summary"
          ? "summary-of-ambulance-runs"
          : reportView === "detailed"
          ? "detailed-ambulance-runs"
          : reportView === "barangay"
          ? "barangay-summary"
          : "classification-summary";

      const filename =
        summaryType === "Monthly"
          ? `${viewLabel}-${selectedMonth}-${selectedYear}.pdf`
          : summaryType === "Quarterly"
          ? `${viewLabel}-${getQuarterLabel(selectedQuarter)
              .replace(/\s+/g, "-")
              .toLowerCase()}-${selectedYear}.pdf`
          : `${viewLabel}-annual-${selectedYear}.pdf`;

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