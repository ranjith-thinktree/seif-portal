const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/response.util');

/**
 * Validation Middleware
 * Can be used in two ways:
 * 1. With validation rules: validate(rules) - for routes with query/body validators
 * 2. Without validation rules: validate - for routes that use validator arrays inline
 */

const validate = (validations) => {
  // If called with validations, run them first
  if (validations && Array.isArray(validations)) {
    return async (req, res, next) => {
      console.log('🟣 Validate middleware called (with validations)');

      // Run all validations
      await Promise.all(validations.map((validation) => validation.run(req)));

      // Check for errors
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        console.log('🟣 Validation errors found:', errors.array());
        const formattedErrors = errors.array().map((error) => ({
          field: error.path || error.param,
          message: error.msg,
          value: error.value,
        }));

        return ApiResponse.validationError(res, formattedErrors, 'Validation failed');
      }

      console.log('🟣 Validation passed');
      next();
    };
  }

  // If called without validations (used after validator array in route)
  // Return middleware that just checks results
  return async (req, res, next) => {
    console.log('🟣 Validate middleware called (checking results)');

    // Check for errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      console.log('🟣 Validation errors found:', errors.array());
      const formattedErrors = errors.array().map((error) => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value,
      }));

      return ApiResponse.validationError(res, formattedErrors, 'Validation failed');
    }

    console.log('🟣 Validation passed');
    next();
  };
};

module.exports = { validate };
