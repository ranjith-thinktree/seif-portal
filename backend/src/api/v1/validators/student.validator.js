const { param, query } = require('express-validator');

/**
 * Validator for student ID parameter
 */
const studentIdValidator = [
  param('id')
    .notEmpty()
    .withMessage('Student ID is required')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Student ID must be a valid UUID'),
];

/**
 * Validator for batch ID parameter
 */
const batchIdValidator = [
  param('batchId')
    .notEmpty()
    .withMessage('Batch ID is required')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Batch ID must be a valid UUID'),
];

/**
 * Validator for listing students
 */
const listStudentsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('search').optional().isString().withMessage('Search must be a string'),

  query('center_id')
    .optional({ checkFalsy: true })
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Center ID must be a valid UUID'),

  query('batch_id')
    .optional({ checkFalsy: true })
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Batch ID must be a valid UUID'),

  query('partner_id')
    .optional({ checkFalsy: true })
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Partner ID must be a valid UUID'),
];

module.exports = {
  studentIdValidator,
  batchIdValidator,
  listStudentsValidator,
};
