const { body, query, param } = require('express-validator');

/**
 * Validator for creating a new trainer
 */
const createTrainerValidator = [
  body('partner_id')
    .notEmpty()
    .withMessage('Partner ID is required')
    .isUUID()
    .withMessage('Invalid partner ID format'),
  body('center_id')
    .notEmpty()
    .withMessage('Center ID is required')
    .isUUID()
    .withMessage('Invalid center ID format'),
  body('trainer_name')
    .trim()
    .notEmpty()
    .withMessage('Trainer name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Trainer name must be between 2 and 255 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('mobile_no')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Invalid mobile number format'),
  body('course_name')
    .trim()
    .optional()
    .isLength({ max: 255 })
    .withMessage('Course name must not exceed 255 characters'),
  body('qualification')
    .trim()
    .optional()
    .isLength({ max: 255 })
    .withMessage('Qualification must not exceed 255 characters'),
  body('date_of_joining')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Invalid date format'),
  body('training_partner').optional().trim(),
  body('training_centre_name').optional().trim(),
];

/**
 * Validator for updating a trainer
 */
const updateTrainerValidator = [
  param('id').isUUID().withMessage('Invalid trainer ID'),
  body('partner_id')
    .notEmpty()
    .withMessage('Partner ID is required')
    .isUUID()
    .withMessage('Invalid partner ID format'),
  body('center_id')
    .notEmpty()
    .withMessage('Center ID is required')
    .isUUID()
    .withMessage('Invalid center ID format'),
  body('trainer_name')
    .trim()
    .notEmpty()
    .withMessage('Trainer name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Trainer name must be between 2 and 255 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('mobile_no')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Invalid mobile number format'),
  body('course_name')
    .trim()
    .optional()
    .isLength({ max: 255 })
    .withMessage('Course name must not exceed 255 characters'),
  body('qualification')
    .trim()
    .optional()
    .isLength({ max: 255 })
    .withMessage('Qualification must not exceed 255 characters'),
  body('date_of_joining')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Invalid date format'),
  body('training_partner').optional().trim(),
  body('training_centre_name').optional().trim(),
];

/**
 * Validator for trainer ID parameter
 */
const trainerIdValidator = [param('id').isUUID().withMessage('Invalid trainer ID')];

/**
 * Validator for listing trainers with pagination and filters
 */
const listTrainersValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  query('partner_id').optional().isUUID().withMessage('Invalid partner ID'),
  query('center_id').optional().isUUID().withMessage('Invalid center ID'),
  query('search').optional().trim(),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Invalid status'),
];

module.exports = {
  createTrainerValidator,
  updateTrainerValidator,
  trainerIdValidator,
  listTrainersValidator,
};
