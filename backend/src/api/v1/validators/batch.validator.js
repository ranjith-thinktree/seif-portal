const { body, param, query } = require('express-validator');

/**
 * Validator for creating a new batch
 */
const createBatchValidator = [
  body('center_id')
    .notEmpty()
    .withMessage('Center ID is required')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Center ID must be a valid UUID'),

  body('partner_id')
    .notEmpty()
    .withMessage('Partner ID is required')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Partner ID must be a valid UUID'),

  body('batch_number')
    .notEmpty()
    .withMessage('Batch number is required')
    .isString()
    .withMessage('Batch number must be a string')
    .trim(),

  body('batch_start_date')
    .notEmpty()
    .withMessage('Batch start date is required')
    .isISO8601()
    .withMessage('Batch start date must be a valid date (YYYY-MM-DD)'),

  body('batch_complete_date')
    .optional()
    .isISO8601()
    .withMessage('Batch complete date must be a valid date (YYYY-MM-DD)'),

  body('total_students')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total students must be a positive integer'),

  body('male_students')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Male students must be a positive integer'),

  body('female_students')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Female students must be a positive integer'),

  body('status')
    .optional()
    .isIn(['active', 'completed', 'cancelled'])
    .withMessage('Status must be one of: active, completed, cancelled'),
];

/**
 * Validator for updating a batch
 */
const updateBatchValidator = [
  body('batch_number').optional().isString().withMessage('Batch number must be a string').trim(),

  body('batch_start_date')
    .optional()
    .isISO8601()
    .withMessage('Batch start date must be a valid date (YYYY-MM-DD)'),

  body('batch_complete_date')
    .optional()
    .isISO8601()
    .withMessage('Batch complete date must be a valid date (YYYY-MM-DD)'),

  body('total_students')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total students must be a positive integer'),

  body('male_students')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Male students must be a positive integer'),

  body('female_students')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Female students must be a positive integer'),

  body('status')
    .optional()
    .isIn(['active', 'completed', 'cancelled'])
    .withMessage('Status must be one of: active, completed, cancelled'),
];

/**
 * Validator for batch ID parameter
 */
const batchIdValidator = [
  param('id')
    .notEmpty()
    .withMessage('Batch ID is required')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Batch ID must be a valid UUID'),
];

/**
 * Validator for center ID parameter
 */
const centerIdValidator = [
  param('centerId')
    .notEmpty()
    .withMessage('Center ID is required')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Center ID must be a valid UUID'),
];

/**
 * Validator for listing batches
 */
const listBatchesValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('search').optional().isString().withMessage('Search must be a string'),

  query('status')
    .optional({ checkFalsy: true })
    .isIn(['active', 'completed', 'cancelled'])
    .withMessage('Status must be one of: active, completed, cancelled'),

  query('center_id')
    .optional({ checkFalsy: true })
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Center ID must be a valid UUID'),

  query('partner_id')
    .optional({ checkFalsy: true })
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Partner ID must be a valid UUID'),
];

module.exports = {
  createBatchValidator,
  updateBatchValidator,
  batchIdValidator,
  centerIdValidator,
  listBatchesValidator,
};
