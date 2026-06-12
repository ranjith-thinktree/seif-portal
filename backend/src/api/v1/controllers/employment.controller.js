const employmentService = require('../services/employment.service');
const notificationService = require('../services/notification.service');
const { emitToRole, emitToUser } = require('../../../websocket/socket');
const {
  generateEmploymentTemplate,
  generatePrefilledEmploymentTemplate,
  parseExcelFile,
  extractEmploymentData,
  EXPECTED_EMPLOYMENT_COLUMNS,
} = require('../../../utils/excelHandler');
const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const resolvePartnerId = (req, { requireForAdmin = false } = {}) => {
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);
  const targetPartnerId = req.body?.targetPartnerId || req.query?.targetPartnerId || null;

  if (isAdmin) {
    if (targetPartnerId) return targetPartnerId;
    if (requireForAdmin) {
      return null;
    }
  }

  return req.user?.partner_id || null;
};

/**
 * Upload employment CSV + optional PDF/ZIP attachments (B7)
 * POST /api/v1/employment/upload
 * Accepts multipart/form-data with:
 *   file        — Excel/CSV employment data (required)
 *   attachments — PDF/ZIP supporting documents (optional, up to 10)
 */
exports.uploadEmployment = async (req, res) => {
  // Support both uploadCSV (req.file) and uploadEmploymentWithAttachments (req.files)
  const dataFile = req.file || (req.files && req.files['file'] && req.files['file'][0]);
  const attachmentFiles = (req.files && req.files['attachments']) || [];

  try {
    const partnerId = resolvePartnerId(req, { requireForAdmin: true });
    const uploadedBy = req.user.id;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required for admin uploads. Please select a partner.',
      });
    }

    if (!dataFile) {
      return res.status(400).json({
        success: false,
        message: 'No employment data file uploaded. Please attach a CSV or Excel file.',
      });
    }

    // Parse the uploaded file (fix: correct arg order and destructuring)
    const { rows } = await parseExcelFile(dataFile.path, dataFile.originalname, 'employment');

    if (!rows || rows.length === 0) {
      try {
        fs.unlinkSync(dataFile.path);
      } catch (e) {
        /* ignore */
      }
      return res
        .status(400)
        .json({ success: false, message: 'File is empty or has no data rows.' });
    }

    // Map parsed rows to service-expected field names
    const csvData = rows.map((row) => extractEmploymentData(row.data));

    // Handle attachment files (B7): store to S3 if configured, else keep local path
    const attachmentUrls = [];
    for (const attach of attachmentFiles) {
      let fileUrl = null;
      try {
        if (process.env.AWS_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID) {
          // S3 upload
          const AWS = require('aws-sdk');
          const s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || 'ap-south-1',
          });
          const fileContent = fs.readFileSync(attach.path);
          const s3Key = `employment-attachments/${partnerId}/${Date.now()}_${attach.originalname.replace(/\s+/g, '_')}`;
          await s3
            .upload({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: s3Key,
              Body: fileContent,
              ContentType: attach.mimetype,
            })
            .promise();
          fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
          // Clean up local file after S3 upload
          try {
            fs.unlinkSync(attach.path);
          } catch (e) {
            /* ignore */
          }
        } else {
          // Local fallback — keep the saved path as URL
          fileUrl = attach.path;
        }
      } catch (uploadErr) {
        console.warn(`Failed to upload attachment ${attach.originalname}:`, uploadErr.message);
        fileUrl = attach.path; // fallback to local
      }
      attachmentUrls.push(fileUrl);
    }

    // Create employment_uploads record
    const uploadId = uuidv4();
    await db.query(
      `INSERT INTO employment_uploads
         (id, partner_id, file_name, total_records, status, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, 'processing', ?, NOW())`,
      [uploadId, partnerId, dataFile.originalname, csvData.length, uploadedBy]
    );

    // Store data file path + any attachment URLs in file_url
    // Format: plain path string when no attachments; JSON {data, attachments} when both exist
    if (attachmentUrls.length > 0) {
      await db.query(`UPDATE employment_uploads SET file_url = ? WHERE id = ?`, [
        JSON.stringify({ data: dataFile.path, attachments: attachmentUrls }),
        uploadId,
      ]);
    } else {
      await db.query(`UPDATE employment_uploads SET file_url = ? WHERE id = ?`, [
        dataFile.path,
        uploadId,
      ]);
    }

    // Process pre-parsed data through service (all-or-nothing validation)
    const result = await employmentService.processEmploymentUpload(
      partnerId,
      uploadId,
      csvData,
      dataFile.originalname
    );

    // If any row failed validation → delete the upload record and return 400
    if (result.hasErrors) {
      await db.query('DELETE FROM employment_uploads WHERE id = ?', [uploadId]);
      try {
        fs.unlinkSync(dataFile.path);
      } catch (e) {
        /* ignore */
      }
      return res.status(400).json({
        success: false,
        message: `Upload rejected: ${result.failed} row(s) have errors. Fix all errors and re-upload.`,
        errors: result.error_log,
        total: result.total,
        failed: result.failed,
      });
    }

    // All rows valid — update upload record to pending_review
    await db.query(
      `UPDATE employment_uploads
         SET records_processed = ?, records_failed = 0, status = 'pending_review',
             review_status = 'pending_review', processed_at = NOW()
       WHERE id = ?`,
      [result.processed, uploadId]
    );

    // Note: data file is kept for download — not deleted here

    // Notify admins
    const partnerName = req.user.partner_name || req.user.full_name || 'Partner';
    try {
      await notificationService.createUploadNotification({
        uploadId,
        partnerId,
        partnerName,
        fileName: dataFile.originalname,
        totalRecords: result.processed,
        entityType: 'employment_upload',
      });
      emitToRole('admin', 'notification:new', {
        type: 'employment_upload',
        title: 'New Employment Upload',
        message: `${partnerName} uploaded employment data: ${dataFile.originalname} (${result.processed} records)`,
        uploadId,
        totalRecords: result.processed,
        timestamp: new Date().toISOString(),
      });
    } catch (notifErr) {
      console.warn('Failed to send employment upload notification:', notifErr.message);
    }

    res.json({ success: true, uploadId, ...result, status: 'pending_review' });
  } catch (error) {
    console.error('Error in uploadEmployment:', error);

    // Clean up data file on error
    if (dataFile && dataFile.path) {
      try {
        fs.unlinkSync(dataFile.path);
      } catch (err) {
        /* ignore */
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload employment data',
    });
  }
};

