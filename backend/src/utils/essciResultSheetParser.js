'use strict';

const path = require('path');
const ExcelJS = require('exceljs');
const { detectFileFormat } = require('./excelHandler');

const COLUMN_ALIASES = {
  registered: [
    'candidates enrolled',
    'enrolled',
    'registered',
    'candidates registered',
    'trainees registered',
  ],
  attended: ['assessed', 'attended', 'candidates assessed', 'trainees attended'],
  passed: ['pass', 'passed', 'trainees passed'],
  failed: ['fail', 'failed', 'trainees failed'],
  serial: ['s. no.', 's no', 's.no', 'serial', 'sr no', 'sr. no.'],
};

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function cellToString(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && value.text !== undefined) return String(value.text);
  return String(value);
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
  if (value == null || value === '') return 0;
  const n = parseInt(String(value).replace(/,/g, '').trim(), 10);
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
    return raw !== '' && raw != null && !Number.isNaN(parseCount(raw));
  });

  if (!hasMetric) return false;

  if (serialIdx >= 0) {
    const serial = String(row[serialIdx] ?? '').trim();
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
        cell.includes('candidates enrolled') ||
        cell.includes('registered') ||
        cell === 'enrolled'
    );
    const hasAssessed = normalized.some(
      (cell) => cell === 'assessed' || cell.includes('attended')
    );
    const hasPassFail = normalized.some((cell) => cell === 'pass' || cell === 'fail');
    if (hasEnrolled && hasAssessed && hasPassFail) {
      return i;
    }
  }
  return -1;
}

async function readSheetRows(filePath, originalName = null) {
  const workbook = new ExcelJS.Workbook();
  const fileInfo = detectFileFormat(filePath);
  const nameForExt = originalName || filePath;
  const ext = path.extname(nameForExt).toLowerCase();

  if (fileInfo.format === 'csv' || ext === '.csv') {
    await workbook.csv.readFile(filePath);
  } else {
    await workbook.xlsx.readFile(filePath);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in the uploaded file.');
  }

  const rows = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values = [];
    const maxCol = Math.max(row.cellCount, worksheet.columnCount || 0, 1);
    for (let col = 1; col <= maxCol; col += 1) {
      const cell = row.getCell(col);
      values.push(cellToString(cell.value));
    }
    rows.push(values);
  });

  return rows;
}

/**
 * Parse student-level data rows from a result sheet file.
 * @returns {{ headers: string[], dataRows: string[][] }}
 */
async function parseResultSheetStudentRows(filePath, originalName = null) {
  const rows = await readSheetRows(filePath, originalName);
  const headerRowIndex = findHeaderRowIndex(rows);

  if (headerRowIndex === -1) {
    throw new Error('Could not find the result summary header row.');
  }

  const headers = rows[headerRowIndex].map((cell) => String(cell ?? ''));
  const indices = {
    registered: findColumnIndex(headers, COLUMN_ALIASES.registered),
    attended: findColumnIndex(headers, COLUMN_ALIASES.attended),
    passed: findColumnIndex(headers, COLUMN_ALIASES.passed),
    failed: findColumnIndex(headers, COLUMN_ALIASES.failed),
  };
  const serialIdx = findColumnIndex(headers, COLUMN_ALIASES.serial);

  const dataRows = [];
  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!isDataRow(row, indices, serialIdx)) continue;
    const normalized = headers.map((_, idx) => String(row[idx] ?? ''));
    dataRows.push(normalized);
  }

  if (dataRows.length === 0) {
    throw new Error('No student result rows found below the header row.');
  }

  return { headers, dataRows };
}

module.exports = {
  parseResultSheetStudentRows,
  readSheetRows,
  findHeaderRowIndex,
};
