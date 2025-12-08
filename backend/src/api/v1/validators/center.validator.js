const { body, param, query } = require('express-validator');

/**
 * Center Validators
 * Validation rules for center-related requests
 */

/**
 * Validate center creation
 */
exports.createCenterValidator = [
  body('partner_id')
    .notEmpty()
    .withMessage('Partner ID is required')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Invalid partner ID format'),

  body('center_name')
    .trim()
    .notEmpty()
    .withMessage('Center name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Center name must be between 2 and 255 characters'),

  body('center_type')
    .optional()
    .trim()
    .isIn(['Short Term', 'Long Term', 'ITI', 'Polytechnic'])
    .withMessage('Invalid center type'),

  body('region')
    .optional()
    .trim()
    .isIn(['North', 'South', 'East', 'West', 'Central'])
    .withMessage('Invalid region'),

  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),

  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State must not exceed 100 characters'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),

  body('year_of_establishment')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Invalid year of establishment'),

  body('status')
    .optional()
    .isIn(['active', 'inactive', 'under_maintenance'])
    .withMessage('Invalid status'),

  body('center_head')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Center head name must not exceed 255 characters'),

  body('mobile_number')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be exactly 10 digits'),

  body('email').optional().trim().isEmail().withMessage('Invalid email format').normalizeEmail(),

  body('latitude').optional().isDecimal().withMessage('Latitude must be a decimal number'),

  body('longitude').optional().isDecimal().withMessage('Longitude must be a decimal number'),

  body('refurbishment_eligible')
    .optional()
    .isBoolean()
    .withMessage('Refurbishment eligible must be a boolean'),

  body('refurbishment_frequency_months')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Refurbishment frequency must be a non-negative integer'),

  body('last_refurbishment_date')
    .optional()
    .isDate()
    .withMessage('Invalid last refurbishment date format (YYYY-MM-DD)'),
];

/**
 * Validate center update
 */
exports.updateCenterValidator = [
  param('id')
    .notEmpty()
    .withMessage('Center ID is required')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Invalid center ID format'),

  body('center_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Center name cannot be empty')
    .isLength({ min: 2, max: 255 })
    .withMessage('Center name must be between 2 and 255 characters'),

  body('center_type')
    .optional()
    .trim()
    .isIn(['Short Term', 'Long Term', 'ITI', 'Polytechnic'])
    .withMessage('Invalid center type'),

  body('region')
    .optional()
    .trim()
    .isIn(['North', 'South', 'East', 'West', 'Central'])
    .withMessage('Invalid region'),

  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),

  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State must not exceed 100 characters'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),

  body('year_of_establishment')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Invalid year of establishment'),

  body('status')
    .optional()
    .isIn(['active', 'inactive', 'under_maintenance'])
    .withMessage('Invalid status'),

  body('center_head')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Center head name must not exceed 255 characters'),

  body('mobile_number')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be exactly 10 digits'),

  body('email').optional().trim().isEmail().withMessage('Invalid email format').normalizeEmail(),

  body('latitude').optional().isDecimal().withMessage('Latitude must be a decimal number'),

  body('longitude').optional().isDecimal().withMessage('Longitude must be a decimal number'),

  body('refurbishment_eligible')
    .optional()
    .isBoolean()
    .withMessage('Refurbishment eligible must be a boolean'),

  body('refurbishment_frequency_months')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Refurbishment frequency must be a non-negative integer'),

  body('last_refurbishment_date')
    .optional()
    .isDate()
    .withMessage('Invalid last refurbishment date format (YYYY-MM-DD)'),
];

/**
 * Validate center ID param
 */
exports.centerIdValidator = [
  param('id')
    .notEmpty()
    .withMessage('Center ID is required')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Invalid center ID format'),
];

/**
 * Validate query parameters for listing centers
 */
exports.listCentersValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Search query must not exceed 255 characters'),

  query('status')
    .optional({ checkFalsy: true })
    .isIn(['active', 'inactive', 'under_maintenance'])
    .withMessage('Invalid status filter'),

  query('approval_status')
    .optional({ checkFalsy: true })
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Invalid approval status filter'),

  query('partner_id')
    .optional({ checkFalsy: true })
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Invalid partner ID format'),
];

/**
 * Validate center approval
 */
exports.approveCenterValidator = [
  param('id')
    .notEmpty()
    .withMessage('Center ID is required')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Invalid center ID format'),
];

/**
 * Validate center rejection
 */
exports.rejectCenterValidator = [
  param('id')
    .notEmpty()
    .withMessage('Center ID is required')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Invalid center ID format'),

  body('rejection_reason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection reason must be between 10 and 500 characters'),
];
