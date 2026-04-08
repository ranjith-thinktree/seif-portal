const totService = require('../services/tot.service');
const { parseExcelFile } = require('../../../utils/excelHandler');
const fs = require('fs');
const path = require('path');

/**
 * TOT Controller
 * POST /api/v1/tot/upload  — partner uploads TOT CSV
 * GET  /api/v1/tot/template — download CSV template
 * GET  /api/v1/tot/uploads  — partner history
 * GET  /api/v1/tot/uploads/:id — detail
 * GET  /api/v1/tot/admin/uploads — admin list
 * POST /api/v1/tot/admin/uploads/:id/approve
 * POST /api/v1/tot/admin/uploads/:id/reject
 */

/**
 * Download TOT CSV template
 */
exports.downloadTemplate = (req, res) => {
  const csv = totService.getTemplateCSV();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="TOT_Upload_Template.csv"');
  res.send(csv);
};

/**
 * Upload TOT file (partner)
 */
exports.uploadTot = async (req, res) => {
  const dataFile = req.file;
  if (!dataFile) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  try {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    const targetPartnerId = req.body.targetPartnerId || null;
    let partnerId = req.user.partner_id || req.user.id;
    if (isAdmin && targetPartnerId) partnerId = targetPartnerId;

    const uploadedBy = req.user.id;

    // Parse file
    const { rows } = await parseExcelFile(dataFile.path, dataFile.originalname, 'tot');

    if (!rows || rows.length === 0) {
      fs.unlink(dataFile.path, () => {});
      return res
        .status(400)
        .json({ success: false, message: 'File is empty or has no data rows.' });
    }

    // Validate rows
    const validationErrors = [];
    const cleanedRows = [];

    for (let i = 0; i < rows.length; i++) {
      const { isValid, errors, cleaned } = totService.validateTotRow(rows[i].data, i + 2);
      if (!isValid) {
        validationErrors.push(...errors);
      } else {
        cleanedRows.push(cleaned);
      }
    }

    if (validationErrors.length > 0) {
      fs.unlink(dataFile.path, () => {});
      return res.status(400).json({
        success: false,
        message: 'File validation failed. Please fix the errors and re-upload.',
        errors: validationErrors.slice(0, 50),
        totalErrors: validationErrors.length,
      });
    }

    const fileUrl = dataFile.path; // local path (S3 optional)

    const result = await totService.createUpload(
      partnerId,
      uploadedBy,
      dataFile.originalname,
      fileUrl,
      cleanedRows
    );

    fs.unlink(dataFile.path, () => {});

    return res.status(201).json({
      success: true,
      message: `Successfully uploaded ${result.processed} TOT records. Awaiting admin approval.`,
      data: {
        uploadId: result.uploadId,
        total: result.total,
        processed: result.processed,
      },
    });
  } catch (error) {
    if (dataFile && dataFile.path) fs.unlink(dataFile.path, () => {});
    console.error('TOT upload error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Upload failed.' });
  }
};

/**
 * Get partner's TOT uploads (history)
 */
exports.getMyUploads = async (req, res) => {
  try {
    const partnerId = req.user.partner_id || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await totService.getPartnerUploads(partnerId, page, limit);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('getMyUploads error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get upload details (partner view)
 */
exports.getUploadDetails = async (req, res) => {
  try {
    const upload = await totService.getUploadDetails(req.params.id);
    if (!upload) return res.status(404).json({ success: false, message: 'Upload not found.' });
    return res.json({ success: true, data: upload });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: get all TOT uploads
 */
exports.getAllUploads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || null;
    const result = await totService.getAllUploads(page, limit, status);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: approve TOT upload
 */
exports.approveUpload = async (req, res) => {
  try {
    const result = await totService.approveUpload(
      req.params.id,
      req.user.id,
      req.body.remarks || null
    );
    return res.json({
      success: true,
      message: `Approved ${result.approved} TOT records.`,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Admin: reject TOT upload
 */
exports.rejectUpload = async (req, res) => {
  try {
    await totService.rejectUpload(req.params.id, req.user.id, req.body.remarks || null);
    return res.json({ success: true, message: 'TOT upload rejected.' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
