const batchService = require('../services/batch.service');
const { successResponse, errorResponse } = require('../../../utils/response.util');
const { sendExportResponse } = require('../../../utils/export.util');

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

      // Handle center_id and partner_id as arrays (multi-select support)
      const centerIdFilter = center_id ? (Array.isArray(center_id) ? center_id : [center_id]) : '';
      const partnerIdFilter = partner_id
        ? Array.isArray(partner_id)
          ? partner_id
          : [partner_id]
        : '';

      const result = await batchService.getAllBatches({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        status,
        center_id: centerIdFilter,
        partner_id: partnerIdFilter,
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

      return successResponse(res, 'Batch retrieved successfully', batch);
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

      return successResponse(res, 'Batch created successfully', batch, 201);
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

      const batch = await batchService.updateBatch(id, batchData);

      return successResponse(res, 'Batch updated successfully', batch);
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

      return successResponse(res, 'Batch deleted successfully', null);
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

      return successResponse(res, 'Batches retrieved successfully', batches);
    } catch (error) {
      console.error('Error in getBatchesByCenter controller:', error);
      return errorResponse(res, 'Failed to retrieve batches', 500);
    }
  }

  /**
   * Get filter options for batches
   */
  async getBatchFilterOptions(req, res) {
    try {
      const { role, partner_id: userPartnerId } = req.user;

      const options = await batchService.getBatchFilterOptions({
        role,
        user_partner_id: userPartnerId,
      });

      return successResponse(res, 'Filter options retrieved successfully', options);
    } catch (error) {
      console.error('Error in getBatchFilterOptions controller:', error);
      return errorResponse(res, 'Failed to retrieve filter options', 500);
    }
  }

  /**
   * Export batches to CSV
   */
  async exportBatches(req, res) {
    try {
      const {
        search = '',
        status = '',
        center_id = '',
        partner_id = '',
        format = 'csv',
      } = req.query;

      const { role, partner_id: userPartnerId } = req.user;

      // Handle center_id and partner_id as arrays (multi-select support)
      const centerIdFilter = center_id ? (Array.isArray(center_id) ? center_id : [center_id]) : '';
      const partnerIdFilter = partner_id
        ? Array.isArray(partner_id)
          ? partner_id
          : [partner_id]
        : '';

      const batches = await batchService.exportBatches({
        search,
        status,
        center_id: centerIdFilter,
        partner_id: partnerIdFilter,
        role,
        user_partner_id: userPartnerId,
      });

      if (!batches || batches.length === 0) {
        return successResponse(res, 'No batches found for export', []);
      }
      return sendExportResponse(res, batches, {
        format,
        baseFileName: 'batches',
        title: 'Batches Report',
        sheetName: 'Batches',
      });
    } catch (error) {
      console.error('Error in exportBatches controller:', error);
      return errorResponse(res, 'Failed to export batches', 500);
    }
  }

  /**
   * Bulk delete batches
   * @route POST /api/v1/batches/bulk-delete
   * @access Admin, SUPER_ADMIN, PARTNER
   */
  async bulkDeleteBatches(req, res) {
    try {
      const { ids } = req.body;
      const { role, partner_id } = req.user;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return errorResponse(res, 'Please provide an array of batch IDs to delete', 400);
      }

      const results = await batchService.bulkDeleteBatches(ids, role, partner_id);

      // Return appropriate status code
      if (results.summary.failed === 0) {
        return successResponse(
          res,
          `Successfully deleted ${results.summary.successful} batch(es)`,
          results
        );
      } else if (results.summary.successful === 0) {
        return errorResponse(res, 'Failed to delete any batches', 400, results);
      } else {
        // Partial success
        return res.status(207).json({
          success: true,
          message: `Deleted ${results.summary.successful} batch(es), ${results.summary.failed} failed`,
          data: results,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error in bulkDeleteBatches:', error);
      return errorResponse(res, error.message || 'Failed to delete batches', 500);
    }
  }
}

module.exports = new BatchController();
