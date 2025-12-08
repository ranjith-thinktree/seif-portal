const batchService = require('../services/batch.service');
const { successResponse, errorResponse } = require('../../../utils/response.util');

/**
 * Batch Controller
 * Handles HTTP requests for batch management
 */
class BatchController {
  /**
   * Get all batches with pagination and filters
   */
  async getAllBatches(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        status = '',
        center_id = '',
        partner_id = '',
      } = req.query;

      const { role, partner_id: userPartnerId } = req.user;

      const result = await batchService.getAllBatches({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        status,
        center_id,
        partner_id,
        role,
        user_partner_id: userPartnerId,
      });

      return res.status(200).json({
        success: true,
        message: 'Batches retrieved successfully',
        data: {
          data: result.data,
          pagination: result.pagination,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getAllBatches controller:', error);
      return errorResponse(res, 'Failed to retrieve batches', 500);
    }
  }

  /**
   * Get batch by ID
   */
  async getBatchById(req, res) {
    try {
      const { id } = req.params;
      const { role, partner_id: userPartnerId } = req.user;

      const batch = await batchService.getBatchById(id);

      if (!batch) {
        return errorResponse(res, 'Batch not found', 404);
      }

      // Partners can only view their own batches
      if (role === 'PARTNER' && batch.partner_id !== userPartnerId) {
        return errorResponse(res, 'Access denied', 403);
      }

      return successResponse(res, batch, 'Batch retrieved successfully');
    } catch (error) {
      console.error('Error in getBatchById controller:', error);
      return errorResponse(res, 'Failed to retrieve batch', 500);
    }
  }

  /**
   * Create new batch
   */
  async createBatch(req, res) {
    try {
      const { role, partner_id: userPartnerId } = req.user;
      const batchData = req.body;

      // Partners can only create batches for their own centers
      if (role === 'PARTNER') {
        batchData.partner_id = userPartnerId;
      }

      const batch = await batchService.createBatch(batchData);

      return successResponse(res, batch, 'Batch created successfully', 201);
    } catch (error) {
      console.error('Error in createBatch controller:', error);

      if (error.message.includes('Center not found')) {
        return errorResponse(res, error.message, 404);
      }

      if (error.code === 'ER_DUP_ENTRY') {
        return errorResponse(res, 'Batch with this number already exists for this center', 409);
      }

      return errorResponse(res, 'Failed to create batch', 500);
    }
  }

  /**
   * Update batch
   */
  async updateBatch(req, res) {
    try {
      const { id } = req.params;
      const { role, partner_id: userPartnerId } = req.user;
      const updateData = req.body;

      // Check if batch exists and user has permission
      const existingBatch = await batchService.getBatchById(id);

      if (!existingBatch) {
        return errorResponse(res, 'Batch not found', 404);
      }

      // Partners can only update their own batches
      if (role === 'PARTNER' && existingBatch.partner_id !== userPartnerId) {
        return errorResponse(res, 'You can only update your own batches', 403);
      }

      const batch = await batchService.updateBatch(id, updateData);

      return successResponse(res, batch, 'Batch updated successfully');
    } catch (error) {
      console.error('Error in updateBatch controller:', error);

      if (error.message === 'Batch not found') {
        return errorResponse(res, error.message, 404);
      }

      return errorResponse(res, 'Failed to update batch', 500);
    }
  }

  /**
   * Delete batch
   */
  async deleteBatch(req, res) {
    try {
      const { id } = req.params;

      await batchService.deleteBatch(id);

      return successResponse(res, null, 'Batch deleted successfully');
    } catch (error) {
      console.error('Error in deleteBatch controller:', error);

      if (error.message === 'Batch not found') {
        return errorResponse(res, error.message, 404);
      }

      if (error.message.includes('Cannot delete batch')) {
        return errorResponse(res, error.message, 400);
      }

      return errorResponse(res, 'Failed to delete batch', 500);
    }
  }

  /**
   * Get batches by center ID
   */
  async getBatchesByCenter(req, res) {
    try {
      const { centerId } = req.params;
      const { role, partner_id: userPartnerId } = req.user;

      const batches = await batchService.getBatchesByCenter(centerId);

      // If partner, check if center belongs to them
      if (role === 'PARTNER' && batches.length > 0) {
        if (batches[0].partner_id !== userPartnerId) {
          return errorResponse(res, 'Access denied', 403);
        }
      }

      return successResponse(res, batches, 'Batches retrieved successfully');
    } catch (error) {
      console.error('Error in getBatchesByCenter controller:', error);
      return errorResponse(res, 'Failed to retrieve batches', 500);
    }
  }
}

module.exports = new BatchController();
