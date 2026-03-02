const employmentService = require('../services/employment.service');
const {
  generateEmploymentTemplate,
  parseExcelFile,
  validateHeaders,
  EXPECTED_EMPLOYMENT_COLUMNS,
} = require('../../../utils/excelHandler');
const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

/**
 * Upload employment CSV
 * POST /api/v1/employment/upload
 */
exports.uploadEmployment = async (req, res) => {
  try {
    const partnerId = req.user.partner_id || req.user.id;
    const uploadedBy = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Parse the uploaded file
    const { data: csvData, headers } = await parseExcelFile(req.file.path, 'employment');

    // Validate headers
    const headerValidation = validateHeaders(headers, 'employment');
    if (!headerValidation.isValid) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        /* ignore */
      }
      return res.status(400).json({
        success: false,
        message: `Invalid file format: ${headerValidation.errors.join(', ')}`,
      });
    }

    // Create employment_uploads record
    const uploadId = uuidv4();
    await db.query(
      `INSERT INTO employment_uploads
         (id, partner_id, file_name, total_records, status, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, 'processing', ?, NOW())`,
      [uploadId, partnerId, req.file.originalname, csvData.length, uploadedBy]
    );

    // Process pre-parsed data through service
    const result = await employmentService.processEmploymentUpload(
      partnerId,
      uploadId,
      csvData,
      req.file.originalname
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

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      /* ignore */
    }

    res.json({ success: true, uploadId, ...result });
  } catch (error) {
    console.error('Error in uploadEmployment:', error);

    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
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
 * Download employment template
 * GET /api/v1/employment/template
 */
exports.downloadTemplate = async (req, res) => {
  try {
    const partnerId = req.user.partner_id || req.user.id;
    const partnerName = req.user.partner_name || req.user.full_name || 'Partner';
    const sampleRowCount = parseInt(req.query.samples) || 3;

    // Check if partner has any approved students
    const [approvedStudents] = await db.query(
      `SELECT COUNT(*) as count 
       FROM uploaded_students 
       WHERE partner_id = ? 
       AND review_status = 'approved'`,
      [partnerId]
    );

    const approvedCount = approvedStudents[0]?.count || 0;

    if (approvedCount === 0) {
      return res.status(400).json({
        success: false,
        message:
          'No approved students found. Please upload and get student data approved before downloading employment template.',
        code: 'NO_APPROVED_STUDENTS',
      });
    }

    const templateBuffer = await generateEmploymentTemplate(partnerName, sampleRowCount);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Employment_Data_Template_${Date.now()}.xlsx`
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

    const result = await employmentService.getPartnerEmploymentUploads(partnerId, {
      page,
      limit,
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

    const result = await employmentService.getAllEmploymentUploads({
      page,
      limit,
      status,
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
