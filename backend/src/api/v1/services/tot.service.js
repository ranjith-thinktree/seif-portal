const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');

/**
 * TOT (Trainer of Trainers) Service
 * Handles upload, validation, and approval of trainer records
 */
class TotService {
  /**
   * Validate a single TOT row from CSV
   * @param {Object} rowData - Raw row data
   * @param {number} rowNumber - 1-based row number (for error messages)
   * @returns {{isValid: boolean, errors: string[], cleaned: Object}}
   */
  validateTotRow(rowData, rowNumber) {
    const errors = [];

    const cellError = (column, reason) => `Row ${rowNumber}, Column: ${column} — ${reason}`;

    // Normalize keys (case-insensitive column name matching)
    const get = (key) => {
      const found = Object.entries(rowData).find(
        ([k]) => k.trim().toLowerCase() === key.toLowerCase()
      );
      return found ? String(found[1] || '').trim() : '';
    };

    const trainerName = get('name of the trainer') || get('trainer_name') || get('trainer name');
    const courseName = get('course name') || get('course_name');
    const trainingPartner = get('training partner') || get('training_partner');
    const centreName =
      get('name of training centre') || get('training_centre_name') || get('centre name');
    const qualification = get('qualification');
    const dateOfJoining = get('date of joining') || get('date_of_joining');
    const mobileNo = get('mobile no') || get('mobile_no') || get('mobile');
    const email = get('email');

    if (!trainerName) errors.push(cellError('Name of the Trainer', 'Trainer name is required'));
    if (!courseName) errors.push(cellError('Course name', 'Course name is required'));

    // Mobile number validation (10 digits)
    if (mobileNo && !/^\d{10}$/.test(mobileNo.replace(/\s+/g, ''))) {
      errors.push(cellError('Mobile no', 'Mobile number must be exactly 10 digits'));
    }

    // Email validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(cellError('Email', 'Invalid email address'));
    }

