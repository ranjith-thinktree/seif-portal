const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/response.util');

/**
 * Validation Middleware
 * Works in two modes automatically:
 *
 * Mode 1 — Direct middleware: used as `validate` in a route (no call parentheses).
 *   Express calls validate(req, res, next) — checks existing validation results.
 *
 * Mode 2 — Factory: called as `validate(rules)` — returns a middleware that
 *   first runs the provided validator array, then checks results.
 */
const validate = (validationsOrReq, res, next) => {
  // ── Mode 1: called directly as middleware (req, res, next) ──────────────────
  // Detect by checking whether the second argument looks like an Express Response
  // (has a .status function). When called as a factory, res is undefined.
  if (res !== undefined && typeof res.status === 'function') {
    const req = validationsOrReq;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map((error) => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value,
      }));
      return ApiResponse.validationError(res, formattedErrors, 'Validation failed');
    }

    return next();
  }

  // ── Mode 2: called as a factory — validate(rules) ───────────────────────────
  const validations = validationsOrReq;

  return async (req, res, next) => {
    // Run all provided validators first (if any)
    if (validations && Array.isArray(validations)) {
      await Promise.all(validations.map((v) => v.run(req)));
    }

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
