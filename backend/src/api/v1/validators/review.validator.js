const { body, param } = require('express-validator');

/**
 * Review Validators
 */

// Validate uploadId param (UUID format)
const uploadIdValidator = [
  param('uploadId')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Invalid upload ID format'),
];

// Validate centerId param (UUID format)
const centerIdValidator = [
  param('centerId')
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Invalid center ID format'),
];

// Validate reject center request body
const rejectCenterValidator = [
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ min: 10 })
    .withMessage('Rejection reason must be at least 10 characters'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Remarks must not exceed 1000 characters'),
];

module.exports = {
  uploadIdValidator,
  centerIdValidator,
  rejectCenterValidator,
};
