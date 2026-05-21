const studentService = require('../services/student.service');
const { successResponse, errorResponse } = require('../../../utils/response.util');
const { sendExportResponse } = require('../../../utils/export.util');

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
        batch_year = '',
        sort_by = 'created_at',
        sort_order = 'desc',
      } = req.query;

      const { role, partner_id: userPartnerId } = req.user;

      // Handle center_id, batch_id, and partner_id as arrays (multi-select support)
      const centerIdFilter = center_id ? (Array.isArray(center_id) ? center_id : [center_id]) : '';
      const batchIdFilter = batch_id ? (Array.isArray(batch_id) ? batch_id : [batch_id]) : '';
      const partnerIdFilter = partner_id
        ? Array.isArray(partner_id)
          ? partner_id
          : [partner_id]
        : '';

      const result = await studentService.getAllStudents({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        center_id: centerIdFilter,
        batch_id: batchIdFilter,
        partner_id: partnerIdFilter,
        gender,
        city,
        state,
        course_name,
        batch_year,
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

      return successResponse(res, 'Student retrieved successfully', student);
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
      const {
        search = '',
        center_id = '',
        batch_id = '',
        partner_id = '',
        format = 'csv',
        batch_year = '',
      } = req.query;

      const { role, partner_id: userPartnerId } = req.user;

      // Handle center_id, batch_id, and partner_id as arrays (multi-select support)
      const centerIdFilter = center_id ? (Array.isArray(center_id) ? center_id : [center_id]) : '';
      const batchIdFilter = batch_id ? (Array.isArray(batch_id) ? batch_id : [batch_id]) : '';
      const partnerIdFilter = partner_id
        ? Array.isArray(partner_id)
          ? partner_id
          : [partner_id]
        : '';

      const students = await studentService.exportStudents({
        search,
        center_id: centerIdFilter,
        batch_id: batchIdFilter,
        partner_id: partnerIdFilter,
        batch_year,
        role,
        user_partner_id: userPartnerId,
      });

      if (!students || students.length === 0) {
        return successResponse(res, 'No students found for export', []);
      }

      return sendExportResponse(res, students, {
        format,
        baseFileName: batch_year ? `students_${batch_year}` : 'students',
        title: 'Students Report',
        sheetName: 'Students',
      });
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

      return successResponse(res, 'Students retrieved successfully', students);
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

  /**
   * Bulk delete students
   * @route POST /api/v1/students/bulk-delete
   * @access Admin, SUPER_ADMIN, PARTNER
   */
  async bulkDeleteStudents(req, res) {
    try {
      const { ids } = req.body;
      const { role, partner_id } = req.user;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return errorResponse(res, 'Please provide an array of student IDs to delete', 400);
      }

      const results = await studentService.bulkDeleteStudents(ids, role, partner_id);

      // Return appropriate status code
      if (results.summary.failed === 0) {
        return successResponse(
          res,
          `Successfully deleted ${results.summary.successful} student(s)`,
          results
        );
      } else if (results.summary.successful === 0) {
        return errorResponse(res, 'Failed to delete any students', 400, results);
      } else {
        // Partial success
        return res.status(207).json({
          success: true,
          message: `Deleted ${results.summary.successful} student(s), ${results.summary.failed} failed`,
          data: results,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error in bulkDeleteStudents:', error);
      return errorResponse(res, error.message || 'Failed to delete students', 500);
    }
  }
}

module.exports = new StudentController();
