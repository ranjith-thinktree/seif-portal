const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
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

module.exports = router;
