const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');

/**
 * Analytics Routes
 * All routes require Admin or Super Admin role
 */

/**
 * @route   GET /api/v1/analytics/consolidated
 * @desc    Get consolidated student analytics with filters
 * @access  Admin, SUPER_ADMIN
 */
router.get(
  '/consolidated',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  analyticsController.getConsolidatedAnalytics
);

/**
 * @route   GET /api/v1/analytics/filter-options
 * @desc    Get filter options (partners, centers) for analytics
 * @access  Admin, SUPER_ADMIN
 */
router.get(
  '/filter-options',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  analyticsController.getFilterOptions
);

module.exports = router;
