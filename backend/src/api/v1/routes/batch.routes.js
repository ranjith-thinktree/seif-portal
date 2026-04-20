const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batch.controller');
const {
  createBatchValidator,
  updateBatchValidator,
  batchIdValidator,
  centerIdValidator,
  listBatchesValidator,
} = require('../validators/batch.validator');
const { validate } = require('../../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');

/**
 * @route   GET /api/v1/batches
 * @desc    Get all batches with pagination and filters
 * @access  All authenticated users
 */
router.get(
  '/',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER', 'ESSCI', 'SEIF_READONLY', 'SEIF_READONLY_DOWNLOAD']),
  listBatchesValidator,
  validate,
  batchController.getAllBatches
);

/**
 * @route   GET /api/v1/batches/filter-options
 * @desc    Get filter options for batches (partners, centers, statuses)
 * @access  All authenticated users
 */
router.get(
  '/filter-options',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER', 'ESSCI', 'SEIF_READONLY', 'SEIF_READONLY_DOWNLOAD']),
  batchController.getBatchFilterOptions
);

/**
 * @route   GET /api/v1/batches/export
 * @desc    Export batches to CSV
 * @access  All authenticated users
 */
router.get(
  '/export',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER', 'ESSCI', 'SEIF_READONLY', 'SEIF_READONLY_DOWNLOAD']),
  batchController.exportBatches
);

/**
 * @route   GET /api/v1/batches/by-center/:centerId
 * @desc    Get all batches for a specific center
 * @access  All authenticated users
 */
router.get(
  '/by-center/:centerId',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER', 'ESSCI', 'SEIF_READONLY', 'SEIF_READONLY_DOWNLOAD']),
  centerIdValidator,
  validate,
  batchController.getBatchesByCenter
);

/**
 * @route   GET /api/v1/batches/:id
 * @desc    Get batch by ID
 * @access  All authenticated users
 */
router.get(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER', 'ESSCI', 'SEIF_READONLY', 'SEIF_READONLY_DOWNLOAD']),
  batchIdValidator,
  validate,
  batchController.getBatchById
);

/**
 * @route   POST /api/v1/batches
 * @desc    Create new batch
 * @access  ADMIN, SUPER_ADMIN, PARTNER
 */
router.post(
  '/',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER']),
  createBatchValidator,
  validate,
  batchController.createBatch
);

/**
 * @route   PUT /api/v1/batches/:id
 * @desc    Update batch
 * @access  ADMIN, SUPER_ADMIN, PARTNER (own batches only)
 */
router.put(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER']),
  batchIdValidator,
  updateBatchValidator,
  validate,
  batchController.updateBatch
);

/**
 * @route   DELETE /api/v1/batches/:id
 * @desc    Delete batch
 * @access  ADMIN, SUPER_ADMIN only
 */
router.delete(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  batchIdValidator,
  validate,
  batchController.deleteBatch
);

/**
 * @route   POST /api/v1/batches/bulk-delete
 * @desc    Bulk delete batches
 * @access  ADMIN, SUPER_ADMIN, PARTNER
 */
router.post(
  '/bulk-delete',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER']),
  batchController.bulkDeleteBatches
);

module.exports = router;
