const centerService = require('../services/center.service');
const { successResponse, errorResponse } = require('../../../utils/response.util');
const { Parser } = require('json2csv');

/**
 * Center Controller
 * Handles HTTP requests for center management
 */
class CenterController {
  /**
   * Get all centers
   * @route GET /api/v1/centers
   * @access Admin, SUPER_ADMIN, ESSCI, SEIF_READONLY, PARTNER
   */
  async getAllCenters(req, res) {
    try {
      const {
        page,
        limit,
        search,
        status,
        approval_status,
        partner_id,
        region,
        city,
        state,
        center_type,
        year_of_establishment,
        sort_by,
        sort_order,
      } = req.query;
      const { role, partner_id: user_partner_id } = req.user;

      const result = await centerService.getAllCenters({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search: search || '',
        status: status || '',
        approval_status: approval_status || '',
        partner_id: partner_id || '',
        region: region || '',
        city: city || '',
        state: state || '',
        center_type: center_type || '',
        year_of_establishment: year_of_establishment || '',
        sort_by: sort_by || 'created_at',
        sort_order: sort_order || 'desc',
        role,
        user_partner_id,
      });

      return res.status(200).json({
        success: true,
        message: 'Centers fetched successfully',
        data: {
          data: result.data,
          pagination: result.pagination,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getAllCenters:', error);
      return errorResponse(res, 'Failed to fetch centers', 500);
    }
  }

  /**
   * Get partner's own centers
   * @route GET /api/v1/centers/my-centers
   * @access PARTNER
   */
  async getMyCenters(req, res) {
    try {
      const {
        page,
        limit,
        search,
        status,
        region,
        city,
        state,
        center_type,
        year_of_establishment,
        sort_by,
        sort_order,
      } = req.query;
      const { partner_id } = req.user;

      if (!partner_id) {
        return errorResponse(res, 'Partner ID not found in user profile', 400);
      }

      const result = await centerService.getMyCenters(partner_id, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search: search || '',
        status: status || '',
        region: region || '',
        city: city || '',
        state: state || '',
        center_type: center_type || '',
        year_of_establishment: year_of_establishment || '',
        sort_by: sort_by || 'created_at',
        sort_order: sort_order || 'desc',
      });

      return res.status(200).json({
        success: true,
        message: 'Centers fetched successfully',
        data: {
          data: result.data,
          pagination: result.pagination,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getMyCenters:', error);
      return errorResponse(res, 'Failed to fetch centers', 500);
    }
  }

  /**
   * Get center by ID
   * @route GET /api/v1/centers/:id
   * @access Admin, SUPER_ADMIN, ESSCI, SEIF_READONLY, PARTNER
   */
  async getCenterById(req, res) {
    try {
      const { id } = req.params;

      const center = await centerService.getCenterById(id);

      if (!center) {
        return errorResponse(res, 'Center not found', 404);
      }

      // Check if user has permission to view pending centers
      if (
        center.approval_status === 'pending' &&
        req.user.role !== 'ADMIN' &&
        req.user.role !== 'SUPER_ADMIN' &&
        req.user.partner_id !== center.partner_id
      ) {
        return errorResponse(res, 'Center not found', 404);
      }

      return successResponse(res, 'Center fetched successfully', center);
    } catch (error) {
      console.error('Error in getCenterById:', error);
      return errorResponse(res, 'Failed to fetch center', 500);
    }
  }

  /**
   * Create new center
   * @route POST /api/v1/centers
   * @access Admin, SUPER_ADMIN, PARTNER
   */
  async createCenter(req, res) {
    try {
      const { role, partner_id: user_partner_id } = req.user;

      // If partner is creating, ensure they're creating for their own partner_id
      if (role === 'PARTNER') {
        req.body.partner_id = user_partner_id;
      }

      const center = await centerService.createCenter(req.body, role);

      const message =
        role === 'PARTNER'
          ? 'Center created successfully. Awaiting admin approval.'
          : 'Center created successfully';

      return successResponse(res, message, center, 201);
    } catch (error) {
      console.error('Error in createCenter:', error);
      if (error.message.includes('Duplicate entry')) {
        return errorResponse(res, 'Center with this name already exists', 409);
      }
      return errorResponse(res, 'Failed to create center', 500);
    }
  }

  /**
   * Update center
   * @route PUT /api/v1/centers/:id
   * @access Admin, SUPER_ADMIN, PARTNER (own centers only)
   */
  async updateCenter(req, res) {
    try {
      const { id } = req.params;
      const { role, partner_id: user_partner_id } = req.user;

      // Check ownership for partners
      if (role === 'PARTNER') {
        const existingCenter = await centerService.getCenterById(id);
        if (!existingCenter) {
          return errorResponse(res, 'Center not found', 404);
        }
        if (existingCenter.partner_id !== user_partner_id) {
          return errorResponse(res, 'You do not have permission to update this center', 403);
        }
      }

      const center = await centerService.updateCenter(id, req.body);

      return successResponse(res, 'Center updated successfully', center);
    } catch (error) {
      console.error('Error in updateCenter:', error);
      if (error.message === 'Center not found') {
        return errorResponse(res, 'Center not found', 404);
      }
      return errorResponse(res, 'Failed to update center', 500);
    }
  }

  /**
   * Delete center
   * @route DELETE /api/v1/centers/:id
   * @access Admin, SUPER_ADMIN
   */
  async deleteCenter(req, res) {
    try {
      const { id } = req.params;

      await centerService.deleteCenter(id);

      return successResponse(res, 'Center deleted successfully', null);
    } catch (error) {
      console.error('Error in deleteCenter:', error);
      if (error.message === 'Center not found') {
        return errorResponse(res, 'Center not found', 404);
      }
      if (error.message.includes('Cannot delete center')) {
        return errorResponse(res, error.message, 400);
      }
      return errorResponse(res, 'Failed to delete center', 500);
    }
  }

  /**
   * Approve center
   * @route PATCH /api/v1/centers/:id/approve
   * @access Admin, SUPER_ADMIN
   */
  async approveCenter(req, res) {
    try {
      const { id } = req.params;
      const { id: userId } = req.user;

      const center = await centerService.approveCenter(id, userId);

      return successResponse(res, 'Center approved successfully', center);
    } catch (error) {
      console.error('Error in approveCenter:', error);
      if (error.message === 'Center not found') {
        return errorResponse(res, 'Center not found', 404);
      }
      if (error.message === 'Center is already approved') {
        return errorResponse(res, 'Center is already approved', 400);
      }
      return errorResponse(res, 'Failed to approve center', 500);
    }
  }

  /**
   * Reject center
   * @route PATCH /api/v1/centers/:id/reject
   * @access Admin, SUPER_ADMIN
   */
  async rejectCenter(req, res) {
    try {
      const { id } = req.params;
      const { rejection_reason } = req.body;
      const { id: userId } = req.user;

      const center = await centerService.rejectCenter(id, userId, rejection_reason);

      return successResponse(res, 'Center rejected successfully', center);
    } catch (error) {
      console.error('Error in rejectCenter:', error);
      if (error.message === 'Center not found') {
        return errorResponse(res, 'Center not found', 404);
      }
      return errorResponse(res, 'Failed to reject center', 500);
    }
  }

  /**
   * Get available filter options for centers
   * @route GET /api/v1/centers/filter-options
   * @access Admin, SUPER_ADMIN, ESSCI, SEIF_READONLY, PARTNER
   */
  async getFilterOptions(req, res) {
    try {
      const { role, partner_id: user_partner_id } = req.user;

      const options = await centerService.getFilterOptions({
        role,
        user_partner_id,
      });

      return successResponse(res, 'Filter options fetched successfully', options);
    } catch (error) {
      console.error('Error in getFilterOptions:', error);
      return errorResponse(res, 'Failed to fetch filter options', 500);
    }
  }

  /**
   * Export centers as CSV
   * @route GET /api/v1/centers/export
   * @access Admin, SUPER_ADMIN, ESSCI, PARTNER
   */
  async exportCenters(req, res) {
    try {
      const { status, approval_status, partner_id, search } = req.query;
      const { role, partner_id: user_partner_id } = req.user;

      const centers = await centerService.exportCenters({
        role,
        user_partner_id,
        status: status || '',
        approval_status: approval_status || '',
        partner_id: partner_id || '',
        search: search || '',
      });

      if (centers.length === 0) {
        return errorResponse(res, 'No centers found to export', 404);
      }

      // Convert to CSV
      const parser = new Parser();
      const csv = parser.parse(centers);

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=centers_${Date.now()}.csv`);

      return res.send(csv);
    } catch (error) {
      console.error('Error in exportCenters:', error);
      return errorResponse(res, 'Failed to export centers', 500);
    }
  }
}

module.exports = new CenterController();
