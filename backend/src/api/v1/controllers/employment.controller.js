const employmentService = require('../services/employment.service');
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
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    const targetPartnerId = req.body.targetPartnerId || null;
    let partnerId = req.user.partner_id || req.user.id;
    if (isAdmin && targetPartnerId) {
      partnerId = targetPartnerId;
    }
    const uploadedBy = req.user.id;

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

    // Store attachment URLs if any
    if (attachmentUrls.length > 0) {
      await db.query(`UPDATE employment_uploads SET file_url = ? WHERE id = ?`, [
        JSON.stringify(attachmentUrls),
        uploadId,
      ]);
    }

    // Process pre-parsed data through service
    const result = await employmentService.processEmploymentUpload(
      partnerId,
      uploadId,
      csvData,
      dataFile.originalname
    );

    // Update upload record with final stats
    const finalStatus = result.failed === csvData.length ? 'failed' : 'completed';
    await db.query(
      `UPDATE employment_uploads
         SET records_processed = ?, records_failed = ?, status = ?,
             error_log = ?, processed_at = NOW()
       WHERE id = ?`,
      [result.processed, result.failed, finalStatus, JSON.stringify(result.error_log), uploadId]
    );

    // Clean up data file
    try {
      fs.unlinkSync(dataFile.path);
    } catch (err) {
      /* ignore */
    }

    res.json({ success: true, uploadId, ...result });
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

/**
 * Download pre-filled employment template (B4/B5/B6)
 * GET /api/v1/employment/template
 * Query params:
 *   period=1m|6m|1y|all  (default: all) — filter students approved in the last N months
 */
exports.downloadTemplate = async (req, res) => {
  try {
    const partnerId = req.user.partner_id || req.user.id;
    const partnerName = req.user.partner_name || req.user.full_name || 'Partner';
    const period = req.query.period || 'all';

    // Calculate cutoff date based on period
    // Accepts: 'all' or any '<N>m' where N is a positive integer (e.g. 1m, 2m, 3m ... 24m)
    let cutoffDate = null;
    if (period !== 'all') {
      const monthMatch = /^(\d+)m$/.exec(period);
      if (!monthMatch) {
        return res.status(400).json({
          success: false,
          message: 'Invalid period. Use a number of months like 1m, 2m, 3m ... or \'all\'.',
        });
      }
      const months = parseInt(monthMatch[1], 10);
      if (months < 1 || months > 24) {
        return res.status(400).json({
          success: false,
          message: 'Period must be between 1m and 24m, or \'all\'.',
        });
      }
      const now = new Date();
      now.setMonth(now.getMonth() - months);
      cutoffDate = now;
    }

    // Fetch approved students for this partner, filtered by approval date (students.created_at)
    // Join with uploaded_students to get father_name, batches for batch_number, centers for center_csv_id
    let query = `
      SELECT
        s.id            AS student_uuid,
        s.partner_student_id,
        s.student_name,
        us.father_name,
        b.batch_number,
        c.center_id     AS center_csv_id,
        s.created_at    AS approved_at
      FROM students s
      LEFT JOIN uploaded_students us ON us.approved_student_id = s.id
      LEFT JOIN batches b ON b.id = s.batch_id
      LEFT JOIN centers c ON c.id = s.center_id
      WHERE s.partner_id = ?
    `;
    const params = [partnerId];

    if (cutoffDate) {
      query += ' AND s.created_at >= ?';
      params.push(cutoffDate);
    }

    query += ' ORDER BY c.center_id, b.batch_number, s.student_name';

    const [students] = await db.query(query, params);

    if (students.length === 0) {
      const monthMatch = /^(\d+)m$/.exec(period);
      const periodLabel = period === 'all'
        ? ''
        : ` approved in the last ${monthMatch ? monthMatch[1] + (monthMatch[1] === '1' ? ' month' : ' months') : period}`;
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
    const periodSuffix = period === 'all' ? '' : `_${period}`;
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Employment_Template_${partnerName.replace(/\s+/g, '_')}${periodSuffix}_${Date.now()}.xlsx`
    );

    res.send(templateBuffer);
  } catch (error) {
    console.error('Error in downloadTemplate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
    });
  }
};

/**
 * Check if partner has approved students
 * GET /api/v1/employment/check-approved-students
 */
exports.checkApprovedStudents = async (req, res) => {
  try {
    const partnerId = req.user.partner_id || req.user.id;

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
    const partnerId = req.user.partner_id || req.user.id;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const { status, dateFrom, dateTo } = req.query;

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
    const partnerId = req.user.partner_id || req.user.id;

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
 * Get student employment history
 * GET /api/v1/employment/students/:studentId
 */
exports.getStudentEmployment = async (req, res) => {
  try {
    const { studentId } = req.params;
    const partnerId = req.user.partner_id || req.user.id;

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
