const express = require('express');
const router = express.Router();
const centerController = require('../controllers/center.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const validate = require('../../../middleware/validate.middleware');
const {
  createCenterValidator,
  updateCenterValidator,
  centerIdValidator,
  listCentersValidator,
  approveCenterValidator,
  rejectCenterValidator,
} = require('../validators/center.validator');

/**
 * @route   GET /api/v1/centers
 * @desc    Get all centers with pagination
 * @access  Private (All roles)
 */
router.get(
  '/',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'ESSCI', 'SEIF_READONLY', 'PARTNER']),
  listCentersValidator,
  validate,
  centerController.getAllCenters
);

/**
 * @route   GET /api/v1/centers/filter-options
 * @desc    Get available filter options for centers
 * @access  Private (All roles)
 */
router.get(
  '/filter-options',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'ESSCI', 'SEIF_READONLY', 'PARTNER']),
  centerController.getFilterOptions
);

/**
 * @route   GET /api/v1/centers/my-centers
 * @desc    Get partner's own centers
 * @access  Private (PARTNER)
 */
router.get(
  '/my-centers',
  authenticate,
  checkRole(['PARTNER']),
  listCentersValidator,
  validate,
  centerController.getMyCenters
);

/**
 * @route   GET /api/v1/centers/export
 * @desc    Export centers as CSV
 * @access  Private (Admin, SUPER_ADMIN, ESSCI, PARTNER)
 */
router.get(
  '/export',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'ESSCI', 'PARTNER']),
  centerController.exportCenters
);

/**
 * @route   GET /api/v1/centers/:id
 * @desc    Get center by ID with batches
 * @access  Private (All roles)
 */
router.get(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'ESSCI', 'SEIF_READONLY', 'PARTNER']),
  centerIdValidator,
  validate,
  centerController.getCenterById
);

/**
 * @route   POST /api/v1/centers
 * @desc    Create new center
 * @access  Private (Admin, SUPER_ADMIN, PARTNER)
 */
router.post(
  '/',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER']),
  createCenterValidator,
  validate,
  centerController.createCenter
);

/**
 * @route   PUT /api/v1/centers/:id
 * @desc    Update center
 * @access  Private (Admin, SUPER_ADMIN, PARTNER - own centers)
 */
router.put(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER']),
  updateCenterValidator,
  validate,
  centerController.updateCenter
);

/**
 * @route   DELETE /api/v1/centers/:id
 * @desc    Delete center
 * @access  Private (Admin, SUPER_ADMIN)
 */
router.delete(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  centerIdValidator,
  validate,
  centerController.deleteCenter
);

/**
 * @route   PATCH /api/v1/centers/:id/approve
 * @desc    Approve center
 * @access  Private (Admin, SUPER_ADMIN)
 */
router.patch(
  '/:id/approve',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  approveCenterValidator,
  validate,
  centerController.approveCenter
);

/**
 * @route   PATCH /api/v1/centers/:id/reject
 * @desc    Reject center
 * @access  Private (Admin, SUPER_ADMIN)
 */
router.patch(
  '/:id/reject',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  rejectCenterValidator,
  validate,
  centerController.rejectCenter
);

module.exports = router;
