const express = require('express');
const router = express.Router();
const totController = require('../controllers/tot.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const { uploadCSV, handleUploadError } = require('../../../middleware/upload.middleware');

/**
 * TOT Routes
 * Base path: /api/v1/tot
 */

// Download template (anyone authenticated)
router.get('/template', authenticate, totController.downloadTemplate);

// Partner: upload TOT file
router.post(
  '/upload',
  authenticate,
  checkRole(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  uploadCSV,
  handleUploadError,
  totController.uploadTot
);

// Partner: upload history
router.get(
  '/uploads',
  authenticate,
  checkRole(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  totController.getMyUploads
);

// Partner/Admin: upload details
router.get(
  '/uploads/:id',
  authenticate,
  checkRole(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  totController.getUploadDetails
);

router.get(
  '/trainers',
  authenticate,
  checkRole([
    'PARTNER',
    'ADMIN',
    'SUPER_ADMIN',
    'ESSCI',
    'SEIF_READONLY',
    'SEIF_READONLY_DOWNLOAD',
  ]),
  totController.getTrainers
);

router.get(
  '/trainers/filter-options',
  authenticate,
  checkRole([
    'PARTNER',
    'ADMIN',
    'SUPER_ADMIN',
    'ESSCI',
    'SEIF_READONLY',
    'SEIF_READONLY_DOWNLOAD',
  ]),
  totController.getTrainerFilterOptions
);

router.get(
  '/trainers/:id',
  authenticate,
  checkRole([
    'PARTNER',
    'ADMIN',
    'SUPER_ADMIN',
    'ESSCI',
    'SEIF_READONLY',
    'SEIF_READONLY_DOWNLOAD',
  ]),
  totController.getTrainerById
);

router.post(
  '/trainers',
  authenticate,
  checkRole(['PARTNER', 'ADMIN', 'SUPER_ADMIN']),
  totController.createTrainer
);

router.put(
  '/trainers/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  totController.updateTrainer
);

router.delete(
  '/trainers/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  totController.deleteTrainer
);

// Admin: all uploads
router.get(
  '/admin/uploads',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  totController.getAllUploads
);

// Admin: approve
router.post(
  '/admin/uploads/:id/approve',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  totController.approveUpload
);

// Admin: reject
router.post(
  '/admin/uploads/:id/reject',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  totController.rejectUpload
);

// Admin: save edits before approval
router.post(
  '/admin/uploads/:id/save-edits',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  totController.saveTotAdminEdits
);

module.exports = router;
