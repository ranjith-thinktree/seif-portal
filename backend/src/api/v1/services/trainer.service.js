const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');
const ApiResponse = require('../../../utils/response.util');

/**
 * Trainer Service
 * Handles all business logic for trainer management
 */
class TrainerService {
  static tableInitialized = false;

  static async ensureTrainerProfilesTable() {
    if (TrainerService.tableInitialized) {
      return;
    }

    const [profileTableRows] = await db.query(
      `
        SELECT COUNT(*) AS count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = 'trainer_profiles'
      `
    );

    const trainerProfilesExists = Number(profileTableRows?.[0]?.count || 0) > 0;

    if (!trainerProfilesExists) {
      await db.query(`
        CREATE TABLE trainer_profiles (
          id CHAR(36) NOT NULL PRIMARY KEY,
          partner_id CHAR(36) NOT NULL,
          center_id CHAR(36) NOT NULL,
          training_partner VARCHAR(255) DEFAULT NULL,
          training_centre_name VARCHAR(255) DEFAULT NULL,
          trainer_name VARCHAR(255) NOT NULL,
          course_name VARCHAR(255) DEFAULT NULL,
          qualification VARCHAR(255) DEFAULT NULL,
          date_of_joining DATE DEFAULT NULL,
          mobile_no VARCHAR(20) NOT NULL,
          email VARCHAR(255) NOT NULL,
          resume_file_url VARCHAR(1000) DEFAULT NULL,
          resume_file_name VARCHAR(255) DEFAULT NULL,
          qualification_certificate_url VARCHAR(1000) DEFAULT NULL,
          qualification_certificate_name VARCHAR(255) DEFAULT NULL,
          id_proof_file_url VARCHAR(1000) DEFAULT NULL,
          id_proof_file_name VARCHAR(255) DEFAULT NULL,
          status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          KEY idx_trainer_profiles_partner_id (partner_id),
          KEY idx_trainer_profiles_center_id (center_id),
          KEY idx_trainer_profiles_status (status),
          CONSTRAINT fk_trainer_profiles_partner_id FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
          CONSTRAINT fk_trainer_profiles_center_id FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci
      `);

      const [legacyTrainerTableRows] = await db.query(
        `
          SELECT COUNT(*) AS count
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
            AND table_name = 'trainers'
        `
      );

      const trainersTableExists = Number(legacyTrainerTableRows?.[0]?.count || 0) > 0;

      if (trainersTableExists) {
        const [legacyTrainerColumns] = await db.query(
          `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = 'trainers'
          `
        );

        const availableColumns = new Set(
          (legacyTrainerColumns || []).map((column) => column.column_name)
        );

        const columnOrNull = (columnName) =>
          availableColumns.has(columnName) ? `tr.${columnName}` : 'NULL';

        await db.query(`
          INSERT INTO trainer_profiles (
            id,
            partner_id,
            center_id,
            training_partner,
            training_centre_name,
            trainer_name,
            course_name,
            qualification,
            date_of_joining,
            mobile_no,
            email,
            resume_file_url,
            resume_file_name,
            qualification_certificate_url,
            qualification_certificate_name,
            id_proof_file_url,
            id_proof_file_name,
            status,
            created_at,
            updated_at
          )
          SELECT
            tr.id,
            tr.partner_id,
            tr.center_id,
            ${columnOrNull('training_partner')},
            ${columnOrNull('training_centre_name')},
            tr.trainer_name,
            ${columnOrNull('course_name')},
            ${columnOrNull('qualification')},
            ${columnOrNull('date_of_joining')},
            tr.mobile_no,
            tr.email,
            ${columnOrNull('resume_file_url')},
            ${columnOrNull('resume_file_name')},
            ${columnOrNull('qualification_certificate_url')},
            ${columnOrNull('qualification_certificate_name')},
            ${columnOrNull('id_proof_file_url')},
            ${columnOrNull('id_proof_file_name')},
            CASE
              WHEN tr.status IN ('active', 'inactive', 'suspended') THEN tr.status
              ELSE 'active'
            END,
            tr.created_at,
            tr.updated_at
          FROM trainers tr
          WHERE NOT EXISTS (
            SELECT 1
            FROM trainer_profiles tp
            WHERE tp.id = tr.id
          )
        `);
      }
    }

    TrainerService.tableInitialized = true;
  }