const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Download pre-filled employment template (B4/B5/B6)
 * GET /api/v1/employment/template
 * Query params (range mode — Tasks 2/3):
 *   fromYear, fromMonth, toYear, toMonth — inclusive range based on batch_start_date
 * Legacy fallback:
 *   period=1m|6m|all    — still accepted for backward compat
 */
exports.downloadTemplate = async (req, res) => {
  try {
    const partnerId = resolvePartnerId(req, { requireForAdmin: true });
    const partnerName = req.user.partner_name || req.user.full_name || 'Partner';

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required for admin template download. Please select a partner.',
      });
    }

    // Task 4: include batch_start_date and batch_end_date in SELECT
    // Task 3: filter uses batch_start_date via JOIN (not s.created_at)
    // LEFT JOIN employment to pre-fill existing approved employment data
    let query = `
      SELECT
        s.id            AS student_uuid,
        s.partner_student_id,
        s.student_name,
        us.father_name,
        b.batch_number,
        b.batch_start_date,
        b.batch_complete_date AS batch_end_date,
        c.center_id     AS center_csv_id,
        s.created_at    AS approved_at,
        e.employment_status AS existing_emp_status,
        e.company_name  AS existing_company_name,
        e.company_location AS existing_company_location,
        e.date_of_joining  AS existing_date_of_joining,
        e.designation   AS existing_designation,
        e.salary_per_month AS existing_salary
      FROM students s
      LEFT JOIN uploaded_students us ON us.approved_student_id = s.id
      LEFT JOIN batches b ON b.id = s.batch_id
      LEFT JOIN centers c ON c.id = s.center_id
      LEFT JOIN employment e ON e.student_id = s.id
      WHERE s.partner_id = ?
    `;
    const params = [partnerId];
    let periodLabel = '';
    let filenameSuffix = '';

    const {
      fromYear: fromYearParam,
      fromMonth: fromMonthParam,
      toYear: toYearParam,
      toMonth: toMonthParam,
    } = req.query;

    if (fromYearParam && fromMonthParam && toYearParam && toMonthParam) {
      // ── Range mode (Task 2/3) ─────────────────────────────────────────
      const fromYear = parseInt(fromYearParam, 10);
      const fromMonth = parseInt(fromMonthParam, 10);
      const toYear = parseInt(toYearParam, 10);
      const toMonth = parseInt(toMonthParam, 10);

      if (
        isNaN(fromYear) ||
        isNaN(fromMonth) ||
        isNaN(toYear) ||
        isNaN(toMonth) ||
        fromMonth < 1 ||
        fromMonth > 12 ||
        toMonth < 1 ||
        toMonth > 12 ||
        fromYear < 2000 ||
        toYear > 2100
      ) {
        return res.status(400).json({ success: false, message: 'Invalid period parameters.' });
      }

      const fromVal = fromYear * 100 + fromMonth;
      const toVal = toYear * 100 + toMonth;

      if (toVal < fromVal) {
        return res.status(400).json({
          success: false,
          message: '"To" period must be on or after "From" period.',
        });
      }

      // Filter by batch_start_date falling within the inclusive YYYYMM range
      query += ` AND (YEAR(b.batch_start_date) * 100 + MONTH(b.batch_start_date)) BETWEEN ? AND ?`;
      params.push(fromVal, toVal);

      const fromLabel = `${MONTH_NAMES_SHORT[fromMonth - 1]} ${fromYear}`;
      const toLabel = `${MONTH_NAMES_SHORT[toMonth - 1]} ${toYear}`;
      periodLabel = fromVal === toVal ? ` for ${fromLabel}` : ` from ${fromLabel} to ${toLabel}`;
      filenameSuffix = `_${fromYear}${String(fromMonth).padStart(2, '0')}-${toYear}${String(toMonth).padStart(2, '0')}`;
    } else {
      // ── Legacy period mode ────────────────────────────────────────────
      const period = req.query.period || 'all';
      if (period !== 'all') {
        const monthMatch = /^(\d+)m$/.exec(period);
        if (!monthMatch) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid period. Use fromYear/fromMonth/toYear/toMonth params, or legacy 'all' / '<N>m'.",
          });
        }
        const months = parseInt(monthMatch[1], 10);
        if (months < 1 || months > 24) {
          return res.status(400).json({ success: false, message: 'Period must be 1m–24m or all.' });
        }
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - months);
        query += ' AND b.batch_start_date >= ?';
        params.push(cutoff);
        periodLabel = ` for batches starting in the last ${months} month${months === 1 ? '' : 's'}`;
        filenameSuffix = `_${period}`;
      }
    }

    query += ' ORDER BY c.center_id, b.batch_number, s.student_name';

    const [students] = await db.query(query, params);

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No approved students found${periodLabel}. Please upload and get student data approved first.`,
        code: 'NO_APPROVED_STUDENTS',
      });
    }

    const templateBuffer = await generatePrefilledEmploymentTemplate(students, partnerName);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Employment_Template_${partnerName.replace(/\s+/g, '_')}${filenameSuffix}_${Date.now()}.xlsx`
    );

    res.send(templateBuffer);
  } catch (error) {
    console.error('Error in downloadTemplate:', error);
    res.status(500).json({ success: false, message: 'Failed to generate template' });
  }
};

