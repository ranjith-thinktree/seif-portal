import {
  CERTIFICATION_ARCHIVE_MONTH_OPTIONS,
  CERTIFICATION_ARCHIVE_YEAR_OPTIONS,
} from "./certificationArchiveUtils";

/** Certification report period modes (Assessment Date) */
export const CERTIFICATION_PERIOD_MODE_OPTIONS = [
  { value: "month", label: "Month" },
  { value: "day", label: "Day" },
  { value: "range", label: "Range" },
  { value: "calendar_year", label: "Calendar Year" },
  { value: "financial_year", label: "Financial Year" },
];

export function toIsoDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** FY Apr–Mar: if month >= April (index 3), start year is current year */
export function getCurrentFyStartYear(date = new Date()) {
  return date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
}

export function formatFyLabel(startYear) {
  const y = Number(startYear);
  return `${y}-${String(y + 1).slice(-2)}`;
}

export function buildFyOptions(yearsBack = 6) {
  const currentStart = getCurrentFyStartYear();
  const options = [];
  for (let i = 0; i <= yearsBack; i += 1) {
    const start = currentStart - i;
    options.push({ value: String(start), label: formatFyLabel(start) });
  }
  return options;
}

export function defaultCertificationPeriodState(date = new Date()) {
  const iso = toIsoDate(date);
  const monthStart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  return {
    mode: "month",
    month: String(date.getMonth() + 1),
    year: String(date.getFullYear()),
    day: iso,
    fromDate: monthStart,
    toDate: iso,
    fyStartYear: String(getCurrentFyStartYear(date)),
  };
}

/**
 * Build archive API filter object for the certification reports panel.
 * Month / Calendar Year use month+year filters; Day / Range / FY use fromDate/toDate.
 */
export function buildCertificationReportFilters(period = {}) {
  const dateTypes = ["assessment"];
  const traineeMetrics = [];
  const mode = period.mode || "month";

  if (mode === "month") {
    return {
      dateTypes,
      months: [String(period.month)],
      years: [String(period.year)],
      traineeMetrics,
    };
  }

  if (mode === "calendar_year") {
    return {
      dateTypes,
      months: CERTIFICATION_ARCHIVE_MONTH_OPTIONS.map((m) => m.value),
      years: [String(period.year)],
      traineeMetrics,
    };
  }

  if (mode === "day") {
    const day = String(period.day || toIsoDate());
    return { dateTypes, fromDate: day, toDate: day, traineeMetrics };
  }

  if (mode === "range") {
    let fromDate = String(period.fromDate || "");
    let toDate = String(period.toDate || "");
    if (fromDate && toDate && fromDate > toDate) {
      [fromDate, toDate] = [toDate, fromDate];
    }
    return { dateTypes, fromDate, toDate, traineeMetrics };
  }

  if (mode === "financial_year") {
    const start = Number(period.fyStartYear) || getCurrentFyStartYear();
    return {
      dateTypes,
      fromDate: `${start}-04-01`,
      toDate: `${start + 1}-03-31`,
      traineeMetrics,
    };
  }

  return {
    dateTypes,
    months: [String(new Date().getMonth() + 1)],
    years: [String(new Date().getFullYear())],
    traineeMetrics,
  };
}

export function formatReadableIsoDate(iso) {
  if (!iso) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim());
  if (!match) return String(iso);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthIdx = Number(match[2]) - 1;
  const monthLabel = months[monthIdx] || match[2];
  return `${match[3]} ${monthLabel} ${match[1]}`;
}

export function getCertificationPeriodModeLabel(mode) {
  return (
    CERTIFICATION_PERIOD_MODE_OPTIONS.find((o) => o.value === mode)?.label ||
    "Period"
  );
}

export function describeCertificationReportPeriod(period = {}) {
  const mode = period.mode || "month";
  if (mode === "month") {
    const monthLabel =
      CERTIFICATION_ARCHIVE_MONTH_OPTIONS.find(
        (m) => m.value === String(period.month),
      )?.label || period.month;
    return `${monthLabel} ${period.year}`;
  }
  if (mode === "day") return formatReadableIsoDate(period.day);
  if (mode === "range") {
    return `${formatReadableIsoDate(period.fromDate)} → ${formatReadableIsoDate(period.toDate)}`;
  }
  if (mode === "calendar_year") return String(period.year || "—");
  if (mode === "financial_year") {
    return formatFyLabel(period.fyStartYear);
  }
  return "—";
}

/** Subtitle: "Month · July 2026" */
export function describeCertificationReportPeriodFull(period = {}) {
  const modeLabel = getCertificationPeriodModeLabel(period.mode || "month");
  const detail = describeCertificationReportPeriod(period);
  return `${modeLabel} · ${detail}`;
}

function sanitizeFilenamePart(value) {
  return String(value || "")
    .trim()
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function certificationReportExportFilename(period = {}) {
  const mode = period.mode || "month";
  const stamp = toIsoDate();
  if (mode === "month") {
    const monthLabel =
      CERTIFICATION_ARCHIVE_MONTH_OPTIONS.find(
        (m) => m.value === String(period.month),
      )?.label || String(period.month).padStart(2, "0");
    return `SEIF_Certification_${sanitizeFilenamePart(monthLabel)}_${period.year}.xlsx`;
  }
  if (mode === "day") {
    return `SEIF_Certification_Day_${sanitizeFilenamePart(period.day || stamp)}.xlsx`;
  }
  if (mode === "range") {
    return `SEIF_Certification_Range_${sanitizeFilenamePart(period.fromDate || stamp)}_to_${sanitizeFilenamePart(period.toDate || stamp)}.xlsx`;
  }
  if (mode === "calendar_year") {
    return `SEIF_Certification_CY_${sanitizeFilenamePart(period.year)}.xlsx`;
  }
  if (mode === "financial_year") {
    return `SEIF_Certification_FY_${sanitizeFilenamePart(formatFyLabel(period.fyStartYear))}.xlsx`;
  }
  return `SEIF_Certification_${stamp}.xlsx`;
}

export { CERTIFICATION_ARCHIVE_MONTH_OPTIONS, CERTIFICATION_ARCHIVE_YEAR_OPTIONS };
