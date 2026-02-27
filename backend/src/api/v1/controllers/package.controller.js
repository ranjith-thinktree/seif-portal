const PackageService = require('../services/package.service');
const ApiResponse = require('../../../utils/response.util');
const { ValidationError, NotFoundError } = require('../../../utils/error.util');
const { deleteImage } = require('../../../middleware/imageUpload.middleware');

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
        is_active: req.query.is_active ? req.query.is_active === 'true' : undefined,
        search: req.query.search,
        limit: parseInt(req.query.limit) || 100,
        offset: parseInt(req.query.offset) || 0,
      };

      const result = await PackageService.getAllPackages(filters);

      return ApiResponse.success(res, result, 'Packages retrieved successfully', 200);
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
      // Handle uploaded images
      const imagePaths = req.files
        ? req.files.map((file) => `uploads/packages/${file.filename}`)
        : [];

      const packageData = {
        package_name: req.body.package_name,
        description: req.body.description,
        is_active: req.body.is_active !== undefined ? req.body.is_active : true,
        display_order: req.body.display_order,
        images: imagePaths.length > 0 ? imagePaths : null,
      };

      const newPackage = await PackageService.createPackage(packageData, req.user.id);

      return ApiResponse.created(res, 'Package created successfully', newPackage, 201);
    } catch (error) {
      // Cleanup uploaded images if package creation fails
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          deleteImage(`uploads/packages/${file.filename}`);
        });
      }

      if (error instanceof ValidationError) {
        return ApiResponse.error(res, error.message, 400);
      }
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/packages/:id
   * Update package (including images)
   */
  static async updatePackage(req, res, next) {
    try {
      const { id } = req.params;

      // Get existing package to handle image deletion
      const existingPackage = await PackageService.getPackageById(id);

      // Handle new uploaded images
      const newImagePaths = req.files
        ? req.files.map((file) => `uploads/packages/${file.filename}`)
        : [];

      // Handle images update
      let imagesToSave = null;

      if (req.body.existingImages) {
        // Parse existing images from request (sent as JSON string from frontend)
        const existingImages = JSON.parse(req.body.existingImages);
        imagesToSave = [...existingImages, ...newImagePaths];

        // Delete removed images from filesystem
        if (existingPackage.images) {
          const oldImages = JSON.parse(existingPackage.images);
          const removedImages = oldImages.filter((img) => !existingImages.includes(img));
          removedImages.forEach((imgPath) => deleteImage(imgPath));
        }
      } else if (newImagePaths.length > 0) {
        // Only new images (replace all)
        imagesToSave = newImagePaths;

        // Delete all old images
        if (existingPackage.images) {
          const oldImages = JSON.parse(existingPackage.images);
          oldImages.forEach((imgPath) => deleteImage(imgPath));
        }
      }

      const packageData = {
        package_name: req.body.package_name,
        description: req.body.description,
        is_active: req.body.is_active,
        display_order: req.body.display_order,
        images: imagesToSave,
      };

      // Remove undefined values
      Object.keys(packageData).forEach(
        (key) => packageData[key] === undefined && delete packageData[key]
      );

      const updatedPackage = await PackageService.updatePackage(id, packageData, req.user.id);

      return ApiResponse.success(res, updatedPackage, 'Package updated successfully', 200);
    } catch (error) {
      // Cleanup new images if update fails
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          deleteImage(`uploads/packages/${file.filename}`);
        });
      }

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

      // Get package first to retrieve images (only if hard delete)
      let packageImages = [];
      if (hardDelete) {
        const packageData = await PackageService.getPackageById(id);
        if (packageData.images) {
          packageImages = JSON.parse(packageData.images);
        }
      }

      const result = await PackageService.deletePackage(id, req.user.id, hardDelete);

      // Delete images from filesystem only on hard delete
      if (hardDelete && packageImages.length > 0) {
        packageImages.forEach((imagePath) => deleteImage(imagePath));
      }

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
