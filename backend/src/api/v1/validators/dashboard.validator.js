const { body, query } = require('express-validator');

/**
 * Dashboard Validators
 */
const dashboardValidator = {
  /**
   * Validate SEIF dashboard query filters
   */
  seifDashboardFilters: [
    query('state')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('State must be between 2 and 100 characters'),
    
    query('region')
      .optional()
      .isString()
      .trim()
      .isIn(['North', 'South', 'East', 'West', 'Central', 'Northeast'])
      .withMessage('Region must be one of: North, South, East, West, Central, Northeast'),
    
    query('year')
      .optional()
      .isInt({ min: 2000, max: 2100 })
      .withMessage('Year must be a valid year between 2000 and 2100'),
  ],
};

module.exports = dashboardValidator;
