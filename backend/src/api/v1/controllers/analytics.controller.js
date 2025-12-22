const analyticsService = require('../services/analytics.service');
const { successResponse, errorResponse } = require('../../../utils/response.util');

/**
 * Analytics Controller
 * Handles HTTP requests for analytics endpoints
 */
class AnalyticsController {
  /**
   * Get consolidated student analytics with filters
   * @route GET /api/v1/analytics/consolidated
   * @access Admin, SUPER_ADMIN
   */
  async getConsolidatedAnalytics(req, res) {
    try {
      const { financialYear, partnerId, centerId, gender } = req.query;

      const analytics = await analyticsService.getConsolidatedAnalytics({
        financialYear,
        partnerId,
        centerId,
        gender,
      });

      return successResponse(res, 'Consolidated analytics retrieved successfully', analytics);
    } catch (error) {
      console.error('Error in getConsolidatedAnalytics controller:', error);
      return errorResponse(res, error.message || 'Failed to retrieve analytics', 500);
    }
  }

  /**
   * Get filter options for analytics
   * @route GET /api/v1/analytics/filter-options
   * @access Admin, SUPER_ADMIN
   */
  async getFilterOptions(req, res) {
    try {
      const options = await analyticsService.getFilterOptions();

      return successResponse(res, 'Filter options retrieved successfully', options);
    } catch (error) {
      console.error('Error in getFilterOptions controller:', error);
      return errorResponse(res, 'Failed to retrieve filter options', 500);
    }
  }
}

module.exports = new AnalyticsController();
