const express = require('express');
const router = express.Router();
const trainerController = require('../controllers/trainer.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const { validate } = require('../../../middleware/validate.middleware');
const { uploadTotTrainerDocuments } = require('../../../middleware/upload.middleware');
const {
  createTrainerValidator,
  updateTrainerValidator,
  trainerIdValidator,
  listTrainersValidator,
} = require('../validators/trainer.validator');

/**
 * @route   GET /api/v1/trainers
 * @desc    Get all trainers with pagination, filters, and search
 * @access  Private (Admin, SUPER_ADMIN, PARTNER)
 */
router.get(
  '/',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER']),
  listTrainersValidator,
  validate(),
  trainerController.getAllTrainers
);

/**
 * @route   GET /api/v1/trainers/filter-options
 * @desc    Get filter options (partners and centers for dropdowns)
 * @access  Private (Admin, SUPER_ADMIN, PARTNER)
 */
router.get(
  '/filter-options',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER']),
  trainerController.getFilterOptions
);

/**
 * @route   GET /api/v1/trainers/:id
 * @desc    Get trainer by ID
 * @access  Private (Admin, SUPER_ADMIN, PARTNER)
 */
router.get(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER']),
  trainerIdValidator,
  validate(),
  trainerController.getTrainerById
);

/**
 * @route   POST /api/v1/trainers
 * @desc    Create new trainer
 * @access  Private (Admin, SUPER_ADMIN, PARTNER)
 */
router.post(
  '/',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER']),
  uploadTotTrainerDocuments,
  createTrainerValidator,
  validate(),
  trainerController.createTrainer
);

/**
 * @route   PUT /api/v1/trainers/:id
 * @desc    Update trainer
 * @access  Private (Admin, SUPER_ADMIN, PARTNER)
 */
router.put(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER']),
  uploadTotTrainerDocuments,
  updateTrainerValidator,
  validate(),
  trainerController.updateTrainer
);

/**
 * @route   DELETE /api/v1/trainers/:id
 * @desc    Delete trainer (hard delete for admin, soft delete for partner)
 * @access  Private (Admin, SUPER_ADMIN, PARTNER)
 */
router.delete(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER']),
  trainerIdValidator,
  validate(),
  trainerController.deleteTrainer
);

module.exports = router;
