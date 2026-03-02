const RefurbishmentPackageModel = require('../../../models/RefurbishmentPackage.model');
const { ValidationError, NotFoundError } = require('../../../utils/error.util');

/**
 * Package Service
 * Business logic for refurbishment packages
 */

class PackageService {
  /**
   * Get all packages with pagination and filters
   * Returns packages with course names for display
   */
  static async getAllPackages(filters = {}) {
    const packages = await RefurbishmentPackageModel.findAllWithCourses(filters);
    const total = await RefurbishmentPackageModel.count(filters);

    return {
      packages,
      pagination: {
        total,
        limit: parseInt(filters.limit || 100),
        offset: parseInt(filters.offset || 0),
        hasMore: total > parseInt(filters.offset || 0) + packages.length,
      },
    };
  }

  /**
   * Get package by ID
   */
  static async getPackageById(id) {
    const pkg = await RefurbishmentPackageModel.findById(id);

    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    return pkg;
  }

  /**
   * Get package with course links
   */
  static async getPackageWithCourses(id) {
    const pkg = await RefurbishmentPackageModel.findByIdWithCourses(id);

    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    return pkg;
  }

  /**
   * Create new package
   */
  static async createPackage(packageData, userId) {
    // Validate required fields
    if (!packageData.package_name) {
      throw new ValidationError('Package name is required');
    }

    // Validate category if provided
    const VALID_CATEGORIES = [
      'electrical',
      'electronics',
      'it',
      'mechanical',
      'civil',
      'mechatronics',
      'general',
    ];
    if (
      packageData.category !== undefined &&
      !VALID_CATEGORIES.includes(packageData.category.toLowerCase())
    ) {
      throw new ValidationError(
        `Invalid category: "${packageData.category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`
      );
    }

    // Check if package name already exists
    const existingPackage = await RefurbishmentPackageModel.findByName(packageData.package_name);

    if (existingPackage) {
      throw new ValidationError(`Package with name "${packageData.package_name}" already exists`);
    }

    // Set display_order if not provided
    if (!packageData.display_order) {
      packageData.display_order = await RefurbishmentPackageModel.getNextDisplayOrder();
    }

    // Create package
    const newPackage = await RefurbishmentPackageModel.create(packageData);

    // Log audit trail (would be implemented in audit service)
    // await AuditLogService.log({
    //   userId,
    //   action: 'create',
    //   entityType: 'refurbishment_package',
    //   entityId: newPackage.id,
    //   changes: { new: newPackage }
    // });

    return newPackage;
  }

  /**
   * Update package
   */
  static async updatePackage(id, packageData, userId) {
    // Check if package exists
    const existingPackage = await RefurbishmentPackageModel.findById(id);

    if (!existingPackage) {
      throw new NotFoundError('Package not found');
    }

    // Check if new name conflicts with existing package
    if (packageData.package_name && packageData.package_name !== existingPackage.package_name) {
      const duplicatePackage = await RefurbishmentPackageModel.findByName(packageData.package_name);

      if (duplicatePackage && duplicatePackage.id !== id) {
        throw new ValidationError(`Package with name "${packageData.package_name}" already exists`);
      }
    }

    // Update package
    const updatedPackage = await RefurbishmentPackageModel.update(id, packageData);

    // Log audit trail
    // await AuditLogService.log({
    //   userId,
    //   action: 'update',
    //   entityType: 'refurbishment_package',
    //   entityId: id,
    //   changes: {
    //     old: existingPackage,
    //     new: updatedPackage
    //   }
    // });

    return updatedPackage;
  }

  /**
   * Delete package (soft delete)
   */
  static async deletePackage(id, userId, hardDelete = false) {
    // Check if package exists
    const existingPackage = await RefurbishmentPackageModel.findById(id);

    if (!existingPackage) {
      throw new NotFoundError('Package not found');
    }

    let success;

    if (hardDelete) {
      // Hard delete (will throw error if package is linked to courses)
      try {
        success = await RefurbishmentPackageModel.hardDelete(id);
      } catch (error) {
        if (error.message.includes('linked to courses')) {
          throw new ValidationError(
            'Cannot permanently delete package that is linked to courses. Use soft delete instead.'
          );
        }
        throw error;
      }
    } else {
      // Soft delete (set is_active = false)
      success = await RefurbishmentPackageModel.softDelete(id);
    }

    if (!success) {
      throw new Error('Failed to delete package');
    }

    // Log audit trail
    // await AuditLogService.log({
    //   userId,
    //   action: hardDelete ? 'hard_delete' : 'soft_delete',
    //   entityType: 'refurbishment_package',
    //   entityId: id,
    //   changes: { old: existingPackage }
    // });

    return { success: true, deleted: hardDelete ? 'permanently' : 'soft' };
  }

  /**
   * Reorder packages
   */
  static async reorderPackages(orderMap, userId) {
    // Validate orderMap
    if (!orderMap || typeof orderMap !== 'object') {
      throw new ValidationError('Invalid order map provided');
    }

    // Validate all package IDs exist
    const packageIds = Object.keys(orderMap);

    for (const id of packageIds) {
      const pkg = await RefurbishmentPackageModel.findById(id);
      if (!pkg) {
        throw new NotFoundError(`Package with ID ${id} not found`);
      }
    }

    // Reorder
    await RefurbishmentPackageModel.reorder(orderMap);

    // Log audit trail
    // await AuditLogService.log({
    //   userId,
    //   action: 'reorder',
    //   entityType: 'refurbishment_packages',
    //   changes: { orderMap }
    // });

    return { success: true, message: 'Packages reordered successfully' };
  }
}

module.exports = PackageService;
