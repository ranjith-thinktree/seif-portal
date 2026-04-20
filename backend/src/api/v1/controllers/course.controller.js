const courseService = require('../services/course.service');
const { successResponse, errorResponse } = require('../../../utils/response.util');

class CourseController {
  async getCourses(req, res) {
    try {
      const { page, limit, search, is_active, sort_by, sort_order } = req.query;
      const result = await courseService.getCourses({
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 10,
        search: search || '',
        is_active,
        sort_by: sort_by || 'course_name',
        sort_order: sort_order || 'asc',
      });

      return res.status(200).json({
        success: true,
        message: 'Courses fetched successfully',
        data: result.data,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getCourses:', error);
      return errorResponse(
        res,
        error.message || 'Failed to fetch courses',
        error.statusCode || 500
      );
    }
  }

  async getCourseById(req, res) {
    try {
      const course = await courseService.getCourseById(req.params.id);

      if (!course) {
        return errorResponse(res, 'Course not found', 404);
      }

      return successResponse(res, 'Course fetched successfully', course);
    } catch (error) {
      console.error('Error in getCourseById:', error);
      return errorResponse(res, error.message || 'Failed to fetch course', error.statusCode || 500);
    }
  }

  async createCourse(req, res) {
    try {
      const course = await courseService.createCourse(req.body);
      return successResponse(res, 'Course created successfully', course, 201);
    } catch (error) {
      console.error('Error in createCourse:', error);
      return errorResponse(
        res,
        error.message || 'Failed to create course',
        error.statusCode || 500
      );
    }
  }

  async updateCourse(req, res) {
    try {
      const course = await courseService.updateCourse(req.params.id, req.body);

      if (!course) {
        return errorResponse(res, 'Course not found', 404);
      }

      return successResponse(res, 'Course updated successfully', course);
    } catch (error) {
      console.error('Error in updateCourse:', error);
      return errorResponse(
        res,
        error.message || 'Failed to update course',
        error.statusCode || 500
      );
    }
  }
}

module.exports = new CourseController();
