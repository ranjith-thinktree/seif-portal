const reviewService = require('../services/review.service');
const { errorResponse } = require('../../../utils/response.util');

/**
 * Review Controller
 * Handles HTTP requests for upload review and approval
 */
class ReviewController {
  /**
   * Get upload details for review
   * @route GET /api/v1/review/:uploadId
   */
  async getUploadForReview(req, res) {
    try {
      const { uploadId } = req.params;

      const upload = await reviewService.getUploadForReview(uploadId);

      if (!upload) {
        return errorResponse(res, 'Upload not found', 404);
      }

      // Note: We allow reviewing uploads regardless of approval_status
      // because we're doing center-wise review, not upload-wise
      // The upload might be 'approved' at upload level, but individual centers
      // still need to be reviewed

      return res.status(200).json({
        success: true,
        message: 'Upload details retrieved successfully',
        data: upload,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getUploadForReview:', error);
      return errorResponse(res, 'Failed to retrieve upload details', 500);
    }
  }

  /**
   * Get pending centers for an upload
   * @route GET /api/v1/review/:uploadId/centers
   */
  async getPendingCenters(req, res) {
    try {
      const { uploadId } = req.params;
      const { page, limit, search } = req.query;

      const result = await reviewService.getPendingCenters(uploadId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search: search || '',
      });

      return res.status(200).json({
        success: true,
        message: 'Centers retrieved successfully',
        data: {
          data: result.data,
          pagination: result.pagination,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getPendingCenters:', error);
      return errorResponse(res, 'Failed to retrieve centers', 500);
    }
  }

  /**
   * Get students for a center in upload
   * @route GET /api/v1/review/:uploadId/centers/:centerId/students
   */
  async getCenterStudentsForReview(req, res) {
    try {
      const { uploadId, centerId } = req.params;
      const { page, limit, search } = req.query;

      const result = await reviewService.getCenterStudentsForReview(uploadId, centerId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search: search || '',
      });

      if (!result.center) {
        return errorResponse(res, 'Center not found', 404);
      }

      return res.status(200).json({
        success: true,
        message: 'Students retrieved successfully',
        data: {
          students: result.data,
          center: result.center,
          pagination: result.pagination,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getCenterStudentsForReview:', error);
      return errorResponse(res, 'Failed to retrieve students', 500);
    }
  }

  /**
   * Save admin edits to students (during initial review)
   * Saves to uploaded_students + logs in data_edit_logs with admin user ID
   * @route PUT /api/v1/review/:uploadId/centers/:centerId/save-edits
   */
  async saveAdminEdits(req, res) {
    try {
      const { uploadId, centerId } = req.params;
      const { students, changes } = req.body;
      const { id: adminUserId } = req.user;

      if (!students || !Array.isArray(students)) {
        return errorResponse(res, 'Students array is required', 400);
      }

      if (!changes || !Array.isArray(changes)) {
        return errorResponse(res, 'Changes array is required', 400);
      }

      const result = await reviewService.saveAdminEdits(
        uploadId,
        centerId,
        students,
        changes,
        adminUserId
      );

      return res.status(200).json({
        success: true,
        message: 'Admin edits saved successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in saveAdminEdits:', error);
      return errorResponse(res, error.message || 'Failed to save admin edits', 500);
    }
  }

  /**
   * Approve a center
   * @route POST /api/v1/review/:uploadId/centers/:centerId/approve
   */
  async approveCenter(req, res) {
    try {
      const { uploadId, centerId } = req.params;
      const { id: userId } = req.user;

      const result = await reviewService.approveCenter(uploadId, centerId, userId);

      return res.status(200).json({
        success: true,
        message: result.allReviewed
          ? 'Center approved. All centers reviewed successfully!'
          : 'Center approved successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in approveCenter:', error);
      return errorResponse(res, error.message || 'Failed to approve center', 500);
    }
  }

  /**
   * Reject a center
   * @route POST /api/v1/review/:uploadId/centers/:centerId/reject
   */
  async rejectCenter(req, res) {
    try {
      const { uploadId, centerId } = req.params;
      const { id: userId } = req.user;
      const { reason, remarks } = req.body;

      if (!reason || reason.trim().length < 10) {
        return errorResponse(res, 'Rejection reason must be at least 10 characters', 400);
      }

      const result = await reviewService.rejectCenter(
        uploadId,
        centerId,
        userId,
        reason,
        remarks || ''
      );

      return res.status(200).json({
        success: true,
        message: 'Center rejected successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in rejectCenter:', error);
      return errorResponse(res, error.message || 'Failed to reject center', 500);
    }
  }

  /**
   * Get rejected centers for partner
   * @route GET /api/v1/review/:uploadId/rejected
   */
  async getRejectedCenters(req, res) {
    try {
      const { uploadId } = req.params;
      const { partner_id: partnerId } = req.user;

      if (!partnerId) {
        return errorResponse(res, 'Partner ID not found', 400);
      }

      const result = await reviewService.getRejectedCentersForPartner(uploadId, partnerId);

      if (!result) {
        return errorResponse(res, 'Upload not found or unauthorized', 404);
      }

      return res.status(200).json({
        success: true,
        message: 'Rejected centers retrieved successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getRejectedCenters:', error);
      return errorResponse(res, 'Failed to retrieve rejected centers', 500);
    }
  }

  /**
   * Get upload details for partner review/edit
   * @route GET /api/v1/review/:uploadId/partner-review
   */
  async getUploadForPartnerReview(req, res) {
    try {
      const { uploadId } = req.params;
      const { partner_id: partnerId } = req.user;

      if (!partnerId) {
        return errorResponse(res, 'Partner ID not found', 400);
      }

      const result = await reviewService.getUploadForPartnerReview(uploadId, partnerId);

      if (!result) {
        return errorResponse(res, 'Upload not found or unauthorized', 404);
      }

      return res.status(200).json({
        success: true,
        message: 'Upload details retrieved successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getUploadForPartnerReview:', error);
      return errorResponse(res, 'Failed to retrieve upload details', 500);
    }
  }

  /**
   * NEW: Get pending centers for approval (Tab 1)
   * @route GET /api/v1/review/pending-centers
   */
  async getPendingCentersForApproval(req, res) {
    try {
      const { page, limit, search, partner_id } = req.query;

      const result = await reviewService.getPendingCentersForApproval({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search: search || '',
        partner_id: partner_id || '',
      });

      return res.status(200).json({
        success: true,
        message: 'Pending centers retrieved successfully',
        data: result.data,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getPendingCentersForApproval:', error);
      return errorResponse(res, 'Failed to retrieve pending centers', 500);
    }
  }

  /**
   * NEW: Approve center directly (Tab 1)
   * @route POST /api/v1/review/centers/:centerId/approve
   */
  async approveCenterDirect(req, res) {
    try {
      const { centerId } = req.params;
      const { id: userId } = req.user;

      const result = await reviewService.approveCenterDirect(centerId, userId);

      return res.status(200).json({
        success: true,
        message: 'Center approved successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in approveCenterDirect:', error);
      if (error.message.includes('not found') || error.message.includes('already reviewed')) {
        return errorResponse(res, error.message, 404);
      }
      return errorResponse(res, 'Failed to approve center', 500);
    }
  }

  /**
   * NEW: Reject center directly (Tab 1)
   * @route POST /api/v1/review/centers/:centerId/reject
   */
  async rejectCenterDirect(req, res) {
    try {
      const { centerId } = req.params;
      const { id: userId } = req.user;
      const { reason, remarks } = req.body;

      if (!reason) {
        return errorResponse(res, 'Rejection reason is required', 400);
      }

      const result = await reviewService.rejectCenterDirect(centerId, userId, reason, remarks);

      return res.status(200).json({
        success: true,
        message: 'Center rejected successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in rejectCenterDirect:', error);
      if (error.message.includes('not found') || error.message.includes('already reviewed')) {
        return errorResponse(res, error.message, 404);
      }
      return errorResponse(res, 'Failed to reject center', 500);
    }
  }

  /**
   * NEW: Get pending data uploads (Tab 2)
   * @route GET /api/v1/review/pending-uploads
   */
  async getPendingDataUploads(req, res) {
    try {
      const { page, limit, search, partner_id } = req.query;

      const result = await reviewService.getPendingDataUploads({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search: search || '',
        partner_id: partner_id || '',
      });

      return res.status(200).json({
        success: true,
        message: 'Pending data uploads retrieved successfully',
        data: result.data,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getPendingDataUploads:', error);
      return errorResponse(res, 'Failed to retrieve pending uploads', 500);
    }
  }
}

module.exports = new ReviewController();
