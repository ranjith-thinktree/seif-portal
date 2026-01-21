const PackageService = require('../services/package.service');
const ApiResponse = require('../../../utils/response.util');
const { ValidationError, NotFoundError } = require('../../../utils/error.util');

/**
 * Package Controller
 * Handles HTTP requests for refurbishment packages
 */

class PackageController {
  /**
   * GET /api/v1/admin/packages
   * Get all packages with pagination and filters
   */
  static async getAllPackages(req, res, next) {
    try {
      const filters = {
        category: req.query.category,
        is_active: req.query.is_active
          ? req.query.is_active === 'true'
          : undefined,
        search: req.query.search,
        limit: parseInt(req.query.limit) || 100,
        offset: parseInt(req.query.offset) || 0,
      };

      const result = await PackageService.getAllPackages(filters);

      return ApiResponse.success(
        res,
        result,
        'Packages retrieved successfully',
        200
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/packages/:id
   * Get single package by ID
   */
  static async getPackageById(req, res, next) {
    try {
      const { id } = req.params;
      const includeCourses = req.query.include_courses === 'true';

      let pkg;

      if (includeCourses) {
        pkg = await PackageService.getPackageWithCourses(id);
      } else {
        pkg = await PackageService.getPackageById(id);
      }

      return ApiResponse.success(res, pkg, 'Package retrieved successfully', 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/packages
   * Create new package
   */
  static async createPackage(req, res, next) {
    try {
      const packageData = {
        package_name: req.body.package_name,
        description: req.body.description,
        category: req.body.category,
        is_active: req.body.is_active !== undefined ? req.body.is_active : true,
        display_order: req.body.display_order,
      };

      const newPackage = await PackageService.createPackage(
        packageData,
        req.user.id
      );

      return ApiResponse.created(
        res,
        'Package created successfully',
        newPackage,
        201
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return ApiResponse.error(res, error.message, 400);
      }
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/packages/:id
   * Update package
   */
  static async updatePackage(req, res, next) {
    try {
      const { id } = req.params;

      const packageData = {
        package_name: req.body.package_name,
        description: req.body.description,
        category: req.body.category,
        is_active: req.body.is_active,
        display_order: req.body.display_order,
      };

      // Remove undefined values
      Object.keys(packageData).forEach(
        (key) => packageData[key] === undefined && delete packageData[key]
      );

      const updatedPackage = await PackageService.updatePackage(
        id,
        packageData,
        req.user.id
      );

      return ApiResponse.success(
        res,
        updatedPackage,
        'Package updated successfully',
        200
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ApiResponse.notFound(res, error.message);
      }
      if (error instanceof ValidationError) {
        return ApiResponse.error(res, error.message, 400);
      }
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/packages/:id
   * Delete package (soft delete by default, hard delete if ?hard=true)
   */
  static async deletePackage(req, res, next) {
    try {
      const { id } = req.params;
      const hardDelete = req.query.hard === 'true';

      const result = await PackageService.deletePackage(
        id,
        req.user.id,
        hardDelete
      );

      return ApiResponse.success(
        res,
        `Package ${result.deleted === 'permanently' ? 'permanently deleted' : 'deactivated'} successfully`,
        result,
        200
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ApiResponse.notFound(res, error.message);
      }
      if (error instanceof ValidationError) {
        return ApiResponse.error(res, error.message, 400);
      }
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/packages/reorder
   * Reorder packages (bulk update display_order)
   */
  static async reorderPackages(req, res, next) {
    try {
      const { orderMap } = req.body;

      if (!orderMap) {
        return ApiResponse.error(
          res,
          'orderMap is required (object with package_id: display_order)',
          400
        );
      }

      const result = await PackageService.reorderPackages(orderMap, req.user.id);

      return ApiResponse.success(res, result, result.message, 200);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        return ApiResponse.error(res, error.message, 400);
      }
      next(error);
    }
  }
}

module.exports = PackageController;
