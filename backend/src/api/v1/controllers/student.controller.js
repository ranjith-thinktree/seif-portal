const studentService = require('../services/student.service');
const { successResponse, errorResponse } = require('../../../utils/response.util');

/**
 * Student Controller
 * Handles HTTP requests for student management
 * Note: Students are read-only (created from CSV approval)
 */
class StudentController {
  /**
   * Get all students with pagination and filters
   */
  async getAllStudents(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        center_id = '',
        batch_id = '',
        partner_id = '',
        gender = '',
        city = '',
        state = '',
        course_name = '',
        placement_status = '',
        sort_by = 'created_at',
        sort_order = 'desc',
      } = req.query;

      const { role, partner_id: userPartnerId } = req.user;

      const result = await studentService.getAllStudents({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        center_id,
        batch_id,
        partner_id,
        gender,
        city,
        state,
        course_name,
        placement_status,
        sort_by,
        sort_order,
        role,
        user_partner_id: userPartnerId,
      });

      return res.status(200).json({
        success: true,
        message: 'Students retrieved successfully',
        data: {
          data: result.data,
          pagination: result.pagination,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getAllStudents controller:', error);
      return errorResponse(res, 'Failed to retrieve students', 500);
    }
  }

  /**
   * Get student by ID
   */
  async getStudentById(req, res) {
    try {
      const { id } = req.params;
      const { role, partner_id: userPartnerId } = req.user;

      const student = await studentService.getStudentById(id);

      if (!student) {
        return errorResponse(res, 'Student not found', 404);
      }

      // Partners can only view their own students
      if (role === 'PARTNER' && student.partner_id !== userPartnerId) {
        return errorResponse(res, 'Access denied', 403);
      }

      return successResponse(res, student, 'Student retrieved successfully');
    } catch (error) {
      console.error('Error in getStudentById controller:', error);
      return errorResponse(res, 'Failed to retrieve student', 500);
    }
  }

  /**
   * Export students to CSV
   */
  async exportStudents(req, res) {
    try {
      const { search = '', center_id = '', batch_id = '', partner_id = '' } = req.query;

      const { role, partner_id: userPartnerId } = req.user;

      const csv = await studentService.exportStudents({
        search,
        center_id,
        batch_id,
        partner_id,
        role,
        user_partner_id: userPartnerId,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=students_${Date.now()}.csv`);

      return res.status(200).send(csv);
    } catch (error) {
      console.error('Error in exportStudents controller:', error);
      return errorResponse(res, 'Failed to export students', 500);
    }
  }

  /**
   * Get students by batch ID
   */
  async getStudentsByBatch(req, res) {
    try {
      const { batchId } = req.params;
      const { role, partner_id: userPartnerId } = req.user;

      const students = await studentService.getStudentsByBatch(batchId);

      // If partner, check if batch belongs to them
      if (role === 'PARTNER' && students.length > 0) {
        if (students[0].partner_id !== userPartnerId) {
          return errorResponse(res, 'Access denied', 403);
        }
      }

      return successResponse(res, students, 'Students retrieved successfully');
    } catch (error) {
      console.error('Error in getStudentsByBatch controller:', error);
      return errorResponse(res, 'Failed to retrieve students', 500);
    }
  }

  /**
   * Get available filter options for students
   */
  async getFilterOptions(req, res) {
    try {
      const { role, partner_id: userPartnerId } = req.user;
      const { center_id } = req.query;

      const options = await studentService.getFilterOptions({
        role,
        user_partner_id: userPartnerId,
        center_id: center_id || '',
      });

      return successResponse(res, 'Filter options fetched successfully', options);
    } catch (error) {
      console.error('Error in getFilterOptions:', error);
      return errorResponse(res, 'Failed to fetch filter options', 500);
    }
  }
}

module.exports = new StudentController();
