const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/response.util');

/**
 * Validation Middleware
 * Handles express-validator validation errors
 */

const validate = (req, res, next) => {
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

module.exports = validate;
