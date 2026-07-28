import { CERTIFICATION_ARCHIVE_MONTH_OPTIONS } from "../../utils/certificationArchiveUtils";
import {
  buildFyOptions,
  formatFyLabel,
  formatReadableIsoDate,
  getCurrentFyStartYear,
  toIsoDate,
} from "../../utils/certificationReportPeriodUtils";
import { getYearFilterOptions } from "../../utils/refurbishmentUtils";

/** Modes for the page-level Report period (Certification + Refurbishment). */
export const REPORT_PERIOD_MODE_OPTIONS = [
  { value: "month", label: "Month" },
  { value: "day", label: "Day" },
  { value: "range", label: "Range" },
  { value: "calendar_year", label: "Calendar Year" },
  { value: "financial_year", label: "Financial Year" },
];

/** @deprecated use REPORT_PERIOD_MODE_OPTIONS */
export const SHARED_PERIOD_PRESET_OPTIONS = REPORT_PERIOD_MODE_OPTIONS;

export function defaultReportPeriodState(date = new Date()) {
  const iso = toIsoDate(date);
  const monthStart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  return {
    mode: "financial_year",
    month: String(date.getMonth() + 1),
    year: String(date.getFullYear()),
    fyStartYear: String(getCurrentFyStartYear(date)),
    day: iso,
    fromDate: monthStart,
    toDate: iso,
  };
}

/** @deprecated use defaultReportPeriodState */
export function defaultSharedPeriodDraft(date = new Date()) {
  return defaultReportPeriodState(date);
}

export function getSharedMonthOptions() {
  return CERTIFICATION_ARCHIVE_MONTH_OPTIONS;
}

export function getSharedYearOptions(yearsBack = 6) {
  return getYearFilterOptions(yearsBack);
}

export function getSharedFyOptions(yearsBack = 6) {
  return buildFyOptions(yearsBack);
}

export function fyStartYearToImpactValue(fyStartYear) {
  const start = Number(fyStartYear);
  if (!Number.isFinite(start)) return null;
  return formatFyLabel(start);
}

/** Normalize inverted range dates; returns a period object safe for panels. */
export function normalizeReportPeriod(period = {}) {
  const mode = period.mode || "financial_year";
  const year = String(period.year || new Date().getFullYear());
  const month = String(period.month || new Date().getMonth() + 1);
  const fyStartYear = String(period.fyStartYear || getCurrentFyStartYear());
  const today = toIsoDate();
  const day = String(period.day || today);
  let fromDate = String(
    period.fromDate || `${year}-${String(month).padStart(2, "0")}-01`,
  );
  let toDate = String(period.toDate || today);
  if (fromDate && toDate && fromDate > toDate) {
    [fromDate, toDate] = [toDate, fromDate];
  }
  return {
    mode,
    year,
    month,
    fyStartYear,
    day,
    fromDate,
    toDate,
  };
}

/**
 * Human label for the page report period, e.g. "Financial Year · 2025-26".
 */
export function describeReportPeriod(period = {}) {
  const p = normalizeReportPeriod(period);
  const modeLabel =
    REPORT_PERIOD_MODE_OPTIONS.find((o) => o.value === p.mode)?.label ||
    "Period";

  if (p.mode === "month") {
    const monthLabel =
      CERTIFICATION_ARCHIVE_MONTH_OPTIONS.find((m) => m.value === p.month)
        ?.label || p.month;
    return `${modeLabel} · ${monthLabel} ${p.year}`;
  }
  if (p.mode === "day") {
    return `${modeLabel} · ${formatReadableIsoDate(p.day)}`;
  }
  if (p.mode === "range") {
    return `${modeLabel} · ${formatReadableIsoDate(p.fromDate)} → ${formatReadableIsoDate(p.toDate)}`;
  }
  if (p.mode === "calendar_year") {
    return `${modeLabel} · ${p.year}`;
  }
  return `${modeLabel} · ${formatFyLabel(p.fyStartYear)}`;
}

/** @deprecated use describeReportPeriod */
export function describeSharedPeriodDraft(draft = {}) {
  return describeReportPeriod(draft);
}

/**
 * @deprecated Apply-sync payload (S1). Prefer live page period state.
 * Kept for unit tests covering label/normalize behavior.
 */
export function buildSharedPeriodSync(draft = {}, syncId = Date.now()) {
  const p = normalizeReportPeriod(draft);
  const label = describeReportPeriod(p);
  return {
    id: syncId,
    mode: p.mode,
    label,
    certification: { ...p },
    refurbishment: { ...p },
    impactYear: p.mode === "financial_year" ? fyStartYearToImpactValue(p.fyStartYear) : null,
  };
}
