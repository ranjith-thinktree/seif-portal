const express = require('express');
const RefurbishmentController = require('../controllers/refurbishment.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');

const router = express.Router();

/**
 * Refurbishment Routes
 * All routes require authentication and ADMIN or SUPER_ADMIN role
 * Base path: /api/v1/admin/refurbishment
 */

// Apply authentication to all routes
router.use(authenticate);

// Apply role-based authorization (ADMIN or SUPER_ADMIN only)
router.use(checkRole(['ADMIN', 'SUPER_ADMIN']));

/**
 * GET /api/v1/admin/refurbishment/eligible-centers
 * Get centers eligible for refurbishment (Tab 1)
 * Query params: limit, offset
 */
router.get('/eligible-centers', RefurbishmentController.getEligibleCenters);

/**
 * GET /api/v1/admin/refurbishment/all-centers
 * Get all active centers with eligibility status (Tab 3)
 * Query params: limit, offset
 */
router.get('/all-centers', RefurbishmentController.getAllCentersWithStatus);

/**
 * GET /api/v1/admin/refurbishment/recently-refurbished
 * Get recently refurbished centers (Tab 2)
 * Query params: within (months), limit, offset
 */
router.get('/recently-refurbished', RefurbishmentController.getRecentlyRefurbishedCenters);

/**
 * GET /api/v1/admin/refurbishment/centers/:centerId/eligibility
 * Check eligibility of a specific center
 * Path params: centerId (UUID)
 */
router.get('/centers/:centerId/eligibility', RefurbishmentController.checkCenterEligibility);

/**
 * GET /api/v1/admin/refurbishment/dashboard
 * Get aggregated dashboard summary for all 3 tabs
 * Query params: recentlyRefurbishedWithin (months)
 */
router.get('/dashboard', RefurbishmentController.getDashboardSummary);

module.exports = router;
