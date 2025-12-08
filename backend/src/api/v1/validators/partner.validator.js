const { body, param, query } = require('express-validator');

/**
 * Partner Validators
 * Validation rules for partner-related requests
 */

/**
 * Validate partner creation
 */
exports.createPartnerValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Partner name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Partner name must be between 2 and 255 characters'),

  body('organization_type')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Organization type must not exceed 100 characters'),

  body('contact_person')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Contact person name must not exceed 255 characters'),

  body('contact_email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('contact_phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Contact phone must be exactly 10 digits'),

  body('address_line1')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address line 1 must not exceed 255 characters'),

  body('address_line2')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address line 2 must not exceed 255 characters'),

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

  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),

  body('postal_code')
    .optional()
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage('Postal code must be exactly 6 digits'),

  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be one of: active, inactive, suspended'),

  body('registration_date')
    .optional()
    .isDate()
    .withMessage('Invalid registration date format (YYYY-MM-DD)'),
];

/**
 * Validate partner update
 */
exports.updatePartnerValidator = [
  param('id')
    .notEmpty()
    .withMessage('Partner ID is required')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Invalid partner ID format'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Partner name cannot be empty')
    .isLength({ min: 2, max: 255 })
    .withMessage('Partner name must be between 2 and 255 characters'),

  body('organization_type')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Organization type must not exceed 100 characters'),

  body('contact_person')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Contact person name must not exceed 255 characters'),

  body('contact_email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('contact_phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Contact phone must be exactly 10 digits'),

  body('address_line1')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address line 1 must not exceed 255 characters'),

  body('address_line2')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address line 2 must not exceed 255 characters'),

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

  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),

  body('postal_code')
    .optional()
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage('Postal code must be exactly 6 digits'),

  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be one of: active, inactive, suspended'),

  body('registration_date')
    .optional()
    .isDate()
    .withMessage('Invalid registration date format (YYYY-MM-DD)'),
];

/**
 * Validate partner ID param
 */
exports.partnerIdValidator = [
  param('id')
    .notEmpty()
    .withMessage('Partner ID is required')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Invalid partner ID format'),
];

/**
 * Validate query parameters for listing partners
 */
exports.listPartnersValidator = [
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
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Invalid status filter'),

  query('approval_status')
    .optional({ checkFalsy: true })
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Invalid approval status filter'),
];

/**
 * Validate partner approval
 */
exports.approvePartnerValidator = [
  param('id')
    .notEmpty()
    .withMessage('Partner ID is required')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Invalid partner ID format'),
];

/**
 * Validate partner rejection
 */
exports.rejectPartnerValidator = [
  param('id')
    .notEmpty()
    .withMessage('Partner ID is required')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Invalid partner ID format'),

  body('rejection_reason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection reason must be between 10 and 500 characters'),
];
