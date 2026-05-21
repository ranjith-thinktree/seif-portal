const trainerModuleService = require('../services/trainer-module.service');
const { successResponse, errorResponse } = require('../../../utils/response.util');

class TrainerModuleController {
  async getModules(req, res) {
    try {
      const { page, limit, search, is_active, sort_by, sort_order } = req.query;
      const result = await trainerModuleService.getModules({
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 10,
        search: search || '',
        is_active,
        sort_by: sort_by || 'module_name',
        sort_order: sort_order || 'asc',
      });

      return res.status(200).json({
        success: true,
        message: 'Trainer modules fetched successfully',
        data: result.data,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getModules:', error);
      return errorResponse(
        res,
        error.message || 'Failed to fetch trainer modules',
        error.statusCode || 500
      );
    }
  }

  async getModuleById(req, res) {
    try {
      const module = await trainerModuleService.getModuleById(req.params.id);

      if (!module) {
        return errorResponse(res, 'Trainer module not found', 404);
      }

      return successResponse(res, 'Trainer module fetched successfully', module);
    } catch (error) {
      console.error('Error in getModuleById:', error);
      return errorResponse(
        res,
        error.message || 'Failed to fetch trainer module',
        error.statusCode || 500
      );
    }
  }

  async createModule(req, res) {
    try {
      const module = await trainerModuleService.createModule(req.body);
      return successResponse(res, 'Trainer module created successfully', module, 201);
    } catch (error) {
      console.error('Error in createModule:', error);
      return errorResponse(
        res,
        error.message || 'Failed to create trainer module',
        error.statusCode || 500
      );
    }
  }

  async updateModule(req, res) {
    try {
      const module = await trainerModuleService.updateModule(req.params.id, req.body);

      if (!module) {
        return errorResponse(res, 'Trainer module not found', 404);
      }

      return successResponse(res, 'Trainer module updated successfully', module);
    } catch (error) {
      console.error('Error in updateModule:', error);
      return errorResponse(
        res,
        error.message || 'Failed to update trainer module',
        error.statusCode || 500
      );
    }
  }

  async deleteModule(req, res) {
    try {
      const result = await trainerModuleService.deleteModule(req.params.id);

      if (!result) {
        return errorResponse(res, 'Trainer module not found', 404);
      }

      return successResponse(res, 'Trainer module deleted successfully', null);
    } catch (error) {
      console.error('Error in deleteModule:', error);
      return errorResponse(
        res,
        error.message || 'Failed to delete trainer module',
        error.statusCode || 500
      );
    }
  }
}

module.exports = new TrainerModuleController();
