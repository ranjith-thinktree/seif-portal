const dataService = require('../services/data.service');
const { successResponse, errorResponse } = require('../../../utils/response.util');

/**
 * Data Controller
 * Handles HTTP requests for data management overview
 */
class DataController {
  /**
   * Get overview statistics
   * @route GET /api/v1/data/overview-stats
   * @access Admin, SUPER_ADMIN, PARTNER, ESSCI, SEIF_READONLY
   */
  async getOverviewStats(req, res) {
    try {
      const { role, partner_id } = req.user;

      const stats = await dataService.getOverviewStats({
        role,
        partner_id,
      });

      // Wrap stats in summary object for frontend compatibility
      return successResponse(res, 'Overview statistics retrieved successfully', { summary: stats });
    } catch (error) {
      console.error('Error in getOverviewStats controller:', error);
      return errorResponse(res, 'Failed to retrieve overview statistics', 500);
    }
  }
}

module.exports = new DataController();
