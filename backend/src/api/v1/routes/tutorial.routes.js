const express = require('express');
const router = express.Router();
const tutorialController = require('../controllers/tutorial.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const { USER_ROLES } = require('../../../constants');

const ADMIN_ROLES = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN];
const ALL_ROLES = Object.values(USER_ROLES);

/**
 * Tutorial Routes
 * Base path: /api/v1/tutorials
 */

// All authenticated users can view tutorials
router.get('/', authenticate, checkRole(ALL_ROLES), tutorialController.getAll);
router.get('/:id', authenticate, checkRole(ALL_ROLES), tutorialController.getOne);

// Admin only: manage tutorials
router.post('/upload-url', authenticate, checkRole(ADMIN_ROLES), tutorialController.getUploadUrl);
router.post('/', authenticate, checkRole(ADMIN_ROLES), tutorialController.create);
router.put('/:id', authenticate, checkRole(ADMIN_ROLES), tutorialController.update);
router.delete('/:id', authenticate, checkRole(ADMIN_ROLES), tutorialController.remove);

module.exports = router;
