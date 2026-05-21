const { body, param, query } = require('express-validator');

const uuidValidation = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exports.listModulesValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Search query must not exceed 255 characters'),
  query('is_active')
    .optional()
    .isIn(['true', 'false', '1', '0'])
    .withMessage('is_active must be true, false, 1, or 0'),
  query('sort_by')
    .optional()
    .isIn([
      'module_name',
      'module_code',
      'duration_months',
      'is_active',
      'created_at',
      'updated_at',
    ])
    .withMessage('Invalid sort field'),
  query('sort_order').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order'),
];

exports.moduleIdValidator = [
  param('id')
    .notEmpty()
    .withMessage('Module ID is required')
    .matches(uuidValidation)
    .withMessage('Invalid module ID format'),
];

exports.createModuleValidator = [
  body('module_name')
    .trim()
    .notEmpty()
    .withMessage('Module name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Module name must be between 2 and 255 characters'),
  body('module_code')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Module code must not exceed 50 characters'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('duration_months')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 120 })
    .withMessage('Duration must be between 1 and 120 months'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
];

exports.updateModuleValidator = [
  ...exports.moduleIdValidator,
  body('module_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Module name cannot be empty')
    .isLength({ min: 2, max: 255 })
    .withMessage('Module name must be between 2 and 255 characters'),
  body('module_code')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Module code must not exceed 50 characters'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('duration_months')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 120 })
    .withMessage('Duration must be between 1 and 120 months'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
];
