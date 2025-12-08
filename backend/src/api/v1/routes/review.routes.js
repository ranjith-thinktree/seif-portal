const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const validate = require('../../../middleware/validate.middleware');
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

module.exports = router;
