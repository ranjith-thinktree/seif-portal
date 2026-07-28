export const CERTIFICATION_DATE_TYPE_OPTIONS = [
  { value: "assessment", label: "Assessment date" },
  { value: "request", label: "Partner request date" },
  { value: "batchStart", label: "Batch start date" },
  { value: "batchEnd", label: "Batch end date" },
];

export const CERTIFICATION_ARCHIVE_MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i, 1).toLocaleString("en-US", { month: "long" }),
}));

export const CERTIFICATION_TRAINEE_METRIC_OPTIONS = [
  { value: "registered", label: "Registered" },
  { value: "attended", label: "Attended" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
];

export function buildCertificationArchiveYearOptions() {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current + 1; y >= current - 6; y -= 1) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

export const CERTIFICATION_ARCHIVE_YEAR_OPTIONS = buildCertificationArchiveYearOptions();

export const emptyCertificationArchiveFilters = () => ({
  dateTypes: [],
  months: [],
  years: [],
  traineeMetrics: [],
});

/** Normalize legacy `year` string into `years` array for comparison/API. */
export function normalizeCertificationArchiveFilters(filters = {}) {
  const years = Array.isArray(filters.years)
    ? filters.years.map(String)
    : filters.year
      ? [String(filters.year)]
      : [];
  return {
    dateTypes: [...(filters.dateTypes || [])].map(String).sort(),
    months: [...(filters.months || [])].map(String).sort(),
    years: [...years].sort(),
    traineeMetrics: [...(filters.traineeMetrics || [])].map(String).sort(),
  };
}

export function areCertificationArchiveFiltersEqual(a = {}, b = {}) {
  return (
    JSON.stringify(normalizeCertificationArchiveFilters(a)) ===
    JSON.stringify(normalizeCertificationArchiveFilters(b))
  );
}

export function countActiveCertificationArchiveFilters(filters = {}) {
  const normalized = normalizeCertificationArchiveFilters(filters);
  let count = 0;
  if (normalized.dateTypes.length && normalized.months.length && normalized.years.length) {
    count += 1;
  }
  count += normalized.traineeMetrics.length;
  return count;
}

export function hasActiveCertificationArchiveFilters(filters = {}) {
  return countActiveCertificationArchiveFilters(filters) > 0;
}

/**
 * Single Apply/Reset button mode:
 * - Reset when applied filters are active and draft matches applied
 * - Apply otherwise
 */
export function getCertificationFilterActionMode(draft = {}, applied = {}) {
  const appliedActive = hasActiveCertificationArchiveFilters(applied);
  const draftMatchesApplied = areCertificationArchiveFiltersEqual(draft, applied);
  if (appliedActive && draftMatchesApplied) return "reset";
  return "apply";
}

export function describeCertificationArchiveFilters(filters = {}) {
  const labels = [];
  const normalized = normalizeCertificationArchiveFilters(filters);
  const monthName = (m) =>
    CERTIFICATION_ARCHIVE_MONTH_OPTIONS.find((item) => item.value === String(m))?.label || m;

  if (normalized.dateTypes.length && normalized.months.length && normalized.years.length) {
    const typeLabels = normalized.dateTypes
      .map(
        (type) =>
          CERTIFICATION_DATE_TYPE_OPTIONS.find((item) => item.value === type)?.label || type,
      )
      .join(", ");
    const monthLabels = normalized.months.map((month) => monthName(month)).join(", ");
    labels.push(`${typeLabels}: ${monthLabels} ${normalized.years.join(", ")}`);
  }

  normalized.traineeMetrics.forEach((metric) => {
    const label =
      CERTIFICATION_TRAINEE_METRIC_OPTIONS.find((item) => item.value === metric)?.label ||
      metric;
    labels.push(`${label} > 0`);
  });

  return labels;
}

export function buildCertificationArchiveApiParams(filters = {}) {
  const params = {
    page: 1,
    limit: 200,
  };
  const normalized = normalizeCertificationArchiveFilters(filters);
  const fromDate = filters.fromDate ? String(filters.fromDate).trim() : "";
  const toDate = filters.toDate ? String(filters.toDate).trim() : "";
  const dateTypes = normalized.dateTypes.length
    ? normalized.dateTypes
    : (filters.dateTypes || []).map(String);

  // Date-range path (Day / Range / FY reports) — preferred when both bounds exist
  if (fromDate && toDate && dateTypes.length) {
    params.dateTypes = dateTypes.join(",");
    params.fromDate = fromDate;
    params.toDate = toDate;
  } else if (
    normalized.dateTypes.length &&
    normalized.months.length &&
    normalized.years.length
  ) {
    params.dateTypes = normalized.dateTypes.join(",");
    params.months = normalized.months.join(",");
    params.years = normalized.years.join(",");
  }

  if (normalized.traineeMetrics.length) {
    params.traineeMetrics = normalized.traineeMetrics.join(",");
  }

  return params;
}

export function summarizeCertificationArchiveRows(rows = []) {
  let certificates = 0;
  let resultSheets = 0;
  rows.forEach((row) => {
    (row.files || []).forEach((file) => {
      if (file.fileType === "certificate") certificates += 1;
      if (file.fileType === "result_sheet") resultSheets += 1;
    });
  });
  return {
    requests: rows.length,
    certificates,
    resultSheets,
  };
}

export function collectArchiveFilesFromRows(rows = []) {
  const files = [];
  rows.forEach((row) => {
    (row.files || []).forEach((file) => {
      files.push({
        ...file,
        uploadId: row.upload_id,
        partnerName: row.partner_name,
        centerName: row.center_name,
        batchNumber: row.batch_number,
      });
    });
  });
  return files;
}

export function partitionSelectedArchiveFiles(allFiles = [], selectedIds = []) {
  const selectedSet = new Set(selectedIds);
  const selected = allFiles.filter((file) => selectedSet.has(file.id));
  return {
    selected,
    certificates: selected.filter((file) => file.fileType === "certificate"),
    resultSheets: selected.filter((file) => file.fileType === "result_sheet"),
  };
}

export function groupCertificationRowsByMonth(rows = []) {
  const grouped = new Map();
  rows.forEach((row) => {
    const month = row.storage_month || "Unknown";
    if (!grouped.has(month)) grouped.set(month, []);
    grouped.get(month).push(row);
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, monthRows]) => ({
      month,
      rows: monthRows.sort((a, b) =>
        String(a.partner_name || "").localeCompare(String(b.partner_name || "")),
      ),
    }));
}

export function getRequestFolderLabel(row) {
  const parts = [row.partner_name, row.center_name, row.batch_number].filter(Boolean);
  return parts.join(" · ") || row.upload_id;
}
