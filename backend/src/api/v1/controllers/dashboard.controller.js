const DashboardService = require('../services/dashboard.service');
const ApiResponse = require('../../../utils/response.util');
const { ROLES } = require('../../../constants');

/**
 * Dashboard Controller
 * Handles HTTP requests for dashboard statistics
 */
class DashboardController {
  /**
   * Get partner dashboard
   * @route GET /api/v1/dashboard/partner
   * @access Partner
   */
  static async getPartnerDashboard(req, res, next) {
    try {
      const partnerId = req.user.partner_id;

      if (!partnerId) {
        return ApiResponse.error(res, 'Partner ID not found in user profile', 400);
      }

      const dashboardData = await DashboardService.getPartnerDashboard(partnerId);
      
      return ApiResponse.success(
        res,
        dashboardData,
        'Partner dashboard data retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get admin dashboard
   * @route GET /api/v1/dashboard/admin
   * @access Admin, Super Admin
   */
  static async getAdminDashboard(req, res, next) {
    try {
      const dashboardData = await DashboardService.getAdminDashboard();
      
      return ApiResponse.success(
        res,
        dashboardData,
        'Admin dashboard data retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get SEIF/ESSCI dashboard
   * @route GET /api/v1/dashboard/seif
   * @access SEIF_READONLY, ESSCI, Admin, Super Admin
   */
  static async getSEIFDashboard(req, res, next) {
    try {
      const { state, region, year } = req.query;

      const filters = {};
      if (state) filters.state = state;
      if (region) filters.region = region;
      if (year) filters.year = parseInt(year);

      const dashboardData = await DashboardService.getSEIFDashboard(filters);
      
      return ApiResponse.success(
        res,
        dashboardData,
        'SEIF dashboard data retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DashboardController;