/**
 * Get available years + months that have approved student data for a partner
 * GET /api/v1/employment/template/periods
 * Returns: { success, data: { periods: [{ year, months: number[] }] } }
 */
exports.getAvailablePeriods = async (req, res) => {
  try {
    const partnerId = resolvePartnerId(req, { requireForAdmin: true });

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required.',
      });
    }

    // Use batch_start_date when available, fall back to student's created_at
    const [rows] = await db.query(
      `SELECT
         YEAR(COALESCE(b.batch_start_date, s.created_at)) AS year,
         MONTH(COALESCE(b.batch_start_date, s.created_at)) AS month
       FROM students s
       LEFT JOIN batches b ON b.id = s.batch_id
       WHERE s.partner_id = ?
       GROUP BY
         YEAR(COALESCE(b.batch_start_date, s.created_at)),
         MONTH(COALESCE(b.batch_start_date, s.created_at))
       ORDER BY year DESC, month ASC`,
      [partnerId]
    );

    // Group into [{ year, months: [] }], most recent year first
    const map = {};
    for (const row of rows) {
      if (!map[row.year]) map[row.year] = [];
      map[row.year].push(row.month);
    }
    const periods = Object.entries(map)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, months]) => ({ year: Number(year), months }));

    res.json({ success: true, data: { periods } });
  } catch (error) {
    console.error('Error in getAvailablePeriods:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch available periods.' });
  }
};

