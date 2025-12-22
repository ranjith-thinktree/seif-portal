const adminService = require('../services/admin.service');
const partnerService = require('../services/partner.service');
const UserModel = require('../../../models/User.model');
const bcrypt = require('bcryptjs');
const emailService = require('../../../utils/email.util');

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

/**
 * Reset partner password (Admin action)
 * POST /api/v1/admin/partners/:partnerId/reset-password
 * Requires ADMIN or SUPER_ADMIN role
 */
const resetPartnerPassword = async (req, res, next) => {
  try {
    const { partnerId } = req.params;
    const { sendEmail = true } = req.body;

    // Get partner details
    const partner = await partnerService.getPartnerById(partnerId);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Find partner's user account
    const user = await UserModel.findByEmail(partner.contact_email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Partner user account not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Generate new temporary password
    const tempPassword = emailService.generatePassword(12);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Update password in database and set must_change_password flag
    await UserModel.update(user.id, {
      password_hash: passwordHash,
      password_changed_at: new Date(),
    });

    // Force user to change password on next login
    await UserModel.setMustChangePassword(user.id, true);

    // Send email with new credentials
    if (sendEmail) {
      try {
        await emailService.sendPartnerWelcomeEmail({
          email: partner.contact_email,
          name: partner.name,
          partnerId: partner.partner_id,
          tempPassword: tempPassword,
        });

        return res.status(200).json({
          success: true,
          message: 'Password reset successfully and email sent to partner',
          data: {
            email: partner.contact_email,
            partnerId: partner.partner_id,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);

        // Return password if email fails
        return res.status(200).json({
          success: true,
          message:
            'Password reset successful, but email failed to send. Please provide these credentials to the partner manually.',
          data: {
            email: partner.contact_email,
            partnerId: partner.partner_id,
            tempPassword: tempPassword,
            warning: 'Email service failed. Partner must be informed manually.',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    // If sendEmail is false, return password in response
    return res.status(200).json({
      success: true,
      message: 'Password reset successfully (email not sent)',
      data: {
        email: partner.contact_email,
        partnerId: partner.partner_id,
        tempPassword: tempPassword,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get partner login details (Admin view only)
 * GET /api/v1/admin/partners/:partnerId/login-details
 * Requires ADMIN or SUPER_ADMIN role
 */
const getPartnerLoginDetails = async (req, res, next) => {
  try {
    const { partnerId } = req.params;

    // Get partner details
    const partner = await partnerService.getPartnerById(partnerId);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Find partner's user account
    const user = await UserModel.findByEmail(partner.contact_email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Partner user account not found',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Partner login details retrieved',
      data: {
        partnerId: partner.partner_id,
        partnerName: partner.name,
        email: user.email,
        status: user.status,
        lastLogin: user.last_login_at,
        accountCreated: user.created_at,
        hasLoggedInBefore: user.last_login_at ? true : false,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  resetDatabase,
  getDatabaseStats,
  resetPartnerPassword,
  getPartnerLoginDetails,
};
