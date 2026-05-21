const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');

/**
 * TOT (Trainer of Trainers) Service
 * Handles upload, validation, and approval of trainer records
 */
class TotService {
  async tableExists(tableName) {
    const [rows] = await db.query(
      `SELECT 1 AS present
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       LIMIT 1`,
      [tableName]
    );

    return rows.length > 0;
  }

  async columnExists(tableName, columnName) {
    const [rows] = await db.query(
      `SELECT 1 AS present
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?
       LIMIT 1`,
      [tableName, columnName]
    );

    return rows.length > 0;
  }

  parseDateOfJoining(value) {
    if (!value) return null;

    const normalized = String(value).trim();
    if (!normalized) return null;

    const ddmmyyyy = normalized.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    const yyyymmdd = normalized.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);

    if (ddmmyyyy) {
      return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
    }

    if (yyyymmdd) {
      return `${yyyymmdd[1]}-${yyyymmdd[2].padStart(2, '0')}-${yyyymmdd[3].padStart(2, '0')}`;
    }

    return null;
  }

  getTrainerListFilters({
    search = '',
    partner_id = '',
    training_centre_name = '',
    course_name = '',
    document_status = '',
    role = '',
    user_partner_id = '',
  }) {
    const whereConditions = [];
    const queryParams = [];

    if (role === 'PARTNER') {
      whereConditions.push('t.partner_id = ?');
      queryParams.push(user_partner_id);
    }

    if (partner_id) {
      const partnerIds = Array.isArray(partner_id) ? partner_id : [partner_id];
      const validPartnerIds = partnerIds.filter(Boolean);
      if (validPartnerIds.length > 0) {
        whereConditions.push(`t.partner_id IN (${validPartnerIds.map(() => '?').join(',')})`);
        queryParams.push(...validPartnerIds);
      }
    }

    if (training_centre_name) {
      const centerNames = Array.isArray(training_centre_name)
        ? training_centre_name
        : [training_centre_name];
      const validCenterNames = centerNames.filter(Boolean);
      if (validCenterNames.length > 0) {
        whereConditions.push(
          `COALESCE(t.training_centre_name, '') IN (${validCenterNames.map(() => '?').join(',')})`
        );
        queryParams.push(...validCenterNames);
      }
    }

    if (course_name) {
      const courseNames = Array.isArray(course_name) ? course_name : [course_name];
      const validCourseNames = courseNames.filter(Boolean);
      if (validCourseNames.length > 0) {
        whereConditions.push(`t.course_name IN (${validCourseNames.map(() => '?').join(',')})`);
        queryParams.push(...validCourseNames);
      }
    }

    if (document_status) {
      if (document_status === 'complete') {
        whereConditions.push(
          `t.resume_file_url IS NOT NULL AND t.resume_file_url != ''
           AND t.qualification_certificate_url IS NOT NULL AND t.qualification_certificate_url != ''
           AND t.id_proof_file_url IS NOT NULL AND t.id_proof_file_url != ''`
        );
      } else if (document_status === 'partial') {
        whereConditions.push(
          `(
            (t.resume_file_url IS NOT NULL AND t.resume_file_url != '')
            OR (t.qualification_certificate_url IS NOT NULL AND t.qualification_certificate_url != '')
            OR (t.id_proof_file_url IS NOT NULL AND t.id_proof_file_url != '')
          )
          AND NOT (
            t.resume_file_url IS NOT NULL AND t.resume_file_url != ''
            AND t.qualification_certificate_url IS NOT NULL AND t.qualification_certificate_url != ''
            AND t.id_proof_file_url IS NOT NULL AND t.id_proof_file_url != ''
          )`
        );
      } else if (document_status === 'missing') {
        whereConditions.push(
          `(t.resume_file_url IS NULL OR t.resume_file_url = '')
          AND (t.qualification_certificate_url IS NULL OR t.qualification_certificate_url = '')
          AND (t.id_proof_file_url IS NULL OR t.id_proof_file_url = '')`
        );
      }
    }

    if (search) {
      const searchPattern = `%${search}%`;
      whereConditions.push(
        `(
          t.trainer_name LIKE ?
          OR t.course_name LIKE ?
          OR t.training_centre_name LIKE ?
          OR t.mobile_no LIKE ?
          OR t.email LIKE ?
          OR p.name LIKE ?
        )`
      );
      queryParams.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
    }

    return {
      whereClause: whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '',
      queryParams,
    };
  }

  getTrainerDocumentColumnMap() {
    return {
      resume: {
        url: 'resume_file_url',
        name: 'resume_file_name',
      },
      qualificationCertificate: {
        url: 'qualification_certificate_url',
        name: 'qualification_certificate_name',
      },
      idProof: {
        url: 'id_proof_file_url',
        name: 'id_proof_file_name',
      },
    };
  }

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
              trainer_name, course_name, qualification, date_of_joining, mobile_no, email, row_seq)
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
    const safeLimit = parseInt(limit) || 10;
    const safeOffset = parseInt(offset);
    const [rows] = await db.query(
      `SELECT tu.*, u.full_name AS uploaded_by_name, r.full_name AS reviewed_by_name
       FROM tot_uploads tu
       LEFT JOIN users u ON u.id = tu.uploaded_by
       LEFT JOIN users r ON r.id = tu.reviewed_by
       WHERE tu.partner_id = ?
       ORDER BY tu.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [partnerId]
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
    const safeLimit2 = parseInt(limit) || 10;
    const safeOffset2 = parseInt(offset);
    const countParams = status ? [status] : [];
    const [rows] = await db.query(
      `SELECT tu.*, p.name AS partner_name, u.full_name AS uploaded_by_name, r.full_name AS reviewed_by_name
       FROM tot_uploads tu
       LEFT JOIN partners p ON p.id = tu.partner_id
       LEFT JOIN users u ON u.id = tu.uploaded_by
       LEFT JOIN users r ON r.id = tu.reviewed_by
       ${where}
       ORDER BY tu.created_at DESC
       LIMIT ${safeLimit2} OFFSET ${safeOffset2}`,
      status ? [status] : []
    );
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
      `SELECT * FROM uploaded_tots WHERE data_upload_id = ? ORDER BY row_seq ASC`,
      [uploadId]
    );
    upload.rows = rows;
    return upload;
  }

  async getTrainers({
    page = 1,
    limit = 10,
    search = '',
    partner_id = '',
    training_centre_name = '',
    course_name = '',
    document_status = '',
    sort_by = 'created_at',
    sort_order = 'desc',
    role = '',
    user_partner_id = '',
  }) {
    const validPage = Math.max(1, parseInt(page, 10) || 1);
    const validLimit = Math.max(1, Math.min(1000, parseInt(limit, 10) || 10));
    const offset = (validPage - 1) * validLimit;

    const hasTotsTable = await this.tableExists('tots');
    if (!hasTotsTable) {
      return {
        data: [],
        pagination: {
          page: validPage,
          limit: validLimit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const { whereClause, queryParams } = this.getTrainerListFilters({
      search,
      partner_id,
      training_centre_name,
      course_name,
      document_status,
      role,
      user_partner_id,
    });

    const hasCreatedAt = await this.columnExists('tots', 'created_at');
    const allowedSortFields = {
      trainer_name: 't.trainer_name',
      course_name: 't.course_name',
      training_centre_name: 't.training_centre_name',
      date_of_joining: 't.date_of_joining',
      created_at: hasCreatedAt ? 't.created_at' : 't.approved_at',
      partner_name: 'p.name',
    };

    const sortField =
      allowedSortFields[sort_by] || (hasCreatedAt ? 't.created_at' : 't.approved_at');
    const sortDirection = String(sort_order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM tots t
       LEFT JOIN partners p ON p.id = t.partner_id
       ${whereClause}`,
      queryParams
    );

    const total = countRows[0]?.total || 0;

    const [rows] = await db.query(
      `SELECT
        t.*,
        p.name AS partner_name,
        u.full_name AS approved_by_name,
        (
          (CASE WHEN t.resume_file_url IS NOT NULL AND t.resume_file_url != '' THEN 1 ELSE 0 END) +
          (CASE WHEN t.qualification_certificate_url IS NOT NULL AND t.qualification_certificate_url != '' THEN 1 ELSE 0 END) +
          (CASE WHEN t.id_proof_file_url IS NOT NULL AND t.id_proof_file_url != '' THEN 1 ELSE 0 END)
        ) AS document_count
      FROM tots t
      LEFT JOIN partners p ON p.id = t.partner_id
      LEFT JOIN users u ON u.id = t.approved_by
      ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT ${validLimit} OFFSET ${offset}`,
      queryParams
    );

    return {
      data: rows,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit),
      },
    };
  }

  async getTrainerFilterOptions({ role = '', user_partner_id = '' }) {
    const hasTotsTable = await this.tableExists('tots');
    const baseFilter = role === 'PARTNER' ? 'WHERE t.partner_id = ?' : '';
    const baseParams = role === 'PARTNER' ? [user_partner_id] : [];

    const [partnerRows] =
      role === 'PARTNER'
        ? await db.query(
            `SELECT p.id AS value, p.name AS label
           FROM partners p
           WHERE p.id = ?
           ORDER BY p.name ASC`,
            [user_partner_id]
          )
        : await db.query(
            `SELECT p.id AS value, p.name AS label
           FROM partners p
           ORDER BY p.name ASC`
          );

    const [centerRows] = hasTotsTable
      ? await db.query(
          `SELECT DISTINCT t.training_centre_name AS value, t.training_centre_name AS label
           FROM tots t
           ${baseFilter ? `${baseFilter} AND` : 'WHERE'} t.training_centre_name IS NOT NULL AND t.training_centre_name != ''
           ORDER BY t.training_centre_name ASC`,
          baseParams
        )
      : [[]];

    const [courseRows] = hasTotsTable
      ? await db.query(
          `SELECT DISTINCT t.course_name AS value, t.course_name AS label
           FROM tots t
           ${baseFilter ? `${baseFilter} AND` : 'WHERE'} t.course_name IS NOT NULL AND t.course_name != ''
           ORDER BY t.course_name ASC`,
          baseParams
        )
      : [[]];

    return {
      partners: partnerRows.filter((row) => row.value && row.label),
      centers: centerRows.filter((row) => row.value && row.label),
      courses: courseRows.filter((row) => row.value && row.label),
      documentStatuses: [
        { value: 'complete', label: 'Complete Documents' },
        { value: 'partial', label: 'Partial Documents' },
        { value: 'missing', label: 'Missing Documents' },
      ],
    };
  }

  async createTrainer({ actor, targetPartnerId, trainerData, documents = {} }) {
    const hasTotUploadsTable = await this.tableExists('tot_uploads');
    const hasTotsTable = await this.tableExists('tots');

    if (!hasTotUploadsTable || !hasTotsTable) {
      throw new Error(
        'TOT tables are not initialized. Please run the TOT migration before adding trainers.'
      );
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(actor.role);
    const partnerId = isAdmin ? targetPartnerId : actor.partnerId;

    if (!partnerId) {
      throw new Error('Partner is required to add trainer data.');
    }

    const trainerName = String(trainerData.trainer_name || '').trim();
    const courseName = String(trainerData.course_name || '').trim();
    const trainingPartner = String(trainerData.training_partner || '').trim() || null;
    const trainingCentreName = String(trainerData.training_centre_name || '').trim() || null;
    const qualification = String(trainerData.qualification || '').trim() || null;
    const mobileNoRaw = String(trainerData.mobile_no || '').trim();
    const mobileNo = mobileNoRaw ? mobileNoRaw.replace(/\s+/g, '') : null;
    const email = String(trainerData.email || '').trim() || null;

    if (!trainerName) {
      throw new Error('Trainer name is required.');
    }

    if (!courseName) {
      throw new Error('Course name is required.');
    }

    if (mobileNo && !/^\d{10}$/.test(mobileNo)) {
      throw new Error('Mobile number must be exactly 10 digits.');
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email address.');
    }

    const parsedDate = this.parseDateOfJoining(trainerData.date_of_joining);
    if (trainerData.date_of_joining && !parsedDate) {
      throw new Error('Invalid date format. Use DD-MM-YYYY or YYYY-MM-DD.');
    }

    const [partnerRows] = await db.query(`SELECT id, name FROM partners WHERE id = ? LIMIT 1`, [
      partnerId,
    ]);
    if (!partnerRows.length) {
      throw new Error('Selected partner not found.');
    }

    const resume = documents.resume || null;
    const qualificationCertificate = documents.qualificationCertificate || null;
    const idProof = documents.idProof || null;

    const uploadId = uuidv4();
    const trainerId = uuidv4();
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `INSERT INTO tot_uploads
          (id, partner_id, file_name, file_url, total_records, records_processed, records_failed, status, uploaded_by, reviewed_by, reviewed_at)
         VALUES (?, ?, ?, NULL, 1, 1, 0, 'approved', ?, ?, NOW())`,
        [uploadId, partnerId, 'Manual TOT Entry', actor.id, actor.id]
      );

      await connection.query(
        `INSERT INTO tots
          (id, tot_upload_id, partner_id, training_partner, training_centre_name,
           trainer_name, course_name, qualification, date_of_joining, mobile_no, email,
           resume_file_url, resume_file_name,
           qualification_certificate_url, qualification_certificate_name,
           id_proof_file_url, id_proof_file_name,
           approved_by, approved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          trainerId,
          uploadId,
          partnerId,
          trainingPartner,
          trainingCentreName,
          trainerName,
          courseName,
          qualification,
          parsedDate,
          mobileNo,
          email,
          resume?.fileUrl || null,
          resume?.fileName || null,
          qualificationCertificate?.fileUrl || null,
          qualificationCertificate?.fileName || null,
          idProof?.fileUrl || null,
          idProof?.fileName || null,
          actor.id,
        ]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const [[createdTrainer]] = await db.query(
      `SELECT t.*, p.name AS partner_name
       FROM tots t
       LEFT JOIN partners p ON p.id = t.partner_id
       WHERE t.id = ?`,
      [trainerId]
    );

    return createdTrainer;
  }

  async attachTrainerDocuments(uploadId, trainerId, actor, documents) {
    const [[upload]] = await db.query(`SELECT * FROM tot_uploads WHERE id = ?`, [uploadId]);

    if (!upload) {
      throw new Error('TOT upload not found.');
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(actor.role);
    if (!isAdmin && upload.partner_id !== actor.partnerId) {
      throw new Error('You do not have access to this TOT upload.');
    }

    if (upload.status !== 'pending') {
      throw new Error(
        'Trainer documents can only be uploaded while the TOT upload is pending review.'
      );
    }

    const [[trainer]] = await db.query(
      `SELECT * FROM uploaded_tots WHERE id = ? AND data_upload_id = ?`,
      [trainerId, uploadId]
    );

    if (!trainer) {
      throw new Error('Trainer row not found for this upload.');
    }

    const fieldMap = this.getTrainerDocumentColumnMap();
    const updates = [];
    const params = [];

    Object.entries(fieldMap).forEach(([key, columns]) => {
      const payload = documents[key];
      if (!payload) return;

      updates.push(`${columns.url} = ?`, `${columns.name} = ?`);
      params.push(payload.fileUrl, payload.fileName);
    });

    if (updates.length === 0) {
      throw new Error('No trainer documents were provided.');
    }

    params.push(trainerId, uploadId);

    await db.query(
      `UPDATE uploaded_tots SET ${updates.join(', ')} WHERE id = ? AND data_upload_id = ?`,
      params
    );

    const [[updatedTrainer]] = await db.query(
      `SELECT * FROM uploaded_tots WHERE id = ? AND data_upload_id = ?`,
      [trainerId, uploadId]
    );

    return updatedTrainer;
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
              resume_file_url, resume_file_name,
              qualification_certificate_url, qualification_certificate_name,
              id_proof_file_url, id_proof_file_name,
              approved_by, approved_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
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
            row.resume_file_url,
            row.resume_file_name,
            row.qualification_certificate_url,
            row.qualification_certificate_name,
            row.id_proof_file_url,
            row.id_proof_file_name,
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
