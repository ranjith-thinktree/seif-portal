const express = require('express');
const router = express.Router();

const PackageController = require('../controllers/package.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const { validate } = require('../../../middleware/validate.middleware');
const packageValidators = require('../validators/package.validator');
const {
  uploadPackageImages,
  handleImageUploadError,
} = require('../../../middleware/imageUpload.middleware');

/**
 * Package Routes
 * All routes require authentication
 * Write operations (POST, PUT, DELETE) require SUPER_ADMIN role
 * Read operations allow SUPER_ADMIN, ADMIN, and SEIF_READONLY roles
 */

/**
 * @route   GET /api/v1/admin/packages
 * @desc    Get all packages with pagination and filters
 * @access  SUPER_ADMIN, ADMIN, SEIF_READONLY
 * @query   ?category=electrical&is_active=true&search=multimeter&limit=50&offset=0
 */
router.get(
  '/',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SEIF_READONLY']),
  validate(packageValidators.listPackages),
  PackageController.getAllPackages
);

/**
 * @route   GET /api/v1/admin/packages/:id
 * @desc    Get single package by ID
 * @access  SUPER_ADMIN, ADMIN, SEIF_READONLY
 * @query   ?include_courses=true (optional, includes linked courses)
 */
router.get(
  '/:id',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SEIF_READONLY']),
  validate(packageValidators.packageId),
  PackageController.getPackageById
);

/**
 * @route   POST /api/v1/admin/packages
 * @desc    Create new package
 * @access  SUPER_ADMIN only
 * @body    { package_name, description, category, is_active, display_order, images[] }
 */
router.post(
  '/',
  authenticate,
  checkRole(['SUPER_ADMIN']),
  uploadPackageImages,
  handleImageUploadError,
  validate(packageValidators.createPackage),
  PackageController.createPackage
);

/**
 * @route   PUT /api/v1/admin/packages/:id
 * @desc    Update package
 * @access  SUPER_ADMIN only
 * @body    { package_name?, description?, category?, is_active?, display_order?, images[], existingImages }
 */
router.put(
  '/:id',
  authenticate,
  checkRole(['SUPER_ADMIN']),
  uploadPackageImages,
  handleImageUploadError,
  validate(packageValidators.updatePackage),
  PackageController.updatePackage
);

/**
 * @route   DELETE /api/v1/admin/packages/:id
 * @desc    Delete package (soft delete by default, hard delete with ?hard=true)
 * @access  SUPER_ADMIN only
 * @query   ?hard=true (optional, permanently delete if not linked to courses)
 */
router.delete(
  '/:id',
  authenticate,
  checkRole(['SUPER_ADMIN']),
  validate(packageValidators.packageId),
  PackageController.deletePackage
);

/**
 * @route   POST /api/v1/admin/packages/reorder
 * @desc    Reorder packages (bulk update display_order)
 * @access  SUPER_ADMIN only
 * @body    { orderMap: { "package-uuid-1": 1, "package-uuid-2": 2, ... } }
 */
router.post(
  '/reorder',
  authenticate,
  checkRole(['SUPER_ADMIN']),
  validate(packageValidators.reorderPackages),
  PackageController.reorderPackages
);

module.exports = router;
