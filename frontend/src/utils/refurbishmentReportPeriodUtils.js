import { CERTIFICATION_ARCHIVE_MONTH_OPTIONS } from "./certificationArchiveUtils";
import {
  buildFyOptions,
  formatFyLabel,
  formatReadableIsoDate,
  getCurrentFyStartYear,
  toIsoDate,
} from "./certificationReportPeriodUtils";
import { getYearFilterOptions } from "./refurbishmentUtils";

export const REFURBISHMENT_PERIOD_MODE_OPTIONS = [
  { value: "month", label: "Month" },
  { value: "day", label: "Day" },
  { value: "range", label: "Range" },
  { value: "calendar_year", label: "Calendar Year" },
  { value: "financial_year", label: "Financial Year" },
];

export { buildFyOptions, CERTIFICATION_ARCHIVE_MONTH_OPTIONS as MONTH_OPTIONS };

export function getRefurbishmentReportYearOptions(yearsBack = 6) {
  return getYearFilterOptions(yearsBack);
}

/** Default stays calendar year (previous panel behavior) */
export function defaultRefurbishmentPeriodState(date = new Date()) {
  const iso = toIsoDate(date);
  const monthStart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  return {
    mode: "calendar_year",
    month: String(date.getMonth() + 1),
    year: String(date.getFullYear()),
    day: iso,
    fromDate: monthStart,
    toDate: iso,
    fyStartYear: String(getCurrentFyStartYear(date)),
  };
}

function lastDayOfMonth(year, month) {
  const y = Number(year);
  const m = Number(month);
  const d = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Resolve inclusive from/to dates for the selected period.
 * Used for past-requests + refurbished stats (except calendar_year can use year API).
 */
export function resolveRefurbishmentPeriodBounds(period = {}) {
  const mode = period.mode || "calendar_year";

  if (mode === "month") {
    const year = String(period.year || new Date().getFullYear());
    const month = String(period.month || new Date().getMonth() + 1);
    return {
      fromDate: `${year}-${String(month).padStart(2, "0")}-01`,
      toDate: lastDayOfMonth(year, month),
      year: null,
    };
  }

  if (mode === "day") {
    const day = String(period.day || toIsoDate());
    return { fromDate: day, toDate: day, year: null };
  }

  if (mode === "range") {
    let fromDate = String(period.fromDate || "");
    let toDate = String(period.toDate || "");
    if (fromDate && toDate && fromDate > toDate) {
      [fromDate, toDate] = [toDate, fromDate];
    }
    return { fromDate, toDate, year: null };
  }

  if (mode === "financial_year") {
    const start = Number(period.fyStartYear) || getCurrentFyStartYear();
    return {
      fromDate: `${start}-04-01`,
      toDate: `${start + 1}-03-31`,
      year: null,
    };
  }

  // calendar_year — prefer year filter (legacy API path)
  const year = String(period.year || new Date().getFullYear());
  return {
    fromDate: `${year}-01-01`,
    toDate: `${year}-12-31`,
    year: Number(year),
  };
}

export function buildRefurbishmentPastRequestParams(period = {}, extra = {}) {
  const bounds = resolveRefurbishmentPeriodBounds(period);
  const params = { limit: 200, offset: 0, ...extra };
  if (period.mode === "calendar_year" && bounds.year) {
    params.year = bounds.year;
  } else {
    params.fromDate = bounds.fromDate;
    params.toDate = bounds.toDate;
  }
  return params;
}

export function describeRefurbishmentReportPeriod(period = {}) {
  const mode = period.mode || "calendar_year";
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
  if (mode === "financial_year") return formatFyLabel(period.fyStartYear);
  return "—";
}

export function describeRefurbishmentReportPeriodFull(period = {}) {
  const modeLabel =
    REFURBISHMENT_PERIOD_MODE_OPTIONS.find((o) => o.value === period.mode)
      ?.label || "Period";
  return `${modeLabel} · ${describeRefurbishmentReportPeriod(period)}`;
}

export function refurbishmentReportExportFilename(period = {}) {
  const mode = period.mode || "calendar_year";
  const detail = describeRefurbishmentReportPeriod(period)
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_");
  return `SEIF_Refurbishment_${mode}_${detail}.xlsx`;
}
