'use strict';

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');
const archiver = require('archiver');
const db = require('../../../database/connection');
const { parseResultSheetStudentRows } = require('../../../utils/essciResultSheetParser');

const PROJECT_UPLOADS = path.join(__dirname, '../../../../../uploads');
const BACKEND_UPLOADS = path.join(__dirname, '../../../../uploads');

const CONTEXT_HEADERS = ['Partner', 'Center', 'Batch', 'Request ID', 'Assessment Date'];

function storageMonthFromDate(dateValue) {
  if (!dateValue) return null;
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function resolveUploadAbsolutePath(urlPath) {
  if (!urlPath) return null;
  const relative = String(urlPath).replace(/^\/uploads\//, '');
  const candidates = [
    path.join(PROJECT_UPLOADS, relative),
    path.join(BACKEND_UPLOADS, relative),
  ];
  for (const abs of candidates) {
    if (fs.existsSync(abs)) return abs;
  }
  return candidates[0];
}

function resolveArchiveAbsolutePath(archivePath) {
  return resolveUploadAbsolutePath(archivePath);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeFileName(name) {
  return String(name || 'file')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_');
}

function copyToArchive(sourceAbs, destAbs) {
  ensureDir(path.dirname(destAbs));
  fs.copyFileSync(sourceAbs, destAbs);
}

function parseCertificationFilesJson(jsonValue) {
  if (!jsonValue) return [];
  try {
    const parsed = JSON.parse(jsonValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const DATE_TYPE_COLUMNS = {
  assessment: 'cu.assessment_date',
  request: 'cu.created_at',
  batchStart: 'cu.batch_start_date',
  batchEnd: 'cu.batch_end_date',
};

const TRAINEE_METRIC_COLUMNS = {
  registered: 'cp.trainees_registered',
  attended: 'cp.trainees_attended',
  passed: 'cp.trainees_passed',
  failed: 'cp.trainees_failed',
};

const BASE_ARCHIVE_CONDITIONS = [
  "cp.status = 'approved'",
  'cp.certification_upload_id IS NOT NULL',
  'EXISTS (SELECT 1 FROM certification_archived_files caf0 WHERE caf0.certification_pdf_id = cp.id)',
];

function parseListParam(value) {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildMonthYearFilter(columnExpr, month, year, params) {
  if (!month || !year) return null;
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (Number.isNaN(m) || Number.isNaN(y) || m < 1 || m > 12) return null;
  params.push(m, y);
  return `MONTH(${columnExpr}) = ? AND YEAR(${columnExpr}) = ?`;
}

function buildMonthYearOrClause(columnExpr, months, years, params) {
  const validMonths = months
    .map((month) => parseInt(month, 10))
    .filter((month) => !Number.isNaN(month) && month >= 1 && month <= 12);
  const validYears = years
    .map((year) => parseInt(year, 10))
    .filter((year) => !Number.isNaN(year) && year > 1990 && year < 2100);

  if (!validMonths.length || !validYears.length) return null;

  const parts = [];
  validYears.forEach((year) => {
    validMonths.forEach((month) => {
      parts.push(`(MONTH(${columnExpr}) = ? AND YEAR(${columnExpr}) = ?)`);
      params.push(month, year);
    });
  });
  return `(${parts.join(' OR ')})`;
}

function resolveYearsParam(query = {}) {
  const years = parseListParam(query.years);
  if (years.length) return years;
  if (query.year) return parseListParam(query.year);
  return [];
}

function usesNewDateFilters(query = {}) {
  return (
    parseListParam(query.dateTypes).length > 0 &&
    parseListParam(query.months).length > 0 &&
    resolveYearsParam(query).length > 0
  );
}

/** YYYY-MM-DD only — used by reports Day/Range/FY period modes */
function parseIsoDateParam(value) {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() + 1 !== month ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function usesDateRangeFilters(query = {}) {
  const fromDate = parseIsoDateParam(query.fromDate);
  const toDate = parseIsoDateParam(query.toDate);
  if (!fromDate || !toDate) return false;
  if (fromDate > toDate) return false;
  return parseListParam(query.dateTypes).length > 0;
}

function buildDateRangeOrClause(columnExpr, fromDate, toDate, params) {
  params.push(fromDate, toDate);
  return `(DATE(${columnExpr}) BETWEEN ? AND ?)`;
}

function applyTraineeMetricFilters(query, conditions) {
  parseListParam(query.traineeMetrics).forEach((metric) => {
    const column = TRAINEE_METRIC_COLUMNS[metric];
    if (column) conditions.push(`${column} > 0`);
  });
}

function applyLegacyTraineeFilters(query, conditions, params) {
  const legacyFields = [
    ['registered', 'cp.trainees_registered'],
    ['attended', 'cp.trainees_attended'],
    ['passed', 'cp.trainees_passed'],
    ['failed', 'cp.trainees_failed'],
  ];
  legacyFields.forEach(([key, column]) => {
    const value = query[key];
    if (value === undefined || value === null || value === '') return;
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return;
    params.push(n);
    conditions.push(`${column} = ?`);
  });
}

function parseFileIds(value) {
  return [...new Set(parseListParam(value))];
}

function hasActiveListFilters(query = {}) {
  if (usesDateRangeFilters(query)) return true;
  if (usesNewDateFilters(query)) return true;
  if (parseListParam(query.traineeMetrics).length) return true;
  if (query.assessmentMonth && query.assessmentYear) return true;
  if (query.requestMonth && query.requestYear) return true;
  if (query.batchStartMonth && query.batchStartYear) return true;
  if (query.batchEndMonth && query.batchEndYear) return true;
  if (['registered', 'attended', 'passed', 'failed'].some((key) => {
    const value = query[key];
    return value !== undefined && value !== null && value !== '';
  })) {
    return true;
  }
  return false;
}

function buildArchiveFilters(query = {}) {
  const conditions = [...BASE_ARCHIVE_CONDITIONS];
  const params = [];

  if (usesDateRangeFilters(query)) {
    const dateTypes = parseListParam(query.dateTypes);
    const fromDate = parseIsoDateParam(query.fromDate);
    const toDate = parseIsoDateParam(query.toDate);
    const rangeParts = [];

    dateTypes.forEach((type) => {
      const column = DATE_TYPE_COLUMNS[type];
      if (!column) return;
      rangeParts.push(buildDateRangeOrClause(column, fromDate, toDate, params));
    });
    if (rangeParts.length) {
      conditions.push(
        rangeParts.length === 1 ? rangeParts[0] : `(${rangeParts.join(' OR ')})`,
      );
    }
    applyTraineeMetricFilters(query, conditions);
  } else if (usesNewDateFilters(query)) {
    const dateTypes = parseListParam(query.dateTypes);
    const months = parseListParam(query.months);
    const years = resolveYearsParam(query);

    dateTypes.forEach((type) => {
      const column = DATE_TYPE_COLUMNS[type];
      if (!column) return;
      const clause = buildMonthYearOrClause(column, months, years, params);
      if (clause) conditions.push(clause);
    });
    applyTraineeMetricFilters(query, conditions);
  } else {
    const assessmentFilter = buildMonthYearFilter(
      'cu.assessment_date',
      query.assessmentMonth,
      query.assessmentYear,
      params
    );
    if (assessmentFilter) conditions.push(assessmentFilter);

    const requestFilter = buildMonthYearFilter(
      'cu.created_at',
      query.requestMonth,
      query.requestYear,
      params
    );
    if (requestFilter) conditions.push(requestFilter);

    const batchStartFilter = buildMonthYearFilter(
      'cu.batch_start_date',
      query.batchStartMonth,
      query.batchStartYear,
      params
    );
    if (batchStartFilter) conditions.push(batchStartFilter);

    const batchEndFilter = buildMonthYearFilter(
      'cu.batch_end_date',
      query.batchEndMonth,
      query.batchEndYear,
      params
    );
    if (batchEndFilter) conditions.push(batchEndFilter);

    if (parseListParam(query.traineeMetrics).length) {
      applyTraineeMetricFilters(query, conditions);
    } else {
      applyLegacyTraineeFilters(query, conditions, params);
    }
  }

  return { where: `WHERE ${conditions.join(' AND ')}`, params };
}

async function getArchivedFilesForExport({ fileIds = [], fileType, filters = {} } = {}) {
  const ids = parseFileIds(fileIds);
  if (ids.length) {
    const [rows] = await db.query(
      `SELECT caf.id, caf.original_name, caf.archive_path, caf.file_type,
              caf.certification_pdf_id AS pdf_id,
              cu.id AS upload_id,
              p.name AS partner_name,
              COALESCE(c.center_name, cu.center_name) AS center_name,
              COALESCE(b.batch_number, cu.other_batch_number) AS batch_number,
              cu.assessment_date,
              cp.status AS pdf_status
       FROM certification_archived_files caf
       JOIN certification_pdfs cp ON cp.id = caf.certification_pdf_id
       JOIN certification_uploads cu ON cu.id = cp.certification_upload_id
       JOIN partners p ON p.id = cp.partner_id
       LEFT JOIN centers c ON c.id = cp.center_id
       LEFT JOIN batches b ON b.id = cp.batch_id
       WHERE caf.id IN (${ids.map(() => '?').join(',')})
         AND caf.file_type = ?
         AND cp.status = 'approved'
       ORDER BY p.name, batch_number, caf.original_name`,
      [...ids, fileType]
    );
    return rows;
  }

  if (!hasActiveListFilters(filters)) {
    const err = new Error('Apply filters or select files before exporting');
    err.statusCode = 400;
    throw err;
  }

  const { where, params } = buildArchiveFilters(filters);
  const [rows] = await db.query(
    `SELECT caf.id, caf.original_name, caf.archive_path, caf.file_type,
            caf.certification_pdf_id AS pdf_id,
            cu.id AS upload_id,
            p.name AS partner_name,
            COALESCE(c.center_name, cu.center_name) AS center_name,
            COALESCE(b.batch_number, cu.other_batch_number) AS batch_number,
            cu.assessment_date
     FROM certification_archived_files caf
     JOIN certification_pdfs cp ON cp.id = caf.certification_pdf_id
     JOIN certification_uploads cu ON cu.id = cp.certification_upload_id
     JOIN partners p ON p.id = cp.partner_id
     LEFT JOIN centers c ON c.id = cp.center_id
     LEFT JOIN batches b ON b.id = cp.batch_id
     ${where} AND caf.file_type = ?
     ORDER BY p.name, batch_number, caf.original_name`,
    [...params, fileType]
  );
  return rows;
}

async function getPdfArchiveContext(pdfId) {
  const [[row]] = await db.query(
    `SELECT cp.id AS pdf_id,
            cp.certification_upload_id,
            cp.zip_file_url,
            cp.zip_file_name,
            cp.student_list_url,
            cp.student_list_name,
            cp.certification_files_json,
            cu.assessment_date
     FROM certification_pdfs cp
     LEFT JOIN certification_uploads cu ON cu.id = cp.certification_upload_id
     WHERE cp.id = ?`,
    [pdfId]
  );
  return row || null;
}

async function registerArchivedFile({
  pdfId,
  uploadId,
  fileType,
  storageMonth,
  archivePath,
  originalName,
}) {
  const [[existing]] = await db.query(
    `SELECT id FROM certification_archived_files
     WHERE certification_pdf_id = ? AND file_type = ? AND original_name = ?`,
    [pdfId, fileType, originalName]
  );
  if (existing?.id) return existing.id;

  const id = uuidv4();
  await db.query(
    `INSERT INTO certification_archived_files
       (id, certification_pdf_id, certification_upload_id, file_type, storage_month, archive_path, original_name)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, pdfId, uploadId, fileType, storageMonth, archivePath, originalName]
  );
  return id;
}

async function archiveCertificationPdfFiles(pdfId) {
  const ctx = await getPdfArchiveContext(pdfId);
  if (!ctx?.certification_upload_id) {
    console.warn(`[certArchive] skip pdf ${pdfId}: no linked upload`);
    return { archived: 0 };
  }

  const storageMonth = storageMonthFromDate(ctx.assessment_date);
  if (!storageMonth) {
    console.warn(`[certArchive] skip pdf ${pdfId}: no assessment_date`);
    return { archived: 0 };
  }

  const uploadId = ctx.certification_upload_id;
  let archived = 0;

  const certEntries = parseCertificationFilesJson(ctx.certification_files_json);
  if (certEntries.length === 0 && ctx.zip_file_url) {
    certEntries.push({ url: ctx.zip_file_url, name: ctx.zip_file_name || path.basename(ctx.zip_file_url) });
  }

  for (const entry of certEntries) {
    const sourceAbs = resolveUploadAbsolutePath(entry.url);
    if (!sourceAbs || !fs.existsSync(sourceAbs)) continue;

    const fileName = safeFileName(entry.name || path.basename(entry.url));
    const destAbs = path.join(
      PROJECT_UPLOADS,
      'certification',
      storageMonth,
      'certificates',
      uploadId,
      fileName
    );
    const publicPath = `/uploads/certification/${storageMonth}/certificates/${uploadId}/${fileName}`;

    copyToArchive(sourceAbs, destAbs);
    await registerArchivedFile({
      pdfId,
      uploadId,
      fileType: 'certificate',
      storageMonth,
      archivePath: publicPath,
      originalName: entry.name || fileName,
    });
    archived += 1;
  }

  if (ctx.student_list_url) {
    const sourceAbs = resolveUploadAbsolutePath(ctx.student_list_url);
    if (sourceAbs && fs.existsSync(sourceAbs)) {
      const fileName = safeFileName(ctx.student_list_name || path.basename(ctx.student_list_url));
      const destAbs = path.join(
        PROJECT_UPLOADS,
        'certification',
        storageMonth,
        'result_sheets',
        uploadId,
        fileName
      );
      const publicPath = `/uploads/certification/${storageMonth}/result_sheets/${uploadId}/${fileName}`;

      copyToArchive(sourceAbs, destAbs);
      await registerArchivedFile({
        pdfId,
        uploadId,
        fileType: 'result_sheet',
        storageMonth,
        archivePath: publicPath,
        originalName: ctx.student_list_name || fileName,
      });
      archived += 1;
    }
  }

  return { archived, storageMonth };
}

async function listArchivedCertificationRecords({ page = 1, limit = 50, ...filters } = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const { where, params } = buildArchiveFilters(filters);

  const [rows] = await db.query(
    `SELECT
       cu.id AS upload_id,
       cp.id AS pdf_id,
       p.name AS partner_name,
       COALESCE(c.center_name, cu.center_name) AS center_name,
       COALESCE(b.batch_number, cu.other_batch_number) AS batch_number,
       DATE(cu.created_at) AS partner_request_date,
       cu.batch_start_date,
       cu.batch_end_date,
       cu.assessment_date,
       caf.storage_month,
       cp.trainees_registered AS registered,
       cp.trainees_attended AS attended,
       cp.trainees_passed AS passed,
       cp.trainees_failed AS failed
     FROM certification_pdfs cp
     JOIN certification_uploads cu ON cu.id = cp.certification_upload_id
     JOIN certification_archived_files caf ON caf.certification_pdf_id = cp.id
     JOIN partners p ON p.id = cp.partner_id
     LEFT JOIN centers c ON c.id = cp.center_id
     LEFT JOIN batches b ON b.id = cp.batch_id
     ${where}
     GROUP BY
       cu.id, cp.id, p.name, c.center_name, cu.center_name, b.batch_number, cu.other_batch_number,
       cu.created_at, cu.batch_start_date, cu.batch_end_date, cu.assessment_date, caf.storage_month,
       cp.trainees_registered, cp.trainees_attended, cp.trainees_passed, cp.trainees_failed
     ORDER BY cu.assessment_date DESC, cu.created_at DESC
     LIMIT ${safeLimit} OFFSET ${offset}`,
    params
  );

  const [[{ total }]] = await db.query(
    `SELECT COUNT(DISTINCT cp.id) AS total
     FROM certification_pdfs cp
     JOIN certification_uploads cu ON cu.id = cp.certification_upload_id
     JOIN certification_archived_files caf ON caf.certification_pdf_id = cp.id
     JOIN partners p ON p.id = cp.partner_id
     LEFT JOIN centers c ON c.id = cp.center_id
     LEFT JOIN batches b ON b.id = cp.batch_id
     ${where}`,
    params
  );

  const [[kpiRow]] = await db.query(
    `SELECT
       COUNT(*) AS requests,
       COUNT(DISTINCT center_key) AS centers,
       COUNT(DISTINCT batch_key) AS batches,
       COALESCE(SUM(registered), 0) AS registered,
       COALESCE(SUM(attended), 0) AS attended,
       COALESCE(SUM(passed), 0) AS passed
     FROM (
       SELECT
         cp.id AS pdf_id,
         MAX(
           NULLIF(
             COALESCE(
               CAST(cp.center_id AS CHAR),
               CAST(cu.center_id AS CHAR),
               cu.center_name,
               ''
             ),
             ''
           )
         ) AS center_key,
         MAX(
           NULLIF(
             COALESCE(
               CAST(cp.batch_id AS CHAR),
               CAST(cu.batch_id AS CHAR),
               cu.other_batch_number,
               ''
             ),
             ''
           )
         ) AS batch_key,
         MAX(cp.trainees_registered) AS registered,
         MAX(cp.trainees_attended) AS attended,
         MAX(cp.trainees_passed) AS passed
       FROM certification_pdfs cp
       JOIN certification_uploads cu ON cu.id = cp.certification_upload_id
       JOIN certification_archived_files caf ON caf.certification_pdf_id = cp.id
       JOIN partners p ON p.id = cp.partner_id
       LEFT JOIN centers c ON c.id = cp.center_id
       LEFT JOIN batches b ON b.id = cp.batch_id
       ${where}
       GROUP BY cp.id
     ) scoped`,
    params
  );

  const kpis = {
    centers: Number(kpiRow?.centers) || 0,
    batches: Number(kpiRow?.batches) || 0,
    registered: Number(kpiRow?.registered) || 0,
    attended: Number(kpiRow?.attended) || 0,
    passed: Number(kpiRow?.passed) || 0,
  };

  const pdfIds = rows.map((r) => r.pdf_id);
  let filesByPdf = {};
  if (pdfIds.length) {
    const [fileRows] = await db.query(
      `SELECT id, certification_pdf_id, file_type, original_name, archive_path, storage_month
       FROM certification_archived_files
       WHERE certification_pdf_id IN (${pdfIds.map(() => '?').join(',')})
       ORDER BY file_type, original_name`,
      pdfIds
    );
    filesByPdf = fileRows.reduce((acc, file) => {
      if (!acc[file.certification_pdf_id]) acc[file.certification_pdf_id] = [];
      acc[file.certification_pdf_id].push({
        id: file.id,
        fileType: file.file_type,
        fileName: file.original_name,
        archivePath: file.archive_path,
        storageMonth: file.storage_month,
      });
      return acc;
    }, {});
  }

  const enriched = rows.map((row) => ({
    ...row,
    files: filesByPdf[row.pdf_id] || [],
  }));

  return { rows: enriched, total, page: safePage, limit: safeLimit, kpis };
}

async function getArchivedFileById(fileId) {
  const [[file]] = await db.query(
    `SELECT caf.*,
            cp.status AS pdf_status,
            cu.partner_id AS partner_id
     FROM certification_archived_files caf
     JOIN certification_pdfs cp ON cp.id = caf.certification_pdf_id
     LEFT JOIN certification_uploads cu ON cu.id = caf.certification_upload_id
     WHERE caf.id = ?`,
    [fileId]
  );
  return file || null;
}

async function listArchivedFilesByUploadId(uploadId) {
  if (!uploadId) return [];
  const [rows] = await db.query(
    `SELECT caf.id,
            caf.file_type,
            caf.original_name,
            caf.archive_path,
            caf.storage_month,
            caf.certification_upload_id,
            cp.status AS pdf_status
     FROM certification_archived_files caf
     JOIN certification_pdfs cp ON cp.id = caf.certification_pdf_id
     WHERE caf.certification_upload_id = ?
       AND cp.status = 'approved'
     ORDER BY caf.file_type ASC, caf.created_at ASC`,
    [uploadId]
  );
  return rows || [];
}

async function streamCertificateZip(filters, res) {
  const certFiles = await getArchivedFilesForExport({
    fileIds: filters.fileIds,
    fileType: 'certificate',
    filters,
  });

  if (!certFiles.length) {
    const err = new Error('No certificate files found for the current selection or filters');
    err.statusCode = 404;
    throw err;
  }

  const zipName = `certificates_export_${new Date().toISOString().slice(0, 10)}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    throw err;
  });
  archive.pipe(res);

  const usedNames = new Set();
  for (const file of certFiles) {
    const abs = resolveArchiveAbsolutePath(file.archive_path);
    if (!abs || !fs.existsSync(abs)) continue;
    const base = safeFileName(`${file.partner_name}_${file.batch_number || 'batch'}_${file.original_name}`);
    let entryName = base;
    let counter = 1;
    while (usedNames.has(entryName)) {
      counter += 1;
      entryName = `${path.parse(base).name}_${counter}${path.extname(base)}`;
    }
    usedNames.add(entryName);
    archive.file(abs, { name: entryName });
  }

  await archive.finalize();
}

async function buildMergedResultExcel(filters) {
  const resultFiles = await getArchivedFilesForExport({
    fileIds: filters.fileIds,
    fileType: 'result_sheet',
    filters,
  });

  if (!resultFiles.length) {
    const err = new Error('No result sheet files found for the current selection or filters');
    err.statusCode = 404;
    throw err;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Consolidated Results');
  let headersWritten = false;
  let sheetHeaders = [];

  for (const file of resultFiles) {
    const abs = resolveArchiveAbsolutePath(file.archive_path);
    if (!abs || !fs.existsSync(abs)) continue;

    const { headers, dataRows } = await parseResultSheetStudentRows(abs, file.original_name);

    if (!headersWritten) {
      sheetHeaders = [...CONTEXT_HEADERS, ...headers];
      sheet.addRow(sheetHeaders);
      headersWritten = true;
    }

    const assessmentDate = file.assessment_date
      ? new Date(file.assessment_date).toISOString().slice(0, 10)
      : '';

    for (const row of dataRows) {
      const padded = headers.map((_, idx) => row[idx] ?? '');
      sheet.addRow([
        file.partner_name,
        file.center_name,
        file.batch_number || '',
        file.upload_id,
        assessmentDate,
        ...padded,
      ]);
    }
  }

  if (!headersWritten) {
    const err = new Error('No readable result sheets found for export');
    err.statusCode = 404;
    throw err;
  }

  return workbook;
}

async function backfillAllArchivedFiles({ dryRun = false } = {}) {
  const [pdfs] = await db.query(
    `SELECT cp.id
     FROM certification_pdfs cp
     JOIN certification_uploads cu ON cu.id = cp.certification_upload_id
     WHERE cp.status = 'approved' AND cu.assessment_date IS NOT NULL
     ORDER BY cp.created_at`
  );

  let archived = 0;
  let skipped = 0;
  for (const pdf of pdfs) {
    if (dryRun) {
      skipped += 1;
      continue;
    }
    const result = await archiveCertificationPdfFiles(pdf.id);
    archived += result.archived || 0;
  }

  return { totalPdfs: pdfs.length, archived, skipped };
}

module.exports = {
  archiveCertificationPdfFiles,
  listArchivedCertificationRecords,
  listArchivedFilesByUploadId,
  getArchivedFileById,
  streamCertificateZip,
  streamMonthlyCertificateZip: streamCertificateZip,
  buildMergedResultExcel,
  backfillAllArchivedFiles,
  resolveArchiveAbsolutePath,
};