  static getDocumentColumnMap() {
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
   * Get all trainers with pagination, search, and filters
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.search - Search query
   * @param {string} options.partner_id - Filter by partner
   * @param {string} options.center_id - Filter by center
   * @param {string} options.status - Filter by status
   * @param {string} options.user_role - User role for scoping
   * @param {string} options.user_partner_id - User's partner ID (for PARTNER role)
   * @returns {Promise<Object>} Trainers data with pagination
   */
  static async getAllTrainers({
    page = 1,
    limit = 10,
    search = '',
    partner_id = '',
    center_id = '',
    status = '',
    user_role = '',
    user_partner_id = '',
    sort_by = 'created_at',
    sort_order = 'desc',
  }) {
    try {
      await TrainerService.ensureTrainerProfilesTable();

      const validPage = Math.max(1, parseInt(page) || 1);
      const validLimit = Math.max(1, Math.min(5000, parseInt(limit) || 10));
      const offset = (validPage - 1) * validLimit;

      let whereConditions = [];
      let queryParams = [];

      // Role-based scoping: PARTNER can only see their own trainers
      if (user_role === 'PARTNER' && user_partner_id) {
        whereConditions.push('t.partner_id = ?');
        queryParams.push(user_partner_id);
      } else if (partner_id) {
        // ADMIN can filter by partner
        whereConditions.push('t.partner_id = ?');
        queryParams.push(partner_id);
      }

      // Filter by center
      if (center_id) {
        whereConditions.push('t.center_id = ?');
        queryParams.push(center_id);
      }

      // Filter by status
      if (status) {
        whereConditions.push('t.status = ?');
        queryParams.push(status);
      }

      // Search filter - search in trainer_name, email, mobile_no, course_name, qualification
      if (search) {
        whereConditions.push(
          '(t.trainer_name LIKE ? OR t.email LIKE ? OR t.mobile_no LIKE ? OR t.course_name LIKE ? OR t.qualification LIKE ?)'
        );
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Validate sort field
      const validSortBy = [
        'trainer_name',
        'email',
        'mobile_no',
        'course_name',
        'status',
        'created_at',
      ].includes(sort_by)
        ? sort_by
        : 'created_at';
      const validSortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Get total count
      let countQuery = `SELECT COUNT(*) as total FROM trainer_profiles t ${whereClause}`;
      const [countResult] = await db.query(countQuery, queryParams);
      const total = countResult[0]?.total || 0;

      // Get paginated results with partner and center details
      let dataQuery = `
        SELECT 
          t.*,
          p.name AS partner_name,
          c.center_name AS center_name
        FROM trainer_profiles t
        LEFT JOIN partners p ON t.partner_id = p.id
        LEFT JOIN centers c ON t.center_id = c.id
        ${whereClause}
        ORDER BY t.${validSortBy} ${validSortOrder}
        LIMIT ? OFFSET ?
      `;
      queryParams.push(validLimit, offset);

      const [trainers] = await db.query(dataQuery, queryParams);

      return {
        data: trainers || [],
        pagination: {
          total,
          page: validPage,
          limit: validLimit,
          pages: Math.ceil(total / validLimit),
        },
      };
    } catch (error) {
      console.error('[TrainerService.getAllTrainers] Error:', error);
      throw error;
    }
  }

  /**
   * Get trainer by ID
   * @param {string} trainerId - Trainer ID
   * @returns {Promise<Object>} Trainer data
   */
  static async getTrainerById(trainerId) {
    try {
      await TrainerService.ensureTrainerProfilesTable();

      const query = `
        SELECT 
          t.*,
          p.name AS partner_name,
          c.center_name AS center_name
        FROM trainer_profiles t
        LEFT JOIN partners p ON t.partner_id = p.id
        LEFT JOIN centers c ON t.center_id = c.id
        WHERE t.id = ?
      `;

      const [results] = await db.query(query, [trainerId]);

      if (results.length === 0) {
        throw new Error('Trainer not found');
      }

      return results[0];
    } catch (error) {
      console.error('[TrainerService.getTrainerById] Error:', error);
      throw error;
    }
  }

  /**
   * Create new trainer
   * @param {Object} data - Trainer data
   * @returns {Promise<string>} Trainer ID
   */
  static async createTrainer(data) {
    try {
      await TrainerService.ensureTrainerProfilesTable();

      const trainerId = uuidv4();
      const documents = data.documents || {};

      const query = `
        INSERT INTO trainer_profiles (
          id,
          partner_id,
          center_id,
          training_partner,
          training_centre_name,
          trainer_name,
          course_name,
          qualification,
          date_of_joining,
          mobile_no,
          email,
          resume_file_url,
          resume_file_name,
          qualification_certificate_url,
          qualification_certificate_name,
          id_proof_file_url,
          id_proof_file_name,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const values = [
        trainerId,
        data.partner_id,
        data.center_id,
        data.training_partner || null,
        data.training_centre_name || null,
        data.trainer_name,
        data.course_name || null,
        data.qualification || null,
        data.date_of_joining || null,
        data.mobile_no,
        data.email,
        documents.resume?.fileUrl || null,
        documents.resume?.fileName || null,
        documents.qualificationCertificate?.fileUrl || null,
        documents.qualificationCertificate?.fileName || null,
        documents.idProof?.fileUrl || null,
        documents.idProof?.fileName || null,
        'active',
      ];

      await db.query(query, values);

      return trainerId;
    } catch (error) {
      console.error('[TrainerService.createTrainer] Error:', error);
      throw error;
    }
  }

  /**
   * Update trainer
   * @param {string} trainerId - Trainer ID
   * @param {Object} data - Trainer data to update
   * @param {string} userRole - User role (for determining if hard or soft delete)
   * @returns {Promise<void>}
   */
  static async updateTrainer(trainerId, data, userRole) {
    try {
      await TrainerService.ensureTrainerProfilesTable();

      // Check if trainer exists
      const [existing] = await db.query('SELECT id FROM trainer_profiles WHERE id = ?', [trainerId]);

      if (existing.length === 0) {
        throw new Error('Trainer not found');
      }

      // For PARTNER users, they cannot change partner_id or center_id
      const updateData = { ...data };
      if (userRole === 'PARTNER') {
        delete updateData.partner_id;
        delete updateData.center_id;
      }

      const documentColumnMap = TrainerService.getDocumentColumnMap();
      Object.entries(documentColumnMap).forEach(([documentKey, columns]) => {
        const uploadedDocument = data.documents?.[documentKey];
        if (uploadedDocument) {
          updateData[columns.url] = uploadedDocument.fileUrl || null;
          updateData[columns.name] = uploadedDocument.fileName || null;
        }
      });
      delete updateData.documents;

      const fields = [];
      const values = [];

      Object.entries(updateData).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (fields.length === 0) {
        return; // No fields to update
      }

      values.push(trainerId);

      const query = `
        UPDATE trainer_profiles
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = ?
      `;

      await db.query(query, values);
    } catch (error) {
      console.error('[TrainerService.updateTrainer] Error:', error);
      throw error;
    }
  }

  /**
   * Delete trainer (soft delete for PARTNER, hard delete for ADMIN)
   * @param {string} trainerId - Trainer ID
   * @param {string} userRole - User role
   * @returns {Promise<void>}
   */
  static async deleteTrainer(trainerId, userRole) {
    try {
      await TrainerService.ensureTrainerProfilesTable();

      // Check if trainer exists
      const [existing] = await db.query('SELECT id, partner_id FROM trainer_profiles WHERE id = ?', [
        trainerId,
      ]);

      if (existing.length === 0) {
        throw new Error('Trainer not found');
      }

      if (userRole === 'PARTNER') {
        // Soft delete: set status to inactive
        await db.query('UPDATE trainer_profiles SET status = ?, updated_at = NOW() WHERE id = ?', [
          'inactive',
          trainerId,
        ]);
      } else {
        // Hard delete for ADMIN/SUPER_ADMIN
        await db.query('DELETE FROM trainer_profiles WHERE id = ?', [trainerId]);
      }
    } catch (error) {
      console.error('[TrainerService.deleteTrainer] Error:', error);
      throw error;
    }
  }

  /**
   * Get filter options (partners and centers for dropdowns)
   * @param {string} userRole - User role
   * @param {string} userPartnerId - User's partner ID (for PARTNER role)
   * @returns {Promise<Object>} Filter options
   */
  static async getFilterOptions(userRole, userPartnerId) {
    try {
      await TrainerService.ensureTrainerProfilesTable();

      let partnerQuery = '';
      let partnerParams = [];

      // For PARTNER role, only get their own partner
      if (userRole === 'PARTNER' && userPartnerId) {
        partnerQuery = 'SELECT id, name FROM partners WHERE id = ? AND status = ?';
        partnerParams = [userPartnerId, 'active'];
      } else {
        // For ADMIN/SUPER_ADMIN, get all active partners
        partnerQuery = 'SELECT id, name FROM partners WHERE status = ? ORDER BY name';
        partnerParams = ['active'];
      }

      const [partners] = await db.query(partnerQuery, partnerParams);

      // Get centers, scoped to the partner for partner users
      const centersQuery =
        userRole === 'PARTNER' && userPartnerId
          ? `
          SELECT id, center_name AS name, partner_id
          FROM centers
          WHERE status = ? AND partner_id = ?
          ORDER BY center_name
        `
          : `
          SELECT id, center_name AS name, partner_id
          FROM centers
          WHERE status = ?
          ORDER BY center_name
        `;

      const centersParams =
        userRole === 'PARTNER' && userPartnerId ? ['active', userPartnerId] : ['active'];

      const [centers] = await db.query(centersQuery, centersParams);

      return {
        partners: partners || [],
        centers: centers || [],
      };
    } catch (error) {
      console.error('[TrainerService.getFilterOptions] Error:', error);
      throw error;
    }
  }
}

module.exports = TrainerService;
