const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');

/**
 * TOT (Trainer of Trainers) Service
 * New 21-column schema — migration: add_tot_new_schema.sql
 */

// Ordered 21-column definition used for template, validation, insert, approve
const TOT_COLUMNS = [
  { header: 'TOT Center', field: 'tot_center', required: true },
  { header: 'Center Type', field: 'center_type', required: false },
  { header: 'SEIF Center (yes/no)', field: 'is_seif_center', required: false },
  { header: 'SEIF Center ID', field: 'seif_center_id', required: false },
  { header: 'Trainer Partner Name', field: 'trainer_partner_name', required: false },
  { header: 'Trainer Center Name', field: 'trainer_center_name', required: false },
  { header: 'Trainer Batch No', field: 'trainer_batch_no', required: false },
  { header: 'Trainer Batch Start Date', field: 'trainer_batch_start_date', required: false },
  { header: 'Trainer Batch End Date', field: 'trainer_batch_end_date', required: false },
  { header: 'Trainer Module Trained', field: 'trainer_module_trained', required: true },
  { header: 'First Name', field: 'first_name', required: true },
  { header: 'Last Name', field: 'last_name', required: false },
  { header: 'DOB', field: 'dob', required: false },
  { header: 'Gender', field: 'gender', required: false },
  { header: 'Contact Number', field: 'contact_number', required: false },
  { header: 'Email ID', field: 'email_id', required: false },
  { header: 'Qualification', field: 'qualification', required: false },
  { header: 'Language Knows', field: 'language_knows', required: false },
  { header: 'Contact Address', field: 'contact_address', required: false },
  { header: 'City', field: 'city', required: false },
  { header: 'State', field: 'state', required: false },
];