    // Date of joining validation (DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD)
    let parsedDate = null;
    if (dateOfJoining) {
      const ddmmyyyy = dateOfJoining.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      const yyyymmdd = dateOfJoining.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (ddmmyyyy) {
        parsedDate = `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
      } else if (yyyymmdd) {
        parsedDate = dateOfJoining;
      } else {
        errors.push(cellError('Date of Joining', 'Invalid date format. Use DD-MM-YYYY'));
      }
    }

    const cleaned = {
      trainer_name: trainerName,
      course_name: courseName,
      training_partner: trainingPartner || null,
      training_centre_name: centreName || null,
      qualification: qualification || null,
      date_of_joining: parsedDate,
      mobile_no: mobileNo ? mobileNo.replace(/\s+/g, '') : null,
      email: email || null,
    };

    return { isValid: errors.length === 0, errors, cleaned };
  }

  /**
   * Create a TOT upload record and save rows to staging table
   * @param {string} partnerId
   * @param {string} uploadedBy
   * @param {string} fileName
   * @param {string|null} fileUrl
   * @param {Array} rows - Cleaned row objects
   * @returns {Promise<{uploadId, total, processed, failed, errors}>}
   */
  async createUpload(partnerId, uploadedBy, fileName, fileUrl, rows) {
    const uploadId = uuidv4();
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Create upload record
      await connection.query(
        `INSERT INTO tot_uploads
           (id, partner_id, file_name, file_url, total_records, status, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW())`,
        [uploadId, partnerId, fileName, fileUrl, rows.length, uploadedBy]
      );

      let processed = 0;
      let failed = 0;
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowId = uuidv4();

        await connection.query(
          `INSERT INTO uploaded_tots
             (id, data_upload_id, partner_id, training_partner, training_centre_name,
              trainer_name, course_name, qualification, date_of_joining, mobile_no, email, row_number)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            rowId,
            uploadId,
            partnerId,
            row.training_partner,
            row.training_centre_name,
            row.trainer_name,
            row.course_name,
            row.qualification,
            row.date_of_joining,
            row.mobile_no,
            row.email,
            i + 2, // row 1 = header
          ]
        );
        processed++;
      }

      await connection.query(
        `UPDATE tot_uploads SET records_processed = ?, records_failed = ? WHERE id = ?`,
        [processed, failed, uploadId]
      );

      await connection.commit();
      return { uploadId, total: rows.length, processed, failed, errors };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get partner's TOT upload history
   */
  async getPartnerUploads(partnerId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      `SELECT tu.*, u.full_name AS uploaded_by_name, r.full_name AS reviewed_by_name
       FROM tot_uploads tu
       LEFT JOIN users u ON u.id = tu.uploaded_by
       LEFT JOIN users r ON r.id = tu.reviewed_by
       WHERE tu.partner_id = ?
       ORDER BY tu.created_at DESC
       LIMIT ? OFFSET ?`,
      [partnerId, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM tot_uploads WHERE partner_id = ?`,
      [partnerId]
    );
    return {
      uploads: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get all TOT uploads for admin review
   */
  async getAllUploads(page = 1, limit = 10, status = null) {
    const offset = (page - 1) * limit;
    const where = status ? 'WHERE tu.status = ?' : '';
    const params = status ? [status, limit, offset] : [limit, offset];
    const [rows] = await db.query(
      `SELECT tu.*, p.name AS partner_name, u.full_name AS uploaded_by_name, r.full_name AS reviewed_by_name
       FROM tot_uploads tu
       LEFT JOIN partners p ON p.id = tu.partner_id
       LEFT JOIN users u ON u.id = tu.uploaded_by
       LEFT JOIN users r ON r.id = tu.reviewed_by
       ${where}
       ORDER BY tu.created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );
    const countParams = status ? [status] : [];
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM tot_uploads ${status ? 'WHERE status = ?' : ''}`,
      countParams
    );
    return {
      uploads: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get upload details with rows
   */
  async getUploadDetails(uploadId) {
    const [[upload]] = await db.query(
      `SELECT tu.*, p.name AS partner_name, u.full_name AS uploaded_by_name
       FROM tot_uploads tu
       LEFT JOIN partners p ON p.id = tu.partner_id
       LEFT JOIN users u ON u.id = tu.uploaded_by
       WHERE tu.id = ?`,
      [uploadId]
    );
    if (!upload) return null;

    const [rows] = await db.query(
      `SELECT * FROM uploaded_tots WHERE data_upload_id = ? ORDER BY row_number ASC`,
      [uploadId]
    );
    upload.rows = rows;
    return upload;
  }

  /**
   * Approve a TOT upload — moves rows from uploaded_tots to tots
   */
  async approveUpload(uploadId, reviewedBy, remarks) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Verify upload exists and is pending
      const [[upload]] = await connection.query(
        `SELECT * FROM tot_uploads WHERE id = ? AND status = 'pending'`,
        [uploadId]
      );
      if (!upload) throw new Error('Upload not found or already reviewed');

      // Fetch staged rows
      const [rows] = await connection.query(
        `SELECT * FROM uploaded_tots WHERE data_upload_id = ?`,
        [uploadId]
      );

      // Move to tots table
      for (const row of rows) {
        await connection.query(
          `INSERT INTO tots
             (id, tot_upload_id, partner_id, training_partner, training_centre_name,
              trainer_name, course_name, qualification, date_of_joining, mobile_no, email,
              approved_by, approved_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            uuidv4(),
            uploadId,
            upload.partner_id,
            row.training_partner,
            row.training_centre_name,
            row.trainer_name,
            row.course_name,
            row.qualification,
            row.date_of_joining,
            row.mobile_no,
            row.email,
            reviewedBy,
          ]
        );
      }

      // Update upload status
      await connection.query(
        `UPDATE tot_uploads SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), remarks = ? WHERE id = ?`,
        [reviewedBy, remarks || null, uploadId]
      );

      await connection.commit();
      return { approved: rows.length };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Reject a TOT upload
   */
  async rejectUpload(uploadId, reviewedBy, remarks) {
    const [[upload]] = await db.query(
      `SELECT * FROM tot_uploads WHERE id = ? AND status = 'pending'`,
      [uploadId]
    );
    if (!upload) throw new Error('Upload not found or already reviewed');

    await db.query(
      `UPDATE tot_uploads SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), remarks = ? WHERE id = ?`,
      [reviewedBy, remarks || null, uploadId]
    );
  }

  /**
   * Download template as CSV buffer
   */
  getTemplateCSV() {
    const headers = [
      'Training partner',
      'Name of training centre',
      'Name of the Trainer',
      'Course name',
      'Qualification',
      'Date of Joining',
      'Mobile no',
      'Email',
    ];
    const sampleRow = [
      'Sample Partner',
      'Sample Centre',
      'John Doe',
      'Sewing Machine Operator',
      'ITI',
      '01-04-2024',
      '9876543210',
      'john.doe@example.com',
    ];
    return `${headers.join(',')}\n${sampleRow.join(',')}`;
  }
}

module.exports = new TotService();