/**
 * Check if partner has approved students
 * GET /api/v1/employment/check-approved-students
 */
exports.checkApprovedStudents = async (req, res) => {
  try {
    const partnerId = resolvePartnerId(req, { requireForAdmin: true });

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required for admin checks. Please select a partner.',
      });
    }

    // Check if partner has any approved students
    const [approvedStudents] = await db.query(
      `SELECT COUNT(*) as count 
       FROM uploaded_students 
       WHERE partner_id = ? 
       AND review_status = 'approved'`,
      [partnerId]
    );

    const approvedCount = approvedStudents[0]?.count || 0;

    res.json({
      success: true,
      hasApprovedStudents: approvedCount > 0,
      approvedCount: approvedCount,
    });
  } catch (error) {
    console.error('Error in checkApprovedStudents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check approved students',
    });
  }
};

/**
 * Get partner's employment upload history
 * GET /api/v1/employment/uploads
 */
exports.getUploadHistory = async (req, res) => {
  try {
    const partnerId = resolvePartnerId(req, { requireForAdmin: true });
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const { status, dateFrom, dateTo } = req.query;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required for admin history. Please select a partner.',
      });
    }

    const result = await employmentService.getPartnerEmploymentUploads(partnerId, {
      page,
      limit,
      status: status || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error in getUploadHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upload history',
    });
  }
};

/**
 * Get employment upload details with error log
 * GET /api/v1/employment/uploads/:uploadId
 */
exports.getUploadDetails = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const partnerId = resolvePartnerId(req, { requireForAdmin: true });

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required for admin upload details. Please select a partner.',
      });
    }

    const upload = await employmentService.getEmploymentUploadDetails(uploadId, partnerId);

    res.json({
      success: true,
      data: upload,
    });
  } catch (error) {
    console.error('Error in getUploadDetails:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to fetch upload details',
    });
  }
};

/**
 * Get attachment list for an employment upload
 * GET /api/v1/employment/uploads/:uploadId/attachments
 * Returns parsed file_url JSON so the frontend can show download links.
 * Access: Admin can view any upload; Partner can only view their own.
 */
exports.getUploadAttachments = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);
    const partnerId = req.user?.partner_id || null;

    let rows;
    if (isAdmin) {
      [rows] = await db.query(
        'SELECT id, file_name, file_url, partner_id FROM employment_uploads WHERE id = ? LIMIT 1',
        [uploadId]
      );
    } else {
      if (!partnerId) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      [rows] = await db.query(
        'SELECT id, file_name, file_url, partner_id FROM employment_uploads WHERE id = ? AND partner_id = ? LIMIT 1',
        [uploadId, partnerId]
      );
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Upload not found.' });
    }

    const upload = rows[0];
    let attachments = [];
    if (upload.file_url) {
      try {
        const parsed = JSON.parse(upload.file_url);
        if (Array.isArray(parsed)) {
          // Legacy format: JSON array of attachment URLs
          attachments = parsed.map((url) => ({
            url,
            name: url.split('/').pop().replace(/^\d+_/, ''),
          }));
        } else if (parsed && typeof parsed === 'object' && parsed.attachments) {
          // New format: {data: path, attachments: [...]}
          attachments = parsed.attachments.map((url) => ({
            url,
            name: url.split('/').pop().replace(/^\d+_/, ''),
          }));
        }
      } catch {
        // Plain file_url is the main data file, not an attachment.
        attachments = [];
      }
    }

    res.json({ success: true, data: { uploadId, attachments } });
  } catch (error) {
    console.error('Error in getUploadAttachments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attachments.' });
  }
};

