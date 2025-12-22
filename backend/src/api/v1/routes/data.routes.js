const express = require('express');
const router = express.Router();
const dataController = require('../controllers/data.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');

/**
 * @route   GET /api/v1/data/overview-stats
 * @desc    Get overview statistics for data management page
 * @access  Admin, SUPER_ADMIN, PARTNER, ESSCI, SEIF_READONLY
 */
router.get(
  '/overview-stats',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER', 'ESSCI', 'SEIF_READONLY']),
  dataController.getOverviewStats
);

module.exports = router;
