'use strict';

const certService = require('../services/certification.service');
const path = require('path');
const fs = require('fs');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise a local file path to a URL-style path for storage */
const toFileUrl = (filePath) => {
  if (!filePath) return null;
  return `/uploads/${path.relative(path.join(__dirname, '../../../../uploads'), filePath).replace(/\\/g, '/')}`;
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
 * Multipart: supportDoc (optional)
 * Body: centerId, batchId, batchStartDate, batchEndDate, assessmentDate
 */
exports.uploadCertificationData = async (req, res) => {
  const supportDoc = req.file; // single file from uploadCertificationFiles middleware
  try {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    const targetPartnerId = req.body.targetPartnerId || null;
    let partnerId = req.user.partner_id || req.user.id;
    if (isAdmin && targetPartnerId) {
      partnerId = targetPartnerId;
    }
    const uploadedBy = req.user.id;
    const { centerId, batchId, batchStartDate, batchEndDate, assessmentDate } = req.body;

    if (!centerId || !batchId) {
      cleanupFile(supportDoc?.path);
      return res.status(400).json({ success: false, message: 'centerId and batchId are required' });
    }

    const supportDocUrl = supportDoc ? toFileUrl(supportDoc.path) : null;

    const result = await certService.createCertificationUpload({
      partnerId,
      centerId,
      batchId,
      batchStartDate: batchStartDate || null,
      batchEndDate: batchEndDate || null,
      assessmentDate: assessmentDate || null,
      supportDocUrl,
      supportDocName: supportDoc?.originalname || null,
      uploadedBy,
    });

    res.json({
      success: true,
      message: 'Certification data submitted successfully. Awaiting admin approval.',
      data: result,
    });
  } catch (error) {
    cleanupFile(supportDoc?.path);
    console.error('[certController] uploadCertificationData error:', error);
    res.status(500).json({ success: false, message: error.message || 'Upload failed' });
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
 * Multipart: zipFile (archive) + studentListDoc (document)
 * Body: partnerId, centerId, batchId, [certificationUploadId],
 *       traineesAttended, traineesPassed, traineesFailed, traineesAbsent
 */
exports.essciUploadPDF = async (req, res) => {
  const zipFile = req.files?.zipFile?.[0];
  const studentListDoc = req.files?.studentListDoc?.[0];
  try {
    const uploadedBy = req.user.id;
    const {
      partnerId,
      centerId,
      batchId,
      certificationUploadId,
      traineesAttended,
      traineesPassed,
      traineesFailed,
      traineesAbsent,
    } = req.body;

    if (!partnerId || !centerId || !batchId) {
      cleanupFile(zipFile?.path);
      cleanupFile(studentListDoc?.path);
      return res
        .status(400)
        .json({ success: false, message: 'partnerId, centerId, and batchId are required' });
    }
    if (!zipFile) {
      cleanupFile(studentListDoc?.path);
      return res.status(400).json({ success: false, message: 'ZIP archive file is required' });
    }
    if (!studentListDoc) {
      cleanupFile(zipFile?.path);
      return res.status(400).json({ success: false, message: 'Student list document is required' });
    }

    const result = await certService.uploadCertificatePDF({
      partnerId,
      centerId,
      batchId,
      certificationUploadId: certificationUploadId || null,
      traineesAttended: parseInt(traineesAttended) || 0,
      traineesPassed: parseInt(traineesPassed) || 0,
      traineesFailed: parseInt(traineesFailed) || 0,
      traineesAbsent: parseInt(traineesAbsent) || 0,
      zipFileUrl: toFileUrl(zipFile.path),
      zipFileName: zipFile.originalname,
      studentListUrl: toFileUrl(studentListDoc.path),
      studentListName: studentListDoc.originalname,
      uploadedBy,
    });

    res.json({
      success: true,
      message: 'Certificate data uploaded and pending admin review',
      data: result,
    });
  } catch (error) {
    cleanupFile(zipFile?.path);
    cleanupFile(studentListDoc?.path);
    console.error('[certController] essciUploadPDF error:', error);
    res.status(500).json({ success: false, message: error.message || 'Upload failed' });
  }
};
