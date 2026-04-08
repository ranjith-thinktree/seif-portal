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

/**
 * @route   GET /api/v1/dashboard/analytics
 * @desc    Get consolidated analytics for admin dashboard
 * @access  Admin, Super Admin
 * @query   year - Optional year filter ('2024-25' format or 'all')
 */
router.get(
  '/analytics',
  authenticate,
  checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
  DashboardController.getConsolidatedAnalytics
);

/**
 * @route   GET /api/v1/dashboard/centers-by-establishment
 * @desc    Get centers grouped by year of establishment
 * @access  Admin, Super Admin
 * @query   year - Optional year filter or 'all'
 */
router.get(
  '/centers-by-establishment',
  authenticate,
  checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
  DashboardController.getCentersByEstablishment
);

/**
 * @route   GET /api/v1/dashboard/state-stats
 * @desc    Get state-wise statistics for India Map visualization
 * @access  Admin, Super Admin
 * @query   year - Optional year filter or 'all'
 */
router.get(
  '/state-stats',
  authenticate,
  checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
  DashboardController.getStateStats
);

/**
 * @route   GET /api/v1/dashboard/state-detail
 * @desc    Get detailed course breakdown for a specific state
 * @access  Admin, Super Admin
 * @query   state - Full state name, year - Optional year filter
 */
router.get(
  '/state-detail',
  authenticate,
  checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
  DashboardController.getStateDetail
);

module.exports = router;