/**
 * Download employment data file
 * GET /api/v1/employment/uploads/:uploadId/download
 * Serves the original uploaded file (data file) for download.
 */
exports.downloadEmploymentFile = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);
    const partnerId = req.user?.partner_id || null;

    let rows;
    if (isAdmin) {
      [rows] = await db.query(
        'SELECT id, file_name, file_url FROM employment_uploads WHERE id = ? LIMIT 1',
        [uploadId]
      );
    } else {
      if (!partnerId) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      [rows] = await db.query(
        'SELECT id, file_name, file_url FROM employment_uploads WHERE id = ? AND partner_id = ? LIMIT 1',
        [uploadId, partnerId]
      );
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Upload not found.' });
    }

    const upload = rows[0];
    if (!upload.file_url) {
      return res.status(404).json({
        success: false,
        message: 'No file stored for this upload. Older uploads did not retain the original file.',
      });
    }

    // Resolve the data file path from file_url (may be plain path or JSON {data, attachments})
    let filePath = upload.file_url;
    try {
      const parsed = JSON.parse(upload.file_url);
      if (parsed && typeof parsed === 'object' && parsed.data) {
        filePath = parsed.data;
      }
    } catch {
      // plain string path — use as-is
    }

    // S3 URL: generate presigned URL
    if (filePath.startsWith('http') || filePath.includes('.amazonaws.com')) {
      const { generatePresignedUrl } = require('../../../utils/s3.util');
      let s3Key = filePath;
      try {
        const u = new URL(filePath);
        s3Key = u.pathname.replace(/^\//, '');
      } catch (_) {}
      const presignedUrl = await generatePresignedUrl(s3Key, 900);
      return res.json({
        success: true,
        data: { downloadUrl: presignedUrl, fileName: upload.file_name },
      });
    }

    // Local file: stream it
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(__dirname, '../../../../', filePath);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({
        success: false,
        message: 'The original file is no longer available on this server.',
      });
    }

    res.download(absPath, upload.file_name);
  } catch (error) {
    console.error('Error in downloadEmploymentFile:', error);
    res.status(500).json({ success: false, message: 'Failed to download file.' });
  }
};

/**
 * Download one attachment for an employment upload
 * GET /api/v1/employment/uploads/:uploadId/attachments/:attachmentIndex/download
 */
exports.downloadEmploymentAttachment = async (req, res) => {
  try {
    const { uploadId, attachmentIndex } = req.params;
    const index = Number.parseInt(attachmentIndex, 10);
    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({ success: false, message: 'Invalid attachment index.' });
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);
    const partnerId = req.user?.partner_id || null;

    let rows;
    if (isAdmin) {
      [rows] = await db.query(
        'SELECT id, file_name, file_url, partner_id FROM employment_uploads WHERE id = ? LIMIT 1',
        [uploadId]
      );
    } else {
      if (!partnerId) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      [rows] = await db.query(
        'SELECT id, file_name, file_url, partner_id FROM employment_uploads WHERE id = ? AND partner_id = ? LIMIT 1',
        [uploadId, partnerId]
      );
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Upload not found.' });
    }

    const upload = rows[0];
    if (!upload.file_url) {
      return res
        .status(404)
        .json({ success: false, message: 'No attachments found for this upload.' });
    }

    let attachmentUrl = null;
    try {
      const parsed = JSON.parse(upload.file_url);
      if (Array.isArray(parsed)) {
        attachmentUrl = parsed[index] || null;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.attachments)) {
        attachmentUrl = parsed.attachments[index] || null;
      }
    } catch {
      attachmentUrl = null;
    }

    if (!attachmentUrl) {
      return res.status(404).json({ success: false, message: 'Attachment not found.' });
    }

    const suggestedName = attachmentUrl.split(/[\\/]/).pop().replace(/^\d+_/, '');

    if (attachmentUrl.startsWith('http') || attachmentUrl.includes('.amazonaws.com')) {
      const { generatePresignedUrl } = require('../../../utils/s3.util');
      let s3Key = attachmentUrl;
      try {
        const u = new URL(attachmentUrl);
        s3Key = u.pathname.replace(/^\//, '');
      } catch (_) {}
      const presignedUrl = await generatePresignedUrl(s3Key, 900);
      return res.redirect(presignedUrl);
    }

    const absPath = path.isAbsolute(attachmentUrl)
      ? attachmentUrl
      : path.join(__dirname, '../../../../', attachmentUrl);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({
        success: false,
        message: 'The attachment file is no longer available on this server.',
      });
    }

    res.download(absPath, suggestedName);
  } catch (error) {
    console.error('Error in downloadEmploymentAttachment:', error);
    res.status(500).json({ success: false, message: 'Failed to download attachment.' });
  }
};