// Date fields that need parsing
const DATE_FIELDS = ['dob', 'trainer_batch_start_date', 'trainer_batch_end_date'];

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

  /**
   * Parse a date string (DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD) → 'YYYY-MM-DD' or null
   */
  parseDate(value) {
    if (!value) return null;
    const s = String(value).trim();
    if (!s) return null;
    const ddmmyyyy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyy) {
      return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
    }
    const yyyymmdd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (yyyymmdd) {
      return `${yyyymmdd[1]}-${yyyymmdd[2].padStart(2, '0')}-${yyyymmdd[3].padStart(2, '0')}`;
    }
    return null;
  }

  /**
   * Validate a single TOT row from uploaded Excel/CSV file (new 21-column schema)
   */
  validateTotRow(rowData, rowNumber) {
    const errors = [];
    const cellError = (col, reason) => `Row ${rowNumber}, Column: ${col} — ${reason}`;

    const get = (key) => {
      const found = Object.entries(rowData).find(
        ([k]) => k.trim().toLowerCase() === key.toLowerCase()
      );
      return found ? String(found[1] ?? '').trim() : '';
    };

    const getByField = (fieldOrHeader) => {
      const col = TOT_COLUMNS.find(
        (c) => c.field === fieldOrHeader || c.header.toLowerCase() === fieldOrHeader.toLowerCase()
      );
      if (!col) return '';
      return get(col.header) || get(col.field);
    };

    const val = (field) => getByField(field);

    // Required fields
    const totCenter = val('tot_center');
    const trainerModuleTrained = val('trainer_module_trained');
    const firstName = val('first_name');

    if (!totCenter) errors.push(cellError('TOT Center', 'TOT Center is required'));
    if (!trainerModuleTrained)
      errors.push(cellError('Trainer Module Trained', 'Trainer Module Trained is required'));
    if (!firstName) errors.push(cellError('First Name', 'First Name is required'));

    // Date fields
    const parsedDates = {};
    for (const field of DATE_FIELDS) {
      const col = TOT_COLUMNS.find((c) => c.field === field);
      const raw = val(field);
      if (raw) {
        const parsed = this.parseDate(raw);
        if (!parsed) {
          errors.push(cellError(col.header, 'Invalid date format. Use DD-MM-YYYY or YYYY-MM-DD'));
        } else {
          parsedDates[field] = parsed;
        }
      } else {
        parsedDates[field] = null;
      }
    }

    // Contact number
    const contactNumber = val('contact_number').replace(/\s+/g, '');
    if (contactNumber && !/^\d{10}$/.test(contactNumber)) {
      errors.push(cellError('Contact Number', 'Contact number must be exactly 10 digits'));
    }

    // Email
    const emailId = val('email_id');
    if (emailId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailId)) {
      errors.push(cellError('Email ID', 'Invalid email address'));
    }

    // is_seif_center
    const isSeifRaw = val('is_seif_center').toLowerCase();
    let isSeifCenter = null;
    if (isSeifRaw === 'yes' || isSeifRaw === '1') isSeifCenter = 1;
    else if (isSeifRaw === 'no' || isSeifRaw === '0') isSeifCenter = 0;

    const cleaned = {
      tot_center: totCenter || null,
      center_type: val('center_type') || null,
      is_seif_center: isSeifCenter,
      seif_center_id: val('seif_center_id') || null,
      trainer_partner_name: val('trainer_partner_name') || null,
      trainer_center_name: val('trainer_center_name') || null,
      trainer_batch_no: val('trainer_batch_no') || null,
      trainer_batch_start_date: parsedDates.trainer_batch_start_date,
      trainer_batch_end_date: parsedDates.trainer_batch_end_date,
      trainer_module_trained: trainerModuleTrained || null,
      first_name: firstName || null,
      last_name: val('last_name') || null,
      dob: parsedDates.dob,
      gender: val('gender') || null,
      contact_number: contactNumber || null,
      email_id: emailId || null,
      qualification: val('qualification') || null,
      language_knows: val('language_knows') || null,
      contact_address: val('contact_address') || null,
      city: val('city') || null,
      state: val('state') || null,
    };

    return { isValid: errors.length === 0, errors, cleaned };
  }

  getTrainerListFilters({
    search = '',
    partner_id = '',
    trainer_module_trained = '',
    tot_center = '',
    state = '',
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
      const ids = Array.isArray(partner_id) ? partner_id : [partner_id];
      const valid = ids.filter(Boolean);
      if (valid.length > 0) {
        whereConditions.push(`t.partner_id IN (${valid.map(() => '?').join(',')})`);
        queryParams.push(...valid);
      }
    }

    if (trainer_module_trained) {
      const modules = Array.isArray(trainer_module_trained)
        ? trainer_module_trained
        : [trainer_module_trained];
      const valid = modules.filter(Boolean);
      if (valid.length > 0) {
        whereConditions.push(`t.trainer_module_trained IN (${valid.map(() => '?').join(',')})`);
        queryParams.push(...valid);
      }
    }

    if (tot_center) {
      const centers = Array.isArray(tot_center) ? tot_center : [tot_center];
      const valid = centers.filter(Boolean);
      if (valid.length > 0) {
        whereConditions.push(`t.tot_center IN (${valid.map(() => '?').join(',')})`);
        queryParams.push(...valid);
      }
    }

    if (state) {
      const states = Array.isArray(state) ? state : [state];
      const valid = states.filter(Boolean);
      if (valid.length > 0) {
        whereConditions.push(`t.state IN (${valid.map(() => '?').join(',')})`);
        queryParams.push(...valid);
      }
    }

    if (search) {
      const like = `%${search}%`;
      whereConditions.push(
        `(t.first_name LIKE ? OR t.last_name LIKE ? OR t.tot_center LIKE ?
          OR t.trainer_module_trained LIKE ? OR t.contact_number LIKE ?
          OR t.email_id LIKE ? OR t.state LIKE ? OR p.name LIKE ?)`
      );
      queryParams.push(like, like, like, like, like, like, like, like);
    }

    return {
      whereClause: whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '',
      queryParams,
    };
  }

  /**
   * Create a TOT upload record and save rows to staging table (new 21-column schema)
   */
  async createUpload(partnerId, uploadedBy, fileName, fileUrl, rows) {
    const uploadId = uuidv4();
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `INSERT INTO tot_uploads
           (id, partner_id, file_name, file_url, total_records, status, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW())`,
        [uploadId, partnerId, fileName, fileUrl, rows.length, uploadedBy]
      );

      let processed = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowId = uuidv4();

        await connection.query(
          `INSERT INTO uploaded_tots
             (id, data_upload_id, partner_id,
              tot_center, center_type, is_seif_center, seif_center_id,
              trainer_partner_name, trainer_center_name, trainer_batch_no,
              trainer_batch_start_date, trainer_batch_end_date,
              trainer_module_trained,
              first_name, last_name, dob, gender, contact_number, email_id,
              qualification, language_knows, contact_address, city, state,
              row_number, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            rowId,
            uploadId,
            partnerId,
            row.tot_center,
            row.center_type,
            row.is_seif_center,
            row.seif_center_id,
            row.trainer_partner_name,
            row.trainer_center_name,
            row.trainer_batch_no,
            row.trainer_batch_start_date,
            row.trainer_batch_end_date,
            row.trainer_module_trained,
            row.first_name,
            row.last_name,
            row.dob,
            row.gender,
            row.contact_number,
            row.email_id,
            row.qualification,
            row.language_knows,
            row.contact_address,
            row.city,
            row.state,
            i + 2,
          ]
        );
        processed++;
      }

      await connection.query(
        `UPDATE tot_uploads SET records_processed = ?, records_failed = 0 WHERE id = ?`,
        [processed, uploadId]
      );

      await connection.commit();
      return { uploadId, total: rows.length, processed, failed: 0 };
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
    const safeLimit = parseInt(limit) || 10;
    const safeOffset = parseInt(offset);
    const countParams = status ? [status] : [];
    const [rows] = await db.query(
      `SELECT tu.*, p.name AS partner_name, u.full_name AS uploaded_by_name, r.full_name AS reviewed_by_name
       FROM tot_uploads tu
       LEFT JOIN partners p ON p.id = tu.partner_id
       LEFT JOIN users u ON u.id = tu.uploaded_by
       LEFT JOIN users r ON r.id = tu.reviewed_by
       ${where}
       ORDER BY tu.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
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
      `SELECT * FROM uploaded_tots WHERE data_upload_id = ? ORDER BY row_number ASC`,
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
    trainer_module_trained = '',
    tot_center = '',
    state = '',
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
        pagination: { page: validPage, limit: validLimit, total: 0, totalPages: 0 },
      };
    }

    const { whereClause, queryParams } = this.getTrainerListFilters({
      search,
      partner_id,
      trainer_module_trained,
      tot_center,
      state,
      role,
      user_partner_id,
    });

    const allowedSortFields = {
      first_name: 't.first_name',
      last_name: 't.last_name',
      tot_center: 't.tot_center',
      trainer_module_trained: 't.trainer_module_trained',
      trainer_partner_name: 't.trainer_partner_name',
      contact_number: 't.contact_number',
      email_id: 't.email_id',
      state: 't.state',
      created_at: 't.created_at',
      approved_at: 't.approved_at',
      partner_name: 'p.name',
    };

    const sortField = allowedSortFields[sort_by] || 't.created_at';
    const sortDirection = String(sort_order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM tots t LEFT JOIN partners p ON p.id = t.partner_id ${whereClause}`,
      queryParams
    );
    const total = countRows[0]?.total || 0;

    const [rows] = await db.query(
      `SELECT t.*, p.name AS partner_name, u.full_name AS approved_by_name,
              c.center_name AS seif_center_name
       FROM tots t
       LEFT JOIN partners p ON p.id = t.partner_id
       LEFT JOIN users u ON u.id = t.approved_by
       LEFT JOIN centers c ON c.id = t.seif_center_id
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

  async getTrainerById(id) {
    const [rows] = await db.query(
      `SELECT t.*, p.name AS partner_name, u.full_name AS approved_by_name,
              c.center_name AS seif_center_name
       FROM tots t
       LEFT JOIN partners p ON p.id = t.partner_id
       LEFT JOIN users u ON u.id = t.approved_by
       LEFT JOIN centers c ON c.id = t.seif_center_id
       WHERE t.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  async updateTrainer(id, data) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [existingRows] = await connection.query('SELECT id FROM tots WHERE id = ? LIMIT 1', [
        id,
      ]);
      if (existingRows.length === 0) {
        throw new Error('Trainer not found');
      }

      const fieldMap = {
        tot_center: 'tot_center',
        center_type: 'center_type',
        is_seif_center: 'is_seif_center',
        seif_center_id: 'seif_center_id',
        trainer_partner_name: 'trainer_partner_name',
        trainer_center_name: 'trainer_center_name',
        trainer_batch_no: 'trainer_batch_no',
        trainer_batch_start_date: 'trainer_batch_start_date',
        trainer_batch_end_date: 'trainer_batch_end_date',
        trainer_module_trained: 'trainer_module_trained',
        first_name: 'first_name',
        last_name: 'last_name',
        dob: 'dob',
        gender: 'gender',
        contact_number: 'contact_number',
        email_id: 'email_id',
        qualification: 'qualification',
        language_knows: 'language_knows',
        contact_address: 'contact_address',
        city: 'city',
        state: 'state',
      };

      const fields = [];
      const values = [];

      Object.entries(fieldMap).forEach(([inputKey, column]) => {
        if (data[inputKey] !== undefined) {
          let value = data[inputKey];
          if (inputKey === 'is_seif_center') {
            const normalized = String(value).trim().toLowerCase();
            if (normalized === 'yes' || normalized === '1' || normalized === 'true') value = 1;
            else if (normalized === 'no' || normalized === '0' || normalized === 'false') value = 0;
            else value = null;
          }
          fields.push(`${column} = ?`);
          values.push(value === '' ? null : value);
        }
      });

      if (fields.length > 0) {
        values.push(id);
        await connection.query(
          `UPDATE tots SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
          values
        );
      }

      await connection.commit();
      return this.getTrainerById(id);
    } catch (error) {
      await connection.rollback();
      console.error('Error in updateTrainer:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteTrainer(id) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [existingRows] = await connection.query('SELECT id FROM tots WHERE id = ? LIMIT 1', [
        id,
      ]);
      if (existingRows.length === 0) {
        throw new Error('Trainer not found');
      }

      await connection.query('DELETE FROM tots WHERE id = ?', [id]);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error('Error in deleteTrainer:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async getTrainerFilterOptions({ role = '', user_partner_id = '' }) {
    const hasTotsTable = await this.tableExists('tots');
    const partnerWhere = role === 'PARTNER' ? 'WHERE t.partner_id = ?' : '';
    const baseParams = role === 'PARTNER' ? [user_partner_id] : [];

    const [partnerRows] =
      role === 'PARTNER'
        ? await db.query(
            `SELECT p.id AS value, p.name AS label FROM partners p WHERE p.id = ? ORDER BY p.name ASC`,
            [user_partner_id]
          )
        : await db.query(
            `SELECT p.id AS value, p.name AS label FROM partners p ORDER BY p.name ASC`
          );

    const [moduleRows] = hasTotsTable
      ? await db.query(
          `SELECT DISTINCT t.trainer_module_trained AS value, t.trainer_module_trained AS label
           FROM tots t
           ${partnerWhere ? partnerWhere + ' AND' : 'WHERE'} t.trainer_module_trained IS NOT NULL AND t.trainer_module_trained != ''
           ORDER BY t.trainer_module_trained ASC`,
          baseParams
        )
      : [[]];

    const [centerRows] = hasTotsTable
      ? await db.query(
          `SELECT DISTINCT t.tot_center AS value, t.tot_center AS label
           FROM tots t
           ${partnerWhere ? partnerWhere + ' AND' : 'WHERE'} t.tot_center IS NOT NULL AND t.tot_center != ''
           ORDER BY t.tot_center ASC`,
          baseParams
        )
      : [[]];

    const [stateRows] = hasTotsTable
      ? await db.query(
          `SELECT DISTINCT t.state AS value, t.state AS label
           FROM tots t
           ${partnerWhere ? partnerWhere + ' AND' : 'WHERE'} t.state IS NOT NULL AND t.state != ''
           ORDER BY t.state ASC`,
          baseParams
        )
      : [[]];

    return {
      partners: partnerRows.filter((r) => r.value && r.label),
      modules: moduleRows.filter((r) => r.value && r.label),
      centers: centerRows.filter((r) => r.value && r.label),
      states: stateRows.filter((r) => r.value && r.label),
    };
  }

  /**
   * createTrainer — manual single-record entry (minimal fix for new schema)
   */
  async createTrainer({ actor, targetPartnerId, trainerData }) {
    const hasTotUploadsTable = await this.tableExists('tot_uploads');
    const hasTotsTable = await this.tableExists('tots');

    if (!hasTotUploadsTable || !hasTotsTable) {
      throw new Error('TOT tables are not initialized. Please run the TOT migration.');
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(actor.role);
    const partnerId = isAdmin ? targetPartnerId : actor.partnerId;
    if (!partnerId) throw new Error('Partner is required to add trainer data.');

    const firstName = String(trainerData.first_name || trainerData.trainer_name || '').trim();
    const lastName = String(trainerData.last_name || '').trim() || null;
    const moduleTrained = String(
      trainerData.trainer_module_trained || trainerData.course_name || ''
    ).trim();
    const totCenter =
      String(trainerData.tot_center || trainerData.training_centre_name || '').trim() || null;
    const trainerPartner =
      String(trainerData.trainer_partner_name || trainerData.training_partner || '').trim() || null;
    const contactNum =
      String(trainerData.contact_number || trainerData.mobile_no || '')
        .trim()
        .replace(/\s+/g, '') || null;
    const emailId = String(trainerData.email_id || trainerData.email || '').trim() || null;
    const qualification = String(trainerData.qualification || '').trim() || null;

    if (!firstName) throw new Error('First Name is required.');
    if (!moduleTrained) throw new Error('Trainer Module Trained is required.');
    if (contactNum && !/^\d{10}$/.test(contactNum))
      throw new Error('Contact number must be exactly 10 digits.');
    if (emailId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailId))
      throw new Error('Invalid email address.');

    const [partnerRows] = await db.query(`SELECT id FROM partners WHERE id = ? LIMIT 1`, [
      partnerId,
    ]);
    if (!partnerRows.length) throw new Error('Selected partner not found.');

    const uploadId = uuidv4();
    const trainerId = uuidv4();
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `INSERT INTO tot_uploads
           (id, partner_id, file_name, file_url, total_records, records_processed, records_failed, status, uploaded_by, reviewed_by, reviewed_at)
         VALUES (?, ?, 'Manual TOT Entry', NULL, 1, 1, 0, 'approved', ?, ?, NOW())`,
        [uploadId, partnerId, actor.id, actor.id]
      );

      await connection.query(
        `INSERT INTO tots
           (id, tot_upload_id, partner_id,
            tot_center, trainer_partner_name, trainer_module_trained,
            first_name, last_name, contact_number, email_id, qualification,
            approved_by, approved_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          trainerId,
          uploadId,
          partnerId,
          totCenter,
          trainerPartner,
          moduleTrained,
          firstName,
          lastName,
          contactNum,
          emailId,
          qualification,
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
      `SELECT t.*, p.name AS partner_name FROM tots t LEFT JOIN partners p ON p.id = t.partner_id WHERE t.id = ?`,
      [trainerId]
    );
    return createdTrainer;
  }

  /**
   * Approve a TOT upload — moves rows from uploaded_tots → tots (new 21-column schema)
   */
  async approveUpload(uploadId, reviewedBy, remarks) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [[upload]] = await connection.query(
        `SELECT * FROM tot_uploads WHERE id = ? AND status = 'pending'`,
        [uploadId]
      );
      if (!upload) throw new Error('Upload not found or already reviewed');

      const [rows] = await connection.query(
        `SELECT * FROM uploaded_tots WHERE data_upload_id = ?`,
        [uploadId]
      );

      for (const row of rows) {
        await connection.query(
          `INSERT INTO tots
             (id, tot_upload_id, partner_id,
              tot_center, center_type, is_seif_center, seif_center_id,
              trainer_partner_name, trainer_center_name, trainer_batch_no,
              trainer_batch_start_date, trainer_batch_end_date,
              trainer_module_trained,
              first_name, last_name, dob, gender, contact_number, email_id,
              qualification, language_knows, contact_address, city, state,
              approved_by, approved_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            uuidv4(),
            uploadId,
            upload.partner_id,
            row.tot_center,
            row.center_type,
            row.is_seif_center,
            row.seif_center_id,
            row.trainer_partner_name,
            row.trainer_center_name,
            row.trainer_batch_no,
            row.trainer_batch_start_date,
            row.trainer_batch_end_date,
            row.trainer_module_trained,
            row.first_name,
            row.last_name,
            row.dob,
            row.gender,
            row.contact_number,
            row.email_id,
            row.qualification,
            row.language_knows,
            row.contact_address,
            row.city,
            row.state,
            reviewedBy,
          ]
        );
      }

      await connection.query(
        `UPDATE tot_uploads SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), remarks = ? WHERE id = ?`,
        [reviewedBy, remarks || null, uploadId]
      );

      await connection.commit();
      try {
        const { fireEmail } = require('../../../services/emailDispatch.service');
        fireEmail('tot.approved_partner', {}, { audience: 'partner', partnerId: upload.partner_id });
      } catch (e) {
        /* non-blocking */
      }
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
    try {
      const { fireEmail } = require('../../../services/emailDispatch.service');
      fireEmail('tot.rejected_partner', {}, { audience: 'partner', partnerId: upload.partner_id });
    } catch (e) {
      /* non-blocking */
    }
  }

  /**
   * Admin: save batch edits to uploaded_tots rows before approval
   */
  async saveTotAdminEdits(uploadId, rows, changes, adminId) {
    const [[upload]] = await db.query(
      `SELECT * FROM tot_uploads WHERE id = ? AND status = 'pending'`,
      [uploadId]
    );
    if (!upload) throw new Error('Upload not found or not in pending status');

    const EDITABLE_FIELDS = [
      'tot_center',
      'center_type',
      'is_seif_center',
      'seif_center_id',
      'trainer_partner_name',
      'trainer_center_name',
      'trainer_batch_no',
      'trainer_batch_start_date',
      'trainer_batch_end_date',
      'trainer_module_trained',
      'first_name',
      'last_name',
      'dob',
      'gender',
      'contact_number',
      'email_id',
      'qualification',
      'language_knows',
      'contact_address',
      'city',
      'state',
    ];

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // A row is "new" if it has no real DB id (or _rowId starts with 'new-')
      const isNewRow = (r) => {
        const rid = String(r._rowId || r.id || '');
        return !r.id || rid.startsWith('new-');
      };

      const newRows = rows.filter((r) => !r._deleted && isNewRow(r));
      const existingRows = rows.filter((r) => !r._deleted && !isNewRow(r));

      // Detect deletions: DB rows whose IDs are NOT in the passed existingRows
      const [dbRows] = await connection.query(
        `SELECT id FROM uploaded_tots WHERE data_upload_id = ?`,
        [uploadId]
      );
      const passedIds = new Set(existingRows.map((r) => r.id).filter(Boolean));
      const toDeleteIds = dbRows.map((r) => r.id).filter((id) => !passedIds.has(id));

      for (const id of toDeleteIds) {
        await connection.query(`DELETE FROM uploaded_tots WHERE id = ? AND data_upload_id = ?`, [
          id,
          uploadId,
        ]);
      }

      for (const row of newRows) {
        await connection.query(
          `INSERT INTO uploaded_tots
             (id, data_upload_id, partner_id,
              tot_center, center_type, is_seif_center, seif_center_id,
              trainer_partner_name, trainer_center_name, trainer_batch_no,
              trainer_batch_start_date, trainer_batch_end_date, trainer_module_trained,
              first_name, last_name, dob, gender, contact_number, email_id,
              qualification, language_knows, contact_address, city, state,
              row_number, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            uuidv4(),
            uploadId,
            upload.partner_id,
            row.tot_center || null,
            row.center_type || null,
            row.is_seif_center != null ? row.is_seif_center : null,
            row.seif_center_id || null,
            row.trainer_partner_name || null,
            row.trainer_center_name || null,
            row.trainer_batch_no || null,
            row.trainer_batch_start_date || null,
            row.trainer_batch_end_date || null,
            row.trainer_module_trained || null,
            row.first_name || null,
            row.last_name || null,
            row.dob || null,
            row.gender || null,
            row.contact_number || null,
            row.email_id || null,
            row.qualification || null,
            row.language_knows || null,
            row.contact_address || null,
            row.city || null,
            row.state || null,
            row.row_number || null,
          ]
        );
      }

      for (const row of existingRows) {
        const sets = [];
        const params = [];
        for (const field of EDITABLE_FIELDS) {
          if (field in row) {
            sets.push(`${field} = ?`);
            params.push(row[field] ?? null);
          }
        }
        if (sets.length > 0) {
          params.push(row.id, uploadId);
          await connection.query(
            `UPDATE uploaded_tots SET ${sets.join(', ')} WHERE id = ? AND data_upload_id = ?`,
            params
          );
        }
      }

      const [[{ cnt }]] = await connection.query(
        `SELECT COUNT(*) AS cnt FROM uploaded_tots WHERE data_upload_id = ?`,
        [uploadId]
      );
      await connection.query(
        `UPDATE tot_uploads SET total_records = ?, records_processed = ? WHERE id = ?`,
        [cnt, cnt, uploadId]
      );

      await connection.commit();
      return { saved: existingRows.length, added: newRows.length, deleted: toDeleteIds.length };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Generate Excel (.xlsx) template with module dropdown + partner center list + instructions
   * @param {string|null} partnerId
   * @returns {Promise<Buffer>}
   */
  async generateTemplateExcel(partnerId) {
    const [moduleRows] = await db.query(
      `SELECT module_name FROM trainer_modules WHERE is_active = 1 ORDER BY module_name ASC`
    );
    const moduleNames = moduleRows.map((r) => r.module_name);

    let centerRows = [];
    if (partnerId) {
      const [rows] = await db.query(
        `SELECT id, center_name FROM centers WHERE partner_id = ? AND status = 'approved' ORDER BY center_name ASC`,
        [partnerId]
      );
      centerRows = rows;
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SEIF Portal';
    wb.created = new Date();

    // Sheet 1: TOT Template
    const tmplSheet = wb.addWorksheet('TOT Template');

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E7E34' } };
    const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    const reqFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCC0000' } };
    const borderStyle = { style: 'thin', color: { argb: 'FFD0D0D0' } };
    const allBorders = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle,
    };

    tmplSheet.addRow(TOT_COLUMNS.map((c) => c.header));
    const headerRow = tmplSheet.getRow(1);
    headerRow.height = 28;
    TOT_COLUMNS.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.fill = col.required ? reqFill : headerFill;
      cell.font = headerFont;
      cell.border = allBorders;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    tmplSheet.addRow([
      'Sample Training Center',
      'Government',
      'Yes',
      centerRows[0]?.id || '',
      'Sample Partner Org',
      'Sample Trainer Center',
      'BATCH-001',
      '01-04-2024',
      '30-06-2024',
      moduleNames[0] || 'Module Name Here',
      'John',
      'Doe',
      '15-08-1990',
      'Male',
      '9876543210',
      'john.doe@example.com',
      'ITI',
      'Hindi, English',
      '123 Main Street',
      'Mumbai',
      'Maharashtra',
    ]);

    const colWidths = [
      28, 18, 20, 36, 28, 28, 18, 22, 22, 30, 18, 18, 15, 12, 16, 28, 20, 20, 30, 16, 16,
    ];
    colWidths.forEach((w, i) => {
      tmplSheet.getColumn(i + 1).width = w;
    });

    if (moduleNames.length > 0) {
      const modulesSheet = wb.addWorksheet('_Modules');
      modulesSheet.state = 'veryHidden';
      moduleNames.forEach((name, i) => {
        modulesSheet.getCell(i + 1, 1).value = name;
      });
      const moduleFormula = `_Modules!$A$1:$A$${moduleNames.length}`;
      for (let r = 2; r <= 1001; r++) {
        tmplSheet.getCell(r, 10).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [moduleFormula],
          showErrorMessage: true,
          errorTitle: 'Invalid Module',
          error: 'Please select a module from the dropdown list.',
        };
      }
    }

    for (let r = 2; r <= 1001; r++) {
      tmplSheet.getCell(r, 14).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Male,Female,Other"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Gender',
        error: 'Select Male, Female, or Other.',
      };
      tmplSheet.getCell(r, 3).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Yes,No"'],
      };
    }

    // Sheet 2: Center List
    const centerSheet = wb.addWorksheet('Center List');
    centerSheet.addRow(['Center ID', 'Center Name']);
    const centerHeader = centerSheet.getRow(1);
    centerHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    centerHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E7E34' } };
    centerHeader.height = 24;
    centerSheet.getColumn(1).width = 38;
    centerSheet.getColumn(2).width = 40;
    if (centerRows.length > 0) {
      centerRows.forEach((c) => centerSheet.addRow([c.id, c.center_name]));
    } else {
      centerSheet.addRow(['(No approved centers found for this partner)', '']);
    }

    // Sheet 3: Instructions
    const instrSheet = wb.addWorksheet('Instructions');
    instrSheet.getColumn(1).width = 28;
    instrSheet.getColumn(2).width = 18;
    instrSheet.getColumn(3).width = 55;

    const instrTitle = instrSheet.getCell('A1');
    instrTitle.value = 'TOT Upload Template — Field Guide';
    instrTitle.font = { bold: true, size: 14, color: { argb: 'FF1E7E34' } };
    instrSheet.mergeCells('A1:C1');
    instrSheet.addRow(['']);
    instrSheet.addRow(['Column Header', 'Required?', 'Description / Notes']);
    const instrHeaderRow = instrSheet.getRow(3);
    instrHeaderRow.font = { bold: true };
    instrHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };

    [
      ['TOT Center', 'Yes', 'Name of the training center conducting the TOT'],
      ['Center Type', 'No', 'E.g. Government, Private, NGO'],
      ['SEIF Center (yes/no)', 'No', 'Is this an SEIF approved center? Enter Yes or No'],
      [
        'SEIF Center ID',
        'No',
        'If Yes above, enter the SEIF Center ID from the "Center List" sheet',
      ],
      ['Trainer Partner Name', 'No', 'Organization/partner that conducted the trainer batch'],
      ['Trainer Center Name', 'No', 'Center where the trainer was trained'],
      ['Trainer Batch No', 'No', 'Batch number for the trainer program'],
      ['Trainer Batch Start Date', 'No', 'Format: DD-MM-YYYY'],
      ['Trainer Batch End Date', 'No', 'Format: DD-MM-YYYY'],
      [
        'Trainer Module Trained',
        'Yes',
        'Select from dropdown. Must match an active Trainer Module.',
      ],
      ['First Name', 'Yes', 'Trainer first name'],
      ['Last Name', 'No', 'Trainer last name'],
      ['DOB', 'No', 'Date of birth — Format: DD-MM-YYYY'],
      ['Gender', 'No', 'Male / Female / Other'],
      ['Contact Number', 'No', '10-digit mobile number (digits only)'],
      ['Email ID', 'No', 'Valid email address'],
      ['Qualification', 'No', 'E.g. ITI, Diploma, B.Tech, Graduate'],
      ['Language Knows', 'No', 'Comma-separated list, e.g. Hindi, English, Tamil'],
      ['Contact Address', 'No', 'Full contact address'],
      ['City', 'No', 'City of residence'],
      ['State', 'No', 'State of residence'],
      [''],
      ['⚠ Date Format', '', 'Always use DD-MM-YYYY (e.g. 15-08-1990)'],
      [
        '⚠ Red headers',
        '',
        'Columns with red headers are REQUIRED. File will be rejected without them.',
      ],
      [
        '⚠ SEIF Center ID',
        '',
        'Copy the ID from the "Center List" sheet — do NOT type it manually',
      ],
      ['⚠ Contact Number', '', 'Must be exactly 10 digits. Do not include +91 or spaces.'],
    ].forEach((row) => instrSheet.addRow(row));

    return wb.xlsx.writeBuffer();
  }
}

module.exports = new TotService();
