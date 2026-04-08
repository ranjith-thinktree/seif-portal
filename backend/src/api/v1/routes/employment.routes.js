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

router.get('/template', authenticate, checkRole('PARTNER'), employmentController.downloadTemplate);

router.get(
  '/check-approved-students',
  authenticate,
  checkRole('PARTNER'),
  employmentController.checkApprovedStudents
);

router.get('/uploads', authenticate, checkRole('PARTNER'), employmentController.getUploadHistory);

router.get(
  '/uploads/:uploadId',
  authenticate,
  checkRole('PARTNER'),
  employmentController.getUploadDetails
);

router.get(
  '/students/:studentId',
  authenticate,
  checkRole('PARTNER'),
  employmentController.getStudentEmployment
);

// Admin routes
router.get('/admin/uploads', authenticate, checkRole('ADMIN'), employmentController.getAllUploads);

router.post(
  '/admin/:employmentId/verify',
  authenticate,
  checkRole('ADMIN'),
  employmentController.verifyEmployment
);

router.get(
  '/admin/statistics',
  authenticate,
  checkRole('ADMIN'),
  employmentController.getStatistics
);

module.exports = router;
