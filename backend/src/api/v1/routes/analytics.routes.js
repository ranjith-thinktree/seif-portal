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

/**
 * @route   GET /api/v1/analytics/test-query
 * @desc    Test database query without auth (TEMPORARY - REMOVE IN PRODUCTION)
 * @access  Public
 */
router.get('/test-query', async (req, res) => {
  try {
    const db = require('../../../database/connection');
    const result = await db.query(`SELECT 
      COALESCE((SELECT COUNT(*) FROM students s ), 0) as total_students,
      COALESCE((SELECT SUM(CASE WHEN gender = 'Male' THEN 1 ELSE 0 END) FROM students s ), 0) as male_students,
      COALESCE((SELECT SUM(CASE WHEN gender = 'Female' THEN 1 ELSE 0 END) FROM students s ), 0) as female_students,
      (SELECT COUNT(*) FROM partners WHERE status = 'active') as total_partners,
      (SELECT COUNT(*) FROM centers WHERE status = 'active') as total_centers,
      COALESCE((SELECT COUNT(DISTINCT e.id) FROM employment e WHERE e.employment_status IN ('Employed', 'Self-Employed', 'Entrepreneur')), 0) as total_employments
    FROM dual`);
    res.json({ success: true, data: result[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