/**
 * Get student employment history
 * GET /api/v1/employment/students/:studentId
 */
exports.getStudentEmployment = async (req, res) => {
  try {
    const { studentId } = req.params;
    const partnerId = resolvePartnerId(req, { requireForAdmin: true });

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message:
          'Partner ID is required for admin student employment view. Please select a partner.',
      });
    }

    const employments = await employmentService.getStudentEmploymentHistory(studentId, partnerId);

    res.json({
      success: true,
      data: employments,
    });
  } catch (error) {
    console.error('Error in getStudentEmployment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student employment history',
    });
  }
};

/**
 * Admin: Get all employment uploads
 * GET /api/v1/admin/employment/uploads
 */
exports.getAllUploads = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const status = req.query.status || null;
    const { dateFrom, dateTo, partnerId } = req.query;

    const result = await employmentService.getAllEmploymentUploads({
      page,
      limit,
      status,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      partnerId: partnerId || null,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error in getAllUploads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employment uploads',
    });
  }
};

/**
 * Admin: Verify employment record
 * POST /api/v1/admin/employment/:employmentId/verify
 */
exports.verifyEmployment = async (req, res) => {
  try {
    const { employmentId } = req.params;
    const verifiedBy = req.user.id;
    const { notes } = req.body;

    const employment = await employmentService.verifyEmployment(employmentId, verifiedBy, {
      notes,
    });

    res.json({
      success: true,
      message: 'Employment verified successfully',
      data: employment,
    });
  } catch (error) {
    console.error('Error in verifyEmployment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify employment',
    });
  }
};

/**
 * Admin: Get employment statistics
 * GET /api/v1/admin/employment/statistics
 */
exports.getStatistics = async (req, res) => {
  try {
    const stats = await employmentService.getEmploymentStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error in getStatistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employment statistics',
    });
  }
};

// ═══════════════════════════════════════════════════════
// Admin: Employment Upload Review Flow
// ═══════════════════════════════════════════════════════

/**
 * Admin: Get employment uploads pending review
 * GET /api/v1/employment/admin/review-uploads
 */
exports.getAdminReviewUploads = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, partnerId, dateFrom, dateTo } = req.query;
    const result = await employmentService.getAdminReviewUploads({
      page,
      limit,
      status: status || null,
      partnerId: partnerId || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in getAdminReviewUploads:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch review uploads' });
  }
};

/**
 * Admin: Get center-wise summary for an employment upload
 * GET /api/v1/employment/admin/review-uploads/:uploadId/centers
 */
exports.getUploadCenterSummary = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const centers = await employmentService.getUploadCenterSummary(uploadId);
    res.json({ success: true, data: centers });
  } catch (error) {
    console.error('Error in getUploadCenterSummary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch center summary' });
  }
};

/**
 * Admin: Get employment records for a center within an upload
 * GET /api/v1/employment/admin/review-uploads/:uploadId/centers/:centerId
 */
exports.getCenterEmploymentRecords = async (req, res) => {
  try {
    const { uploadId, centerId } = req.params;
    const records = await employmentService.getCenterEmploymentRecords(uploadId, centerId);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Error in getCenterEmploymentRecords:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch center records' });
  }
};

/**
 * Admin: Save edited employment records during review
 * POST /api/v1/employment/admin/review-uploads/:uploadId/centers/:centerId/save-edits
 */
exports.saveAdminEmploymentEdits = async (req, res) => {
  try {
    const { uploadId, centerId } = req.params;
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'No records provided' });
    }

    const result = await employmentService.saveAdminEmploymentEdits(uploadId, centerId, records);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in saveAdminEmploymentEdits:', error);
    res
      .status(error.message.includes('not found') || error.message.includes('Only') ? 400 : 500)
      .json({
        success: false,
        message: error.message || 'Failed to save employment edits',
      });
  }
};

