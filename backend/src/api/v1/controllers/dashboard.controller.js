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

      return ApiResponse.success(res, dashboardData, 'Admin dashboard data retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get state-wise statistics for India Map
   * @route GET /api/v1/dashboard/state-stats
   * @access Admin, Super Admin
   */
  static async getStateStats(req, res, next) {
    try {
      const { year } = req.query;
      const stateStats = await DashboardService.getStateStats(year);

      return ApiResponse.success(res, stateStats, 'State statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get detailed course breakdown for a specific state
   * @route GET /api/v1/dashboard/state-detail
   * @access Admin, Super Admin
   */
  static async getStateDetail(req, res, next) {
    try {
      const { state, year } = req.query;

      if (!state) {
        return res.status(400).json({ success: false, message: 'State name is required' });
      }

      const detail = await DashboardService.getStateDetail(state, year);
      return ApiResponse.success(res, detail, 'State detail retrieved successfully');
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

      return ApiResponse.success(res, dashboardData, 'SEIF dashboard data retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get consolidated analytics for admin dashboard
   * @route GET /api/v1/dashboard/analytics
   * @access Admin, Super Admin
   */
  static async getConsolidatedAnalytics(req, res, next) {
    try {
      const { year } = req.query;

      const dashboardData = await DashboardService.getConsolidatedAnalytics(year);

      return ApiResponse.success(
        res,
        dashboardData,
        'Consolidated analytics retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get centers grouped by year of establishment
   * @route GET /api/v1/dashboard/centers-by-establishment
   * @access Admin, Super Admin
   */
  static async getCentersByEstablishment(req, res, next) {
    try {
      const { year } = req.query;

      const establishmentData = await DashboardService.getCentersByEstablishment(year);

      return ApiResponse.success(
        res,
        establishmentData,
        'Centers by establishment year retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DashboardController;
