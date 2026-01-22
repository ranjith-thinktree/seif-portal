const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/response.util');

/**
 * Validation Middleware
 * Wraps express-validator validation rules
 * @param {Array} validations - Array of express-validator validation rules
 * @returns {Function} Express middleware function
 */

const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map((error) => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value,
      }));

      return ApiResponse.validationError(res, formattedErrors, 'Validation failed');
    }

    next();
  };
};

module.exports = { validate };
