const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');
const { convertToUUID } = require('../../../utils/uuid.util');
const bcrypt = require('bcryptjs');
const emailService = require('../../../utils/email.util');

/**
 * Partner Service
 * Handles all business logic for partner management
 */
class PartnerService {
  /**
   * Get all partners with pagination, search, and filters
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.search - Search query
   * @param {string} options.status - Filter by status
   * @param {string} options.approval_status - Filter by approval status
   * @param {string} options.role - User role (for filtering based on approval status)
   * @returns {Promise<Object>} Partners data with pagination
   */
  async getAllPartners({
    page = 1,
    limit = 10,
    search = '',
    status = '',
    approval_status = '',
    role = '',
    type = '',
    city = '',
    state = '',
    sort_by = 'created_at',
    sort_order = 'desc',
  }) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      // Only ADMIN and SUPER_ADMIN can see pending partners
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        whereConditions.push('p.approval_status = ?');
        queryParams.push('approved');
      } else if (approval_status) {
        whereConditions.push('p.approval_status = ?');
        queryParams.push(approval_status);
      }

      // Status filter
      if (status) {
        whereConditions.push('p.status = ?');
        queryParams.push(status);
      }

      // Type filter
      if (type) {
        whereConditions.push('p.organization_type = ?');
        queryParams.push(type);
      }

      // City filter
      if (city) {
        whereConditions.push('p.city = ?');
        queryParams.push(city);
      }

      // State filter
      if (state) {
        whereConditions.push('p.state = ?');
        queryParams.push(state);
      }

      // Search filter
      if (search) {
        whereConditions.push(
          '(p.name LIKE ? OR p.id LIKE ? OR p.organization_type LIKE ? OR p.contact_person LIKE ? OR p.contact_email LIKE ? OR p.city LIKE ? OR p.state LIKE ?)'
        );
        const searchPattern = `%${search}%`;
        queryParams.push(
          searchPattern,
          searchPattern,
          searchPattern,
          searchPattern,
          searchPattern,
          searchPattern,
          searchPattern
        );
      }

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Validate sort field
      const allowedSortFields = [
        'name',
        'partner_id',
        'organization_type',
        'city',
        'state',
        'status',
        'created_at',
      ];
      const sortField = allowedSortFields.includes(sort_by) ? `p.${sort_by}` : 'p.created_at';
      const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // Get total count
      const countResult = await db.query(
        `SELECT COUNT(*) as total FROM partners p ${whereClause}`,
        queryParams
      );
      const total = countResult[0].total;

      // Get paginated data
      const partners = await db.query(
        `SELECT 
          p.*,
          u.full_name as approved_by_name,
          (SELECT COUNT(*) FROM centers WHERE partner_id = p.id AND approval_status = 'approved') as total_centers,
          (SELECT COUNT(*) FROM students WHERE partner_id = p.id) as total_students,
          (SELECT COUNT(*) FROM students WHERE partner_id = p.id AND gender = 'Male') as total_male_students,
          (SELECT COUNT(*) FROM students WHERE partner_id = p.id AND gender = 'Female') as total_female_students
        FROM partners p
        LEFT JOIN users u ON p.approved_by = u.id
        ${whereClause}
        ORDER BY ${sortField} ${sortDirection}
        LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      );

      return {
        data: partners,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getAllPartners:', error);
      throw error;
    }
  }

  /**
   * Get partner by ID
   * @param {string} id - Partner ID
   * @returns {Promise<Object>} Partner data
   */
  async getPartnerById(id) {
    try {
      const partnerId = convertToUUID(id);

      const partners = await db.query(
        `SELECT 
          p.*,
          u.full_name as approved_by_name,
          (SELECT COUNT(*) FROM centers WHERE partner_id = p.id AND approval_status = 'approved') as total_centers,
          (SELECT COUNT(*) FROM students WHERE partner_id = p.id) as total_students
        FROM partners p
        LEFT JOIN users u ON p.approved_by = u.id
        WHERE p.id = ?`,
        [partnerId]
      );

      if (partners.length === 0) {
        return null;
      }

      return partners[0];
    } catch (error) {
      console.error('Error in getPartnerById:', error);
      throw error;
    }
  }

  /**
   * Create new partner with comprehensive onboarding
   * @param {Object} partnerData - Partner data
   * @returns {Promise<Object>} Created partner with user account
   */
  async createPartner(partnerData) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const partnerId = uuidv4();
      const userId = uuidv4();

      const {
        // Basic Information
        name,
        organization_type,
        partner_email, // Email for login

        // Location Information
        country_id,
        state_id,
        city_id,
        region,
        address_line1,
        address_line2,
        postal_code,

        // Contact Information
        contact_person,
        contact_phone,
        contact_person_2_name,
        contact_person_2_mobile,

        // Legal Information
        date_of_incorporation,
        legal_status,
        registered_as,
        fcra_registration_number,
        years_of_experience,

        // Presence in States (array of state IDs)
        state_presence = [],

        // System fields
        status = 'active',
        registration_date,
      } = partnerData;

      // Get country, state, city names for storing in partners table
      let countryName = 'India';
      let stateName = null;
      let cityName = null;

      if (country_id) {
        const countryResult = await connection.query('SELECT name FROM countries WHERE id = ?', [
          country_id,
        ]);
        if (countryResult[0] && countryResult[0].length > 0) {
          countryName = countryResult[0][0].name;
        }
      }

      if (state_id) {
        const stateResult = await connection.query('SELECT name FROM states WHERE id = ?', [
          state_id,
        ]);
        if (stateResult[0] && stateResult[0].length > 0) {
          stateName = stateResult[0][0].name;
        }
      }

      if (city_id) {
        const cityResult = await connection.query('SELECT name FROM cities WHERE id = ?', [
          city_id,
        ]);
        if (cityResult[0] && cityResult[0].length > 0) {
          cityName = cityResult[0][0].name;
        }
      }

      // Generate readable partner_id
      const countResult = await connection.query(
        'SELECT COALESCE(MAX(CAST(SUBSTRING(partner_id, 6) AS UNSIGNED)), 0) + 1 as next_id FROM partners'
      );

      // Debug log
      console.log('Count result:', countResult);

      // Extract next_id from query result
      // Result format: [ [ { next_id: '2' } ], metadata ]
      let nextNumber = 1; // Default to 1 if no partners exist

      if (countResult && countResult.length > 0 && countResult[0].length > 0) {
        const result = countResult[0][0];
        nextNumber = result?.next_id;

        // Convert to number and validate
        if (nextNumber !== undefined && nextNumber !== null) {
          nextNumber = parseInt(nextNumber, 10);
          if (isNaN(nextNumber) || nextNumber < 1) {
            nextNumber = 1;
          }
        } else {
          nextNumber = 1;
        }
      }

      console.log('Next partner number:', nextNumber);
      const readablePartnerId = `ORG-${String(nextNumber).padStart(4, '0')}`;

      // Insert partner record with BOTH text names AND reference IDs
      await connection.query(
        `INSERT INTO partners (
          id, partner_id, name, organization_type, contact_person, contact_email, contact_phone,
          contact_person_2_name, contact_person_2_mobile,
          address_line1, address_line2, city, state, country, postal_code, region,
          country_ref_id, state_ref_id, city_ref_id,
          date_of_incorporation, legal_status, registered_as, fcra_registration_number,
          years_of_experience, status, approval_status, registration_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          partnerId,
          readablePartnerId,
          name,
          organization_type,
          contact_person,
          partner_email,
          contact_phone,
          contact_person_2_name || null,
          contact_person_2_mobile || null,
          address_line1,
          address_line2 || null,
          cityName,
          stateName,
          countryName,
          postal_code || null,
          region || null,
          country_id || null,
          state_id || null,
          city_id || null,
          date_of_incorporation || null,
          legal_status || null,
          registered_as || null,
          fcra_registration_number || null,
          years_of_experience || null,
          status,
          'approved', // Auto-approved when admin creates
          registration_date || null,
        ]
      );

      // Insert partner state presence (if provided)
      if (state_presence && state_presence.length > 0) {
        const presenceValues = state_presence.map((stateId) => [partnerId, stateId]);
        await connection.query(
          'INSERT INTO partner_state_presence (partner_id, state_id) VALUES ?',
          [presenceValues]
        );
      }

      // Generate temporary password
      const tempPassword = emailService.generatePassword(12);
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Create user account for partner login
      await connection.query(
        `INSERT INTO users (
          id, email, password_hash, full_name, mobile_number, 
          role, partner_id, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          partner_email,
          passwordHash,
          contact_person, // Use primary contact person as full name
          contact_phone,
          'PARTNER', // Role for partner login
          partnerId,
          'active',
        ]
      );

      await connection.commit();

      // Send welcome email with credentials (async, don't wait)
      emailService
        .sendPartnerWelcomeEmail({
          email: partner_email,
          name: name,
          partnerId: readablePartnerId,
          tempPassword: tempPassword,
        })
        .catch((err) => {
          console.error('Failed to send welcome email:', err);
          // Don't throw error - partner creation succeeded
        });

      // Return created partner
      connection.release();
      return await this.getPartnerById(partnerId);
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('Error in createPartner:', error);
      throw error;
    }
  }

  /**
   * Update partner
   * @param {string} id - Partner ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated partner
   */
  async updatePartner(id, updateData) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const partnerId = convertToUUID(id);

      // Check if partner exists
      const existingPartner = await this.getPartnerById(partnerId);
      if (!existingPartner) {
        throw new Error('Partner not found');
      }

      const {
        // Basic Information
        name,
        organization_type,
        partner_email,

        // Location Information
        country_id,
        state_id,
        city_id,
        region,
        address_line1,
        address_line2,
        postal_code,

        // Contact Information
        contact_person,
        contact_phone,
        contact_person_2_name,
        contact_person_2_mobile,

        // Legal Information
        date_of_incorporation,
        legal_status,
        registered_as,
        fcra_registration_number,
        years_of_experience,

        // Presence in States
        state_presence,

        // System fields
        status,
        registration_date,
      } = updateData;

      const updates = [];
      const values = [];

      // Basic fields
      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (organization_type !== undefined) {
        updates.push('organization_type = ?');
        values.push(organization_type);
      }
      if (partner_email !== undefined) {
        updates.push('contact_email = ?');
        values.push(partner_email);
      }

      // Contact Information
      if (contact_person !== undefined) {
        updates.push('contact_person = ?');
        values.push(contact_person);
      }
      if (contact_phone !== undefined) {
        updates.push('contact_phone = ?');
        values.push(contact_phone);
      }
      if (contact_person_2_name !== undefined) {
        updates.push('contact_person_2_name = ?');
        values.push(contact_person_2_name || null);
      }
      if (contact_person_2_mobile !== undefined) {
        updates.push('contact_person_2_mobile = ?');
        values.push(contact_person_2_mobile || null);
      }

      // Address fields
      if (address_line1 !== undefined) {
        updates.push('address_line1 = ?');
        values.push(address_line1);
      }
      if (address_line2 !== undefined) {
        updates.push('address_line2 = ?');
        values.push(address_line2 || null);
      }
      if (postal_code !== undefined) {
        updates.push('postal_code = ?');
        values.push(postal_code || null);
      }
      if (region !== undefined) {
        updates.push('region = ?');
        values.push(region || null);
      }

      // Location - handle both reference IDs AND text names
      if (country_id !== undefined) {
        updates.push('country_ref_id = ?');
        values.push(country_id || null);

        // Get country name
        if (country_id) {
          const countryResult = await connection.query('SELECT name FROM countries WHERE id = ?', [
            country_id,
          ]);
          if (countryResult[0].length > 0) {
            updates.push('country = ?');
            values.push(countryResult[0][0].name);
          }
        } else {
          updates.push('country = ?');
          values.push(null);
        }
      }

      if (state_id !== undefined) {
        updates.push('state_ref_id = ?');
        values.push(state_id || null);

        // Get state name
        if (state_id) {
          const stateResult = await connection.query('SELECT name FROM states WHERE id = ?', [
            state_id,
          ]);
          if (stateResult[0].length > 0) {
            updates.push('state = ?');
            values.push(stateResult[0][0].name);
          }
        } else {
          updates.push('state = ?');
          values.push(null);
        }
      }

      if (city_id !== undefined) {
        updates.push('city_ref_id = ?');
        values.push(city_id || null);

        // Get city name
        if (city_id) {
          const cityResult = await connection.query('SELECT name FROM cities WHERE id = ?', [
            city_id,
          ]);
          if (cityResult[0].length > 0) {
            updates.push('city = ?');
            values.push(cityResult[0][0].name);
          }
        } else {
          updates.push('city = ?');
          values.push(null);
        }
      }

      // Legal Information
      if (date_of_incorporation !== undefined) {
        updates.push('date_of_incorporation = ?');
        values.push(date_of_incorporation || null);
      }
      if (legal_status !== undefined) {
        updates.push('legal_status = ?');
        values.push(legal_status || null);
      }
      if (registered_as !== undefined) {
        updates.push('registered_as = ?');
        values.push(registered_as || null);
      }
      if (fcra_registration_number !== undefined) {
        updates.push('fcra_registration_number = ?');
        values.push(fcra_registration_number || null);
      }
      if (years_of_experience !== undefined) {
        updates.push('years_of_experience = ?');
        values.push(years_of_experience || null);
      }

      // System fields
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }
      if (registration_date !== undefined) {
        updates.push('registration_date = ?');
        values.push(registration_date || null);
      }

      // Update state presence if provided
      if (state_presence !== undefined) {
        // Delete existing state presence
        await connection.query('DELETE FROM partner_state_presence WHERE partner_id = ?', [
          partnerId,
        ]);

        // Insert new state presence
        if (state_presence && state_presence.length > 0) {
          const presenceValues = state_presence.map((stateId) => [partnerId, stateId]);
          await connection.query(
            'INSERT INTO partner_state_presence (partner_id, state_id) VALUES ?',
            [presenceValues]
          );
        }
      }

      if (updates.length === 0) {
        await connection.commit();
        connection.release();
        return existingPartner;
      }

      values.push(partnerId);

      await connection.query(`UPDATE partners SET ${updates.join(', ')} WHERE id = ?`, values);

      await connection.commit();
      connection.release();

      return await this.getPartnerById(partnerId);
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('Error in updatePartner:', error);
      throw error;
    }
  }

  /**
   * Delete partner
   * @param {string} id - Partner ID
   * @returns {Promise<boolean>} Success status
   */
  async deletePartner(id) {
    try {
      const partnerId = convertToUUID(id);

      // Check if partner exists
      const existingPartner = await this.getPartnerById(partnerId);
      if (!existingPartner) {
        throw new Error('Partner not found');
      }

      // Check if partner has centers
      const centers = await db.query('SELECT COUNT(*) as count FROM centers WHERE partner_id = ?', [
        partnerId,
      ]);

      if (centers[0].count > 0) {
        throw new Error(
          'Cannot delete partner with existing centers. Please delete all centers first.'
        );
      }

      // Delete associated user accounts (partner login accounts are automatically created)
      // This only deletes users with role='PARTNER' linked to this partner
      await db.query("DELETE FROM users WHERE partner_id = ? AND role = 'PARTNER'", [partnerId]);

      // Delete the partner
      await db.query('DELETE FROM partners WHERE id = ?', [partnerId]);

      return true;
    } catch (error) {
      console.error('Error in deletePartner:', error);
      throw error;
    }
  }

  /**
   * Approve partner
   * @param {string} id - Partner ID
   * @param {string} approvedBy - User ID who approved
   * @returns {Promise<Object>} Updated partner
   */
  async approvePartner(id, approvedBy) {
    try {
      const partnerId = convertToUUID(id);
      const approverUserId = convertToUUID(approvedBy);

      const existingPartner = await this.getPartnerById(partnerId);
      if (!existingPartner) {
        throw new Error('Partner not found');
      }

      if (existingPartner.approval_status === 'approved') {
        throw new Error('Partner is already approved');
      }

      await db.query(
        `UPDATE partners 
        SET approval_status = 'approved', 
            approved_by = ?, 
            approved_at = NOW(),
            rejection_reason = NULL
        WHERE id = ?`,
        [approverUserId, partnerId]
      );

      return await this.getPartnerById(partnerId);
    } catch (error) {
      console.error('Error in approvePartner:', error);
      throw error;
    }
  }

  /**
   * Reject partner
   * @param {string} id - Partner ID
   * @param {string} rejectedBy - User ID who rejected
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Updated partner
   */
  async rejectPartner(id, rejectedBy, reason) {
    try {
      const partnerId = convertToUUID(id);
      const rejecterUserId = convertToUUID(rejectedBy);

      const existingPartner = await this.getPartnerById(partnerId);
      if (!existingPartner) {
        throw new Error('Partner not found');
      }

      await db.query(
        `UPDATE partners 
        SET approval_status = 'rejected', 
            approved_by = ?, 
            approved_at = NOW(),
            rejection_reason = ?
        WHERE id = ?`,
        [rejecterUserId, reason, partnerId]
      );

      return await this.getPartnerById(partnerId);
    } catch (error) {
      console.error('Error in rejectPartner:', error);
      throw error;
    }
  }

  /**
   * Export partners as CSV data
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Partners data for CSV
   */
  async exportPartners(filters = {}) {
    try {
      const { role, status, approval_status, search } = filters;

      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        whereConditions.push('approval_status = ?');
        queryParams.push('approved');
      } else if (approval_status) {
        whereConditions.push('approval_status = ?');
        queryParams.push(approval_status);
      }

      if (status) {
        whereConditions.push('status = ?');
        queryParams.push(status);
      }

      if (search) {
        whereConditions.push('(name LIKE ? OR contact_person LIKE ? OR contact_email LIKE ?)');
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const partners = await db.query(
        `SELECT 
          name as 'Partner Name',
          organization_type as 'Organization Type',
          contact_person as 'Contact Person',
          contact_email as 'Contact Email',
          contact_phone as 'Contact Phone',
          address_line1 as 'Address Line 1',
          address_line2 as 'Address Line 2',
          city as 'City',
          state as 'State',
          country as 'Country',
          postal_code as 'Postal Code',
          status as 'Status',
          approval_status as 'Approval Status',
          registration_date as 'Registration Date',
          created_at as 'Created At'
        FROM partners
        ${whereClause}
        ORDER BY created_at DESC`,
        queryParams
      );

      return partners;
    } catch (error) {
      console.error('Error in exportPartners:', error);
      throw error;
    }
  }

  /**
   * Get rejected uploads for partner (uploads with at least one rejected center)
   * @param {string} partnerId - Partner ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Rejected uploads with pagination
   */
  async getRejectedUploads(partnerId, { page = 1, limit = 10, search = '' }) {
    try {
      const partnerUuid = convertToUUID(partnerId);
      const offset = (page - 1) * limit;

      let whereConditions = ['du.partner_id = ?', 'du.deleted_at IS NULL'];
      let queryParams = [partnerUuid];

      // Search filter
      if (search) {
        whereConditions.push('(du.file_name LIKE ? OR du.id LIKE ?)');
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get uploads that have at least one rejected center
      const countResult = await db.query(
        `SELECT COUNT(DISTINCT du.id) as total 
        FROM data_uploads du
        INNER JOIN uploaded_centers uc ON du.id = uc.data_upload_id
        WHERE ${whereClause} AND uc.review_status = 'rejected'`,
        queryParams
      );
      const total = countResult[0].total;

      // Get paginated data
      const uploads = await db.query(
        `SELECT 
          du.*,
          u.full_name as uploaded_by_name,
          COUNT(DISTINCT CASE WHEN uc.review_status = 'rejected' THEN uc.id END) as rejected_centers_count,
          COUNT(DISTINCT CASE WHEN uc.review_status = 'approved' THEN uc.id END) as approved_centers_count,
          COUNT(DISTINCT CASE WHEN uc.review_status = 'pending' THEN uc.id END) as pending_centers_count,
          SUM(CASE WHEN uc.review_status = 'rejected' THEN (
            SELECT COUNT(*) FROM uploaded_students WHERE uploaded_center_id = uc.id
          ) ELSE 0 END) as rejected_students_count
        FROM data_uploads du
        INNER JOIN uploaded_centers uc ON du.id = uc.data_upload_id
        LEFT JOIN users u ON du.uploaded_by = u.id
        WHERE ${whereClause} AND uc.review_status = 'rejected'
        GROUP BY du.id
        ORDER BY du.created_at DESC
        LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
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
      console.error('Error in getRejectedUploads:', error);
      throw error;
    }
  }

  /**
   * Get all centers for a specific upload (both approved and rejected)
   * @param {string} uploadId - Upload ID
   * @param {string} partnerId - Partner ID
   * @returns {Promise<Object>} Upload info and all centers
   */
  async getRejectedCenters(uploadId, partnerId) {
    try {
      const uploadUuid = convertToUUID(uploadId);
      const partnerUuid = convertToUUID(partnerId);

      // Verify upload belongs to partner and get upload details
      const upload = await db.query(
        `SELECT 
          du.*,
          u.full_name as uploaded_by_name
        FROM data_uploads du
        LEFT JOIN users u ON du.uploaded_by = u.id
        WHERE du.id = ? AND du.partner_id = ? AND du.deleted_at IS NULL`,
        [uploadUuid, partnerUuid]
      );

      if (upload.length === 0) {
        throw new Error('Upload not found or unauthorized');
      }

      // Get ALL centers with student count and review status
      const centers = await db.query(
        `SELECT 
          uc.*,
          (SELECT COUNT(*) FROM uploaded_students WHERE uploaded_center_id = uc.id) as student_count,
          (SELECT COUNT(DISTINCT uploaded_batch_id) FROM uploaded_students WHERE uploaded_center_id = uc.id) as batch_count,
          u.full_name as reviewed_by_name
        FROM uploaded_centers uc
        LEFT JOIN users u ON uc.reviewed_by = u.id
        WHERE uc.data_upload_id = ?
        ORDER BY uc.review_status DESC, uc.center_name`,
        [uploadUuid]
      );

      return {
        upload: upload[0],
        centers,
      };
    } catch (error) {
      console.error('Error in getRejectedCenters:', error);
      throw error;
    }
  }

  /**
   * Get students for a specific center (for partner editing)
   * @param {string} uploadId - Upload ID
   * @param {string} centerId - Center ID
   * @param {string} partnerId - Partner ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Students with pagination
   */
  async getCenterStudentsForEdit(
    uploadId,
    centerId,
    partnerId,
    { page = 1, limit = 50, search = '' }
  ) {
    try {
      const uploadUuid = convertToUUID(uploadId);
      const centerUuid = convertToUUID(centerId);
      const partnerUuid = convertToUUID(partnerId);

      // Verify upload and center belong to partner
      const center = await db.query(
        `SELECT uc.*, du.partner_id
        FROM uploaded_centers uc
        INNER JOIN data_uploads du ON uc.data_upload_id = du.id
        WHERE uc.id = ? AND uc.data_upload_id = ? AND du.partner_id = ?`,
        [centerUuid, uploadUuid, partnerUuid]
      );

      if (center.length === 0) {
        throw new Error('Center not found or unauthorized');
      }

      // Only allow editing rejected centers, not pending ones
      if (center[0].review_status !== 'rejected') {
        throw new Error(
          'Only rejected centers can be edited. This center is currently ' + center[0].review_status
        );
      }

      const offset = (page - 1) * limit;
      let whereConditions = ['us.uploaded_center_id = ?'];
      let queryParams = [centerUuid];

      // Search filter
      if (search) {
        whereConditions.push(
          '(us.student_name LIKE ? OR us.partner_student_id LIKE ? OR us.email LIKE ?)'
        );
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countResult = await db.query(
        `SELECT COUNT(*) as total 
        FROM uploaded_students us
        WHERE ${whereClause}`,
        queryParams
      );
      const total = countResult[0].total;

      // Get paginated students
      const students = await db.query(
        `SELECT 
          us.*,
          ub.batch_number
        FROM uploaded_students us
        LEFT JOIN uploaded_batches ub ON us.uploaded_batch_id = ub.id
        WHERE ${whereClause}
        ORDER BY us.student_name
        LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      );

      return {
        center: center[0],
        students,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getCenterStudentsForEdit:', error);
      throw error;
    }
  }

  /**
   * Get available batches for a center
   * @param {string} centerId - Center ID (from centers table, not uploaded_centers)
   * @param {string} partnerId - Partner ID
   * @returns {Promise<Array>} Available batches
   */
  async getCenterBatches(centerId, partnerId) {
    try {
      const centerUuid = convertToUUID(centerId);
      const partnerUuid = convertToUUID(partnerId);

      // Get batches from production centers table
      const batches = await db.query(
        `SELECT 
          b.id,
          b.batch_number,
          b.batch_start_date,
          b.batch_complete_date,
          b.total_students,
          b.status
        FROM batches b
        INNER JOIN centers c ON b.center_id = c.id
        WHERE c.id = ? AND c.partner_id = ? AND b.status = 'active'
        ORDER BY b.batch_start_date DESC`,
        [centerUuid, partnerUuid]
      );

      return batches;
    } catch (error) {
      console.error('Error in getCenterBatches:', error);
      throw error;
    }
  }

  /**
   * Save student edits (temporary update to uploaded_students)
   * @param {string} uploadId - Upload ID
   * @param {string} centerId - Center ID
   * @param {string} partnerId - Partner ID
   * @param {Array} students - Array of edited student records
   * @param {string} userId - User ID who made the edits
   * @returns {Promise<Object>} Updated students count
   */
  async saveStudentEdits(uploadId, centerId, partnerId, students, userId) {
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();

      const uploadUuid = convertToUUID(uploadId);
      const centerUuid = convertToUUID(centerId);
      const partnerUuid = convertToUUID(partnerId);
      const userUuid = convertToUUID(userId);

      // Verify authorization
      const [center] = await connection.query(
        `SELECT uc.id, uc.review_status FROM uploaded_centers uc
        INNER JOIN data_uploads du ON uc.data_upload_id = du.id
        WHERE uc.id = ? AND uc.data_upload_id = ? AND du.partner_id = ?`,
        [centerUuid, uploadUuid, partnerUuid]
      );

      if (!center || center.length === 0) {
        throw new Error('Unauthorized or center not found');
      }

      // Only allow editing rejected centers
      if (center[0].review_status !== 'rejected') {
        throw new Error(
          'Only rejected centers can be edited. This center is currently ' + center[0].review_status
        );
      }

      let updatedCount = 0;

      // Update each student
      for (const student of students) {
        const studentUuid = convertToUUID(student.id);

        // Get original student data for logging changes
        const [originalStudent] = await connection.query(
          'SELECT * FROM uploaded_students WHERE id = ?',
          [studentUuid]
        );

        if (!originalStudent || originalStudent.length === 0) {
          continue;
        }

        const original = originalStudent[0];
        let hasChanges = false;

        // Update student record
        await connection.query(
          `UPDATE uploaded_students 
          SET 
            student_name = ?,
            date_of_birth = ?,
            gender = ?,
            mobile_number = ?,
            email = ?,
            address = ?,
            city = ?,
            state = ?,
            course_name = ?,
            course_duration_months = ?,
            training_status = ?,
            enrollment_date = ?,
            is_edited = 1,
            updated_at = NOW()
          WHERE id = ?`,
          [
            student.student_name,
            student.date_of_birth,
            student.gender,
            student.mobile_number,
            student.email,
            student.address,
            student.city,
            student.state,
            student.course_name,
            student.course_duration_months,
            student.training_status,
            student.enrollment_date,
            studentUuid,
          ]
        );

        // Log individual field changes for highlighting
        const fieldsToCheck = [
          'student_name',
          'date_of_birth',
          'gender',
          'mobile_number',
          'email',
          'address',
          'city',
          'state',
          'course_name',
          'course_duration_months',
          'training_status',
          'enrollment_date',
        ];

        for (const field of fieldsToCheck) {
          const oldValue = original[field];
          const newValue = student[field];

          // Compare values (handle null/undefined)
          if (String(oldValue) !== String(newValue)) {
            hasChanges = true;
            await connection.query(
              `INSERT INTO data_edit_logs 
              (id, upload_id, version, table_name, record_id, field_name, old_value, new_value, edited_by, edit_type, created_at)
              VALUES (?, ?, ?, 'uploaded_students', ?, ?, ?, ?, ?, 'update', NOW())`,
              [
                uuidv4(),
                uploadUuid,
                1, // Version 1 (edits before resubmit)
                studentUuid,
                field,
                oldValue,
                newValue,
                userUuid,
              ]
            );
          }
        }

        if (hasChanges) {
          updatedCount++;
        }
      }

      await connection.commit();

      return {
        success: true,
        updatedCount,
        message: `Successfully saved ${updatedCount} student edits`,
      };
    } catch (error) {
      await connection.rollback();
      console.error('Error in saveStudentEdits:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Upload CSV and perform smart merge (detect changes only)
   * @param {string} uploadId - Upload ID
   * @param {string} centerId - Center ID
   * @param {string} partnerId - Partner ID
   * @param {Array} csvStudents - Parsed CSV student records
   * @param {string} userId - User ID who uploaded
   * @returns {Promise<Object>} Merge results
   */
  async uploadCsvSmartMerge(uploadId, centerId, partnerId, csvStudents, userId) {
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();

      const uploadUuid = convertToUUID(uploadId);
      const centerUuid = convertToUUID(centerId);
      const partnerUuid = convertToUUID(partnerId);
      const userUuid = convertToUUID(userId);

      // Verify authorization
      const [center] = await connection.query(
        `SELECT uc.*, c.id as production_center_id FROM uploaded_centers uc
        INNER JOIN data_uploads du ON uc.data_upload_id = du.id
        LEFT JOIN centers c ON c.center_name = uc.center_name AND c.partner_id = du.partner_id
        WHERE uc.id = ? AND uc.data_upload_id = ? AND du.partner_id = ?`,
        [centerUuid, uploadUuid, partnerUuid]
      );

      if (!center || center.length === 0) {
        throw new Error('Unauthorized or center not found');
      }

      const centerInfo = center[0];
      const productionCenterId = centerInfo.production_center_id;

      if (!productionCenterId) {
        throw new Error('Center must exist in production to upload CSV data');
      }

      // Get existing students for this upload center
      const [existingStudents] = await connection.query(
        'SELECT * FROM uploaded_students WHERE uploaded_center_id = ?',
        [centerUuid]
      );

      let matchedCount = 0;
      let updatedCount = 0;
      let newStudentCount = 0;
      const warnings = [];

      // Create map of existing students by name + DOB
      const existingMap = new Map();
      existingStudents.forEach((student) => {
        const key = `${student.student_name}_${student.date_of_birth}`;
        existingMap.set(key, student);
      });

      // Process each CSV row
      for (const csvStudent of csvStudents) {
        const key = `${csvStudent.student_name}_${csvStudent.date_of_birth}`;
        const existingStudent = existingMap.get(key);

        if (existingStudent) {
          // Student matched - check for changes
          matchedCount++;
          let hasChanges = false;

          const fieldsToCheck = [
            'student_name',
            'date_of_birth',
            'gender',
            'mobile_number',
            'email',
            'address',
            'city',
            'state',
            'course_name',
            'course_duration_months',
            'training_status',
            'enrollment_date',
          ];

          const studentUuid = existingStudent.id;

          // Check batch number - validate it exists
          let batchWarning = null;
          if (csvStudent.batch_number && csvStudent.batch_number !== existingStudent.batch_number) {
            const [batches] = await connection.query(
              `SELECT b.id FROM batches b
              INNER JOIN centers c ON b.center_id = c.id
              WHERE c.id = ? AND b.batch_number = ?`,
              [productionCenterId, csvStudent.batch_number]
            );

            if (batches.length === 0) {
              // Batch doesn't exist - add warning but don't update
              batchWarning = `Student "${csvStudent.student_name}": Batch "${csvStudent.batch_number}" not found. Available batches will be suggested.`;
              warnings.push(batchWarning);
            }
          }

          // Update student record and log changes
          for (const field of fieldsToCheck) {
            const oldValue = existingStudent[field];
            const newValue = csvStudent[field];

            if (String(oldValue) !== String(newValue)) {
              hasChanges = true;

              // Update the field
              await connection.query(
                `UPDATE uploaded_students SET ${field} = ?, is_edited = 1, updated_at = NOW() WHERE id = ?`,
                [newValue, studentUuid]
              );

              // Log the change
              await connection.query(
                `INSERT INTO data_edit_logs 
                (id, upload_id, version, table_name, record_id, field_name, old_value, new_value, edited_by, edit_type, created_at)
                VALUES (?, ?, ?, 'uploaded_students', ?, ?, ?, ?, ?, 'update', NOW())`,
                [uuidv4(), uploadUuid, 1, studentUuid, field, oldValue, newValue, userUuid]
              );
            }
          }

          if (hasChanges) {
            updatedCount++;
          }
        } else {
          // New student not in original upload - add with warning
          newStudentCount++;
          warnings.push(
            `New student "${csvStudent.student_name}" (DOB: ${csvStudent.date_of_birth}) will be added to the upload.`
          );

          // Get or create batch
          const [batch] = await connection.query(
            'SELECT id FROM uploaded_batches WHERE uploaded_center_id = ? AND batch_number = ?',
            [centerUuid, csvStudent.batch_number]
          );

          let batchId;
          if (batch.length === 0) {
            // Create new batch in uploaded_batches
            const newBatchId = uuidv4();
            await connection.query(
              `INSERT INTO uploaded_batches 
              (id, data_upload_id, csv_center_id, uploaded_center_id, partner_id, batch_number, batch_start_date, batch_complete_date, total_students, male_students, female_students, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, NOW())`,
              [
                newBatchId,
                uploadUuid,
                centerInfo.csv_center_id,
                centerUuid,
                partnerUuid,
                csvStudent.batch_number,
                csvStudent.batch_start_date || null,
                csvStudent.batch_complete_date || null,
              ]
            );
            batchId = newBatchId;
          } else {
            batchId = batch[0].id;
          }

          // Insert new student
          const newStudentId = uuidv4();
          await connection.query(
            `INSERT INTO uploaded_students 
            (id, data_upload_id, csv_center_id, uploaded_batch_id, uploaded_center_id, partner_id, partner_student_id, student_name, date_of_birth, gender, mobile_number, email, address, city, state, enrollment_date, course_name, course_duration_months, training_status, is_edited, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
            [
              newStudentId,
              uploadUuid,
              centerInfo.csv_center_id,
              batchId,
              centerUuid,
              partnerUuid,
              csvStudent.partner_student_id,
              csvStudent.student_name,
              csvStudent.date_of_birth,
              csvStudent.gender,
              csvStudent.mobile_number,
              csvStudent.email,
              csvStudent.address,
              csvStudent.city,
              csvStudent.state,
              csvStudent.enrollment_date,
              csvStudent.course_name,
              csvStudent.course_duration_months,
              csvStudent.training_status,
            ]
          );
        }
      }

      await connection.commit();

      return {
        success: true,
        matchedCount,
        updatedCount,
        newStudentCount,
        totalProcessed: csvStudents.length,
        warnings,
        message: `Processed ${csvStudents.length} students: ${matchedCount} matched, ${updatedCount} updated, ${newStudentCount} new`,
      };
    } catch (error) {
      await connection.rollback();
      console.error('Error in uploadCsvSmartMerge:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Resubmit upload (create Version 2)
   * @param {string} uploadId - Original upload ID
   * @param {string} partnerId - Partner ID
   * @param {string} userId - User ID who is resubmitting
   * @returns {Promise<Object>} New upload details
   */
  async resubmitUpload(uploadId, partnerId, userId) {
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();

      const uploadUuid = convertToUUID(uploadId);
      const partnerUuid = convertToUUID(partnerId);
      const userUuid = convertToUUID(userId);

      // Get original upload
      const [originalUpload] = await connection.query(
        'SELECT * FROM data_uploads WHERE id = ? AND partner_id = ?',
        [uploadUuid, partnerUuid]
      );

      if (!originalUpload || originalUpload.length === 0) {
        throw new Error('Upload not found or unauthorized');
      }

      const original = originalUpload[0];

      // Check if there are any rejected centers (only rejected can be resubmitted)
      const [rejectedCenters] = await connection.query(
        `SELECT COUNT(*) as count FROM uploaded_centers
        WHERE data_upload_id = ? AND review_status = 'rejected'`,
        [uploadUuid]
      );

      if (rejectedCenters[0].count === 0) {
        throw new Error(
          'No rejected centers to resubmit. Only rejected centers can be edited and resubmitted.'
        );
      }

      // Check if there are any edited students
      const [editedStudents] = await connection.query(
        `SELECT COUNT(*) as count FROM uploaded_students us
        INNER JOIN uploaded_centers uc ON us.uploaded_center_id = uc.id
        WHERE uc.data_upload_id = ? AND us.is_edited = 1`,
        [uploadUuid]
      );

      if (editedStudents[0].count === 0) {
        throw new Error(
          'No changes detected. Please edit at least one student before resubmitting.'
        );
      }

      // Create Version 2
      const newUploadId = uuidv4();
      const version = (original.version || 1) + 1;
      const parentUploadId = original.parent_upload_id || uploadUuid;

      await connection.query(
        `INSERT INTO data_uploads 
        (id, partner_id, upload_type, file_name, file_url, total_records, total_centers, total_batches, total_students, centers_total, centers_reviewed, centers_approved, centers_rejected, review_progress, status, uploaded_by, version, parent_upload_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'not_started', 'pending', ?, ?, ?, NOW())`,
        [
          newUploadId,
          partnerUuid,
          original.upload_type,
          original.file_name.replace(/\.csv$/, `_v${version}.csv`),
          original.file_url,
          original.total_records,
          original.total_centers,
          original.total_batches,
          original.total_students,
          original.centers_total,
          userUuid,
          version,
          parentUploadId,
        ]
      );

      // Update original rejected centers to pending (awaiting re-review)
      await connection.query(
        `UPDATE uploaded_centers 
         SET review_status = 'pending', reviewed_by = NULL, reviewed_at = NULL
         WHERE data_upload_id = ? AND review_status = 'rejected'`,
        [uploadUuid]
      );

      // Update original rejected batches to pending
      await connection.query(
        `UPDATE uploaded_batches ub
         INNER JOIN uploaded_centers uc ON ub.uploaded_center_id = uc.id
         SET ub.review_status = 'pending', ub.reviewed_by = NULL, ub.reviewed_at = NULL
         WHERE uc.data_upload_id = ? AND ub.review_status = 'rejected'`,
        [uploadUuid]
      );

      // Update original rejected students to pending
      await connection.query(
        `UPDATE uploaded_students us
         INNER JOIN uploaded_centers uc ON us.uploaded_center_id = uc.id
         SET us.review_status = 'pending', us.reviewed_by = NULL, us.reviewed_at = NULL
         WHERE uc.data_upload_id = ? AND us.review_status = 'rejected'`,
        [uploadUuid]
      );

      // Update parent upload counts to reflect pending status (resubmit resets rejected to pending)
      await connection.query(
        `UPDATE data_uploads 
         SET centers_rejected = 0,
             centers_reviewed = centers_approved,
             review_progress = CASE 
               WHEN centers_approved >= centers_total THEN 'completed'
               WHEN centers_approved > 0 THEN 'in_progress'
               ELSE 'not_started'
             END
         WHERE id = ?`,
        [uploadUuid]
      );

      // Copy centers (only previously rejected, now pending ones)
      const [centersToResubmit] = await connection.query(
        'SELECT * FROM uploaded_centers WHERE data_upload_id = ? AND review_status = "pending"',
        [uploadUuid]
      );

      for (const center of centersToResubmit) {
        const newCenterId = uuidv4();

        await connection.query(
          `INSERT INTO uploaded_centers 
          (id, data_upload_id, partner_id, csv_center_id, center_name, center_type, region, city, state, address, year_of_establishment, status, center_head, mobile_number, email, review_status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
          [
            newCenterId,
            newUploadId,
            partnerUuid,
            center.csv_center_id,
            center.center_name,
            center.center_type,
            center.region,
            center.city,
            center.state,
            center.address,
            center.year_of_establishment,
            center.status,
            center.center_head,
            center.mobile_number,
            center.email,
          ]
        );

        // Copy batches for this center
        const [batches] = await connection.query(
          'SELECT * FROM uploaded_batches WHERE uploaded_center_id = ?',
          [center.id]
        );

        for (const batch of batches) {
          const newBatchId = uuidv4();

          await connection.query(
            `INSERT INTO uploaded_batches 
            (id, data_upload_id, csv_center_id, uploaded_center_id, partner_id, batch_number, batch_start_date, batch_complete_date, total_students, male_students, female_students, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              newBatchId,
              newUploadId,
              batch.csv_center_id,
              newCenterId,
              partnerUuid,
              batch.batch_number,
              batch.batch_start_date,
              batch.batch_complete_date,
              batch.total_students,
              batch.male_students,
              batch.female_students,
            ]
          );

          // Copy students for this batch
          const [students] = await connection.query(
            'SELECT * FROM uploaded_students WHERE uploaded_batch_id = ?',
            [batch.id]
          );

          for (const student of students) {
            const newStudentId = uuidv4();

            await connection.query(
              `INSERT INTO uploaded_students 
              (id, data_upload_id, csv_center_id, uploaded_batch_id, uploaded_center_id, partner_id, partner_student_id, student_name, date_of_birth, gender, mobile_number, email, address, city, state, enrollment_date, course_name, course_duration_months, training_status, review_status, is_edited, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NOW())`,
              [
                newStudentId,
                newUploadId,
                student.csv_center_id,
                newBatchId,
                newCenterId,
                partnerUuid,
                student.partner_student_id,
                student.student_name,
                student.date_of_birth,
                student.gender,
                student.mobile_number,
                student.email,
                student.address,
                student.city,
                student.state,
                student.enrollment_date,
                student.course_name,
                student.course_duration_months,
                student.training_status,
              ]
            );

            // Copy edit logs with new version
            if (student.is_edited) {
              const [editLogs] = await connection.query(
                'SELECT * FROM data_edit_logs WHERE record_id = ?',
                [student.id]
              );

              for (const log of editLogs) {
                await connection.query(
                  `INSERT INTO data_edit_logs 
                  (id, upload_id, version, table_name, record_id, field_name, old_value, new_value, edited_by, edit_type, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                  [
                    uuidv4(),
                    newUploadId,
                    version,
                    log.table_name,
                    newStudentId,
                    log.field_name,
                    log.old_value,
                    log.new_value,
                    log.edited_by,
                    log.edit_type,
                  ]
                );
              }
            }
          }
        }
      }

      // Get partner name for notification
      const [partner] = await connection.query('SELECT name FROM partners WHERE id = ?', [
        partnerUuid,
      ]);

      // Create admin notification
      const notificationId = uuidv4();
      await connection.query(
        `INSERT INTO notifications 
        (id, recipient_role, type, alert_type, title, message, payload, related_entity_type, related_entity_id, is_read, sent_via, created_at)
        VALUES (?, 'admin', 'upload', 'info', ?, ?, ?, 'data_upload', ?, 0, 'platform', NOW())`,
        [
          notificationId,
          `Partner Resubmitted Upload #${version}`,
          `${partner[0].name} has resubmitted data with corrections (${editedStudents[0].count} students modified).`,
          JSON.stringify({
            uploadId: newUploadId,
            version,
            parentUploadId,
            partnerId: partnerUuid,
            partnerName: partner[0].name,
            editedCount: editedStudents[0].count,
          }),
          newUploadId,
        ]
      );

      await connection.commit();

      return {
        success: true,
        newUploadId,
        version,
        editedCount: editedStudents[0].count,
        message: `Successfully created Version ${version} with ${editedStudents[0].count} edits`,
      };
    } catch (error) {
      await connection.rollback();
      console.error('Error in resubmitUpload:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get edit logs for highlighting changes (Admin view)
   * @param {string} uploadId - Upload ID
   * @returns {Promise<Array>} Edit logs grouped by student
   */
  async getUploadChanges(uploadId) {
    try {
      const uploadUuid = convertToUUID(uploadId);

      const editLogs = await db.query(
        `SELECT 
          del.*,
          us.student_name,
          us.partner_student_id,
          u.full_name as edited_by_name
        FROM data_edit_logs del
        INNER JOIN uploaded_students us ON del.record_id = us.id
        LEFT JOIN users u ON del.edited_by = u.id
        WHERE del.upload_id = ?
        ORDER BY us.student_name, del.field_name`,
        [uploadUuid]
      );

      // Group by student
      const changesByStudent = {};
      editLogs.forEach((log) => {
        if (!changesByStudent[log.record_id]) {
          changesByStudent[log.record_id] = {
            partner_student_id: log.partner_student_id,
            student_name: log.student_name,
            changes: [],
          };
        }
        changesByStudent[log.record_id].changes.push({
          field_name: log.field_name,
          old_value: log.old_value,
          new_value: log.new_value,
          edited_by: log.edited_by_name,
          edited_at: log.created_at,
        });
      });

      return Object.values(changesByStudent);
    } catch (error) {
      console.error('Error in getUploadChanges:', error);
      throw error;
    }
  }

  /**
   * Get filter options for partners
   * @param {Object} options - Filter options
   * @param {string} options.role - User role
   * @returns {Promise<Object>} Filter options
   */
  async getFilterOptions({ role }) {
    try {
      let whereCondition = '';
      let queryParams = [];

      // Role-based filtering - same as getAllPartners
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        whereCondition = 'WHERE approval_status = ?';
        queryParams = ['approved'];
      }

      // Get unique values for each filterable field
      const [types, cities, states, statuses, approvalStatuses] = await Promise.all([
        // Partner Types (organization_type column)
        db.query(
          `SELECT DISTINCT organization_type as value, organization_type as label 
           FROM partners 
           ${whereCondition}
           ${whereCondition ? 'AND' : 'WHERE'} organization_type IS NOT NULL AND organization_type != ''
           ORDER BY organization_type ASC`,
          queryParams
        ),
        // Cities
        db.query(
          `SELECT DISTINCT city as value, city as label 
           FROM partners 
           ${whereCondition}
           ${whereCondition ? 'AND' : 'WHERE'} city IS NOT NULL AND city != ''
           ORDER BY city ASC`,
          queryParams
        ),
        // States
        db.query(
          `SELECT DISTINCT state as value, state as label 
           FROM partners 
           ${whereCondition}
           ${whereCondition ? 'AND' : 'WHERE'} state IS NOT NULL AND state != ''
           ORDER BY state ASC`,
          queryParams
        ),
        // Status
        db.query(
          `SELECT DISTINCT status as value, 
           CONCAT(UPPER(SUBSTRING(status, 1, 1)), SUBSTRING(status, 2)) as label 
           FROM partners 
           ${whereCondition}
           ${whereCondition ? 'AND' : 'WHERE'} status IS NOT NULL
           ORDER BY status ASC`,
          queryParams
        ),
        // Approval Status (only for admins)
        role === 'ADMIN' || role === 'SUPER_ADMIN'
          ? db.query(
              `SELECT DISTINCT approval_status as value, 
               CONCAT(UPPER(SUBSTRING(approval_status, 1, 1)), SUBSTRING(approval_status, 2)) as label 
               FROM partners 
               WHERE approval_status IS NOT NULL
               ORDER BY approval_status ASC`
            )
          : Promise.resolve([]),
      ]);

      return {
        types: types.map((t) => ({ value: t.value, label: t.label })),
        cities: cities.map((c) => ({ value: c.value, label: c.label })),
        states: states.map((s) => ({ value: s.value, label: s.label })),
        statuses: statuses.map((st) => ({ value: st.value, label: st.label })),
        approvalStatuses: approvalStatuses.map((as) => ({ value: as.value, label: as.label })),
      };
    } catch (error) {
      console.error('Error in getFilterOptions:', error);
      throw error;
    }
  }

  /**
   * Get all countries for dropdown
   * @returns {Promise<Array>} List of countries
   */
  async getCountries() {
    try {
      const countries = await db.query(
        `SELECT id, name, code FROM countries WHERE is_active = 1 ORDER BY name ASC`
      );
      return countries;
    } catch (error) {
      console.error('Error in getCountries:', error);
      throw error;
    }
  }

  /**
   * Get states by country ID
   * @param {number} countryId - Country ID
   * @returns {Promise<Array>} List of states
   */
  async getStatesByCountry(countryId) {
    try {
      const states = await db.query(
        `SELECT id, name, code FROM states WHERE country_id = ? AND is_active = 1 ORDER BY name ASC`,
        [countryId]
      );
      return states;
    } catch (error) {
      console.error('Error in getStatesByCountry:', error);
      throw error;
    }
  }

  /**
   * Get cities by state ID and country ID
   * Handles both countries with states and countries without states
   * @param {number} stateId - State ID (optional)
   * @param {number} countryId - Country ID
   * @returns {Promise<Array>} List of cities
   */
  async getCitiesByStateAndCountry(stateId, countryId) {
    try {
      let query =
        'SELECT id, name, latitude, longitude FROM cities WHERE country_id = ? AND is_active = 1';
      let params = [countryId];

      if (stateId) {
        // Country has states - filter by specific state
        query += ' AND state_id = ?';
        params.push(stateId);
      } else {
        // Check if country has any states
        const stateCount = await db.query(
          'SELECT COUNT(*) as count FROM states WHERE country_id = ? AND is_active = 1',
          [countryId]
        );

        if (stateCount[0].count === 0) {
          // Country has no states - show all cities
          // No additional filter needed
        } else {
          // Country has states but none selected - show cities without state assignment
          query += ' AND state_id IS NULL';
        }
      }

      query += ' ORDER BY name ASC LIMIT 1000'; // Limit for performance

      const cities = await db.query(query, params);
      return cities;
    } catch (error) {
      console.error('Error in getCitiesByStateAndCountry:', error);
      throw error;
    }
  }

  /**
   * Get all regions for dropdown
   * @returns {Promise<Array>} List of regions
   */
  async getRegions() {
    try {
      const regions = await db.query(
        `SELECT id, code, name FROM regions WHERE is_active = 1 ORDER BY code ASC`
      );
      return regions;
    } catch (error) {
      console.error('Error in getRegions:', error);
      throw error;
    }
  }

  /**
   * Get registered_as dropdown options
   * @returns {Array} List of registration types
   */
  getRegisteredAsOptions() {
    return [
      { value: 'Trust', label: 'Trust' },
      { value: 'Foundation', label: 'Foundation' },
      { value: 'Section 25 Company', label: 'Section 25 Company' },
    ];
  }

  /**
   * Get organization type dropdown options
   * @returns {Array} List of organization types
   */
  getOrganizationTypeOptions() {
    return [
      { value: 'NGO', label: 'NGO' },
      { value: 'Trust', label: 'Trust' },
      { value: 'Private Company', label: 'Private Company' },
      { value: 'Government', label: 'Government' },
      { value: 'Educational Institute', label: 'Educational Institute' },
    ];
  }

  /**
   * Resend welcome email to partner
   * @param {string} partnerId - Partner UUID
   * @returns {Promise<void>}
   */
  async resendWelcomeEmail(partnerId) {
    try {
      // Get partner details
      const partnerRows = await db.query(
        `SELECT id, partner_id, name, contact_email 
         FROM partners 
         WHERE id = ?`,
        [partnerId]
      );

      if (!partnerRows || partnerRows.length === 0) {
        throw new Error('Partner not found');
      }

      const partner = partnerRows[0];

      // Get user account details
      const userRows = await db.query(
        `SELECT email, password_hash 
         FROM users 
         WHERE partner_id = ? AND role = 'PARTNER'`,
        [partnerId]
      );

      if (!userRows || userRows.length === 0) {
        throw new Error('No user account found for this partner');
      }

      // Generate new temporary password
      const tempPassword = emailService.generatePassword(12);
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Update user password
      await db.query(
        `UPDATE users 
         SET password_hash = ?, updated_at = NOW()
         WHERE partner_id = ? AND role = 'PARTNER'`,
        [passwordHash, partnerId]
      );

      // Send welcome email with new credentials
      await emailService.sendPartnerWelcomeEmail({
        email: partner.contact_email,
        name: partner.name,
        partnerId: partner.partner_id,
        tempPassword: tempPassword,
      });

      console.log(`Welcome email resent to partner: ${partner.partner_id}`);
    } catch (error) {
      console.error('Error in resendWelcomeEmail:', error);
      throw error;
    }
  }

  /**
   * Bulk delete partners with dependency checking
   * @param {Array<string>} ids - Array of partner IDs to delete
   * @param {string} role - User role
   * @param {string} userPartnerId - Partner ID of the user (for PARTNER role)
   * @returns {Promise<Object>} Deletion results with success/failure details
   */
  async bulkDeletePartners(ids, role, userPartnerId = null) {
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
      const partnerUUIDs = ids.map((id) => convertToUUID(id));

      // Authorization check for PARTNER role
      if (role === 'PARTNER') {
        throw new Error('Partners are not authorized to delete partner organizations');
      }

      // Validate all partners exist first
      for (const partnerId of partnerUUIDs) {
        try {
          const partner = await this.getPartnerById(partnerId);
          if (!partner) {
            results.failed.push({
              id: partnerId,
              readable_id: partnerId,
              name: 'Unknown',
              reason: 'Partner not found',
            });
            continue;
          }

          // Check for dependencies
          const centers = await db.query(
            'SELECT COUNT(*) as count FROM centers WHERE partner_id = ?',
            [partnerId]
          );

          if (centers[0].count > 0) {
            results.failed.push({
              id: partnerId,
              readable_id: partner.partner_id,
              name: partner.name,
              reason: `Cannot delete partner with ${centers[0].count} existing center(s). Please delete all centers first.`,
            });
            continue;
          }

          // All checks passed - safe to delete
          // Delete associated user accounts first
          await db.query("DELETE FROM users WHERE partner_id = ? AND role = 'PARTNER'", [
            partnerId,
          ]);

          // Delete partner_state_presence records
          await db.query('DELETE FROM partner_state_presence WHERE partner_id = ?', [partnerId]);

          // Delete the partner
          await db.query('DELETE FROM partners WHERE id = ?', [partnerId]);

          results.success.push({
            id: partnerId,
            readable_id: partner.partner_id,
            name: partner.name,
          });
        } catch (error) {
          results.failed.push({
            id: partnerId,
            readable_id: partnerId,
            name: 'Unknown',
            reason: error.message,
          });
        }
      }

      results.summary.successful = results.success.length;
      results.summary.failed = results.failed.length;

      return results;
    } catch (error) {
      console.error('Error in bulkDeletePartners:', error);
      throw error;
    }
  }
}

module.exports = new PartnerService();
