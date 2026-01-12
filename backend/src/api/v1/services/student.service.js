const db = require('../../../database/connection');
const { convertToUUID } = require('../../../utils/uuid.util');
const { Parser } = require('json2csv');

/**
 * Student Service
 * Handles all business logic for student management
 * Note: Students are created from CSV approval, not manually
 */
class StudentService {
  /**
   * Get all students with pagination and filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Students data with pagination
   */
  async getAllStudents({
    page = 1,
    limit = 10,
    search = '',
    center_id = '',
    batch_id = '',
    partner_id = '',
    role = '',
    user_partner_id = '',
    gender = '',
    city = '',
    state = '',
    course_name = '',
    training_status = '',
    sort_by = 'created_at',
    sort_order = 'desc',
  }) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      if (role === 'PARTNER') {
        whereConditions.push('s.partner_id = ?');
        queryParams.push(user_partner_id);
      }

      // Center filter (supports array for multi-select)
      if (center_id) {
        const centerIds = Array.isArray(center_id) ? center_id : [center_id];
        if (centerIds.length > 0) {
          whereConditions.push(`s.center_id IN (${centerIds.map(() => '?').join(',')})`);
          queryParams.push(...centerIds);
        }
      }

      // Batch filter (supports array for multi-select)
      if (batch_id) {
        const batchIds = Array.isArray(batch_id) ? batch_id : [batch_id];
        if (batchIds.length > 0) {
          whereConditions.push(`s.batch_id IN (${batchIds.map(() => '?').join(',')})`);
          queryParams.push(...batchIds);
        }
      }

      // Partner filter (supports array for multi-select)
      if (partner_id) {
        const partnerIds = Array.isArray(partner_id) ? partner_id : [partner_id];
        if (partnerIds.length > 0) {
          whereConditions.push(`s.partner_id IN (${partnerIds.map(() => '?').join(',')})`);
          queryParams.push(...partnerIds);
        }
      }

      // Gender filter
      if (gender) {
        whereConditions.push('s.gender = ?');
        queryParams.push(gender);
      }

      // City filter
      if (city) {
        whereConditions.push('s.city = ?');
        queryParams.push(city);
      }

      // State filter
      if (state) {
        whereConditions.push('s.state = ?');
        queryParams.push(state);
      }

      // Course name filter
      if (course_name) {
        whereConditions.push('s.course_name = ?');
        queryParams.push(course_name);
      }

      // Training status filter
      if (training_status) {
        whereConditions.push('s.training_status = ?');
        queryParams.push(training_status);
      }

      // Search filter
      if (search) {
        whereConditions.push(
          '(s.student_id LIKE ? OR s.student_name LIKE ? OR s.email LIKE ? OR s.mobile_number LIKE ?)'
        );
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Validate and sanitize sort parameters
      const allowedSortFields = [
        'student_id',
        'student_name',
        'student_name',
        'gender',
        'city',
        'state',
        'course_name',
        'training_status',
        'created_at',
      ];
      const sortField = allowedSortFields.includes(sort_by) ? `s.${sort_by}` : 's.created_at';
      const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // Get total count
      const countResult = await db.query(
        `SELECT COUNT(*) as total 
        FROM students s
        ${whereClause}`,
        queryParams
      );
      const total = countResult[0].total;

      // Get paginated data
      const validLimit = parseInt(limit);
      const validOffset = parseInt(offset);
      const students = await db.query(
        `SELECT 
          s.*,
          b.batch_number,
          c.center_name,
          p.name as partner_name
        FROM students s
        LEFT JOIN batches b ON s.batch_id = b.id
        LEFT JOIN centers c ON s.center_id = c.id
        LEFT JOIN partners p ON s.partner_id = p.id
        ${whereClause}
        ORDER BY ${sortField} ${sortDirection}
        LIMIT ${validLimit} OFFSET ${validOffset}`,
        queryParams
      );

      return {
        data: students,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getAllStudents:', error);
      throw error;
    }
  }

  /**
   * Get student by ID
   * @param {string} id - Student ID
   * @returns {Promise<Object>} Student data
   */
  async getStudentById(id) {
    try {
      const studentId = convertToUUID(id);

      const students = await db.query(
        `SELECT 
          s.*,
          b.batch_number,
          b.batch_start_date,
          b.batch_complete_date,
          c.center_name,
          c.city as center_city,
          c.state as center_state,
          p.name as partner_name
        FROM students s
        LEFT JOIN batches b ON s.batch_id = b.id
        LEFT JOIN centers c ON s.center_id = c.id
        LEFT JOIN partners p ON s.partner_id = p.id
        WHERE s.id = ?`,
        [studentId]
      );

      if (students.length === 0) {
        return null;
      }

      return students[0];
    } catch (error) {
      console.error('Error in getStudentById:', error);
      throw error;
    }
  }

