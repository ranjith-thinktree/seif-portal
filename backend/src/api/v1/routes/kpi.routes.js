'use strict';

const express = require('express');
const router = express.Router();
const kpiController = require('../controllers/kpi.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');

/**
 * GET /api/v1/kpi/settings?year=all
 * Readable by any authenticated user.
 */
router.get('/settings', authenticate, kpiController.getSettings);

/**
 * GET /api/v1/kpi/live-values
 * Admin / Super Admin — live DB counts for Settings panel.
 */
router.get(
  '/live-values',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  kpiController.getLiveValues
);

/**
 * PUT /api/v1/kpi/settings/reorder
 * MUST come before /settings/:key so 'reorder' is not matched as a key.
 */
router.put(
  '/settings/reorder',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  kpiController.reorderSettings
);

/**
 * PUT /api/v1/kpi/settings/:key
 * Admin / Super Admin only.
 */
router.put(
  '/settings/:key',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  kpiController.updateSetting
);

module.exports = router;
