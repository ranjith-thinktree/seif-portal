const ApiResponse = require('../utils/response.util');
const { AppError } = require('../utils/error.util');
const config = require('../config');

/**
 * Global Error Handler Middleware
 * Catches all errors and sends consistent error responses
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  if (config.server.env === 'development') {
    console.error('Error:', err);
  }

  // Handle operational errors (AppError instances)
  if (err.isOperational) {
    return ApiResponse.error(res, err.message, err.statusCode, err.errors || null);
  }

  // Handle MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    return ApiResponse.error(res, 'Duplicate entry. Resource already exists', 409);
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return ApiResponse.error(res, 'Referenced resource does not exist', 400);
  }

  if (err.code && err.code.startsWith('ER_')) {
    return ApiResponse.error(res, 'Database operation failed', 500);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token expired');
  }

  // Handle Multer (file upload) errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ApiResponse.error(res, 'File size exceeds maximum limit', 400);
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return ApiResponse.error(res, 'Too many files uploaded', 400);
    }
    return ApiResponse.error(res, 'File upload error', 400);
  }

  // Handle validation errors (express-validator)
  if (err.array && typeof err.array === 'function') {
    const errors = err.array().map((error) => ({
      field: error.param,
      message: error.msg,
    }));
    return ApiResponse.validationError(res, errors);
  }

  // Handle unexpected errors
  console.error('Unexpected Error:', err);
  return ApiResponse.serverError(
    res,
    config.server.env === 'development' ? err.message : 'Internal server error'
  );
};

/**
 * 404 Not Found Handler
 * Handles requests to non-existent routes
 */
const notFoundHandler = (req, res) => {
  return ApiResponse.notFound(res, `Route ${req.originalUrl} not found`);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