  /**
   * Export students to CSV
   * @param {Object} options - Filter options
   * @returns {Promise<string>} CSV data
   */
  async exportStudents({
    search = '',
    center_id = '',
    batch_id = '',
    partner_id = '',
    role = '',
    user_partner_id = '',
  }) {
    try {
      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      if (role === 'PARTNER') {
        whereConditions.push('s.partner_id = ?');
        queryParams.push(user_partner_id);
      }

      // Center filter (supports array for multi-select)
      if (center_id) {
        const centerIds = Array.isArray(center_id) ? center_id : [center_id];
        if (centerIds.length > 0) {
          whereConditions.push(`s.center_id IN (${centerIds.map(() => '?').join(',')})`);
          queryParams.push(...centerIds);
        }
      }

      // Batch filter (supports array for multi-select)
      if (batch_id) {
        const batchIds = Array.isArray(batch_id) ? batch_id : [batch_id];
        if (batchIds.length > 0) {
          whereConditions.push(`s.batch_id IN (${batchIds.map(() => '?').join(',')})`);
          queryParams.push(...batchIds);
        }
      }

      // Partner filter (supports array for multi-select)
      if (partner_id) {
        const partnerIds = Array.isArray(partner_id) ? partner_id : [partner_id];
        if (partnerIds.length > 0) {
          whereConditions.push(`s.partner_id IN (${partnerIds.map(() => '?').join(',')})`);
          queryParams.push(...partnerIds);
        }
      }

      // Search filter
      if (search) {
        whereConditions.push(
          '(s.enrollment_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR s.email LIKE ? OR s.mobile_number LIKE ?)'
        );
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const students = await db.query(
        `SELECT 
          s.enrollment_id,
          s.first_name,
          s.last_name,
          s.email,
          s.mobile_number,
          s.date_of_birth,
          s.gender,
          s.category,
          s.qualification,
          s.guardian_name,
          s.guardian_number,
          s.address,
          s.city,
          s.state,
          s.pincode,
          s.course_name,
          s.trade_sector,
          s.course_start_date,
          s.course_end_date,
          s.training_duration_months,
          s.assessment_date,
          s.certification_date,
          s.placement_status,
          s.company_name,
          s.job_role,
          s.monthly_salary,
          s.employment_type,
          s.date_of_joining,
          b.batch_number,
          c.center_name,
          p.name as partner_name,
          s.created_at
        FROM students s
        LEFT JOIN batches b ON s.batch_id = b.id
        LEFT JOIN centers c ON s.center_id = c.id
        LEFT JOIN partners p ON s.partner_id = p.id
        ${whereClause}
        ORDER BY s.created_at DESC`,
        queryParams
      );

      // Convert to CSV
      const fields = [
        { label: 'Enrollment ID', value: 'enrollment_id' },
        { label: 'First Name', value: 'first_name' },
        { label: 'Last Name', value: 'last_name' },
        { label: 'Email', value: 'email' },
        { label: 'Mobile Number', value: 'mobile_number' },
        { label: 'Date of Birth', value: 'date_of_birth' },
        { label: 'Gender', value: 'gender' },
        { label: 'Category', value: 'category' },
        { label: 'Qualification', value: 'qualification' },
        { label: 'Guardian Name', value: 'guardian_name' },
        { label: 'Guardian Number', value: 'guardian_number' },
        { label: 'Address', value: 'address' },
        { label: 'City', value: 'city' },
        { label: 'State', value: 'state' },
        { label: 'Pincode', value: 'pincode' },
        { label: 'Course Name', value: 'course_name' },
        { label: 'Trade Sector', value: 'trade_sector' },
        { label: 'Course Start Date', value: 'course_start_date' },
        { label: 'Course End Date', value: 'course_end_date' },
        { label: 'Training Duration (Months)', value: 'training_duration_months' },
        { label: 'Assessment Date', value: 'assessment_date' },
        { label: 'Certification Date', value: 'certification_date' },
        { label: 'Placement Status', value: 'placement_status' },
        { label: 'Company Name', value: 'company_name' },
        { label: 'Job Role', value: 'job_role' },
        { label: 'Monthly Salary', value: 'monthly_salary' },
        { label: 'Employment Type', value: 'employment_type' },
        { label: 'Date of Joining', value: 'date_of_joining' },
        { label: 'Batch Number', value: 'batch_number' },
        { label: 'Center Name', value: 'center_name' },
        { label: 'Partner Name', value: 'partner_name' },
        { label: 'Created At', value: 'created_at' },
      ];

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(students);

      return csv;
    } catch (error) {
      console.error('Error in exportStudents:', error);
      throw error;
    }
  }

  /**
   * Get students by batch ID
   * @param {string} batchId - Batch ID
   * @returns {Promise<Array>} Array of students
   */
  async getStudentsByBatch(batchId) {
    try {
      const batchUuid = convertToUUID(batchId);

      const students = await db.query(
        `SELECT 
          s.*,
          b.batch_number,
          c.center_name,
          p.name as partner_name
        FROM students s
        LEFT JOIN batches b ON s.batch_id = b.id
        LEFT JOIN centers c ON s.center_id = c.id
        LEFT JOIN partners p ON s.partner_id = p.id
        WHERE s.batch_id = ?
        ORDER BY s.first_name, s.last_name`,
        [batchUuid]
      );

      return students;
    } catch (error) {
      console.error('Error in getStudentsByBatch:', error);
      throw error;
    }
  }

  /**
   * Get available filter options for students
   * @param {Object} params - Role, user info, and center_id
   * @returns {Promise<Object>} Filter options
   */
  async getFilterOptions({ role, user_partner_id, center_id }) {
    try {
      let whereCondition = '';
      let queryParams = [];

      // Role-based filtering - same as getAllStudents
      if (role === 'PARTNER') {
        whereCondition = 'WHERE s.partner_id = ?';
        queryParams = [user_partner_id];
      }

      // Additional center filter if provided (for specific center students page)
      if (center_id) {
        if (whereCondition) {
          whereCondition += ' AND s.center_id = ?';
          queryParams.push(center_id);
        } else {
          whereCondition = 'WHERE s.center_id = ?';
          queryParams = [center_id];
        }
      }

      // Get unique values for each filterable field
      // MySQL db.query() returns [rows, fields], so we need to destructure the rows
      const [
        [partners],
        [centers],
        [batches],
        [genders],
        [cities],
        [states],
        [courses],
        [placements],
      ] = await Promise.all([
        // Partners - get ALL partners (not just those with students)
        role !== 'PARTNER'
          ? db.query(
              `SELECT id as value, name as label 
               FROM partners
               ORDER BY name ASC`
            )
          : Promise.resolve([[]]),
        // Centers - get ALL centers (optionally filtered by center_id or partner)
        db.query(
          center_id
            ? `SELECT id as value, center_name as label 
               FROM centers
               WHERE id = ?
               ORDER BY center_name ASC`
            : role === 'PARTNER'
              ? `SELECT id as value, center_name as label 
               FROM centers
               WHERE partner_id = ?
               ORDER BY center_name ASC`
              : `SELECT id as value, center_name as label 
               FROM centers
               ORDER BY center_name ASC`,
          center_id ? [center_id] : role === 'PARTNER' ? [user_partner_id] : []
        ),
        // Batches - get ALL batches (optionally filtered by center or partner)
        db.query(
          center_id
            ? `SELECT id as value, batch_number as label 
               FROM batches
               WHERE center_id = ?
               ORDER BY batch_number ASC`
            : role === 'PARTNER'
              ? `SELECT id as value, batch_number as label 
               FROM batches
               WHERE partner_id = ?
               ORDER BY batch_number ASC`
              : `SELECT id as value, batch_number as label 
               FROM batches
               ORDER BY batch_number ASC`,
          center_id ? [center_id] : role === 'PARTNER' ? [user_partner_id] : []
        ),
        // Genders
        db.query(
          `SELECT DISTINCT gender as value, 
           CONCAT(UPPER(SUBSTRING(gender, 1, 1)), SUBSTRING(gender, 2)) as label 
           FROM students s 
           ${whereCondition}
           ${whereCondition ? 'AND' : 'WHERE'} gender IS NOT NULL AND gender != ''
           ORDER BY gender ASC`,
          queryParams
        ),
        // Cities
        db.query(
          `SELECT DISTINCT city as value, city as label 
           FROM students s 
           ${whereCondition}
           ${whereCondition ? 'AND' : 'WHERE'} city IS NOT NULL AND city != ''
           ORDER BY city ASC`,
          queryParams
        ),
        // States
        db.query(
          `SELECT DISTINCT state as value, state as label 
           FROM students s 
           ${whereCondition}
           ${whereCondition ? 'AND' : 'WHERE'} state IS NOT NULL AND state != ''
           ORDER BY state ASC`,
          queryParams
        ),
        // Courses
        db.query(
          `SELECT DISTINCT course_name as value, course_name as label 
           FROM students s 
           ${whereCondition}
           ${whereCondition ? 'AND' : 'WHERE'} course_name IS NOT NULL AND course_name != ''
           ORDER BY course_name ASC`,
          queryParams
        ),
        // Training Status
        db.query(
          `SELECT DISTINCT s.training_status as value, 
           CONCAT(UPPER(SUBSTRING(s.training_status, 1, 1)), SUBSTRING(s.training_status, 2)) as label 
           FROM students s 
           ${whereCondition}
           ${whereCondition ? 'AND' : 'WHERE'} s.training_status IS NOT NULL AND s.training_status != ''
           ORDER BY s.training_status ASC`,
          queryParams
        ),
      ]);

      return {
        partners: (partners || []).map((p) => ({ value: p.value, label: p.label })),
        centers: (centers || []).map((c) => ({ value: c.value, label: c.label })),
        batches: (batches || []).map((b) => ({ value: b.value, label: b.label })),
        genders: (genders || []).map((g) => ({ value: g.value, label: g.label })),
        cities: (cities || []).map((c) => ({ value: c.value, label: c.label })),
        states: (states || []).map((s) => ({ value: s.value, label: s.label })),
        courses: (courses || []).map((c) => ({ value: c.value, label: c.label })),
        trainings: (placements || []).map((p) => ({
          value: p.value,
          label: p.label,
        })),
      };
    } catch (error) {
      console.error('Error in getFilterOptions:', error);
      throw error;
    }
  }

  /**
   * Bulk delete students with authorization checking
   * @param {Array<string>} ids - Array of student IDs to delete
   * @param {string} role - User role
   * @param {string} userPartnerId - Partner ID of the user (for PARTNER role)
   * @returns {Promise<Object>} Deletion results with success/failure details
   */
  async bulkDeleteStudents(ids, role, userPartnerId = null) {
    try {
      const results = {
        success: [],
        failed: [],
        summary: {
          total: ids.length,
          successful: 0,
          failed: 0,
        },
      };

      // Convert all IDs to UUIDs
      const studentUUIDs = ids.map((id) => convertToUUID(id));

      // Validate all students exist and check authorization
      for (const studentId of studentUUIDs) {
        try {
          // Get student details
          const student = await db.query(
            `SELECT s.id, s.name, s.partner_id, s.center_id, s.batch_id,
                    c.center_name, b.batch_number
             FROM students s
             LEFT JOIN centers c ON s.center_id = c.id
             LEFT JOIN batches b ON s.batch_id = b.id
             WHERE s.id = ?`,
            [studentId]
          );

          if (student.length === 0) {
            results.failed.push({
              id: studentId,
              readable_id: studentId,
              name: 'Unknown',
              reason: 'Student not found',
            });
            continue;
          }

          const studentData = student[0];

          // Authorization check for PARTNER role
          // PARTNER can delete students from ANY batch in their centers
          if (role === 'PARTNER' && studentData.partner_id !== userPartnerId) {
            results.failed.push({
              id: studentId,
              readable_id: studentId,
              name: studentData.name,
              reason: 'Not authorized to delete this student',
            });
            continue;
          }

          // No dependencies to check for students - they are leaf nodes
          // Delete the student
          await db.query('DELETE FROM students WHERE id = ?', [studentId]);

          results.success.push({
            id: studentId,
            readable_id: studentId,
            name: studentData.name,
          });
        } catch (error) {
          results.failed.push({
            id: studentId,
            readable_id: studentId,
            name: 'Unknown',
            reason: error.message,
          });
        }
      }

      results.summary.successful = results.success.length;
      results.summary.failed = results.failed.length;

      return results;
    } catch (error) {
      console.error('Error in bulkDeleteStudents:', error);
      throw error;
    }
  }
}

module.exports = new StudentService();
