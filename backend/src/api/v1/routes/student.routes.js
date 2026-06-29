const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const {
  studentIdValidator,
  batchIdValidator,
  listStudentsValidator,
} = require('../validators/student.validator');
const { validate } = require('../../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');

/**
 * @route   GET /api/v1/students/filter-options
 * @desc    Get available filter options for students
 * @access  All authenticated users
 */
router.get(
  '/filter-options',
  authenticate,
  checkRole([
    'ADMIN',
    'SUPER_ADMIN',
    'PARTNER',
    'SEIF_READONLY',
    'SEIF_READONLY_DOWNLOAD',
  ]),
  studentController.getFilterOptions
);

/**
 * @route   GET /api/v1/students
 * @desc    Get all students with pagination and filters
 * @access  All authenticated users
 */
router.get(
  '/',
  authenticate,
  checkRole([
    'ADMIN',
    'SUPER_ADMIN',
    'PARTNER',
    'SEIF_READONLY',
    'SEIF_READONLY_DOWNLOAD',
  ]),
  listStudentsValidator,
  validate,
  studentController.getAllStudents
);

/**
 * @route   GET /api/v1/students/export
 * @desc    Export students to CSV
 * @access  ADMIN, SUPER_ADMIN, PARTNER
 */
router.get(
  '/export',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'ESSCI', 'PARTNER', 'SEIF_READONLY_DOWNLOAD']),
  listStudentsValidator,
  validate,
  studentController.exportStudents
);

/**
 * @route   GET /api/v1/students/by-batch/:batchId
 * @desc    Get all students for a specific batch
 * @access  All authenticated users
 */
router.get(
  '/by-batch/:batchId',
  authenticate,
  checkRole([
    'ADMIN',
    'SUPER_ADMIN',
    'PARTNER',
    'SEIF_READONLY',
    'SEIF_READONLY_DOWNLOAD',
  ]),
  batchIdValidator,
  validate,
  studentController.getStudentsByBatch
);

/**
 * @route   GET /api/v1/students/:id
 * @desc    Get student by ID
 * @access  All authenticated users
 */
router.get(
  '/:id',
  authenticate,
  checkRole([
    'ADMIN',
    'SUPER_ADMIN',
    'PARTNER',
    'SEIF_READONLY',
    'SEIF_READONLY_DOWNLOAD',
  ]),
  studentIdValidator,
  validate,
  studentController.getStudentById
);

// Update student
router.put(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  studentController.updateStudent
);

// Delete student
router.delete(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  studentController.deleteStudent
);

/**
 * @route   POST /api/v1/students/bulk-delete
 * @desc    Bulk delete students
 * @access  ADMIN, SUPER_ADMIN, PARTNER
 */
router.post(
  '/bulk-delete',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'PARTNER']),
  studentController.bulkDeleteStudents
);

module.exports = router;
