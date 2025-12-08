const partnerService = require('../services/partner.service');
const { successResponse, errorResponse } = require('../../../utils/response.util');
const { Parser } = require('json2csv');

/**
 * Partner Controller
 * Handles HTTP requests for partner management
 */
class PartnerController {
  /**
   * Get all partners
   * @route GET /api/v1/partners
   * @access Admin, SUPER_ADMIN, ESSCI, SEIF_READONLY
   */
  async getAllPartners(req, res) {
    try {
      const { page, limit, search, status, approval_status } = req.query;
      const { role } = req.user;

      const result = await partnerService.getAllPartners({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search: search || '',
        status: status || '',
        approval_status: approval_status || '',
        role,
      });

      return res.status(200).json({
        success: true,
        message: 'Partners fetched successfully',
        data: {
          data: result.data,
          pagination: result.pagination,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getAllPartners:', error);
      return errorResponse(res, 'Failed to fetch partners', 500);
    }
  }

  /**
   * Get partner by ID
   * @route GET /api/v1/partners/:id
   * @access Admin, SUPER_ADMIN, ESSCI, SEIF_READONLY
   */
  async getPartnerById(req, res) {
    try {
      const { id } = req.params;

      const partner = await partnerService.getPartnerById(id);

      if (!partner) {
        return errorResponse(res, 'Partner not found', 404);
      }

      // Check if user has permission to view pending partners
      if (
        partner.approval_status === 'pending' &&
        req.user.role !== 'ADMIN' &&
        req.user.role !== 'SUPER_ADMIN'
      ) {
        return errorResponse(res, 'Partner not found', 404);
      }

      return successResponse(res, 'Partner fetched successfully', partner);
    } catch (error) {
      console.error('Error in getPartnerById:', error);
      return errorResponse(res, 'Failed to fetch partner', 500);
    }
  }

  /**
   * Create new partner
   * @route POST /api/v1/partners
   * @access Admin, SUPER_ADMIN
   */
  async createPartner(req, res) {
    try {
      const partner = await partnerService.createPartner(req.body);

      return successResponse(res, 'Partner created successfully', partner, 201);
    } catch (error) {
      console.error('Error in createPartner:', error);
      if (error.message.includes('Duplicate entry')) {
        return errorResponse(res, 'Partner with this name already exists', 409);
      }
      return errorResponse(res, 'Failed to create partner', 500);
    }
  }

  /**
   * Update partner
   * @route PUT /api/v1/partners/:id
   * @access Admin, SUPER_ADMIN
   */
  async updatePartner(req, res) {
    try {
      const { id } = req.params;

      const partner = await partnerService.updatePartner(id, req.body);

      return successResponse(res, 'Partner updated successfully', partner);
    } catch (error) {
      console.error('Error in updatePartner:', error);
      if (error.message === 'Partner not found') {
        return errorResponse(res, 'Partner not found', 404);
      }
      return errorResponse(res, 'Failed to update partner', 500);
    }
  }

  /**
   * Delete partner
   * @route DELETE /api/v1/partners/:id
   * @access Admin, SUPER_ADMIN
   */
  async deletePartner(req, res) {
    try {
      const { id } = req.params;

      await partnerService.deletePartner(id);

      return successResponse(res, 'Partner deleted successfully', null);
    } catch (error) {
      console.error('Error in deletePartner:', error);
      if (error.message === 'Partner not found') {
        return errorResponse(res, 'Partner not found', 404);
      }
      if (error.message.includes('Cannot delete partner')) {
        return errorResponse(res, error.message, 400);
      }
      return errorResponse(res, 'Failed to delete partner', 500);
    }
  }

  /**
   * Approve partner
   * @route PATCH /api/v1/partners/:id/approve
   * @access Admin, SUPER_ADMIN
   */
  async approvePartner(req, res) {
    try {
      const { id } = req.params;
      const { id: userId } = req.user;

      const partner = await partnerService.approvePartner(id, userId);

      return successResponse(res, 'Partner approved successfully', partner);
    } catch (error) {
      console.error('Error in approvePartner:', error);
      if (error.message === 'Partner not found') {
        return errorResponse(res, 'Partner not found', 404);
      }
      if (error.message === 'Partner is already approved') {
        return errorResponse(res, 'Partner is already approved', 400);
      }
      return errorResponse(res, 'Failed to approve partner', 500);
    }
  }

  /**
   * Reject partner
   * @route PATCH /api/v1/partners/:id/reject
   * @access Admin, SUPER_ADMIN
   */
  async rejectPartner(req, res) {
    try {
      const { id } = req.params;
      const { rejection_reason } = req.body;
      const { id: userId } = req.user;

      const partner = await partnerService.rejectPartner(id, userId, rejection_reason);

      return successResponse(res, 'Partner rejected successfully', partner);
    } catch (error) {
      console.error('Error in rejectPartner:', error);
      if (error.message === 'Partner not found') {
        return errorResponse(res, 'Partner not found', 404);
      }
      return errorResponse(res, 'Failed to reject partner', 500);
    }
  }

  /**
   * Export partners as CSV
   * @route GET /api/v1/partners/export
   * @access Admin, SUPER_ADMIN, ESSCI
   */
  async exportPartners(req, res) {
    try {
      const { status, approval_status, search } = req.query;
      const { role } = req.user;

      const partners = await partnerService.exportPartners({
        role,
        status: status || '',
        approval_status: approval_status || '',
        search: search || '',
      });

      if (partners.length === 0) {
        return errorResponse(res, 'No partners found to export', 404);
      }

      // Convert to CSV
      const parser = new Parser();
      const csv = parser.parse(partners);

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=partners_${Date.now()}.csv`);

      return res.send(csv);
    } catch (error) {
      console.error('Error in exportPartners:', error);
      return errorResponse(res, 'Failed to export partners', 500);
    }
  }

  /**
   * Get rejected uploads for logged-in partner
   * @route GET /api/v1/partners/rejected-uploads
   * @access PARTNER
   */
  async getRejectedUploads(req, res) {
    try {
      const { partner_id: partnerId } = req.user;
      const { page, limit, search } = req.query;

      const result = await partnerService.getRejectedUploads(partnerId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search: search || '',
      });

      return successResponse(res, 'Rejected uploads fetched successfully', result);
    } catch (error) {
      console.error('Error in getRejectedUploads:', error);
      return errorResponse(res, 'Failed to fetch rejected uploads', 500);
    }
  }

  /**
   * Get all centers for a specific upload (for review)
   * @route GET /api/v1/partners/uploads/:uploadId/rejected-centers
   * @access PARTNER
   */
  async getRejectedCenters(req, res) {
    try {
      const { uploadId } = req.params;
      const { partner_id: partnerId } = req.user;

      const result = await partnerService.getRejectedCenters(uploadId, partnerId);

      return successResponse(res, 'Centers fetched successfully', result);
    } catch (error) {
      console.error('Error in getRejectedCenters:', error);
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return errorResponse(res, error.message, 404);
      }
      return errorResponse(res, 'Failed to fetch centers', 500);
    }
  }

  /**
   * Get students for editing (partner only sees rejected centers)
   * @route GET /api/v1/partners/uploads/:uploadId/centers/:centerId/students
   * @access PARTNER
   */
  async getCenterStudentsForEdit(req, res) {
    try {
      const { uploadId, centerId } = req.params;
      const { partner_id: partnerId } = req.user;
      const { page, limit, search } = req.query;

      const result = await partnerService.getCenterStudentsForEdit(uploadId, centerId, partnerId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        search: search || '',
      });

      console.log('📊 Returning students data:', {
        centerName: result.center?.center_name,
        studentsCount: result.students?.length,
        sampleStudent: result.students?.[0],
        pagination: result.pagination,
      });

      return successResponse(res, 'Students fetched successfully', result);
    } catch (error) {
      console.error('Error in getCenterStudentsForEdit:', error);
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return errorResponse(res, error.message, 404);
      }
      return errorResponse(res, 'Failed to fetch students', 500);
    }
  }

  /**
   * Get available batches for a center (for autocomplete)
   * @route GET /api/v1/partners/centers/:centerId/batches
   * @access PARTNER
   */
  async getCenterBatches(req, res) {
    try {
      const { centerId } = req.params;
      const { partner_id: partnerId } = req.user;

      const batches = await partnerService.getCenterBatches(centerId, partnerId);

      return successResponse(res, 'Batches fetched successfully', batches);
    } catch (error) {
      console.error('Error in getCenterBatches:', error);
      return errorResponse(res, 'Failed to fetch batches', 500);
    }
  }

  /**
   * Save student edits temporarily
   * @route POST /api/v1/partners/uploads/:uploadId/centers/:centerId/save-edits
   * @access PARTNER
   */
  async saveStudentEdits(req, res) {
    try {
      const { uploadId, centerId } = req.params;
      const { partner_id: partnerId, id: userId } = req.user;
      const { students } = req.body;

      if (!students || !Array.isArray(students) || students.length === 0) {
        return errorResponse(res, 'Students array is required', 400);
      }

      const result = await partnerService.saveStudentEdits(
        uploadId,
        centerId,
        partnerId,
        students,
        userId
      );

      return successResponse(res, result.message, result);
    } catch (error) {
      console.error('Error in saveStudentEdits:', error);
      if (error.message.includes('Unauthorized')) {
        return errorResponse(res, error.message, 403);
      }
      return errorResponse(res, 'Failed to save edits', 500);
    }
  }

  /**
   * Upload CSV and perform smart merge
   * @route POST /api/v1/partners/uploads/:uploadId/centers/:centerId/upload-csv
   * @access PARTNER
   */
  async uploadCsvSmartMerge(req, res) {
    try {
      const { uploadId, centerId } = req.params;
      const { partner_id: partnerId, id: userId } = req.user;
      const { students } = req.body;

      if (!students || !Array.isArray(students) || students.length === 0) {
        return errorResponse(res, 'Students array is required', 400);
      }

      const result = await partnerService.uploadCsvSmartMerge(
        uploadId,
        centerId,
        partnerId,
        students,
        userId
      );

      return successResponse(res, result.message, result);
    } catch (error) {
      console.error('Error in uploadCsvSmartMerge:', error);
      if (error.message.includes('Unauthorized') || error.message.includes('not found')) {
        return errorResponse(res, error.message, error.message.includes('not found') ? 404 : 403);
      }
      return errorResponse(res, 'Failed to merge CSV data', 500);
    }
  }

  /**
   * Resubmit upload (create Version 2)
   * @route POST /api/v1/partners/uploads/:uploadId/resubmit
   * @access PARTNER
   */
  async resubmitUpload(req, res) {
    try {
      const { uploadId } = req.params;
      const { partner_id: partnerId, id: userId } = req.user;

      const result = await partnerService.resubmitUpload(uploadId, partnerId, userId);

      return successResponse(res, result.message, result, 201);
    } catch (error) {
      console.error('Error in resubmitUpload:', error);
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return errorResponse(res, error.message, 404);
      }
      if (error.message.includes('No changes detected')) {
        return errorResponse(res, error.message, 400);
      }
      return errorResponse(res, 'Failed to resubmit upload', 500);
    }
  }

  /**
   * Get edit logs for highlighting (Admin view)
   * @route GET /api/v1/partners/uploads/:uploadId/changes
   * @access ADMIN, SUPER_ADMIN
   */
  async getUploadChanges(req, res) {
    try {
      const { uploadId } = req.params;

      const changes = await partnerService.getUploadChanges(uploadId);

      return successResponse(res, 'Changes fetched successfully', changes);
    } catch (error) {
      console.error('Error in getUploadChanges:', error);
      return errorResponse(res, 'Failed to fetch changes', 500);
    }
  }
}

module.exports = new PartnerController();
