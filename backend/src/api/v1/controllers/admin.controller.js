const adminService = require('../services/admin.service');

/**
 * Reset database (delete all data except users, courses, partners)
 * POST /api/v1/admin/reset-database
 * Requires SUPER_ADMIN role
 */
const resetDatabase = async (req, res, next) => {
  try {
    // Multi-level validation: role, name, and email
    const isSuperAdmin =
      req.user.role === 'SUPER_ADMIN' &&
      req.user.full_name === 'Super Admin' &&
      req.user.email === 'superadmin@seif.org';

    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only the Super Admin account can reset the database',
        errors: null,
        timestamp: new Date().toISOString(),
      });
    }

    // Get stats before reset
    const statsBefore = await adminService.getDatabaseStats();

    // Perform reset
    const result = await adminService.resetDatabase();

    // Get stats after reset
    const statsAfter = await adminService.getDatabaseStats();

    res.status(200).json({
      success: true,
      message: 'Database reset completed successfully',
      data: {
        ...result,
        statsBefore,
        statsAfter,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get database statistics
 * GET /api/v1/admin/database-stats
 * Requires SUPER_ADMIN role
 */
const getDatabaseStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDatabaseStats();

    res.status(200).json({
      success: true,
      message: 'Database statistics fetched successfully',
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  resetDatabase,
  getDatabaseStats,
};
