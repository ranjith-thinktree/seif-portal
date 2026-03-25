'use strict';

const certService = require('../services/certification.service');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise a local file path to a URL-style path for storage */
const toFileUrl = (filePath) => {
  if (!filePath) return null;
  return `/uploads/${path.relative(path.join(__dirname, '../../../../uploads'), filePath).replace(/\\/g, '/')}`;
};

// Columns expected in the certification data file
const CERT_COLUMNS = [
  'Trainee Name',
  'Student ID',
  'Course Name',
  'Assessment Date',
  'Trainer Name',
  'Marks',
  'Status',
  'Gender',
];

/**
 * Parse a CSV or Excel (XLSX/XLS/XLSM) file and return plain row objects.
 * Returns array of objects keyed by column name, e.g. { 'Trainee Name': '...' }
 */
const parseCertDataFile = async (filePath) => {
  const workbook = new ExcelJS.Workbook();

  // Detect format from magic bytes so renamed files still work
  let isExcel = false;
  try {
    const buf = fs.readFileSync(filePath, { encoding: null });
    const sig = buf.slice(0, 4).toString('hex');
    isExcel = sig.startsWith('504b0304') || sig.startsWith('d0cf11e0');
  } catch (_) {
    /* fallback: use extension */
  }

  if (!isExcel) {
    const ext = path.extname(filePath).toLowerCase();
    isExcel = ['.xlsx', '.xls', '.xlsm'].includes(ext);
  }

  if (isExcel) {
    await workbook.xlsx.readFile(filePath);
  } else {
    await workbook.csv.readFile(filePath);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('No worksheet found in the uploaded file.');

  const rows = [];
  let headers = null;

  worksheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
    if (rowIndex === 1) {
      headers = row.values.slice(1).map((h) => String(h || '').trim());
      const missing = CERT_COLUMNS.filter((c) => !headers.includes(c));
      if (missing.length > 0) {
        throw new Error(
          `Missing required columns: ${missing.join(', ')}. Please use the certification data template.`
        );
      }
      return;
    }

    const rowData = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colName = headers[colNumber - 1];
      if (!colName) return;
      let val = cell.value;
      if (val && typeof val === 'object' && val.text !== undefined) val = val.text;
      if (cell.type === ExcelJS.ValueType.Date && val instanceof Date) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        val = `${y}-${m}-${d}`;
      }
      if (cell.type === ExcelJS.ValueType.Formula && cell.result !== undefined) val = cell.result;
      if (cell.type === ExcelJS.ValueType.RichText) val = cell.text;
      rowData[colName] = val !== null && val !== undefined ? String(val).trim() : '';
    });

    rows.push(rowData);
  });

  return rows;
};

/**
 * Generate a formatted Excel (.xlsx) template for certification data.
 */
const generateCertExcelTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SEIF Portal';
  workbook.created = new Date();

  // Data sheet
  const ws = workbook.addWorksheet('Certification Upload', {
    properties: { tabColor: { argb: 'FF009530' } },
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = [
    { header: 'Trainee Name', key: 'traineeName', width: 28 },
    { header: 'Student ID', key: 'studentId', width: 18 },
    { header: 'Course Name', key: 'courseName', width: 30 },
    { header: 'Assessment Date', key: 'assessmentDate', width: 20 },
    { header: 'Trainer Name', key: 'trainerName', width: 28 },
    { header: 'Marks', key: 'marks', width: 12 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Gender', key: 'gender', width: 12 },
  ];

  // Header styling
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF009530' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });

  // Sample rows
  const SAMPLE = [
    {
      traineeName: 'Ravi Kumar',
      studentId: 'STU001',
      courseName: 'Electrical Technician',
      assessmentDate: '2026-03-01',
      trainerName: 'Priya Singh',
      marks: 88,
      status: 'pass',
      gender: 'Male',
    },
    {
      traineeName: 'Sunita Devi',
      studentId: 'STU002',
      courseName: 'Plumbing',
      assessmentDate: '2026-03-01',
      trainerName: 'Amit Sharma',
      marks: 72,
      status: 'pass',
      gender: 'Female',
    },
    {
      traineeName: 'Mohd. Arif',
      studentId: 'STU003',
      courseName: 'Electrical Technician',
      assessmentDate: '2026-03-01',
      trainerName: 'Priya Singh',
      marks: 45,
      status: 'fail',
      gender: 'Male',
    },
    {
      traineeName: 'Kavitha Reddy',
      studentId: 'STU004',
      courseName: 'Computer Basics',
      assessmentDate: '2026-03-02',
      trainerName: 'Rahul Das',
      marks: 0,
      status: 'absent',
      gender: 'Female',
    },
  ];

  SAMPLE.forEach((s) => {
    const dataRow = ws.addRow(s);
    dataRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      };
    });
  });

  // Status column dropdown validation (col G = 7)
  for (let r = 2; r <= 200; r++) {
    ws.getCell(`G${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"pass,fail,absent"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Status',
      error: 'Select pass, fail, or absent',
    };
  }

  // Gender column dropdown validation (col H = 8)
  for (let r = 2; r <= 200; r++) {
    ws.getCell(`H${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Male,Female,Other"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Gender',
      error: 'Select Male, Female, or Other',
    };
  }

  // Instructions sheet
  const instr = workbook.addWorksheet('Instructions', {
    properties: { tabColor: { argb: 'FFFF9900' } },
  });
  instr.columns = [{ header: '', key: 'text', width: 80 }];
  const lines = [
    'SEIF Portal — Certification Data Upload Template',
    '',
    'REQUIRED COLUMNS (do not rename headers):',
    '1. Trainee Name       — Full name of the student',
    '2. Student ID         — Your internal student ID (optional)',
    '3. Course Name        — Name of the course attended',
    '4. Assessment Date    — Date of assessment (YYYY-MM-DD)',
    '5. Trainer Name       — Name of the trainer',
    '6. Marks              — Marks obtained (number)',
    '7. Status             — pass / fail / absent (dropdown)',
    '8. Gender             — Male / Female / Other (dropdown)',
    '',
    'Assessment Date format: YYYY-MM-DD (e.g., 2026-03-15)',
    '',
    'Supported file formats: .xlsx, .xls, .csv, .xlsm',
    '',
    'For support: contact SEIF Portal Administrator',
  ];
  lines.forEach((text, i) => {
    const lr = instr.getRow(i + 1);
    lr.getCell('A').value = text;
    lr.getCell('A').alignment = { wrapText: true, vertical: 'top' };
    if (i === 0) lr.getCell('A').font = { bold: true, size: 13, color: { argb: 'FF009530' } };
    else if (
      text.startsWith('REQUIRED') ||
      text.startsWith('Supported') ||
      text.startsWith('Assessment Date')
    ) {
      lr.getCell('A').font = { bold: true, size: 11 };
    }
  });

  return workbook;
};

