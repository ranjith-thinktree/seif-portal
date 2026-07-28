import * as XLSX from "xlsx";

const COLUMN_ALIASES = {
  registered: [
    "candidates enrolled",
    "enrolled",
    "registered",
    "candidates registered",
    "trainees registered",
  ],
  attended: ["assessed", "attended", "candidates assessed", "trainees attended"],
  passed: ["pass", "passed", "trainees passed"],
  failed: ["fail", "failed", "trainees failed"],
  serial: ["s. no.", "s no", "s.no", "serial", "sr no", "sr. no."],
};

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function findColumnIndex(headers, aliases) {
  const normalized = headers.map(normalizeHeader);
  for (let i = 0; i < normalized.length; i += 1) {
    const header = normalized[i];
    if (!header) continue;
    if (aliases.some((alias) => header === alias || header.includes(alias))) {
      return i;
    }
  }
  return -1;
}

function parseCount(value) {
  if (value == null || value === "") return 0;
  const n = parseInt(String(value).replace(/,/g, "").trim(), 10);
  return Number.isNaN(n) ? 0 : n;
}

function isDataRow(row, indices, serialIdx) {
  if (!row?.length) return false;

  const hasMetric = [
    indices.registered,
    indices.attended,
    indices.passed,
    indices.failed,
  ].some((idx) => {
    const raw = row[idx];
    return raw !== "" && raw != null && !Number.isNaN(parseCount(raw));
  });

  if (!hasMetric) return false;

  if (serialIdx >= 0) {
    const serial = String(row[serialIdx] ?? "").trim();
    if (serial && /^\d+$/.test(serial)) return true;
  }

  return (
    parseCount(row[indices.registered]) > 0 ||
    parseCount(row[indices.attended]) > 0 ||
    parseCount(row[indices.passed]) > 0 ||
    parseCount(row[indices.failed]) > 0
  );
}

function findHeaderRowIndex(rows) {
  for (let i = 0; i < rows.length; i += 1) {
    const normalized = rows[i].map(normalizeHeader);
    const hasEnrolled = normalized.some(
      (cell) =>
        cell.includes("candidates enrolled") ||
        cell.includes("registered") ||
        cell === "enrolled",
    );
    const hasAssessed = normalized.some(
      (cell) => cell === "assessed" || cell.includes("attended"),
    );
    const hasPassFail = normalized.some((cell) => cell === "pass" || cell === "fail");
    if (hasEnrolled && hasAssessed && hasPassFail) {
      return i;
    }
  }
  return -1;
}

/**
 * Parse student result summary spreadsheet (.xlsx, .xls, .xlsm, .csv).
 * Sums enrolled/assessed/pass/fail columns across data rows (any filename).
 *
 * @param {File} file
 * @returns {Promise<{ registered: number, attended: number, passed: number, failed: number }>}
 */
export async function parseEssciResultSummaryFile(file) {
  if (!file) {
    throw new Error("No file provided.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("The uploaded file has no worksheets.");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const headerRowIndex = findHeaderRowIndex(rows);

  if (headerRowIndex === -1) {
    throw new Error(
      "Could not find the result summary header row. The sheet must include columns for enrolled/registered, assessed/attended, pass, and fail counts.",
    );
  }

  const headers = rows[headerRowIndex].map((cell) => String(cell ?? ""));
  const indices = {
    registered: findColumnIndex(headers, COLUMN_ALIASES.registered),
    attended: findColumnIndex(headers, COLUMN_ALIASES.attended),
    passed: findColumnIndex(headers, COLUMN_ALIASES.passed),
    failed: findColumnIndex(headers, COLUMN_ALIASES.failed),
  };
  const serialIdx = findColumnIndex(headers, COLUMN_ALIASES.serial);

  const missing = [];
  if (indices.registered === -1) missing.push("Candidates Enrolled");
  if (indices.attended === -1) missing.push("Assessed");
  if (indices.passed === -1) missing.push("Pass");
  if (indices.failed === -1) missing.push("Fail");
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(", ")}`);
  }

  let registered = 0;
  let attended = 0;
  let passed = 0;
  let failed = 0;
  let dataRows = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!isDataRow(row, indices, serialIdx)) continue;

    registered += parseCount(row[indices.registered]);
    attended += parseCount(row[indices.attended]);
    passed += parseCount(row[indices.passed]);
    failed += parseCount(row[indices.failed]);
    dataRows += 1;
  }

  if (dataRows === 0) {
    throw new Error("No student result rows found below the header row.");
  }

  return { registered, attended, passed, failed };
}
