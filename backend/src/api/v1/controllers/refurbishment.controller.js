const RefurbishmentService = require('../services/refurbishment.service');
const ApiResponse = require('../../../utils/response.util');
const { ValidationError } = require('../../../utils/error.util');

/**
 * Refurbishment Controller
 * Handles admin dashboard endpoints for refurbishment management
 */

class RefurbishmentController {
  /**
   * GET /api/v1/admin/refurbishment/eligible-centers
   * Returns centers eligible for refurbishment (Tab 1: Eligible Centers)
   * 
   * Query params:
   * - limit: number of records per page (default: 50)
   * - offset: pagination offset (default: 0)
   * 
   * Response:
   * - centers: array of eligible center objects
   * - totalCount: total number of eligible centers
   * - pagination: { limit, offset, hasMore }
   */
  static async getEligibleCenters(req, res, next) {
    try {
      // Parse and validate query parameters
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      // Validate pagination parameters
      if (limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
      }
      if (offset < 0) {
        throw new ValidationError('Offset must be non-negative');
      }

      // Call service method
      const result = await RefurbishmentService.getEligibleCenters(limit, offset);

      // Add pagination metadata
      const response = {
        ...result,
        pagination: {
          limit,
          offset,
          hasMore: (offset + limit) < result.totalCount,
        },
      };

      return ApiResponse.success(res, response, 'Eligible centers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/all-centers
   * Returns all active centers with eligibility status (Tab 3: All Centers)
   * 
   * Query params:
   * - limit: number of records per page (default: 50)
   * - offset: pagination offset (default: 0)
   * 
   * Response:
   * - centers: array of all center objects with eligibility status
   * - totalCount: total number of centers
   * - eligibleCount: number of eligible centers
   * - ineligibleCount: number of ineligible centers
   * - pagination: { limit, offset, hasMore }
   */
  static async getAllCentersWithStatus(req, res, next) {
    try {
      // Parse and validate query parameters
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      // Validate pagination parameters
      if (limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
      }
      if (offset < 0) {
        throw new ValidationError('Offset must be non-negative');
      }

      // Call service method
      const result = await RefurbishmentService.getAllCentersWithStatus(limit, offset);

      // Add pagination metadata
      const response = {
        ...result,
        pagination: {
          limit,
          offset,
          hasMore: (offset + limit) < result.totalCount,
        },
      };

      return ApiResponse.success(res, response, 'All centers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/recently-refurbished
   * Returns centers refurbished within specified timeframe (Tab 2: Recently Refurbished)
   * 
   * Query params:
   * - within: number of months (default: 12)
   * - limit: number of records per page (default: 50)
   * - offset: pagination offset (default: 0)
   * 
   * Response:
   * - centers: array of recently refurbished center objects
   * - totalCount: total number of centers in timeframe
   * - withinMonths: timeframe parameter used
   * - pagination: { limit, offset, hasMore }
   */
  static async getRecentlyRefurbishedCenters(req, res, next) {
    try {
      // Parse and validate query parameters
      const withinMonths = parseInt(req.query.within) || 12;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      // Validate parameters
      if (withinMonths < 1 || withinMonths > 120) {
        throw new ValidationError('Within months must be between 1 and 120 (10 years)');
      }
      if (limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
      }
      if (offset < 0) {
        throw new ValidationError('Offset must be non-negative');
      }

      // Call service method
      const result = await RefurbishmentService.getRecentlyRefurbishedCenters(
        withinMonths,
        limit,
        offset
      );

      // Add pagination metadata
      const response = {
        ...result,
        pagination: {
          limit,
          offset,
          hasMore: (offset + limit) < result.totalCount,
        },
      };

      return ApiResponse.success(
        res,
        response,
        `Recently refurbished centers (within ${withinMonths} months) retrieved successfully`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/centers/:centerId/eligibility
   * Check eligibility status of a specific center
   * 
   * Path params:
   * - centerId: UUID of the center
   * 
   * Response:
   * - center: center object with eligibility details
   *   OR null if center not found
   */
  static async checkCenterEligibility(req, res, next) {
    try {
      const { centerId } = req.params;

      // Validate centerId format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(centerId)) {
        throw new ValidationError('Invalid center ID format. Must be a valid UUID.');
      }

      // Call service method
      const center = await RefurbishmentService.checkCenterEligibility(centerId);

      if (!center) {
        return ApiResponse.notFound(res, 'Center not found');
      }

      return ApiResponse.success(res, { center }, 'Center eligibility checked successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/dashboard
   * Aggregated dashboard data for all 3 tabs
   * 
   * Query params:
   * - recentlyRefurbishedWithin: months for recently refurbished filter (default: 12)
   * 
   * Response:
   * - eligibleCenters: { centers (top 10), totalCount }
   * - recentlyRefurbished: { centers (top 10), totalCount, withinMonths }
   * - allCentersSummary: { totalCount, eligibleCount, ineligibleCount }
   */
  static async getDashboardSummary(req, res, next) {
    try {
      const withinMonths = parseInt(req.query.recentlyRefurbishedWithin) || 12;

      // Validate parameter
      if (withinMonths < 1 || withinMonths > 120) {
        throw new ValidationError('Within months must be between 1 and 120 (10 years)');
      }

      // Fetch data for all 3 tabs (top 10 only for performance)
      const [eligible, recentlyRefurbished, allCenters] = await Promise.all([
        RefurbishmentService.getEligibleCenters(10, 0),
        RefurbishmentService.getRecentlyRefurbishedCenters(withinMonths, 10, 0),
        RefurbishmentService.getAllCentersWithStatus(10, 0),
      ]);

      const response = {
        eligibleCenters: {
          centers: eligible.centers,
          totalCount: eligible.totalCount,
        },
        recentlyRefurbished: {
          centers: recentlyRefurbished.centers,
          totalCount: recentlyRefurbished.totalCount,
          withinMonths: recentlyRefurbished.withinMonths,
        },
        allCentersSummary: {
          totalCount: allCenters.totalCount,
          eligibleCount: allCenters.eligibleCount,
          ineligibleCount: allCenters.ineligibleCount,
        },
      };

      return ApiResponse.success(res, response, 'Dashboard summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RefurbishmentController;
