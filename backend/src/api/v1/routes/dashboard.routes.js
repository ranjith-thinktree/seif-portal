const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const { validate } = require('../../../middleware/validate.middleware');
const dashboardValidator = require('../validators/dashboard.validator');
const { USER_ROLES } = require('../../../constants');

/**
 * Dashboard Routes
 * Base path: /api/v1/dashboard
 */

/**
 * @route   GET /api/v1/dashboard/partner
 * @desc    Get partner dashboard statistics
 * @access  Partner only
 */
router.get(
  '/partner',
  authenticate,
  checkRole([USER_ROLES.PARTNER]),
  DashboardController.getPartnerDashboard
);

/**
 * @route   GET /api/v1/dashboard/admin
 * @desc    Get admin dashboard statistics
 * @access  Admin, Super Admin
 */
router.get(
  '/admin',
  authenticate,
  checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
  DashboardController.getAdminDashboard
);

/**
 * @route   GET /api/v1/dashboard/seif
 * @desc    Get SEIF/ESSCI dashboard statistics with optional filters
 * @access  SEIF_READONLY, ESSCI, Admin, Super Admin
 */
router.get(
  '/seif',
  authenticate,
  checkRole([USER_ROLES.SEIF_READONLY, USER_ROLES.ESSCI, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
  validate(dashboardValidator.seifDashboardFilters),
  DashboardController.getSEIFDashboard
);

module.exports = router;