/**
 * Admin: Approve an employment upload
 * POST /api/v1/employment/admin/review-uploads/:uploadId/approve
 */
exports.approveEmploymentUpload = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const adminId = req.user.id;
    const { remarks } = req.body;

    const upload = await employmentService.approveEmploymentUpload(uploadId, adminId, remarks);

    // Notify partner
    try {
      const reviewerName = req.user.full_name || 'Admin';
      await notificationService.createReviewNotification({
        uploadId,
        partnerId: upload.partner_id,
        partnerName: upload.partner_name,
        fileName: upload.file_name,
        status: 'approved',
        reviewerName,
        remarks: remarks || null,
        entityType: 'employment_upload',
      });
      emitToRole('partner', 'notification:new', {
        type: 'employment_review',
        title: 'Employment Upload Approved',
        message: `Your employment upload "${upload.file_name}" has been approved`,
        uploadId,
        timestamp: new Date().toISOString(),
      });
    } catch (notifErr) {
      console.warn('Failed to send approval notification:', notifErr.message);
    }

    res.json({ success: true, message: 'Employment upload approved successfully', data: upload });
  } catch (error) {
    console.error('Error in approveEmploymentUpload:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to approve upload' });
  }
};

/**
 * Admin: Reject an employment upload
 * POST /api/v1/employment/admin/review-uploads/:uploadId/reject
 */
exports.rejectEmploymentUpload = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const adminId = req.user.id;
    const { reason, remarks } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
    }

    const upload = await employmentService.rejectEmploymentUpload(
      uploadId,
      adminId,
      reason,
      remarks
    );

    // Notify partner
    try {
      const reviewerName = req.user.full_name || 'Admin';
      await notificationService.createReviewNotification({
        uploadId,
        partnerId: upload.partner_id,
        partnerName: upload.partner_name,
        fileName: upload.file_name,
        status: 'rejected',
        reviewerName,
        remarks: reason,
        entityType: 'employment_upload',
      });
      emitToRole('partner', 'notification:new', {
        type: 'employment_review',
        title: 'Employment Upload Rejected',
        message: `Your employment upload "${upload.file_name}" was rejected: ${reason}`,
        uploadId,
        timestamp: new Date().toISOString(),
      });
    } catch (notifErr) {
      console.warn('Failed to send rejection notification:', notifErr.message);
    }

    res.json({ success: true, message: 'Employment upload rejected', data: upload });
  } catch (error) {
    console.error('Error in rejectEmploymentUpload:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to reject upload' });
  }
};

/**
 * Admin: Get approved employment records for Data tab
 * GET /api/v1/employment/admin/records
 */
exports.getApprovedEmploymentRecords = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      partnerId,
      centerId,
      employmentStatus,
      dateFrom,
      dateTo,
      search,
    } = req.query;

    // Partners can only see their own records
    const effectivePartnerId =
      req.user.role === 'PARTNER' ? req.user.partner_id : partnerId || null;

    const result = await employmentService.getApprovedEmploymentRecords({
      page,
      limit,
      partnerId: effectivePartnerId,
      centerId: centerId || null,
      employmentStatus: employmentStatus || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      search: search || null,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in getApprovedEmploymentRecords:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employment records' });
  }
};

/**
 * POST /api/v1/employment/add
 * Manually add a single employment record (Admin: verified; Partner: unverified)
 */