const cleanupFile = (fp) => {
  if (fp) {
    try {
      fs.unlinkSync(fp);
    } catch (_) {
      /* ignore */
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PARTNER controllers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /certification/upload
 * Multipart: dataFile (CSV) + validationDoc (PDF/image)
 * Body: centerId, batchId
 */
exports.uploadCertificationData = async (req, res) => {
  const dataFile = req.files?.dataFile?.[0];
  const validationDoc = req.files?.validationDoc?.[0];

  try {
    const partnerId = req.user.partner_id || req.user.id;
    const uploadedBy = req.user.id;
    const { centerId, batchId } = req.body;

    if (!centerId || !batchId) {
      cleanupFile(dataFile?.path);
      cleanupFile(validationDoc?.path);
      return res.status(400).json({ success: false, message: 'centerId and batchId are required' });
    }

    if (!dataFile) {
      cleanupFile(validationDoc?.path);
      return res
        .status(400)
        .json({ success: false, message: 'Data file (CSV or Excel) is required' });
    }

    // Parse CSV or Excel
    const rows = await parseCertDataFile(dataFile.path);
    if (rows.length === 0) {
      cleanupFile(dataFile?.path);
      cleanupFile(validationDoc?.path);
      return res.status(400).json({ success: false, message: 'Data file contains no data rows' });
    }

    const fileUrl = toFileUrl(dataFile.path);
    const validationDocUrl = validationDoc ? toFileUrl(validationDoc.path) : null;

    const result = await certService.createCertificationUpload({
      partnerId,
      centerId,
      batchId,
      fileUrl,
      fileName: dataFile.originalname,
      fileSizeBytes: dataFile.size,
      validationDocUrl,
      validationDocName: validationDoc?.originalname || null,
      rows,
      uploadedBy,
    });

    res.json({
      success: true,
      message: `Certification data uploaded successfully (${rows.length} records)`,
      data: result,
    });
  } catch (error) {
    cleanupFile(dataFile?.path);
    cleanupFile(validationDoc?.path);
    console.error('[certController] uploadCertificationData error:', error);
    res.status(500).json({ success: false, message: error.message || 'Upload failed' });
  }
};

/**
 * GET /certification/template
 */
exports.downloadTemplate = async (req, res) => {
  try {
    const workbook = await generateCertExcelTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="Certification_Data_Template.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[certController] downloadTemplate error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate template' });
  }
};

/**
 * GET /certification/uploads  (partner's own history)
 */
exports.getMyUploads = async (req, res) => {
  try {
    const partnerId = req.user.partner_id || req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const result = await certService.getPartnerUploads(partnerId, page, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[certController] getMyUploads error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /certification/uploads/:uploadId
 */
exports.getUploadDetails = async (req, res) => {
  try {
    const partnerId = req.user.role === 'PARTNER' ? req.user.partner_id || req.user.id : null;
    const upload = await certService.getUploadDetails(req.params.uploadId, partnerId);
    if (!upload) return res.status(404).json({ success: false, message: 'Upload not found' });
    res.json({ success: true, data: upload });
  } catch (error) {
    console.error('[certController] getUploadDetails error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /certification/certificates  (partner downloads approved PDFs)
 */
exports.getPartnerCertificates = async (req, res) => {
  try {
    const partnerId = req.user.partner_id || req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const result = await certService.getPartnerCertificatePDFs(partnerId, { page, limit });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[certController] getPartnerCertificates error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN controllers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /certification/admin/uploads
 */
exports.adminGetUploads = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const result = await certService.getAllCertificationUploads({ status, page, limit, search });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[certController] adminGetUploads error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /certification/admin/uploads/:uploadId/approve
 */
exports.adminApproveUpload = async (req, res) => {
  try {
    const { remarks } = req.body;
    await certService.approveCertificationUpload(req.params.uploadId, req.user.id, remarks);
    res.json({ success: true, message: 'Certification upload approved' });
  } catch (error) {
    console.error('[certController] adminApproveUpload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /certification/admin/uploads/:uploadId/reject
 */
exports.adminRejectUpload = async (req, res) => {
  try {
    const { rejectionReason, remarks } = req.body;
    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }
    await certService.rejectCertificationUpload(
      req.params.uploadId,
      req.user.id,
      rejectionReason,
      remarks
    );
    res.json({ success: true, message: 'Certification upload rejected' });
  } catch (error) {
    console.error('[certController] adminRejectUpload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /certification/admin/pdfs  (list ESSCI uploaded PDFs)
 */
exports.adminGetPDFs = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const result = await certService.getAllCertificatePDFs({ status, page, limit });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[certController] adminGetPDFs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /certification/admin/pdfs/:pdfId/approve
 */
exports.adminApprovePDF = async (req, res) => {
  try {
    const { remarks } = req.body;
    await certService.approveCertificatePDF(req.params.pdfId, req.user.id, remarks);
    res.json({ success: true, message: 'Certificate PDF approved' });
  } catch (error) {
    console.error('[certController] adminApprovePDF error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /certification/admin/pdfs/:pdfId/reject
 */
exports.adminRejectPDF = async (req, res) => {
  try {
    const { rejectionReason, remarks } = req.body;
    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }
    await certService.rejectCertificatePDF(req.params.pdfId, req.user.id, rejectionReason, remarks);
    res.json({ success: true, message: 'Certificate PDF rejected' });
  } catch (error) {
    console.error('[certController] adminRejectPDF error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ESSCI controllers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /certification/essci/data
 */
exports.essciGetData = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, filter } = req.query;
    const result = await certService.getESSCIData({ page, limit, search, filter });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[certController] essciGetData error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /certification/essci/data/:uploadId  (detail with students)
 */
exports.essciGetBatchDetail = async (req, res) => {
  try {
    const detail = await certService.getUploadDetails(req.params.uploadId);
    if (!detail) return res.status(404).json({ success: false, message: 'Upload not found' });
    res.json({ success: true, data: detail });
  } catch (error) {
    console.error('[certController] essciGetBatchDetail error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /certification/essci/partners
 */
exports.essciGetPartners = async (req, res) => {
  try {
    const partners = await certService.getPartnersDropdown();
    res.json({ success: true, data: partners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /certification/essci/centers?partnerId=
 */
exports.essciGetCenters = async (req, res) => {
  try {
    const { partnerId } = req.query;
    if (!partnerId)
      return res.status(400).json({ success: false, message: 'partnerId is required' });
    const centers = await certService.getCentersDropdown(partnerId);
    res.json({ success: true, data: centers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /certification/essci/batches?centerId=&partnerId=
 */
exports.essciGetBatches = async (req, res) => {
  try {
    const { centerId, partnerId } = req.query;
    if (!centerId || !partnerId) {
      return res
        .status(400)
        .json({ success: false, message: 'centerId and partnerId are required' });
    }
    const batches = await certService.getBatchesDropdown(centerId, partnerId);
    res.json({ success: true, data: batches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /certification/essci/upload-pdf
 * Single file: 'file' (PDF)
 * Body: partnerId, centerId, batchId, [certificationUploadId]
 */
exports.essciUploadPDF = async (req, res) => {
  try {
    const uploadedBy = req.user.id;
    const { partnerId, centerId, batchId, certificationUploadId } = req.body;

    if (!partnerId || !centerId || !batchId) {
      cleanupFile(req.file?.path);
      return res
        .status(400)
        .json({ success: false, message: 'partnerId, centerId, and batchId are required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'PDF file is required' });
    }

    const fileUrl = toFileUrl(req.file.path);
    const result = await certService.uploadCertificatePDF({
      partnerId,
      centerId,
      batchId,
      certificationUploadId: certificationUploadId || null,
      fileUrl,
      fileName: req.file.originalname,
      fileSizeBytes: req.file.size,
      uploadedBy,
    });

    res.json({
      success: true,
      message: 'Certificate PDF uploaded and pending admin review',
      data: result,
    });
  } catch (error) {
    cleanupFile(req.file?.path);
    console.error('[certController] essciUploadPDF error:', error);
    res.status(500).json({ success: false, message: error.message || 'Upload failed' });
  }
};
