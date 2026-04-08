'use strict';

const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const { uploadTemplateFile, handleUploadError } = require('../../../middleware/upload.middleware');

/**
 * GET /settings  — readable by any authenticated user
 */
router.get('/', authenticate, settingsController.getSettings);

/**
 * PUT /settings/:key/instruction  — ADMIN / SUPER_ADMIN only
 */
router.put(
  '/:key/instruction',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  settingsController.updateInstruction
);

/**
 * PUT /settings/:key/template  — ADMIN / SUPER_ADMIN only
 */
router.put(
  '/:key/template',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  uploadTemplateFile,
  handleUploadError,
  settingsController.updateTemplate
);

/**
 * GET /settings/dashboard-data  — ADMIN / SUPER_ADMIN only
 */
router.get(
  '/dashboard-data',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  settingsController.getDashboardData
);

/**
 * PUT /settings/dashboard-data  — ADMIN / SUPER_ADMIN only
 */
router.put(
  '/dashboard-data',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  settingsController.updateDashboardData
);

module.exports = router;
