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
 * Body: centerId, centerName, batchId?, otherBatchNumber?, batchStartDate, batchEndDate,
 *       assessmentDate, spokeName, spokeEmail, spokeMobile
 */
exports.uploadCertificationData = async (req, res) => {
  try {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    const targetPartnerId = req.body.targetPartnerId || null;
    let partnerId = req.user.partner_id || req.user.id;
    if (isAdmin && targetPartnerId) {
      partnerId = targetPartnerId;
    }
    const uploadedBy = req.user.id;
    const {
      centerId,
      centerName,
      batchId,
      otherBatchNumber,
      batchStartDate,
      batchEndDate,
      assessmentDate,
      spokeName,
      spokeEmail,
      spokeMobile,
    } = req.body;

    const trimmedOtherBatch = otherBatchNumber ? String(otherBatchNumber).trim() : '';

    if (!centerId) {
      return res.status(400).json({ success: false, message: 'centerId is required' });
    }
    if (!batchId && !trimmedOtherBatch) {
      return res
        .status(400)
        .json({ success: false, message: 'Select a batch or enter an other batch number' });
    }

    const result = await certService.createCertificationUpload({
      partnerId,
      centerId,
      centerName: centerName ? String(centerName).trim() : null,
      batchId: batchId || null,
      otherBatchNumber: trimmedOtherBatch || null,
      batchStartDate: batchStartDate || null,
      batchEndDate: batchEndDate || null,
      assessmentDate: assessmentDate || null,
      spokeName: spokeName ? String(spokeName).trim() : null,
      spokeEmail: spokeEmail ? String(spokeEmail).trim() : null,
      spokeMobile: spokeMobile ? String(spokeMobile).trim() : null,
      uploadedBy,
    });

    res.json({
      success: true,
      message: 'Certification data submitted successfully. ESSCI will process your request.',
      data: result,
    });
  } catch (error) {
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

/**
 * GET /certification/requests  (partner certification request list)
 */
exports.getPartnerCertificationRequests = async (req, res) => {
  try {
    const partnerId = req.user.partner_id || req.user.id;
    const { page = 1, limit = 1000 } = req.query;
    const result = await certService.listCertificationRequests({
      partnerId,
      page,
      limit,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[certController] getPartnerCertificationRequests error:', error);
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
 * GET /certification/admin/requests  (admin certification request list)
 */
exports.adminGetCertificationRequests = async (req, res) => {
  try {
    const { page = 1, limit = 1000 } = req.query;
    const result = await certService.listCertificationRequests({ page, limit });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[certController] adminGetCertificationRequests error:', error);
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
 * POST /certification/essci/step1
 * Multipart: qrCode (optional image/PDF)
 * Body: uploadId, responseLink, responseId, responsePassword
 */
exports.essciSubmitStep1 = async (req, res) => {
  const qrCode = req.files?.qrCode?.[0];
  try {
    const { uploadId, responseLink, responseId, responsePassword } = req.body;

    if (!uploadId) {
      cleanupFile(qrCode?.path);
      return res.status(400).json({ success: false, message: 'uploadId is required' });
    }
    if (!responseLink?.trim() || !responseId?.trim() || !responsePassword?.trim()) {
      cleanupFile(qrCode?.path);
      return res.status(400).json({
        success: false,
        message: 'Link, ID, and password are required',
      });
    }

    const result = await certService.submitESSCIStep1Response({
      uploadId,
      responseLink: String(responseLink).trim(),
      responseId: String(responseId).trim(),
      responsePassword: String(responsePassword).trim(),
      qrCodeUrl: qrCode ? toFileUrl(qrCode.path) : null,
      qrCodeName: qrCode?.originalname || null,
      qrCodePath: qrCode?.path || null,
      submittedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Initial response submitted and shared with the center spoke person',
      data: result,
    });
  } catch (error) {
    cleanupFile(qrCode?.path);
    console.error('[certController] essciSubmitStep1 error:', error);
    res.status(500).json({ success: false, message: error.message || 'Submit failed' });
  }
};

/**
 * POST /certification/essci/upload-pdf
 * Multipart: certificateFiles (1–10) and/or legacy zipFile + studentListDoc
 * Body: partnerId, centerId, batchId, certificationUploadId,
 *       traineesRegistered, traineesAttended, traineesPassed, traineesFailed
 */
exports.essciUploadPDF = async (req, res) => {
  const zipFile = req.files?.zipFile?.[0];
  const studentListDoc = req.files?.studentListDoc?.[0];
  const certificateFiles = req.files?.certificateFiles || [];
  const allFiles = [zipFile, studentListDoc, ...certificateFiles].filter(Boolean);

  const cleanupAll = () => allFiles.forEach((f) => cleanupFile(f?.path));

  try {
    const uploadedBy = req.user.id;
    const {
      partnerId,
      centerId,
      batchId,
      certificationUploadId,
      traineesRegistered,
      traineesAttended,
      traineesPassed,
      traineesFailed,
      traineesAbsent,
    } = req.body;

    if (!certificationUploadId) {
      cleanupAll();
      return res.status(400).json({ success: false, message: 'certificationUploadId is required' });
    }
    if (!partnerId || !centerId) {
      cleanupAll();
      return res
        .status(400)
        .json({ success: false, message: 'partnerId and centerId are required' });
    }

    const reg = parseInt(traineesRegistered, 10);
    const att = parseInt(traineesAttended, 10);
    const pass = parseInt(traineesPassed, 10);
    const fail = parseInt(traineesFailed, 10);
    if ([reg, att, pass, fail].some((n) => Number.isNaN(n))) {
      cleanupAll();
      return res.status(400).json({
        success: false,
        message: 'Registered, attended, passed, and failed counts are required',
      });
    }

    if (allFiles.length === 0) {
      cleanupAll();
      return res.status(400).json({
        success: false,
        message: 'Upload at least one certificate document (ZIP, PDF, or other supported format)',
      });
    }

    const fileEntries = allFiles.map((f) => ({
      url: toFileUrl(f.path),
      name: f.originalname,
    }));

    const primary = fileEntries[0];
    const secondary = fileEntries[1] || null;

    const result = await certService.uploadCertificatePDF({
      partnerId,
      centerId,
      batchId,
      certificationUploadId,
      traineesRegistered: reg,
      traineesAttended: att,
      traineesPassed: pass,
      traineesFailed: fail,
      traineesAbsent: parseInt(traineesAbsent, 10) || 0,
      zipFileUrl: primary?.url || null,
      zipFileName: primary?.name || null,
      studentListUrl: secondary?.url || null,
      studentListName: secondary?.name || null,
      certificationFilesJson: JSON.stringify(fileEntries),
      uploadedBy,
    });

    res.json({
      success: true,
      message: 'Assessment results and certificates submitted successfully',
      data: result,
    });
  } catch (error) {
    cleanupAll();
    console.error('[certController] essciUploadPDF error:', error);
    res.status(500).json({ success: false, message: error.message || 'Upload failed' });
  }
};
