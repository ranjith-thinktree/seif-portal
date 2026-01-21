const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const { validate } = require('../../../middleware/validate.middleware');
const dashboardValidator = require('../validators/dashboard.validator');
const { ROLES } = require('../../../constants');

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
  checkRole([ROLES.PARTNER]),
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
  checkRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
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
  checkRole([ROLES.SEIF_READONLY, ROLES.ESSCI, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  validate(dashboardValidator.seifDashboardFilters),
  DashboardController.getSEIFDashboard
);

module.exports = router;
