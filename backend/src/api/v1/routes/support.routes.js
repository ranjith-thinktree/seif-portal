const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const { USER_ROLES } = require('../../../constants');

const ADMIN_ROLES = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN];
const ALL_ROLES = Object.values(USER_ROLES);

// All authenticated users can view support contacts
router.get('/', authenticate, checkRole(ALL_ROLES), supportController.getAll);

// Admin only: manage support contacts
router.post('/', authenticate, checkRole(ADMIN_ROLES), supportController.create);
router.put('/:id', authenticate, checkRole(ADMIN_ROLES), supportController.update);
router.delete('/:id', authenticate, checkRole(ADMIN_ROLES), supportController.remove);

module.exports = router;
