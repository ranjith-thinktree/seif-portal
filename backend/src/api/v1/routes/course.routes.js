const express = require('express');
const router = express.Router();

const courseController = require('../controllers/course.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const { validate } = require('../../../middleware/validate.middleware');
const {
  listCoursesValidator,
  courseIdValidator,
  createCourseValidator,
  updateCourseValidator,
} = require('../validators/course.validator');

router.get(
  '/',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  listCoursesValidator,
  validate(),
  courseController.getCourses
);

router.get(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  courseIdValidator,
  validate(),
  courseController.getCourseById
);

router.post(
  '/',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  createCourseValidator,
  validate(),
  courseController.createCourse
);

router.put(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  updateCourseValidator,
  validate(),
  courseController.updateCourse
);

router.delete(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  courseIdValidator,
  validate(),
  courseController.deleteCourse
);

module.exports = router;
