const express = require('express');
const router = express.Router();
const employmentController = require('../controllers/employment.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const { uploadEmploymentWithAttachments } = require('../../../middleware/upload.middleware');

// Partner routes
router.post(
  '/upload',
  authenticate,
  checkRole(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  uploadEmploymentWithAttachments,
  employmentController.uploadEmployment
);

router.get(
  '/template/periods',
  authenticate,
  checkRole(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  employmentController.getAvailablePeriods
);

router.get(
  '/template',
  authenticate,
  checkRole(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  employmentController.downloadTemplate
);

router.get(
  '/check-approved-students',
  authenticate,
  checkRole(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  employmentController.checkApprovedStudents
);

router.get(
  '/uploads',
  authenticate,
  checkRole(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  employmentController.getUploadHistory
);

router.get(
  '/uploads/:uploadId',
  authenticate,
  checkRole(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  employmentController.getUploadDetails
);

router.get(
  '/uploads/:uploadId/attachments',
  authenticate,
  checkRole(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  employmentController.getUploadAttachments
);

router.get(
  '/uploads/:uploadId/attachments/:attachmentIndex/download',
  authenticate,
  checkRole(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  employmentController.downloadEmploymentAttachment
);

router.get(
  '/uploads/:uploadId/download',
  authenticate,
  checkRole(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  employmentController.downloadEmploymentFile
);

router.get(
  '/students/:studentId',
  authenticate,
  checkRole(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  employmentController.getStudentEmployment
);

// Admin routes
router.get(
  '/admin/uploads',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  employmentController.getAllUploads
);

// Admin: Employment review flow routes
router.get(
  '/admin/review-uploads',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  employmentController.getAdminReviewUploads
);
router.get(
  '/admin/review-uploads/:uploadId/centers',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  employmentController.getUploadCenterSummary
);
router.get(
  '/admin/review-uploads/:uploadId/centers/:centerId',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  employmentController.getCenterEmploymentRecords
);
router.post(
  '/admin/review-uploads/:uploadId/centers/:centerId/save-edits',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  employmentController.saveAdminEmploymentEdits
);
router.post(
  '/admin/review-uploads/:uploadId/approve',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  employmentController.approveEmploymentUpload
);
router.post(
  '/admin/review-uploads/:uploadId/reject',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  employmentController.rejectEmploymentUpload
);

// Approved records for Data tab (all authenticated roles)
router.get(
  '/admin/records',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'ESSCI', 'SEIF_READONLY', 'PARTNER']),
  employmentController.getApprovedEmploymentRecords
);

// Manual single-record add (Admin: verified; Partner: unverified)
router.post(
  '/add',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER']),
  employmentController.addEmploymentRecord
);

// ── Partner: Edit & Resubmit Rejected Employment Uploads ─────────────────────
router.get(
  '/partner/rejected-uploads',
  authenticate,
  checkRole(['PARTNER']),
  employmentController.getPartnerRejectedEmploymentUploads
);
router.get(
  '/partner/uploads/:uploadId/centers',
  authenticate,
  checkRole(['PARTNER']),
  employmentController.getPartnerEmploymentUploadCenters
);
router.get(
  '/partner/uploads/:uploadId/centers/:centerId/records',
  authenticate,
  checkRole(['PARTNER']),
  employmentController.getPartnerCenterRecordsForEdit
);
router.post(
  '/partner/uploads/:uploadId/centers/:centerId/save-edits',
  authenticate,
  checkRole(['PARTNER']),
  employmentController.savePartnerEmploymentEdits
);
router.post(
  '/partner/uploads/:uploadId/resubmit',
  authenticate,
  checkRole(['PARTNER']),
  employmentController.resubmitEmploymentUpload
);

router.post(
  '/admin/:employmentId/verify',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  employmentController.verifyEmployment
);

router.get(
  '/admin/statistics',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  employmentController.getStatistics
);

module.exports = router;
