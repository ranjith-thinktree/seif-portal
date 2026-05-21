const express = require('express');
const router = express.Router();

const trainerModuleController = require('../controllers/trainer-module.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const { validate } = require('../../../middleware/validate.middleware');
const {
  listModulesValidator,
  moduleIdValidator,
  createModuleValidator,
  updateModuleValidator,
} = require('../validators/trainer-module.validator');

router.get(
  '/',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  listModulesValidator,
  validate(),
  trainerModuleController.getModules
);

router.get(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  moduleIdValidator,
  validate(),
  trainerModuleController.getModuleById
);

router.post(
  '/',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  createModuleValidator,
  validate(),
  trainerModuleController.createModule
);

router.put(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  updateModuleValidator,
  validate(),
  trainerModuleController.updateModule
);

router.delete(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  moduleIdValidator,
  validate(),
  trainerModuleController.deleteModule
);

module.exports = router;
