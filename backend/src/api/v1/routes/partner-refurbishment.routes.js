const express = require('express');
const PartnerRefurbishmentController = require('../controllers/partner-refurbishment.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');

const router = express.Router();

/**
 * Partner Refurbishment Routes
 * All routes require authentication and PARTNER role
 * Base path: /api/v1/partner/refurbishment
 */

// Apply authentication to all routes
router.use(authenticate);

// Apply role-based authorization (PARTNER only)
router.use(checkRole(['PARTNER']));

/**
 * GET /api/v1/partner/refurbishment/requests/:requestId/details
 * Get refurbishment request details including:
 * - Center details
 * - Admin-selected packages per course
 * - Admin remarks
 */
router.get('/requests/:requestId/details', PartnerRefurbishmentController.getRequestDetails);

/**
 * POST /api/v1/partner/refurbishment/requests/:requestId/submit
 * Submit partner's selections for a refurbishment request
 * Body: {
 *   courses: [{ course_id, package_ids[], justification, attachments[] }],
 *   upgradation: { length, breadth, height, justification, photos[] }
 * }
 */
router.post(
  '/requests/:requestId/submit',
  PartnerRefurbishmentController.submitRefurbishmentRequest
);

/**
 * GET /api/v1/partner/refurbishment/requests
 * Get partner's refurbishment requests
 * Query params: limit, offset, status
 */
router.get('/requests', PartnerRefurbishmentController.getMyRequests);

/**
 * GET /api/v1/partner/refurbishment/past-requests
 * Partner's actioned requests (non-submitted)
 */
router.get('/past-requests', PartnerRefurbishmentController.getPartnerPastRequests);

/**
 * POST /api/v1/partner/refurbishment/requests/:requestId/partner-completion
 * Partner submits completion evidence after 2-month notification
 */
router.post(
  '/requests/:requestId/partner-completion',
  PartnerRefurbishmentController.submitPartnerCompletion
);

/**
 * POST /api/v1/partner/refurbishment/upload-url
 * Generate a short-lived S3 presigned PUT URL for direct browser upload,
 * or return a local upload endpoint when S3 is not configured.
 * Body: { fileName, fileType, folder? }
 */
router.post('/upload-url', PartnerRefurbishmentController.generateUploadUrl);

/**
 * POST /api/v1/partner/refurbishment/upload-local
 * Accept multipart file upload and save to local disk (S3 fallback).
 * Body: multipart/form-data field 'file'
 */
router.post('/upload-local', PartnerRefurbishmentController.uploadLocalFile);

module.exports = router;