exports.addEmploymentRecord = async (req, res) => {
  try {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);
    const partnerId = isAdmin ? req.body.partnerId || req.user?.partner_id : req.user?.partner_id;

    if (!partnerId) {
      return res.status(400).json({ success: false, message: 'Partner ID is required.' });
    }

    const {
      partnerStudentId,
      employmentStatus,
      companyName,
      companyLocation,
      dateOfJoining,
      designation,
      salaryPerMonth,
      industry,
    } = req.body;

    if (!partnerStudentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    const record = await employmentService.addEmploymentRecord({
      partnerId,
      partnerStudentId,
      employmentStatus,
      companyName,
      companyLocation,
      dateOfJoining,
      designation,
      salaryPerMonth,
      industry,
      addedById: req.user.id,
      isAdmin,
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('Error in addEmploymentRecord:', error);
    const status =
      error.message.includes('not found') ||
      error.message.includes('required') ||
      error.message.includes('Invalid')
        ? 400
        : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

exports.updateEmploymentRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await employmentService.updateEmploymentRecord(id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error in updateEmploymentRecord:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

exports.deleteEmploymentRecord = async (req, res) => {
  try {
    const { id } = req.params;
    await employmentService.deleteEmploymentRecord(id);
    res.json({ success: true, message: 'Employment record deleted successfully.' });
  } catch (error) {
    console.error('Error in deleteEmploymentRecord:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// PARTNER: Edit & Resubmit Rejected Employment Uploads
// ────────────────────────────────────────────────────────────────────────────

exports.getPartnerRejectedEmploymentUploads = async (req, res) => {
  try {
    const partnerId = req.user.partner_id;
    if (!partnerId)
      return res.status(403).json({ success: false, message: 'Partner access required' });
    const { page, limit, search } = req.query;
    const result = await employmentService.getPartnerRejectedEmploymentUploads(partnerId, {
      page,
      limit,
      search,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in getPartnerRejectedEmploymentUploads:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPartnerEmploymentUploadCenters = async (req, res) => {
  try {
    const partnerId = req.user.partner_id;
    if (!partnerId)
      return res.status(403).json({ success: false, message: 'Partner access required' });
    const { uploadId } = req.params;
    const result = await employmentService.getPartnerEmploymentUploadCenters(uploadId, partnerId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in getPartnerEmploymentUploadCenters:', error);
    const status =
      error.message.includes('unauthorized') || error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

exports.getPartnerCenterRecordsForEdit = async (req, res) => {
  try {
    const partnerId = req.user.partner_id;
    if (!partnerId)
      return res.status(403).json({ success: false, message: 'Partner access required' });
    const { uploadId, centerId } = req.params;
    const result = await employmentService.getPartnerCenterRecordsForEdit(
      uploadId,
      centerId,
      partnerId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in getPartnerCenterRecordsForEdit:', error);
    const status =
      error.message.includes('unauthorized') || error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

exports.savePartnerEmploymentEdits = async (req, res) => {
  try {
    const partnerId = req.user.partner_id;
    if (!partnerId)
      return res.status(403).json({ success: false, message: 'Partner access required' });
    const { uploadId, centerId } = req.params;
    const { records } = req.body;
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'records array is required' });
    }
    const result = await employmentService.savePartnerEmploymentEdits(
      uploadId,
      centerId,
      partnerId,
      records
    );
    res.json({ success: true, data: result, message: 'Changes saved successfully' });
  } catch (error) {
    console.error('Error in savePartnerEmploymentEdits:', error);
    const status =
      error.message.includes('unauthorized') || error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

exports.resubmitEmploymentUpload = async (req, res) => {
  try {
    const partnerId = req.user.partner_id;
    if (!partnerId)
      return res.status(403).json({ success: false, message: 'Partner access required' });
    const { uploadId } = req.params;
    const userId = req.user.id;

    const result = await employmentService.resubmitEmploymentUpload(uploadId, partnerId, userId);

    // Notify admins of new pending review
    try {
      const notifId = uuidv4();
      await notificationService.createNotification({
        id: notifId,
        title: 'Employment Upload Resubmitted',
        message: `${result.upload?.partner_name || 'A partner'} has resubmitted an employment upload (v${result.version}) for review.`,
        type: 'employment_upload',
        related_entity_type: 'employment_upload',
        related_entity_id: result.newUploadId,
        target_role: 'ADMIN',
      });
      emitToRole('ADMIN', 'notification', { message: 'New employment upload pending review' });
    } catch (notifErr) {
      console.warn('Notification failed (non-fatal):', notifErr.message);
    }

    res.json({
      success: true,
      data: {
        newUploadId: result.newUploadId,
        version: result.version,
        message: 'Upload resubmitted successfully. Admin has been notified.',
      },
    });
  } catch (error) {
    console.error('Error in resubmitEmploymentUpload:', error);
    const status =
      error.message.includes('unauthorized') || error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};
