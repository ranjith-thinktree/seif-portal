const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');
const { convertToUUID } = require('../../../utils/uuid.util');
const {
  parseExcelFile,
  validateHeaders,
  EXPECTED_EMPLOYMENT_COLUMNS,
} = require('../../../utils/excelHandler');

class EmploymentService {
  /**
   * Process employment CSV upload
   * @param {string} partnerId - Partner ID
   * @param {Object} fileData - Uploaded file information
   * @param {string} uploadedBy - User ID
   * @returns {Promise<Object>} Upload result with statistics
   */
  async processEmploymentUpload(partnerId, fileData, uploadedBy) {
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();

      const partnerUuid = convertToUUID(partnerId);
      const userUuid = convertToUUID(uploadedBy);

      // Parse the CSV file
      const { data: employmentRecords, headers } = await parseExcelFile(
        fileData.path,
        'employment'
      );

      // Validate headers
      const headerValidation = validateHeaders(headers, EXPECTED_EMPLOYMENT_COLUMNS, 'employment');
      if (!headerValidation.isValid) {
        throw new Error(`Invalid CSV format: ${headerValidation.errors.join(', ')}`);
      }

      // Create employment_uploads record
      const uploadId = uuidv4();
      await connection.query(
        `INSERT INTO employment_uploads 
        (id, partner_id, file_name, file_url, total_records, records_processed, records_failed, status, uploaded_by, created_at)
        VALUES (?, ?, ?, ?, ?, 0, 0, 'processing', ?, NOW())`,
        [
          uploadId,
          partnerUuid,
          fileData.filename,
          fileData.path,
          employmentRecords.length,
          userUuid,
        ]
      );

      let processedCount = 0;
      let failedCount = 0;
      const errorLog = [];

      // Process each employment record
      for (let index = 0; index < employmentRecords.length; index++) {
        const record = employmentRecords[index];
        const rowNumber = index + 2; // +2 for header row and 1-indexed

        try {
          // Validate required fields
          if (!record.student_id || !record.employment_status) {
            throw new Error(`Missing required fields (Student ID or Employment Status)`);
          }

          // Find student by partner_student_id
          const [students] = await connection.query(
            `SELECT id, student_name FROM students 
            WHERE partner_id = ? AND partner_student_id = ? AND deleted_at IS NULL`,
            [partnerUuid, record.student_id.toString().trim()]
          );

          if (students.length === 0) {
            throw new Error(`Student not found with ID: ${record.student_id}`);
          }

          const student = students[0];
          const employmentId = uuidv4();

          // Insert employment record
          await connection.query(
            `INSERT INTO employment 
            (id, student_id, partner_id, partner_student_id, employment_upload_id,
             employment_status, company_name, location, date_of_joining, designation, 
             salary_per_month, offer_letter_url, payslip_url, 
             is_verified, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
            [
              employmentId,
              student.id,
              partnerUuid,
              record.student_id.toString().trim(),
              uploadId,
              record.employment_status,
              record.company_name || null,
              record.location || null,
              record.date_of_joining || null,
              record.designation || null,
              record.salary_per_month || null,
              record.offer_letter_url || null,
              record.payslip_url || null,
            ]
          );

          // Update student's employment_status
          await connection.query(
            `UPDATE students 
            SET employment_status = ?, updated_at = NOW()
            WHERE id = ?`,
            [record.employment_status, student.id]
          );

          processedCount++;
        } catch (error) {
          failedCount++;
          errorLog.push({
            row: rowNumber,
            student_id: record.student_id || 'N/A',
            error: error.message,
          });
        }
      }

      // Update employment_uploads with final statistics
      const finalStatus = failedCount === employmentRecords.length ? 'failed' : 'completed';
      await connection.query(
        `UPDATE employment_uploads 
        SET records_processed = ?, records_failed = ?, status = ?, error_log = ?, processed_at = NOW()
        WHERE id = ?`,
        [processedCount, failedCount, finalStatus, JSON.stringify(errorLog), uploadId]
      );

      await connection.commit();

      return {
        success: true,
        uploadId,
        totalRecords: employmentRecords.length,
        processedCount,
        failedCount,
        errorLog: failedCount > 0 ? errorLog : null,
        message: `Successfully processed ${processedCount} employment records. ${
          failedCount > 0 ? `${failedCount} records failed.` : ''
        }`,
      };
    } catch (error) {
      await connection.rollback();
      console.error('Error in processEmploymentUpload:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get employment upload history for partner
   * @param {string} partnerId - Partner ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Upload history with pagination
   */
  async getPartnerEmploymentUploads(partnerId, { page = 1, limit = 10 }) {
    try {
      const partnerUuid = convertToUUID(partnerId);
      const offset = (page - 1) * limit;

      // Get total count
      const [countResult] = await db.pool.query(
        'SELECT COUNT(*) as total FROM employment_uploads WHERE partner_id = ?',
        [partnerUuid]
      );
      const total = countResult[0].total;

      // Get paginated uploads
      const [uploads] = await db.pool.query(
        `SELECT 
          eu.*,
          u.full_name as uploaded_by_name
        FROM employment_uploads eu
        LEFT JOIN users u ON eu.uploaded_by = u.id
        WHERE eu.partner_id = ?
        ORDER BY eu.created_at DESC
        LIMIT ? OFFSET ?`,
        [partnerUuid, limit, offset]
      );

      return {
        data: uploads,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getPartnerEmploymentUploads:', error);
      throw error;
    }
  }

  /**
   * Get employment upload details with error log
   * @param {string} uploadId - Employment upload ID
   * @param {string} partnerId - Partner ID (for authorization)
   * @returns {Promise<Object>} Upload details with error log
   */
  async getEmploymentUploadDetails(uploadId, partnerId) {
    try {
      const uploadUuid = convertToUUID(uploadId);
      const partnerUuid = convertToUUID(partnerId);

      const [uploads] = await db.pool.query(
        `SELECT 
          eu.*,
          u.full_name as uploaded_by_name
        FROM employment_uploads eu
        LEFT JOIN users u ON eu.uploaded_by = u.id
        WHERE eu.id = ? AND eu.partner_id = ?`,
        [uploadUuid, partnerUuid]
      );

      if (uploads.length === 0) {
        throw new Error('Employment upload not found or unauthorized');
      }

      const upload = uploads[0];

      // Parse error_log JSON
      if (upload.error_log) {
        try {
          upload.error_log = JSON.parse(upload.error_log);
        } catch (e) {
          upload.error_log = [];
        }
      } else {
        upload.error_log = [];
      }

      return upload;
    } catch (error) {
      console.error('Error in getEmploymentUploadDetails:', error);
      throw error;
    }
  }

  /**
   * Get employment history for a specific student
   * @param {string} studentId - Student ID
   * @param {string} partnerId - Partner ID (for authorization)
   * @returns {Promise<Array>} Employment records
   */
  async getStudentEmploymentHistory(studentId, partnerId) {
    try {
      const studentUuid = convertToUUID(studentId);
      const partnerUuid = convertToUUID(partnerId);

      const [employments] = await db.pool.query(
        `SELECT 
          e.*,
          s.student_name,
          s.partner_student_id,
          u.full_name as verified_by_name
        FROM employment e
        INNER JOIN students s ON e.student_id = s.id
        LEFT JOIN users u ON e.verified_by = u.id
        WHERE e.student_id = ? AND e.partner_id = ?
        ORDER BY e.date_of_joining DESC, e.created_at DESC`,
        [studentUuid, partnerUuid]
      );

      return employments;
    } catch (error) {
      console.error('Error in getStudentEmploymentHistory:', error);
      throw error;
    }
  }

  /**
   * Admin: Get all employment uploads for review
   * @param {Object} options - Pagination and filter options
   * @returns {Promise<Object>} Employment uploads with pagination
   */
  async getAllEmploymentUploads({ page = 1, limit = 10, status = null }) {
    try {
      const offset = (page - 1) * limit;

      let whereClause = '1=1';
      const params = [];

      if (status) {
        whereClause += ' AND eu.status = ?';
        params.push(status);
      }

      // Get total count
      const [countResult] = await db.pool.query(
        `SELECT COUNT(*) as total FROM employment_uploads eu WHERE ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      // Get paginated uploads
      const [uploads] = await db.pool.query(
        `SELECT 
          eu.*,
          p.name as partner_name,
          u.full_name as uploaded_by_name
        FROM employment_uploads eu
        INNER JOIN partners p ON eu.partner_id = p.id
        LEFT JOIN users u ON eu.uploaded_by = u.id
        WHERE ${whereClause}
        ORDER BY eu.created_at DESC
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        data: uploads,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getAllEmploymentUploads:', error);
      throw error;
    }
  }

  /**
   * Admin: Verify an employment record
   * @param {string} employmentId - Employment ID
   * @param {string} verifiedBy - Admin user ID
   * @param {Object} verificationData - Verification details
   * @returns {Promise<Object>} Updated employment record
   */
  async verifyEmployment(employmentId, verifiedBy, verificationData) {
    try {
      const employmentUuid = convertToUUID(employmentId);
      const verifiedByUuid = convertToUUID(verifiedBy);

      await db.pool.query(
        `UPDATE employment 
        SET is_verified = 1, 
            verified_by = ?, 
            verified_at = NOW(),
            verification_notes = ?
        WHERE id = ?`,
        [verifiedByUuid, verificationData.notes || null, employmentUuid]
      );

      // Get updated record
      const [employment] = await db.pool.query('SELECT * FROM employment WHERE id = ?', [
        employmentUuid,
      ]);

      return employment[0];
    } catch (error) {
      console.error('Error in verifyEmployment:', error);
      throw error;
    }
  }

  /**
   * Admin: Get employment statistics
   * @returns {Promise<Object>} Employment statistics
   */
  async getEmploymentStatistics() {
    try {
      const [stats] = await db.pool.query(`
        SELECT 
          COUNT(DISTINCT e.id) as total_employments,
          COUNT(DISTINCT e.student_id) as students_employed,
          COUNT(DISTINCT CASE WHEN e.is_verified = 1 THEN e.id END) as verified_employments,
          COUNT(DISTINCT CASE WHEN e.employment_status = 'Employed' THEN e.id END) as employed,
          COUNT(DISTINCT CASE WHEN e.employment_status = 'Self-Employed' THEN e.id END) as self_employed,
          COUNT(DISTINCT eu.id) as total_uploads,
          SUM(eu.records_processed) as total_processed,
          SUM(eu.records_failed) as total_failed
        FROM employment e
        LEFT JOIN employment_uploads eu ON e.employment_upload_id = eu.id
      `);

      return stats[0];
    } catch (error) {
      console.error('Error in getEmploymentStatistics:', error);
      throw error;
    }
  }
}

module.exports = new EmploymentService();
