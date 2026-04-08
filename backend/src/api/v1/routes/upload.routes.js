const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');
const { uploadCSV, handleUploadError } = require('../../../middleware/upload.middleware');

/**
 * Upload Routes
 * Base path: /api/v1/uploads
 */

// ==========================================
// PUBLIC ROUTES (no authentication)
// ==========================================

// Download CSV template (public)
router.get('/template', uploadController.downloadTemplate);

// Download CSV template with dynamic partner name (authenticated)
router.get(
  '/download-template',
  authenticate,
  authorize(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  uploadController.downloadDynamicTemplate
);

// ==========================================
// PARTNER ROUTES (requires PARTNER role)
// ==========================================

// Upload CSV file (with validation and preview)
router.post(
  '/',
  authenticate,
  authorize(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  uploadCSV,
  handleUploadError,
  uploadController.uploadCSV
);

// Confirm upload after preview
router.post(
  '/confirm',
  authenticate,
  authorize(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  uploadController.confirmUpload
);

// Resubmit upload with edits (creates version 2)
router.post(
  '/:uploadId/resubmit',
  authenticate,
  authorize(['PARTNER']),
  uploadController.resubmitUpload
);

// Delete upload (partner can delete own, admin can delete any)
router.delete('/:id', authenticate, authorize(['PARTNER', 'ADMIN']), uploadController.deleteUpload);

// Bulk delete uploads
router.post(
  '/bulk-delete',
  authenticate,
  authorize(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  uploadController.bulkDeleteUploads
);

// Get partner's upload history
router.get('/', authenticate, authorize(['PARTNER']), uploadController.getUploads);

// Download original uploaded file (B10)
router.get(
  '/:id/download',
  authenticate,
  authorize(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  uploadController.downloadUploadFile
);

// Get upload details (partner view)
router.get('/:id', authenticate, authorize(['PARTNER']), uploadController.getUploadDetails);

// ==========================================
// ADMIN ROUTES (requires ADMIN/SUPER_ADMIN role)
// ==========================================

// Get all uploads for admin review
router.get(
  '/admin/all',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  uploadController.getAllUploadsForAdmin
);

// Get upload details for admin review
router.get(
  '/admin/:id',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  uploadController.getUploadDetailsForAdmin
);

// Get students for a specific batch (paginated)
router.get(
  '/batches/:batchId/students',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  uploadController.getBatchStudents
);

// Approve upload
router.post(
  '/:id/approve',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  uploadController.approveUpload
);

// Reject upload
router.post(
  '/:id/reject',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  uploadController.rejectUpload
);

module.exports = router;
