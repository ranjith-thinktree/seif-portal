const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const adminLogsController = require('../controllers/admin.logs.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');

/**
 * Admin Routes
 * All routes require SUPER_ADMIN role
 */

// Get database statistics
router.get(
  '/database-stats',
  authenticate,
  checkRole(['SUPER_ADMIN']),
  adminController.getDatabaseStats
);

// Reset database (DANGER - deletes all data except users, courses, partners)
router.post(
  '/reset-database',
  authenticate,
  checkRole(['SUPER_ADMIN']),
  adminController.resetDatabase
);

// Get partner login details
router.get(
  '/partners/:partnerId/login-details',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  adminController.getPartnerLoginDetails
);

// Reset partner password
router.post(
  '/partners/:partnerId/reset-password',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  adminController.resetPartnerPassword
);

// Get application logs (SUPER_ADMIN only)
router.get(
  '/logs',
  authenticate,
  checkRole(['SUPER_ADMIN']),
  adminLogsController.getLogs
);

// Get system information (SUPER_ADMIN only)
router.get(
  '/system-info',
  authenticate,
  checkRole(['SUPER_ADMIN']),
  adminLogsController.getSystemInfo
);

// Clear logs (SUPER_ADMIN only)
router.post(
  '/logs/clear',
  authenticate,
  checkRole(['SUPER_ADMIN']),
  adminLogsController.clearLogs
);

module.exports = router;
