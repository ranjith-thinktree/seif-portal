const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');
const { convertToUUID } = require('../../../utils/uuid.util');

// Point 14: "Unemployed" removed — use "NA" instead
const VALID_EMPLOYMENT_STATUSES = [
  'Employed',
  'Self-Employed',
  'Entrepreneur',
  'Higher Study',
  'Further Education',
  'NA',
];

class EmploymentService {
  /**
   * Process employment upload from pre-parsed CSV data
   * @param {string} partnerId - Partner ID
   * @param {string} uploadId - Pre-created upload record ID
   * @param {Array}  csvData  - Array of row objects from parsed CSV/Excel file
   * @param {string} fileName - Original file name (for logging)
   * @returns {Promise<{total, processed, failed, error_log}>}
   */
  async processEmploymentUpload(partnerId, uploadId, csvData, fileName) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      let processed = 0;
      let failed = 0;
      const error_log = [];

      for (let i = 0; i < csvData.length; i++) {
        const record = csvData[i];
        const row = i + 2; // row 1 = header, row 2 = first data row

        // Find student by partner_id + partner_student_id
        const [students] = await connection.query(
          `SELECT id FROM students WHERE partner_id = ? AND partner_student_id = ?`,
          [partnerId, String(record.student_id).trim()]
        );

        if (students.length === 0) {
          failed++;
          error_log.push({
            row,
            student_id: record.student_id || 'N/A',
            error: `Row ${row}, Column: Student ID — no approved student found with ID "${record.student_id}". Check that the Student ID matches exactly what was assigned during the student upload.`,
          });
          continue;
        }

        const student = students[0];

        // Point 14: Validate employment_status against allowed list
        const rawStatus = (record.employment_status || '').trim();
        const employmentStatus = rawStatus || 'Employed';
        if (rawStatus && !VALID_EMPLOYMENT_STATUSES.includes(employmentStatus)) {
          failed++;
          error_log.push({
            row,
            student_id: record.student_id || 'N/A',
            error: `Row ${row}, Column: Employment Status — invalid value "${employmentStatus}". Allowed: ${VALID_EMPLOYMENT_STATUSES.join(', ')}`,
          });
          continue;
        }

        const isNA = employmentStatus === 'NA';

        // Point 15: Skip company/salary validation when status is NA
        if (!isNA) {
          // Validate required fields (graceful per-row failure — after student lookup)
          if (!record.company_name) {
            failed++;
            error_log.push({
              row,
              student_id: record.student_id || 'N/A',
              error: `Row ${row}, Column: Company Name — this field is required when status is ${employmentStatus}`,
            });
            continue;
          }

          // Point 13: Validate salary is numeric if provided
          if (
            record.salary !== undefined &&
            record.salary !== null &&
            String(record.salary).trim() !== ''
          ) {
            const salaryNum = Number(String(record.salary).trim());
            if (isNaN(salaryNum)) {
              failed++;
              error_log.push({
                row,
                student_id: record.student_id || 'N/A',
                error: `Row ${row}, Column: Salary — must be a number (e.g. 15000)`,
              });
              continue;
            }
          }
        }

        // Validate and parse date — supports DD-MM-YYYY (template), DD/MM/YYYY, and YYYY-MM-DD
        let parsedDate = null;
        if (record.employment_date) {
          const trimmed = String(record.employment_date).trim();
          // Match DD-MM-YYYY or DD/MM/YYYY (template format)
          const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (dmyMatch) {
            const [, day, month, year] = dmyMatch;
            parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            // Fall back to native parsing (handles ISO YYYY-MM-DD, etc.)
            parsedDate = new Date(trimmed);
          }
          if (isNaN(parsedDate.getTime())) {
            failed++;
            error_log.push({
              row,
              student_id: record.student_id || 'N/A',
              error: `Row ${row}, Column: Employment Date — invalid format. Use DD-MM-YYYY (e.g. 15-03-2025)`,
            });
            continue;
          }
        }

        // Convert to MySQL DATE format YYYY-MM-DD
        const mysqlDate = parsedDate
          ? `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`
          : null;

        // Point 13: Parse salary to a number when present, otherwise null
        let salaryValue = null;
        if (
          !isNA &&
          record.salary !== undefined &&
          record.salary !== null &&
          String(record.salary).trim() !== ''
        ) {
          salaryValue = Number(String(record.salary).trim());
        }

        const employmentId = uuidv4();

        // Insert employment record — DB errors propagate up to outer catch → rollback
        await connection.query(
          `INSERT INTO employment (
             id, student_id, partner_id, partner_student_id, employment_upload_id,
             employment_status, company_name, company_location, designation,
             date_of_joining, salary_per_month, is_verified, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
          [
            employmentId,
            student.id,
            partnerId,
            String(record.student_id).trim(),
            uploadId,
            employmentStatus,
            isNA ? record.company_name || null : record.company_name,
            record.company_location || null,
            record.designation || null,
            mysqlDate,
            salaryValue,
          ]
        );

        // Update student employment_status to 'employed'
        await connection.query(
          `UPDATE students SET employment_status = 'employed', updated_at = NOW() WHERE id = ?`,
          [student.id]
        );

        processed++;
      }

      await connection.commit();

      return { total: csvData.length, processed, failed, error_log };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Generate an Excel template for employment uploads
   * @returns {Promise<Buffer>} Excel file buffer
   */
  async generateTemplate() {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employment Data');

    worksheet.columns = [
      { header: 'Student ID', key: 'student_id', width: 20 },
      { header: 'Company Name', key: 'company_name', width: 30 },
      { header: 'Designation', key: 'designation', width: 25 },
      { header: 'Employment Date (YYYY-MM-DD)', key: 'employment_date', width: 25 },
      { header: 'Salary (Monthly)', key: 'salary', width: 20 },
    ];

    worksheet.addRow({
      student_id: 'EXAMPLE_001',
      company_name: 'Example Corporation',
      designation: 'Software Developer',
      employment_date: '2024-01-15',
      salary: 50000,
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Get employment upload history for partner
   * @param {string} partnerId - Partner ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Upload history with pagination
   */
  async getPartnerEmploymentUploads(
    partnerId,
    { page = 1, limit = 10, status = null, dateFrom = null, dateTo = null }
  ) {
    try {
      const partnerUuid = convertToUUID(partnerId);
      const offset = (page - 1) * limit;

      const conditions = ['eu.partner_id = ?'];
      const params = [partnerUuid];

      if (status) {
        conditions.push('eu.status = ?');
        params.push(status);
      }
      if (dateFrom) {
        conditions.push('DATE(eu.created_at) >= ?');
        params.push(dateFrom);
      }
      if (dateTo) {
        conditions.push('DATE(eu.created_at) <= ?');
        params.push(dateTo);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const [countResult] = await db.pool.query(
        `SELECT COUNT(*) as total FROM employment_uploads eu WHERE ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      // Get paginated uploads
      const validLimit = parseInt(limit);
      const validOffset = parseInt(offset);
      const [uploads] = await db.pool.query(
        `SELECT 
          eu.*,
          u.full_name as uploaded_by_name
        FROM employment_uploads eu
        LEFT JOIN users u ON eu.uploaded_by = u.id
        WHERE ${whereClause}
        ORDER BY eu.created_at DESC
        LIMIT ${validLimit} OFFSET ${validOffset}`,
        params
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
  async getAllEmploymentUploads({
    page = 1,
    limit = 10,
    status = null,
    dateFrom = null,
    dateTo = null,
    partnerId = null,
  }) {
    try {
      const offset = (page - 1) * limit;

      const conditions = ['1=1'];
      const params = [];

      if (status) {
        conditions.push('eu.status = ?');
        params.push(status);
      }
      if (dateFrom) {
        conditions.push('DATE(eu.created_at) >= ?');
        params.push(dateFrom);
      }
      if (dateTo) {
        conditions.push('DATE(eu.created_at) <= ?');
        params.push(dateTo);
      }
      if (partnerId) {
        conditions.push('eu.partner_id = ?');
        params.push(partnerId);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const [countResult] = await db.pool.query(
        `SELECT COUNT(*) as total FROM employment_uploads eu WHERE ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      // Get paginated uploads
      const validLimit = parseInt(limit);
      const validOffset = parseInt(offset);
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
        LIMIT ${validLimit} OFFSET ${validOffset}`,
        params
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
