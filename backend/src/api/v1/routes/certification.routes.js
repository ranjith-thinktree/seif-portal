'use strict';

const express = require('express');
const router = express.Router();
const certController = require('../controllers/certification.controller');
const certFileArchiveController = require('../controllers/certificationFileArchive.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const {
  uploadESSCIFiles,
  handleUploadError,
} = require('../../../middleware/upload.middleware');

// ─────────────────────────────────────────────────────────────────────────────
// PARTNER routes
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/upload',
  authenticate,
  checkRole(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  certController.uploadCertificationData
);

router.get('/uploads', authenticate, checkRole('PARTNER'), certController.getMyUploads);

router.put(
  '/uploads/:uploadId/resubmit',
  authenticate,
  checkRole('PARTNER'),
  certController.resubmitCertificationData
);

router.get(
  '/uploads/:uploadId',
  authenticate,
  checkRole(['PARTNER', 'ADMIN', 'SUPER_ADMIN', 'ESSCI']),
  certController.getUploadDetails
);

router.get(
  '/certificates',
  authenticate,
  checkRole('PARTNER'),
  certController.getPartnerCertificates
);

router.get(
  '/requests',
  authenticate,
  checkRole('PARTNER'),
  certController.getPartnerCertificationRequests
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN routes
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/admin/uploads',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  certController.adminGetUploads
);

router.put(
  '/admin/uploads/:uploadId/approve',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  certController.adminApproveUpload
);

router.put(
  '/admin/uploads/:uploadId/reject',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  certController.adminRejectUpload
);

router.get(
  '/admin/pdfs',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  certController.adminGetPDFs
);

router.get(
  '/admin/requests',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  certController.adminGetCertificationRequests
);

router.put(
  '/admin/pdfs/:pdfId/approve',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  certController.adminApprovePDF
);

router.put(
  '/admin/pdfs/:pdfId/reject',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  certController.adminRejectPDF
);

// ─────────────────────────────────────────────────────────────────────────────
// ESSCI routes
// ─────────────────────────────────────────────────────────────────────────────

router.get('/essci/data', authenticate, checkRole('ESSCI'), certController.essciGetData);

router.get(
  '/essci/data/:uploadId',
  authenticate,
  checkRole('ESSCI'),
  certController.essciGetBatchDetail
);

router.post(
  '/essci/upload-pdf',
  authenticate,
  checkRole('ESSCI'),
  uploadESSCIFiles,
  handleUploadError,
  certController.essciUploadPDF
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN + ESSCI: certification file archive & reports
// ─────────────────────────────────────────────────────────────────────────────

const FILE_ARCHIVE_ROLES = ['ADMIN', 'SUPER_ADMIN', 'ESSCI'];
const FILE_DOWNLOAD_ROLES = ['ADMIN', 'SUPER_ADMIN', 'ESSCI', 'PARTNER'];

router.get(
  '/files/archive',
  authenticate,
  checkRole(FILE_ARCHIVE_ROLES),
  certFileArchiveController.listArchivedFiles
);

router.get(
  '/files/archive/:fileId/download',
  authenticate,
  checkRole(FILE_DOWNLOAD_ROLES),
  certFileArchiveController.downloadArchivedFile
);

router.get(
  '/files/archive/export/zip',
  authenticate,
  checkRole(FILE_ARCHIVE_ROLES),
  certFileArchiveController.exportMonthlyZip
);

router.post(
  '/files/archive/export/zip',
  authenticate,
  checkRole(FILE_ARCHIVE_ROLES),
  certFileArchiveController.exportMonthlyZip
);

router.get(
  '/files/archive/export/excel',
  authenticate,
  checkRole(FILE_ARCHIVE_ROLES),
  certFileArchiveController.exportMergedExcel
);

router.post(
  '/files/archive/export/excel',
  authenticate,
  checkRole(FILE_ARCHIVE_ROLES),
  certFileArchiveController.exportMergedExcel
);

module.exports = router;
