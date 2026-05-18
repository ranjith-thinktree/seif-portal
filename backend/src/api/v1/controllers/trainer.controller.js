const trainerService = require('../services/trainer.service');
const { errorResponse } = require('../../../utils/response.util');
const path = require('path');

const toFileUrl = (filePath) => {
  if (!filePath) return null;
  return `/uploads/${path.relative(path.join(__dirname, '../../../../uploads'), filePath).replace(/\\/g, '/')}`;
};

/**
 * Trainer Controller
 * Handles HTTP requests for trainer management
 */
class TrainerController {
  /**
   * Get all trainers
   * @route GET /api/v1/trainers
   * @access Admin, SUPER_ADMIN, PARTNER
   */
  async getAllTrainers(req, res) {
    try {
      const { page, limit, search, partner_id, center_id, status, sort_by, sort_order } = req.query;
      const { role, id: userId, partner_id: userPartnerId } = req.user;

      const result = await trainerService.getAllTrainers({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search: search || '',
        partner_id: partner_id || '',
        center_id: center_id || '',
        status: status || '',
        user_role: role,
        user_partner_id: userPartnerId || '',
        sort_by: sort_by || 'created_at',
        sort_order: sort_order || 'desc',
      });

      return res.status(200).json({
        success: true,
        message: 'Trainers fetched successfully',
        data: result.data,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getAllTrainers:', error);
      return errorResponse(res, 'Failed to fetch trainers', 500);
    }
  }

  /**
   * Get trainer by ID
   * @route GET /api/v1/trainers/:id
   * @access Admin, SUPER_ADMIN, PARTNER
   */
  async getTrainerById(req, res) {
    try {
      const { id } = req.params;
      const { role, partner_id: userPartnerId } = req.user;

      const trainer = await trainerService.getTrainerById(id);

      if (!trainer) {
        return errorResponse(res, 'Trainer not found', 404);
      }

      // Check if PARTNER can view this trainer (must be their trainer)
      if (role === 'PARTNER' && trainer.partner_id !== userPartnerId) {
        return errorResponse(res, 'Unauthorized access', 403);
      }

      return res.status(200).json({
        success: true,
        message: 'Trainer fetched successfully',
        data: trainer,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getTrainerById:', error);
      return errorResponse(res, 'Failed to fetch trainer', 500);
    }
  }

  /**
   * Create new trainer
   * @route POST /api/v1/trainers
   * @access Admin, SUPER_ADMIN, PARTNER
   */
  async createTrainer(req, res) {
    try {
      const files = req.files || {};
      const {
        partner_id,
        center_id,
        trainer_name,
        email,
        mobile_no,
        course_name,
        qualification,
        date_of_joining,
        training_partner,
        training_centre_name,
      } = req.body;
      const { role, partner_id: userPartnerId } = req.user;

      const documents = {
        resume: files.resume?.[0]
          ? {
              fileUrl: toFileUrl(files.resume[0].path),
              fileName: files.resume[0].originalname,
            }
          : null,
        qualificationCertificate: files.qualificationCertificate?.[0]
          ? {
              fileUrl: toFileUrl(files.qualificationCertificate[0].path),
              fileName: files.qualificationCertificate[0].originalname,
            }
          : null,
        idProof: files.idProof?.[0]
          ? {
              fileUrl: toFileUrl(files.idProof[0].path),
              fileName: files.idProof[0].originalname,
            }
          : null,
      };

      // For PARTNER role, ensure they can only create trainers for their own partner
      if (role === 'PARTNER' && partner_id !== userPartnerId) {
        return errorResponse(res, 'Unauthorized: Cannot create trainer for different partner', 403);
      }

      const trainerId = await trainerService.createTrainer({
        partner_id,
        center_id,
        trainer_name,
        email,
        mobile_no,
        course_name,
        qualification,
        date_of_joining,
        training_partner,
        training_centre_name,
        documents,
      });

      return res.status(201).json({
        success: true,
        message: 'Trainer created successfully',
        data: { id: trainerId },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in createTrainer:', error);
      return errorResponse(res, 'Failed to create trainer', 500);
    }
  }

  /**
   * Update trainer
   * @route PUT /api/v1/trainers/:id
   * @access Admin, SUPER_ADMIN, PARTNER
   */
  async updateTrainer(req, res) {
    try {
      const { id } = req.params;
      const files = req.files || {};
      const {
        partner_id,
        center_id,
        trainer_name,
        email,
        mobile_no,
        course_name,
        qualification,
        date_of_joining,
        training_partner,
        training_centre_name,
      } = req.body;
      const { role, partner_id: userPartnerId } = req.user;

      const documents = {
        resume: files.resume?.[0]
          ? {
              fileUrl: toFileUrl(files.resume[0].path),
              fileName: files.resume[0].originalname,
            }
          : null,
        qualificationCertificate: files.qualificationCertificate?.[0]
          ? {
              fileUrl: toFileUrl(files.qualificationCertificate[0].path),
              fileName: files.qualificationCertificate[0].originalname,
            }
          : null,
        idProof: files.idProof?.[0]
          ? {
              fileUrl: toFileUrl(files.idProof[0].path),
              fileName: files.idProof[0].originalname,
            }
          : null,
      };

      // Check if trainer exists and get their current partner
      const trainer = await trainerService.getTrainerById(id);
      if (!trainer) {
        return errorResponse(res, 'Trainer not found', 404);
      }

      // For PARTNER role, ensure they can only edit their own trainers
      if (role === 'PARTNER' && trainer.partner_id !== userPartnerId) {
        return errorResponse(res, 'Unauthorized: Cannot edit trainer from different partner', 403);
      }

      // For PARTNER role, prevent them from changing partner/center
      if (role === 'PARTNER') {
        if (partner_id !== trainer.partner_id || center_id !== trainer.center_id) {
          return errorResponse(
            res,
            'Unauthorized: Cannot change partner or center assignment',
            403
          );
        }
      }

      await trainerService.updateTrainer(
        id,
        {
          partner_id,
          center_id,
          trainer_name,
          email,
          mobile_no,
          course_name,
          qualification,
          date_of_joining,
          training_partner,
          training_centre_name,
          documents,
        },
        role
      );

      return res.status(200).json({
        success: true,
        message: 'Trainer updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in updateTrainer:', error);
      return errorResponse(res, 'Failed to update trainer', 500);
    }
  }

  /**
   * Delete trainer
   * @route DELETE /api/v1/trainers/:id
   * @access Admin, SUPER_ADMIN, PARTNER
   */
  async deleteTrainer(req, res) {
    try {
      const { id } = req.params;
      const { role, partner_id: userPartnerId } = req.user;

      // Check if trainer exists
      const trainer = await trainerService.getTrainerById(id);
      if (!trainer) {
        return errorResponse(res, 'Trainer not found', 404);
      }

      // For PARTNER role, ensure they can only delete their own trainers
      if (role === 'PARTNER' && trainer.partner_id !== userPartnerId) {
        return errorResponse(
          res,
          'Unauthorized: Cannot delete trainer from different partner',
          403
        );
      }

      await trainerService.deleteTrainer(id, role);

      const message =
        role === 'PARTNER'
          ? 'Trainer marked as inactive successfully'
          : 'Trainer deleted successfully';

      return res.status(200).json({
        success: true,
        message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in deleteTrainer:', error);
      return errorResponse(res, 'Failed to delete trainer', 500);
    }
  }

  /**
   * Get filter options
   * @route GET /api/v1/trainers/filter-options
   * @access Admin, SUPER_ADMIN, PARTNER
   */
  async getFilterOptions(req, res) {
    try {
      const { role, partner_id: userPartnerId } = req.user;

      const options = await trainerService.getFilterOptions(role, userPartnerId);

      return res.status(200).json({
        success: true,
        message: 'Filter options fetched successfully',
        data: options,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getFilterOptions:', error);
      return errorResponse(res, 'Failed to fetch filter options', 500);
    }
  }
}

module.exports = new TrainerController();
