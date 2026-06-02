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

const EMPLOYED_STATUSES = new Set(['Employed', 'Self-Employed', 'Entrepreneur']);

class EmploymentService {
  /**
   * Process employment upload from pre-parsed CSV data
   * @param {string} partnerId - Partner ID
   * @param {string} uploadId - Pre-created upload record ID
   * @param {Array}  csvData  - Array of row objects from parsed CSV/Excel file
   * @param {string} fileName - Original file name (for logging)
   * @returns {Promise<{total, processed, failed, error_log}>}
   */
  /**
   * Validate all rows first, then insert into staging — ALL or NOTHING.
   * If any row has an error, returns { hasErrors: true, errors: [...] } without inserting.
   * On success inserts into uploaded_employment staging table.
   */
  async processEmploymentUpload(partnerId, uploadId, csvData, fileName) {
    const connection = await db.getConnection();
    try {
      // ── Phase 1: Validate ALL rows (no DB writes yet) ──────────────────────
      const errors = [];
      const validatedRows = [];

      for (let i = 0; i < csvData.length; i++) {
        const record = csvData[i];
        const row = i + 2; // row 1 = header

        // Find student by partner_id + partner_student_id
        const [students] = await connection.query(
          `SELECT s.id, s.student_name, s.center_id, s.batch_id,
                  c.center_name
           FROM students s
           LEFT JOIN centers c ON s.center_id = c.id
           WHERE s.partner_id = ? AND s.partner_student_id = ?`,
          [partnerId, String(record.student_id).trim()]
        );

        if (students.length === 0) {
          errors.push({
            row,
            student_id: record.student_id || 'N/A',
            error: `Row ${row}: Student ID "${record.student_id}" not found. Ensure it matches exactly what was assigned during student upload.`,
          });
          continue;
        }

        const student = students[0];

        // Validate employment_status
        const rawStatus = (record.employment_status || '').trim();
        const employmentStatus = rawStatus || 'Employed';
        if (rawStatus && !VALID_EMPLOYMENT_STATUSES.includes(employmentStatus)) {
          errors.push({
            row,
            student_id: record.student_id || 'N/A',
            error: `Row ${row}: Invalid Employment Status "${employmentStatus}". Allowed: ${VALID_EMPLOYMENT_STATUSES.join(', ')}`,
          });
          continue;
        }

        const isNA = employmentStatus === 'NA';

        if (!isNA) {
          if (!record.company_name || !String(record.company_name).trim()) {
            errors.push({
              row,
              student_id: record.student_id || 'N/A',
              error: `Row ${row}: Company Name is required when Employment Status is "${employmentStatus}"`,
            });
            continue;
          }

          if (
            record.salary !== undefined &&
            record.salary !== null &&
            String(record.salary).trim() !== ''
          ) {
            const salaryNum = Number(String(record.salary).trim());
            if (isNaN(salaryNum)) {
              errors.push({
                row,
                student_id: record.student_id || 'N/A',
                error: `Row ${row}: Salary must be a number (e.g. 15000), got "${record.salary}"`,
              });
              continue;
            }
          }
        }

        // Parse date
        let mysqlDate = null;
        if (record.employment_date) {
          const trimmed = String(record.employment_date).trim();
          const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          let parsedDate;
          if (dmyMatch) {
            const [, day, month, year] = dmyMatch;
            parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            parsedDate = new Date(trimmed);
          }
          if (isNaN(parsedDate.getTime())) {
            errors.push({
              row,
              student_id: record.student_id || 'N/A',
              error: `Row ${row}: Invalid Employment Date format. Use DD-MM-YYYY (e.g. 15-03-2025)`,
            });
            continue;
          }
          mysqlDate = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
        }

        let salaryValue = null;
        if (
          !isNA &&
          record.salary !== undefined &&
          record.salary !== null &&
          String(record.salary).trim() !== ''
        ) {
          salaryValue = Number(String(record.salary).trim());
        }

        validatedRows.push({
          id: uuidv4(),
          employment_upload_id: uploadId,
          partner_id: partnerId,
          student_id: student.id,
          center_id: student.center_id || null,
          batch_id: student.batch_id || null,
          partner_student_id: String(record.student_id).trim(),
          student_name: student.student_name || null,
          center_name: student.center_name || null,
          row_number: row,
          employment_status: employmentStatus,
          company_name: record.company_name || null,
          company_location: record.company_location || null,
          date_of_joining: mysqlDate,
          designation: record.designation || null,
          salary_per_month: salaryValue,
        });
      }

      // ── Phase 2: If ANY error → reject the whole upload ────────────────────
      if (errors.length > 0) {
        return {
          total: csvData.length,
          processed: 0,
          failed: errors.length,
          error_log: errors,
          hasErrors: true,
        };
      }

      // ── Phase 3: Insert all validated rows into staging ────────────────────
      await connection.beginTransaction();

      for (const r of validatedRows) {
        await connection.query(
          `INSERT INTO uploaded_employment
             (id, employment_upload_id, partner_id, student_id, center_id, batch_id,
              partner_student_id, student_name, center_name, row_number,
              employment_status, company_name, company_location, date_of_joining,
              designation, salary_per_month, approval_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
          [
            r.id,
            r.employment_upload_id,
            r.partner_id,
            r.student_id,
            r.center_id,
            r.batch_id,
            r.partner_student_id,
            r.student_name,
            r.center_name,
            r.row_number,
            r.employment_status,
            r.company_name,
            r.company_location,
            r.date_of_joining,
            r.designation,
            r.salary_per_month,
          ]
        );
      }

      await connection.commit();

      return {
        total: csvData.length,
        processed: validatedRows.length,
        failed: 0,
        error_log: [],
        hasErrors: false,
      };
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
          u.full_name as uploaded_by_name,
          r.full_name as reviewed_by_name
        FROM employment_uploads eu
        LEFT JOIN users u ON eu.uploaded_by = u.id
        LEFT JOIN users r ON eu.reviewed_by = r.id
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
  /**
   * Admin: Get employment uploads pending review
   */
  async getAdminReviewUploads({
    page = 1,
    limit = 10,
    status = null,
    partnerId = null,
    dateFrom = null,
    dateTo = null,
  }) {
    try {
      const offset = (page - 1) * limit;
      const conditions = ['1=1'];
      const params = [];

      if (status) {
        conditions.push('eu.review_status = ?');
        params.push(status);
      } else {
        // Default: show pending_review
        conditions.push("eu.review_status = 'pending_review'");
      }
      if (partnerId) {
        conditions.push('eu.partner_id = ?');
        params.push(partnerId);
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
      const validLimit = parseInt(limit);
      const validOffset = parseInt(offset);

      const [countResult] = await db.pool.query(
        `SELECT COUNT(*) as total FROM employment_uploads eu WHERE ${whereClause}`,
        params
      );

      const [uploads] = await db.pool.query(
        `SELECT eu.*, p.name as partner_name, u.full_name as uploaded_by_name,
                (SELECT COUNT(DISTINCT ue.center_id) FROM uploaded_employment ue WHERE ue.employment_upload_id = eu.id) as center_count,
                (SELECT COUNT(*) FROM uploaded_employment ue WHERE ue.employment_upload_id = eu.id) as record_count
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
          limit: validLimit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / validLimit),
        },
      };
    } catch (error) {
      console.error('Error in getAdminReviewUploads:', error);
      throw error;
    }
  }

  /**
   * Admin: Get center-wise summary for an employment upload
   */
  async getUploadCenterSummary(uploadId) {
    try {
      const [centers] = await db.pool.query(
        `SELECT 
           ue.center_id,
           ue.center_name,
           COUNT(*) as record_count,
           SUM(CASE WHEN ue.employment_status = 'Employed' THEN 1 ELSE 0 END) as employed_count,
           SUM(CASE WHEN ue.employment_status = 'Self-Employed' THEN 1 ELSE 0 END) as self_employed_count,
           SUM(CASE WHEN ue.employment_status = 'NA' THEN 1 ELSE 0 END) as na_count
         FROM uploaded_employment ue
         WHERE ue.employment_upload_id = ?
         GROUP BY ue.center_id, ue.center_name
         ORDER BY ue.center_name ASC`,
        [uploadId]
      );
      return centers;
    } catch (error) {
      console.error('Error in getUploadCenterSummary:', error);
      throw error;
    }
  }

  /**
   * Admin: Get employment records for a specific center within an upload
   */
  async getCenterEmploymentRecords(uploadId, centerId) {
    try {
      const [records] = await db.pool.query(
        `SELECT ue.*
         FROM uploaded_employment ue
         WHERE ue.employment_upload_id = ? AND ue.center_id = ?
         ORDER BY ue.student_name ASC`,
        [uploadId, centerId]
      );
      return records;
    } catch (error) {
      console.error('Error in getCenterEmploymentRecords:', error);
      throw error;
    }
  }

  /**
   * Admin: Approve an employment upload — moves staged records to employment table
   */
  async approveEmploymentUpload(uploadId, adminId, remarks) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Get staged records
      const [staged] = await connection.query(
        `SELECT * FROM uploaded_employment WHERE employment_upload_id = ? AND approval_status = 'pending'`,
        [uploadId]
      );

      if (staged.length === 0) {
        throw new Error('No pending staged records found for this upload');
      }

      // Insert into employment table
      for (const r of staged) {
        const empId = uuidv4();
        await connection.query(
          `INSERT INTO employment (
             id, student_id, partner_id, partner_student_id, employment_upload_id,
             employment_status, company_name, company_location, designation,
             date_of_joining, salary_per_month, is_verified, verified_by, verified_at, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`,
          [
            empId,
            r.student_id,
            r.partner_id,
            r.partner_student_id,
            uploadId,
            r.employment_status,
            r.company_name,
            r.company_location,
            r.designation,
            r.date_of_joining,
            r.salary_per_month,
            adminId,
          ]
        );

        // Update student employment_status
        await connection.query(
          `UPDATE students SET employment_status = 'employed', updated_at = NOW() WHERE id = ?`,
          [r.student_id]
        );
      }

      // Mark staged records as approved
      await connection.query(
        `UPDATE uploaded_employment SET approval_status = 'approved' WHERE employment_upload_id = ?`,
        [uploadId]
      );

      // Update upload record
      await connection.query(
        `UPDATE employment_uploads SET
           status = 'approved', review_status = 'approved',
           reviewed_by = ?, reviewed_at = NOW(), review_remarks = ?,
           records_processed = ?, processed_at = NOW()
         WHERE id = ?`,
        [adminId, remarks || null, staged.length, uploadId]
      );

      await connection.commit();

      // Get upload details for notification
      const [uploadRows] = await db.pool.query(
        `SELECT eu.*, p.name as partner_name, eu.partner_id
         FROM employment_uploads eu
         INNER JOIN partners p ON eu.partner_id = p.id
         WHERE eu.id = ?`,
        [uploadId]
      );
      return uploadRows[0];
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Admin: Reject an employment upload
   */
  async rejectEmploymentUpload(uploadId, adminId, reason, remarks) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE uploaded_employment SET approval_status = 'rejected' WHERE employment_upload_id = ?`,
        [uploadId]
      );

      await connection.query(
        `UPDATE employment_uploads SET
           status = 'rejected', review_status = 'rejected',
           reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ?, review_remarks = ?
         WHERE id = ?`,
        [adminId, reason, remarks || null, uploadId]
      );

      await connection.commit();

      const [uploadRows] = await db.pool.query(
        `SELECT eu.*, p.name as partner_name, eu.partner_id
         FROM employment_uploads eu
         INNER JOIN partners p ON eu.partner_id = p.id
         WHERE eu.id = ?`,
        [uploadId]
      );
      return uploadRows[0];
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Add a single employment record manually (Admin: verified; Partner: unverified)
   */
  async addEmploymentRecord({
    partnerId,
    partnerStudentId,
    employmentStatus,
    companyName,
    companyLocation,
    dateOfJoining,
    designation,
    salaryPerMonth,
    industry,
    addedById,
    isAdmin,
  }) {
    // Validate status
    if (employmentStatus && !VALID_EMPLOYMENT_STATUSES.includes(employmentStatus)) {
      throw new Error(
        `Invalid employment status "${employmentStatus}". Allowed: ${VALID_EMPLOYMENT_STATUSES.join(', ')}`
      );
    }

    // Look up the student
    const [students] = await db.query(
      `SELECT s.id, s.student_name, s.center_id, s.batch_id
       FROM students s WHERE s.partner_id = ? AND s.partner_student_id = ?`,
      [partnerId, String(partnerStudentId).trim()]
    );
    if (students.length === 0) {
      throw new Error(`Student ID "${partnerStudentId}" not found under this partner.`);
    }
    const student = students[0];

    const status = employmentStatus || 'Employed';
    const isNA = status === 'NA';
    if (!isNA && (!companyName || !String(companyName).trim())) {
      throw new Error(`Company Name is required when Employment Status is "${status}".`);
    }

    // Parse date
    let mysqlDate = null;
    if (dateOfJoining) {
      const trimmed = String(dateOfJoining).trim();
      const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      let parsed;
      if (dmyMatch) {
        const [, day, month, year] = dmyMatch;
        parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        parsed = new Date(trimmed);
      }
      if (!isNaN(parsed.getTime())) {
        mysqlDate = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
      }
    }

    const salary = salaryPerMonth ? Number(salaryPerMonth) : null;
    const empId = uuidv4();
    const isVerified = isAdmin ? 1 : 0;
    const verifiedBy = isAdmin ? addedById : null;

    await db.query(
      `INSERT INTO employment (id, student_id, partner_id, partner_student_id,
         employment_status, company_name, company_location, date_of_joining,
         designation, salary_per_month, industry,
         is_verified, verified_by, verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${isAdmin ? 'NOW()' : 'NULL'}, NOW(), NOW())`,
      [
        empId,
        student.id,
        partnerId,
        String(partnerStudentId).trim(),
        status,
        companyName || null,
        companyLocation || null,
        mysqlDate,
        designation || null,
        salary,
        industry || null,
        isVerified,
        verifiedBy,
      ]
    );

    if (isAdmin && status !== 'NA') {
      await db.query(
        `UPDATE students SET employment_status = 'employed', updated_at = NOW() WHERE id = ?`,
        [student.id]
      );
    }

    const [rows] = await db.query(
      `SELECT e.*, s.student_name, s.partner_student_id, c.center_name
       FROM employment e
       INNER JOIN students s ON e.student_id = s.id
       LEFT JOIN centers c ON s.center_id = c.id
       WHERE e.id = ?`,
      [empId]
    );
    return rows[0];
  }

  /**
   * Admin: Get all approved employment records for the Data tab
   */
  async getApprovedEmploymentRecords({
    page = 1,
    limit = 20,
    partnerId = null,
    centerId = null,
    employmentStatus = null,
    dateFrom = null,
    dateTo = null,
    search = null,
  }) {
    try {
      const offset = (page - 1) * limit;
      const conditions = ['e.is_verified = 1'];
      const params = [];

      if (partnerId) {
        conditions.push('e.partner_id = ?');
        params.push(partnerId);
      }
      if (centerId) {
        conditions.push('s.center_id = ?');
        params.push(centerId);
      }
      if (employmentStatus) {
        conditions.push('e.employment_status = ?');
        params.push(employmentStatus);
      }
      if (dateFrom) {
        conditions.push('DATE(e.date_of_joining) >= ?');
        params.push(dateFrom);
      }
      if (dateTo) {
        conditions.push('DATE(e.date_of_joining) <= ?');
        params.push(dateTo);
      }
      if (search) {
        conditions.push('(s.student_name LIKE ? OR e.company_name LIKE ? OR e.designation LIKE ?)');
        const q = `%${search}%`;
        params.push(q, q, q);
      }

      const whereClause = conditions.join(' AND ');
      const validLimit = parseInt(limit);
      const validOffset = parseInt(offset);

      const [countResult] = await db.pool.query(
        `SELECT COUNT(*) as total FROM employment e INNER JOIN students s ON e.student_id = s.id WHERE ${whereClause}`,
        params
      );

      const [records] = await db.pool.query(
        `SELECT e.*, s.student_name, s.partner_student_id, s.center_id,
                c.center_name, p.name as partner_name,
                u.full_name as verified_by_name
         FROM employment e
         INNER JOIN students s ON e.student_id = s.id
         LEFT JOIN centers c ON s.center_id = c.id
         LEFT JOIN partners p ON e.partner_id = p.id
         LEFT JOIN users u ON e.verified_by = u.id
         WHERE ${whereClause}
         ORDER BY e.created_at DESC
         LIMIT ${validLimit} OFFSET ${validOffset}`,
        params
      );

      return {
        data: records,
        pagination: {
          page: parseInt(page),
          limit: validLimit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / validLimit),
        },
      };
    } catch (error) {
      console.error('Error in getApprovedEmploymentRecords:', error);
      throw error;
    }
  }

  async getEmploymentRecordById(id) {
    const employmentId = convertToUUID(id);
    const [rows] = await db.query(
      `SELECT e.*, s.student_name, s.partner_student_id, s.center_id,
              c.center_name, p.name as partner_name,
              u.full_name as verified_by_name
       FROM employment e
       INNER JOIN students s ON e.student_id = s.id
       LEFT JOIN centers c ON s.center_id = c.id
       LEFT JOIN partners p ON e.partner_id = p.id
       LEFT JOIN users u ON e.verified_by = u.id
       WHERE e.id = ?
       LIMIT 1`,
      [employmentId]
    );

    return rows[0] || null;
  }

  async updateEmploymentRecord(id, data) {
    const employmentId = convertToUUID(id);
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [existingRows] = await connection.query(
        'SELECT id, student_id, employment_status FROM employment WHERE id = ?',
        [employmentId]
      );

      if (existingRows.length === 0) {
        throw new Error('Employment record not found');
      }

      const fieldMap = {
        employment_status: 'employment_status',
        company_name: 'company_name',
        company_location: 'company_location',
        designation: 'designation',
        date_of_joining: 'date_of_joining',
        salary_per_month: 'salary_per_month',
      };

      const fields = [];
      const values = [];

      Object.entries(fieldMap).forEach(([inputKey, column]) => {
        if (data[inputKey] !== undefined) {
          if (inputKey === 'employment_status') {
            const normalized = String(data[inputKey]).trim();
            if (!VALID_EMPLOYMENT_STATUSES.includes(normalized)) {
              throw new Error('Invalid employment status');
            }
            fields.push(`${column} = ?`);
            values.push(normalized);
            return;
          }

          fields.push(`${column} = ?`);
          values.push(data[inputKey] === '' ? null : data[inputKey]);
        }
      });

      if (fields.length > 0) {
        values.push(employmentId);
        await connection.query(
          `UPDATE employment SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
          values
        );
      }

      const [currentRows] = await connection.query(
        'SELECT student_id, employment_status FROM employment WHERE id = ?',
        [employmentId]
      );

      if (currentRows.length > 0 && currentRows[0].student_id) {
        const nextStatus = EMPLOYED_STATUSES.has(currentRows[0].employment_status)
          ? 'employed'
          : null;
        await connection.query('UPDATE students SET employment_status = ?, updated_at = NOW() WHERE id = ?', [
          nextStatus,
          currentRows[0].student_id,
        ]);
      }

      await connection.commit();
      return this.getEmploymentRecordById(id);
    } catch (error) {
      await connection.rollback();
      console.error('Error in updateEmploymentRecord:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteEmploymentRecord(id) {
    const employmentId = convertToUUID(id);
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [existingRows] = await connection.query(
        'SELECT id, student_id FROM employment WHERE id = ?',
        [employmentId]
      );

      if (existingRows.length === 0) {
        throw new Error('Employment record not found');
      }

      if (existingRows[0].student_id) {
        await connection.query(
          'UPDATE students SET employment_status = NULL, updated_at = NOW() WHERE id = ?',
          [existingRows[0].student_id]
        );
      }

      await connection.query('DELETE FROM employment WHERE id = ?', [employmentId]);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error('Error in deleteEmploymentRecord:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PARTNER: Edit & Resubmit Rejected Employment Uploads
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Partner: List their rejected employment uploads (for the rejected-uploads page)
   */
  async getPartnerRejectedEmploymentUploads(partnerId, { page = 1, limit = 10, search = '' } = {}) {
    const connection = await db.getConnection();
    try {
      const validPage = Math.max(1, parseInt(page) || 1);
      const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 10));
      const offset = (validPage - 1) * validLimit;

      const baseParams = [partnerId];
      const searchCond = search ? ' AND (eu.file_name LIKE ? OR eu.id LIKE ?)' : '';
      if (search) {
        const p = `%${search}%`;
        baseParams.push(p, p);
      }

      const [[{ total }]] = await connection.query(
        `SELECT COUNT(*) as total FROM employment_uploads eu
         WHERE eu.partner_id = ? AND eu.status = 'rejected' AND eu.deleted_at IS NULL${searchCond}`,
        baseParams
      );

      const [uploads] = await connection.query(
        `SELECT eu.*,
                (SELECT COUNT(*) FROM uploaded_employment ue WHERE ue.employment_upload_id = eu.id) as total_records
         FROM employment_uploads eu
         WHERE eu.partner_id = ? AND eu.status = 'rejected' AND eu.deleted_at IS NULL${searchCond}
         ORDER BY eu.created_at DESC
         LIMIT ? OFFSET ?`,
        [...baseParams, validLimit, offset]
      );

      return {
        data: uploads,
        pagination: {
          page: validPage,
          limit: validLimit,
          total,
          totalPages: Math.ceil(total / validLimit),
        },
      };
    } catch (error) {
      console.error('Error in getPartnerRejectedEmploymentUploads:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Partner: Get center breakdown for a rejected employment upload
   */
  async getPartnerEmploymentUploadCenters(uploadId, partnerId) {
    const connection = await db.getConnection();
    try {
      // Verify ownership
      const [[upload]] = await connection.query(
        `SELECT eu.* FROM employment_uploads eu WHERE eu.id = ? AND eu.partner_id = ? AND eu.deleted_at IS NULL`,
        [uploadId, partnerId]
      );
      if (!upload) throw new Error('Upload not found or unauthorized');
      if (upload.status !== 'rejected') throw new Error('Only rejected uploads can be edited');

      // Group by center
      const [centers] = await connection.query(
        `SELECT
           ue.center_id,
           ue.center_name,
           COUNT(*) as record_count,
           SUM(CASE WHEN ue.employment_status IN ('Employed','Self-Employed','Entrepreneur') THEN 1 ELSE 0 END) as employed_count,
           SUM(CASE WHEN ue.employment_status = 'NA' THEN 1 ELSE 0 END) as na_count,
           SUM(CASE WHEN ue.is_edited = 1 THEN 1 ELSE 0 END) as edited_count
         FROM uploaded_employment ue
         WHERE ue.employment_upload_id = ?
         GROUP BY ue.center_id, ue.center_name
         ORDER BY ue.center_name`,
        [uploadId]
      );

      return { upload, centers };
    } catch (error) {
      console.error('Error in getPartnerEmploymentUploadCenters:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Partner: Get individual employment records in a center for editing
   */
  async getPartnerCenterRecordsForEdit(uploadId, centerId, partnerId) {
    const connection = await db.getConnection();
    try {
      // Verify ownership & status
      const [[upload]] = await connection.query(
        `SELECT eu.* FROM employment_uploads eu WHERE eu.id = ? AND eu.partner_id = ? AND eu.deleted_at IS NULL`,
        [uploadId, partnerId]
      );
      if (!upload) throw new Error('Upload not found or unauthorized');
      if (upload.status !== 'rejected') throw new Error('Only rejected uploads can be edited');

      const [records] = await connection.query(
        `SELECT * FROM uploaded_employment
         WHERE employment_upload_id = ? AND center_id = ?
         ORDER BY row_number`,
        [uploadId, centerId]
      );

      // Get the center name from first record
      const centerName = records[0]?.center_name || null;

      return { upload, centerName, records };
    } catch (error) {
      console.error('Error in getPartnerCenterRecordsForEdit:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Partner: Save edited employment records back to uploaded_employment staging
   */
  async savePartnerEmploymentEdits(uploadId, centerId, partnerId, records) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Verify
      const [[upload]] = await connection.query(
        `SELECT eu.* FROM employment_uploads eu WHERE eu.id = ? AND eu.partner_id = ? AND eu.deleted_at IS NULL`,
        [uploadId, partnerId]
      );
      if (!upload) throw new Error('Upload not found or unauthorized');
      if (upload.status !== 'rejected') throw new Error('Only rejected uploads can be edited');

      const EDITABLE_FIELDS = [
        'employment_status',
        'company_name',
        'company_location',
        'designation',
        'date_of_joining',
        'salary_per_month',
      ];

      let updatedCount = 0;
      for (const rec of records) {
        const updates = {};
        for (const field of EDITABLE_FIELDS) {
          if (rec[field] !== undefined) updates[field] = rec[field] !== '' ? rec[field] : null;
        }
        if (Object.keys(updates).length === 0) continue;

        const setClause = Object.keys(updates)
          .map((k) => `${k} = ?`)
          .join(', ');
        const values = [...Object.values(updates), 1, uploadId, rec.id];

        await connection.query(
          `UPDATE uploaded_employment SET ${setClause}, is_edited = ? WHERE employment_upload_id = ? AND id = ?`,
          values
        );
        updatedCount++;
      }

      await connection.commit();
      return { updated: updatedCount };
    } catch (error) {
      await connection.rollback();
      console.error('Error in savePartnerEmploymentEdits:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Admin: Save edited employment records in uploaded_employment staging (pending_review uploads)
   */
  async saveAdminEmploymentEdits(uploadId, centerId, records) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [[upload]] = await connection.query(
        `SELECT id, status, review_status FROM employment_uploads WHERE id = ? AND deleted_at IS NULL`,
        [uploadId]
      );
      if (!upload) throw new Error('Upload not found');
      if (!['pending_review', 'rejected'].includes(upload.review_status || upload.status)) {
        throw new Error('Only pending or rejected uploads can be edited');
      }

      const EDITABLE_FIELDS = [
        'employment_status',
        'company_name',
        'company_location',
        'designation',
        'date_of_joining',
        'salary_per_month',
      ];

      let updatedCount = 0;
      for (const rec of records) {
        const updates = {};
        for (const field of EDITABLE_FIELDS) {
          if (rec[field] !== undefined) updates[field] = rec[field] !== '' ? rec[field] : null;
        }
        if (Object.keys(updates).length === 0) continue;

        const setClause = Object.keys(updates)
          .map((k) => `${k} = ?`)
          .join(', ');
        const values = [...Object.values(updates), 1, uploadId, rec.id];

        await connection.query(
          `UPDATE uploaded_employment SET ${setClause}, is_edited = ? WHERE employment_upload_id = ? AND id = ?`,
          values
        );
        updatedCount++;
      }

      await connection.commit();
      return { updated: updatedCount };
    } catch (error) {
      await connection.rollback();
      console.error('Error in saveAdminEmploymentEdits:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Partner: Resubmit a rejected employment upload — creates v2 with copied records
   */
  async resubmitEmploymentUpload(uploadId, partnerId, userId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [[original]] = await connection.query(
        `SELECT * FROM employment_uploads WHERE id = ? AND partner_id = ?`,
        [uploadId, partnerId]
      );
      if (!original) throw new Error('Upload not found or unauthorized');
      if (original.status !== 'rejected')
        throw new Error('Only rejected uploads can be resubmitted');

      const newVersion = (original.version || 1) + 1;
      const newUploadId = uuidv4();

      // Create new upload record
      await connection.query(
        `INSERT INTO employment_uploads
           (id, partner_id, file_name, file_url, total_records, status, version, parent_upload_id, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending_review', ?, ?, ?, NOW())`,
        [
          newUploadId,
          partnerId,
          original.file_name,
          original.file_url,
          original.total_records,
          newVersion,
          uploadId,
          userId,
        ]
      );

      // Copy staged records, reset approval_status to pending
      await connection.query(
        `INSERT INTO uploaded_employment
           (id, employment_upload_id, partner_id, student_id, center_id, batch_id,
            partner_student_id, student_name, center_name, row_number,
            employment_status, company_name, company_location, date_of_joining,
            designation, salary_per_month, approval_status, is_edited)
         SELECT UUID(), ?, partner_id, student_id, center_id, batch_id,
            partner_student_id, student_name, center_name, row_number,
            employment_status, company_name, company_location, date_of_joining,
            designation, salary_per_month, 'pending', is_edited
         FROM uploaded_employment WHERE employment_upload_id = ?`,
        [newUploadId, uploadId]
      );

      // Soft-delete the old upload
      await connection.query(`UPDATE employment_uploads SET deleted_at = NOW() WHERE id = ?`, [
        uploadId,
      ]);

      await connection.commit();

      // Return details for notification
      const [[newUpload]] = await db.pool.query(
        `SELECT eu.*, p.name as partner_name FROM employment_uploads eu
         INNER JOIN partners p ON eu.partner_id = p.id
         WHERE eu.id = ?`,
        [newUploadId]
      );
      return { newUploadId, version: newVersion, upload: newUpload };
    } catch (error) {
      await connection.rollback();
      console.error('Error in resubmitEmploymentUpload:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new EmploymentService();
