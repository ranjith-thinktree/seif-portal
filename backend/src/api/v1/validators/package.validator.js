const { body, param, query } = require('express-validator');

/**
 * Package Validators
 * Request validation rules for package endpoints
 */

const packageValidators = {
  /**
   * Validation for creating a package
   */
  createPackage: [
    body('package_name')
      .trim()
      .notEmpty()
      .withMessage('Package name is required')
      .isLength({ min: 3, max: 255 })
      .withMessage('Package name must be between 3 and 255 characters'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),

    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),

    body('display_order')
      .optional()
      .isInt({ min: 1 })
      .withMessage('display_order must be a positive integer'),
  ],

  /**
   * Validation for updating a package
   */
  updatePackage: [
    param('id')
      .trim()
      .notEmpty()
      .withMessage('Package ID is required')
      .isUUID()
      .withMessage('Invalid package ID format'),

    body('package_name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage('Package name must be between 3 and 255 characters'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),

    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),

    body('display_order')
      .optional()
      .isInt({ min: 1 })
      .withMessage('display_order must be a positive integer'),
  ],

  /**
   * Validation for getting/deleting a package by ID
   */
  packageId: [
    param('id')
      .trim()
      .notEmpty()
      .withMessage('Package ID is required')
      .isUUID()
      .withMessage('Invalid package ID format'),
  ],

  /**
   * Validation for listing packages with filters
   */
  listPackages: [
    query('is_active')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('is_active must be true or false'),

    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Limit must be between 1 and 500'),

    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
  ],

  /**
   * Validation for reordering packages
   */
  reorderPackages: [
    body('orderMap')
      .notEmpty()
      .withMessage('orderMap is required')
      .isObject()
      .withMessage('orderMap must be an object'),
  ],
};

module.exports = packageValidators;
