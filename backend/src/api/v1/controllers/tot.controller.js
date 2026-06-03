const totService = require('../services/tot.service');
const { parseExcelFile } = require('../../../utils/excelHandler');
const notificationService = require('../services/notification.service');
const { emitToRole } = require('../../../websocket/socket');
const fs = require('fs');

/**
 * TOT Controller
 * GET  /api/v1/tot/template                      — download xlsx template
 * POST /api/v1/tot/upload                        — partner uploads TOT file
 * GET  /api/v1/tot/uploads                       — partner history
 * GET  /api/v1/tot/uploads/:id                   — upload details
 * GET  /api/v1/tot/admin/uploads                 — admin list
 * POST /api/v1/tot/admin/uploads/:id/approve     — approve
 * POST /api/v1/tot/admin/uploads/:id/reject      — reject
 * POST /api/v1/tot/admin/uploads/:id/save-edits  — save edits before approve
 * GET  /api/v1/tot/trainers                      — approved trainer list
 * GET  /api/v1/tot/trainers/filter-options       — filter options
 * POST /api/v1/tot/trainers                      — create single trainer
 */

/**
 * Download TOT Excel (.xlsx) template
 */
exports.downloadTemplate = async (req, res) => {
  try {
    const partnerId = req.user.partner_id || req.query.partnerId || null;
    const buffer = await totService.generateTemplateExcel(partnerId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="TOT_Upload_Template.xlsx"');
    return res.send(buffer);
  } catch (error) {
    console.error('downloadTemplate error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate template.' });
  }
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
    let partnerId = req.user.partner_id;
    if (isAdmin) {
      if (!targetPartnerId) {
        if (dataFile && dataFile.path) fs.unlink(dataFile.path, () => {});
        return res.status(400).json({
          success: false,
          message: 'Partner ID is required for admin uploads. Please select a partner.',
        });
      }
      partnerId = targetPartnerId;
    }
    if (!partnerId) {
      if (dataFile && dataFile.path) fs.unlink(dataFile.path, () => {});
      return res.status(400).json({
        success: false,
        message: 'Partner ID not found. Please ensure you are logged in as a partner user.',
      });
    }

    const uploadedBy = req.user.id;

    const { rows } = await parseExcelFile(dataFile.path, dataFile.originalname, 'tot');

    if (!rows || rows.length === 0) {
      fs.unlink(dataFile.path, () => {});
      return res
        .status(400)
        .json({ success: false, message: 'File is empty or has no data rows.' });
    }

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

    const result = await totService.createUpload(
      partnerId,
      uploadedBy,
      dataFile.originalname,
      dataFile.path,
      cleanedRows
    );

    fs.unlink(dataFile.path, () => {});

    try {
      const partnerName = req.user.partner_name || req.user.full_name || 'Partner';
      await notificationService.createUploadNotification({
        uploadId: result.uploadId,
        partnerId,
        partnerName,
        fileName: dataFile.originalname,
        totalRecords: result.processed,
        entityType: 'tot_upload',
      });

      emitToRole('admin', 'notification:new', {
        type: 'tot_upload',
        alert_type: 'info',
        title: 'New TOT Data Upload',
        message: `${partnerName} uploaded TOT data: ${dataFile.originalname} (${result.processed} records)`,
        uploadId: result.uploadId,
        totalRecords: result.processed,
        related_entity_type: 'tot_upload',
        timestamp: new Date().toISOString(),
      });
    } catch (notifError) {
      console.warn('Failed to send TOT upload notification:', notifError.message);
    }

    return res.status(201).json({
      success: true,
      message: `Successfully uploaded ${result.processed} TOT records. Awaiting admin approval.`,
      data: { uploadId: result.uploadId, total: result.total, processed: result.processed },
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
 * Get upload details
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

/**
 * Admin: save edits to uploaded_tots rows (before approval)
 */
exports.saveTotAdminEdits = async (req, res) => {
  try {
    const { rows = [], changes = [] } = req.body;
    const result = await totService.saveTotAdminEdits(req.params.id, rows, changes, req.user.id);
    return res.json({ success: true, message: 'Changes saved.', data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get approved TOT trainers
 */
exports.getTrainers = async (req, res) => {
  try {
    const result = await totService.getTrainers({
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 10,
      search: req.query.search || '',
      partner_id: req.query.partner_id || '',
      trainer_module_trained: req.query.trainer_module_trained || '',
      tot_center: req.query.tot_center || '',
      state: req.query.state || '',
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'desc',
      role: req.user.role,
      user_partner_id: req.user.partner_id || req.user.id,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message || 'Failed to fetch TOT trainers.' });
  }
};

exports.getTrainerById = async (req, res) => {
  try {
    const trainer = await totService.getTrainerById(req.params.id);
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found' });
    }

    return res.json({ success: true, data: trainer });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message || 'Failed to load trainer' });
  }
};

exports.updateTrainer = async (req, res) => {
  try {
    const trainer = await totService.updateTrainer(req.params.id, req.body || {});
    return res.json({ success: true, message: 'Trainer updated successfully', data: trainer });
  } catch (error) {
    const status = error.message === 'Trainer not found' ? 404 : 500;
    return res
      .status(status)
      .json({ success: false, message: error.message || 'Failed to update trainer' });
  }
};

exports.deleteTrainer = async (req, res) => {
  try {
    await totService.deleteTrainer(req.params.id);
    return res.json({ success: true, message: 'Trainer deleted successfully', data: null });
  } catch (error) {
    const status = error.message === 'Trainer not found' ? 404 : 500;
    return res
      .status(status)
      .json({ success: false, message: error.message || 'Failed to delete trainer' });
  }
};

/**
 * Get filter options for TOT trainer data tab
 */
exports.getTrainerFilterOptions = async (req, res) => {
  try {
    const result = await totService.getTrainerFilterOptions({
      role: req.user.role,
      user_partner_id: req.user.partner_id || req.user.id,
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message || 'Failed to load TOT filter options.' });
  }
};

/**
 * Create a single trainer directly in approved TOT data (minimal form)
 */
exports.createTrainer = async (req, res) => {
  try {
    const actor = {
      id: req.user.id,
      role: req.user.role,
      partnerId: req.user.partner_id || req.user.id,
    };

    const trainer = await totService.createTrainer({
      actor,
      targetPartnerId: req.body.targetPartnerId || null,
      trainerData: req.body,
    });

    return res
      .status(201)
      .json({ success: true, message: 'Trainer added successfully.', data: trainer });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, message: error.message || 'Failed to add trainer.' });
  }
};
