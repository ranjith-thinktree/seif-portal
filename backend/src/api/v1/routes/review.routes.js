const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const { validate } = require('../../../middleware/validate.middleware');
const {
  uploadIdValidator,
  centerIdValidator,
  rejectCenterValidator,
} = require('../validators/review.validator');

/**
 * Review Routes
 * All routes require authentication
 * Admin/Super Admin only for review actions
 */

// Get upload details for review
router.get(
  '/:uploadId',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  uploadIdValidator,
  validate,
  reviewController.getUploadForReview
);

// Get pending centers for an upload
router.get(
  '/:uploadId/centers',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  uploadIdValidator,
  validate,
  reviewController.getPendingCenters
);

// Get students for a center in upload
router.get(
  '/:uploadId/centers/:centerId/students',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  [...uploadIdValidator, ...centerIdValidator],
  validate,
  reviewController.getCenterStudentsForReview
);

// Save admin edits to students (during initial review)
router.put(
  '/:uploadId/centers/:centerId/save-edits',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  [...uploadIdValidator, ...centerIdValidator],
  validate,
  reviewController.saveAdminEdits
);

// Approve a center
router.post(
  '/:uploadId/centers/:centerId/approve',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  [...uploadIdValidator, ...centerIdValidator],
  validate,
  reviewController.approveCenter
);

// Reject a center
router.post(
  '/:uploadId/centers/:centerId/reject',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  [...uploadIdValidator, ...centerIdValidator, ...rejectCenterValidator],
  validate,
  reviewController.rejectCenter
);

// Get rejected centers for partner (partner-only route)
router.get(
  '/:uploadId/rejected',
  authenticate,
  authorize(['PARTNER']),
  uploadIdValidator,
  validate,
  reviewController.getRejectedCenters
);

// Get upload details for partner review/edit (partner-only route)
router.get(
  '/:uploadId/partner-review',
  authenticate,
  authorize(['PARTNER']),
  uploadIdValidator,
  validate,
  reviewController.getUploadForPartnerReview
);

// ========== NEW TWO-TAB SYSTEM ROUTES ==========

// Tab 1: Get pending centers for approval (from centers table)
router.get(
  '/pending-centers',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  reviewController.getPendingCentersForApproval
);

// Tab 1: Approve center directly (from centers table)
router.post(
  '/centers/:centerId/approve',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  centerIdValidator,
  validate,
  reviewController.approveCenterDirect
);

// Tab 1: Reject center directly (from centers table)
router.post(
  '/centers/:centerId/reject',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  [...centerIdValidator, ...rejectCenterValidator],
  validate,
  reviewController.rejectCenterDirect
);

// Tab 2: Get pending data uploads (batches/students)
router.get(
  '/pending-uploads',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  reviewController.getPendingDataUploads
);

module.exports = router;
