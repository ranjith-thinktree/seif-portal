const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');
const { convertToUUID } = require('../../../utils/uuid.util');

/**
 * Center Service
 * Handles all business logic for center management
 */
class CenterService {
  /**
   * Get all centers with pagination, search, and filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Centers data with pagination
   */
  async getAllCenters({
    page = 1,
    limit = 10,
    search = '',
    status = '',
    approval_status = '',
    partner_id = '',
    role = '',
    user_partner_id = '',
    region = '',
    city = '',
    state = '',
    center_type = '',
    year_of_establishment = '',
    sort_by = 'created_at',
    sort_order = 'desc',
  }) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      if (role === 'PARTNER') {
        // Partners can only see their own centers
        whereConditions.push('c.partner_id = ?');
        queryParams.push(user_partner_id);
      } else if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        // ESSCI and SEIF_READONLY can only see approved centers
        whereConditions.push('c.approval_status = ?');
        queryParams.push('approved');
      } else if (approval_status) {
        // Admin can filter by approval status
        whereConditions.push('c.approval_status = ?');
        queryParams.push(approval_status);
      }

      // Partner filter
      if (partner_id) {
        whereConditions.push('c.partner_id = ?');
        queryParams.push(partner_id);
      }

      // Status filter
      if (status) {
        whereConditions.push('c.status = ?');
        queryParams.push(status);
      }

      // Region filter
      if (region) {
        whereConditions.push('c.region = ?');
        queryParams.push(region);
      }

      // City filter
      if (city) {
        whereConditions.push('c.city = ?');
        queryParams.push(city);
      }

      // State filter
      if (state) {
        whereConditions.push('c.state = ?');
        queryParams.push(state);
      }

      // Center type filter
      if (center_type) {
        whereConditions.push('c.center_type = ?');
        queryParams.push(center_type);
      }

      // Year of establishment filter
      if (year_of_establishment) {
        whereConditions.push('c.year_of_establishment = ?');
        queryParams.push(year_of_establishment);
      }

      // Search filter
      if (search) {
        whereConditions.push(
          '(c.center_name LIKE ? OR c.city LIKE ? OR c.state LIKE ? OR c.center_head LIKE ? OR p.name LIKE ?)'
        );
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Validate and sanitize sort parameters
      const allowedSortFields = [
        'center_name',
        'city',
        'state',
        'region',
        'center_type',
        'year_of_establishment',
        'status',
        'approval_status',
        'created_at',
      ];
      const sortField = allowedSortFields.includes(sort_by) ? `c.${sort_by}` : 'c.created_at';
      const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // Get total count
      const countResult = await db.query(
        `SELECT COUNT(*) as total 
        FROM centers c
        LEFT JOIN partners p ON c.partner_id = p.id
        ${whereClause}`,
        queryParams
      );
      const total = countResult[0].total;

      // Get paginated data
      const centers = await db.query(
        `SELECT 
          c.*,
          p.name as partner_name,
          u.full_name as approved_by_name,
          (SELECT COUNT(*) FROM batches WHERE center_id = c.id) as total_batches,
          (SELECT COUNT(*) FROM students WHERE center_id = c.id) as total_students,
          (SELECT COUNT(*) FROM students WHERE center_id = c.id AND gender = 'Male') as total_male_students,
          (SELECT COUNT(*) FROM students WHERE center_id = c.id AND gender = 'Female') as total_female_students
        FROM centers c
        LEFT JOIN partners p ON c.partner_id = p.id
        LEFT JOIN users u ON c.approved_by = u.id
        ${whereClause}
        ORDER BY ${sortField} ${sortDirection}
        LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      );

      return {
        data: centers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getAllCenters:', error);
      throw error;
    }
  }

  /**
   * Get centers for a specific partner (My Centers for PARTNER role)
   * @param {string} partnerId - Partner ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Centers data with pagination
   */
  async getMyCenters(partnerId, options) {
    try {
      return await this.getAllCenters({
        ...options,
        partner_id: partnerId,
        role: 'PARTNER',
        user_partner_id: partnerId,
      });
    } catch (error) {
      console.error('Error in getMyCenters:', error);
      throw error;
    }
  }

  /**
   * Get center by ID with batches
   * @param {string} id - Center ID
   * @returns {Promise<Object>} Center data with batches
   */
  async getCenterById(id) {
    try {
      const centerId = convertToUUID(id);

      const centers = await db.query(
        `SELECT 
          c.*,
          p.name as partner_name,
          p.contact_person as partner_contact_person,
          p.contact_email as partner_contact_email,
          u.full_name as approved_by_name
        FROM centers c
        LEFT JOIN partners p ON c.partner_id = p.id
        LEFT JOIN users u ON c.approved_by = u.id
        WHERE c.id = ?`,
        [centerId]
      );

      if (centers.length === 0) {
        return null;
      }

      const center = centers[0];

      // Get batches for this center
      const batches = await db.query(
        `SELECT 
          b.*,
          (SELECT COUNT(*) FROM students WHERE batch_id = b.id) as enrolled_students
        FROM batches b
        WHERE b.center_id = ?
        ORDER BY b.batch_start_date DESC`,
        [centerId]
      );

      center.batches = batches;

      return center;
    } catch (error) {
      console.error('Error in getCenterById:', error);
      throw error;
    }
  }

  /**
   * Create new center
   * @param {Object} centerData - Center data
   * @param {string} createdByRole - Role of user creating the center
   * @returns {Promise<Object>} Created center
   */
  async createCenter(centerData, createdByRole) {
    try {
      const centerId = uuidv4();

      const {
        partner_id,
        center_name,
        center_type,
        region,
        city,
        state,
        address,
        year_of_establishment,
        status = 'active',
        center_head,
        mobile_number,
        email,
        latitude,
        longitude,
        refurbishment_eligible = 0,
        refurbishment_frequency_months,
        last_refurbishment_date,
      } = centerData;

      // Partners create centers with pending approval
      // Admins create centers with auto-approval
      const approval_status =
        createdByRole === 'ADMIN' || createdByRole === 'SUPER_ADMIN' ? 'approved' : 'pending';

      await db.query(
        `INSERT INTO centers (
          id, partner_id, center_name, center_type, region, city, state, address,
          year_of_establishment, status, approval_status, center_head, mobile_number,
          email, latitude, longitude, refurbishment_eligible,
          refurbishment_frequency_months, last_refurbishment_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          centerId,
          partner_id,
          center_name,
          center_type,
          region,
          city,
          state,
          address,
          year_of_establishment,
          status,
          approval_status,
          center_head,
          mobile_number,
          email,
          latitude,
          longitude,
          refurbishment_eligible,
          refurbishment_frequency_months,
          last_refurbishment_date,
        ]
      );

      return await this.getCenterById(centerId);
    } catch (error) {
      console.error('Error in createCenter:', error);
      throw error;
    }
  }

  /**
   * Update center
   * @param {string} id - Center ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated center
   */
  async updateCenter(id, updateData) {
    try {
      const centerId = convertToUUID(id);

      // Check if center exists
      const existingCenter = await this.getCenterById(centerId);
      if (!existingCenter) {
        throw new Error('Center not found');
      }

      const updates = [];
      const values = [];

      // Build dynamic update query
      const allowedFields = [
        'center_name',
        'center_type',
        'region',
        'city',
        'state',
        'address',
        'year_of_establishment',
        'status',
        'center_head',
        'mobile_number',
        'email',
        'latitude',
        'longitude',
        'refurbishment_eligible',
        'refurbishment_frequency_months',
        'last_refurbishment_date',
      ];

      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(updateData[field]);
        }
      });

      if (updates.length === 0) {
        return existingCenter;
      }

      values.push(centerId);

      await db.query(`UPDATE centers SET ${updates.join(', ')} WHERE id = ?`, values);

      return await this.getCenterById(centerId);
    } catch (error) {
      console.error('Error in updateCenter:', error);
      throw error;
    }
  }

  /**
   * Delete center
   * @param {string} id - Center ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteCenter(id) {
    try {
      const centerId = convertToUUID(id);

      const existingCenter = await this.getCenterById(centerId);
      if (!existingCenter) {
        throw new Error('Center not found');
      }

      // Check if center has batches
      const batches = await db.query('SELECT COUNT(*) as count FROM batches WHERE center_id = ?', [
        centerId,
      ]);

      if (batches[0].count > 0) {
        throw new Error(
          'Cannot delete center with existing batches. Please delete all batches first.'
        );
      }

      await db.query('DELETE FROM centers WHERE id = ?', [centerId]);

      return true;
    } catch (error) {
      console.error('Error in deleteCenter:', error);
      throw error;
    }
  }

  /**
   * Approve center
   * @param {string} id - Center ID
   * @param {string} approvedBy - User ID who approved
   * @returns {Promise<Object>} Updated center
   */
  async approveCenter(id, approvedBy) {
    try {
      const centerId = convertToUUID(id);
      const approverUserId = convertToUUID(approvedBy);

      const existingCenter = await this.getCenterById(centerId);
      if (!existingCenter) {
        throw new Error('Center not found');
      }

      if (existingCenter.approval_status === 'approved') {
        throw new Error('Center is already approved');
      }

      await db.query(
        `UPDATE centers 
        SET approval_status = 'approved', 
            approved_by = ?, 
            approved_at = NOW(),
            rejection_reason = NULL
        WHERE id = ?`,
        [approverUserId, centerId]
      );

      return await this.getCenterById(centerId);
    } catch (error) {
      console.error('Error in approveCenter:', error);
      throw error;
    }
  }

  /**
   * Reject center
   * @param {string} id - Center ID
   * @param {string} rejectedBy - User ID who rejected
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Updated center
   */
  async rejectCenter(id, rejectedBy, reason) {
    try {
      const centerId = convertToUUID(id);
      const rejecterUserId = convertToUUID(rejectedBy);

      const existingCenter = await this.getCenterById(centerId);
      if (!existingCenter) {
        throw new Error('Center not found');
      }

      await db.query(
        `UPDATE centers 
        SET approval_status = 'rejected', 
            approved_by = ?, 
            approved_at = NOW(),
            rejection_reason = ?
        WHERE id = ?`,
        [rejecterUserId, reason, centerId]
      );

      return await this.getCenterById(centerId);
    } catch (error) {
      console.error('Error in rejectCenter:', error);
      throw error;
    }
  }

  /**
   * Get available filter options for centers
   * @param {Object} params - Role and user info
   * @returns {Promise<Object>} Filter options
   */
  async getFilterOptions({ role, user_partner_id }) {
    try {
      let whereCondition = '';
      let queryParams = [];

      // Role-based filtering - same as getAllCenters
      if (role === 'PARTNER') {
        whereCondition = 'WHERE c.partner_id = ?';
        queryParams = [user_partner_id];
      } else if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        whereCondition = 'WHERE c.approval_status = ?';
        queryParams = ['approved'];
      }

      // Get unique values for each filterable field
      const [regions, cities, states, centerTypes, years, statuses, approvalStatuses] =
        await Promise.all([
          // Regions
          db.query(
            `SELECT DISTINCT region as value, region as label 
           FROM centers c 
           ${whereCondition}
           AND region IS NOT NULL AND region != ''
           ORDER BY region ASC`,
            queryParams
          ),
          // Cities
          db.query(
            `SELECT DISTINCT city as value, city as label 
           FROM centers c 
           ${whereCondition}
           AND city IS NOT NULL AND city != ''
           ORDER BY city ASC`,
            queryParams
          ),
          // States
          db.query(
            `SELECT DISTINCT state as value, state as label 
           FROM centers c 
           ${whereCondition}
           AND state IS NOT NULL AND state != ''
           ORDER BY state ASC`,
            queryParams
          ),
          // Center Types
          db.query(
            `SELECT DISTINCT center_type as value, center_type as label 
           FROM centers c 
           ${whereCondition}
           AND center_type IS NOT NULL AND center_type != ''
           ORDER BY center_type ASC`,
            queryParams
          ),
          // Years
          db.query(
            `SELECT DISTINCT year_of_establishment as value, year_of_establishment as label 
           FROM centers c 
           ${whereCondition}
           AND year_of_establishment IS NOT NULL
           ORDER BY year_of_establishment DESC`,
            queryParams
          ),
          // Status
          db.query(
            `SELECT DISTINCT status as value, 
           CONCAT(UPPER(SUBSTRING(status, 1, 1)), SUBSTRING(status, 2)) as label 
           FROM centers c 
           ${whereCondition}
           AND status IS NOT NULL
           ORDER BY status ASC`,
            queryParams
          ),
          // Approval Status (only for admins)
          role === 'ADMIN' || role === 'SUPER_ADMIN'
            ? db.query(
                `SELECT DISTINCT approval_status as value, 
               CONCAT(UPPER(SUBSTRING(approval_status, 1, 1)), SUBSTRING(approval_status, 2)) as label 
               FROM centers 
               WHERE approval_status IS NOT NULL
               ORDER BY approval_status ASC`
              )
            : Promise.resolve([]),
        ]);

      return {
        regions: regions.map((r) => ({ value: r.value, label: r.label })),
        cities: cities.map((c) => ({ value: c.value, label: c.label })),
        states: states.map((s) => ({ value: s.value, label: s.label })),
        centerTypes: centerTypes.map((ct) => ({ value: ct.value, label: ct.label })),
        years: years.map((y) => ({ value: y.value, label: y.label?.toString() || '' })),
        statuses: statuses.map((st) => ({ value: st.value, label: st.label })),
        approvalStatuses: approvalStatuses.map((as) => ({ value: as.value, label: as.label })),
      };
    } catch (error) {
      console.error('Error in getFilterOptions:', error);
      throw error;
    }
  }

  /**
   * Export centers as CSV data
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Centers data for CSV
   */
  async exportCenters(filters = {}) {
    try {
      const { role, status, approval_status, partner_id, search, user_partner_id } = filters;

      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      if (role === 'PARTNER') {
        whereConditions.push('c.partner_id = ?');
        queryParams.push(user_partner_id);
      } else if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        whereConditions.push('c.approval_status = ?');
        queryParams.push('approved');
      } else if (approval_status) {
        whereConditions.push('c.approval_status = ?');
        queryParams.push(approval_status);
      }

      if (partner_id) {
        whereConditions.push('c.partner_id = ?');
        queryParams.push(partner_id);
      }

      if (status) {
        whereConditions.push('c.status = ?');
        queryParams.push(status);
      }

      if (search) {
        whereConditions.push('(c.center_name LIKE ? OR c.city LIKE ? OR p.name LIKE ?)');
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const centers = await db.query(
        `SELECT 
          c.center_name as 'Center Name',
          p.name as 'Partner Name',
          c.center_type as 'Center Type',
          c.region as 'Region',
          c.city as 'City',
          c.state as 'State',
          c.address as 'Address',
          c.year_of_establishment as 'Year of Establishment',
          c.center_head as 'Center Head',
          c.mobile_number as 'Mobile Number',
          c.email as 'Email',
          c.status as 'Status',
          c.approval_status as 'Approval Status',
          c.created_at as 'Created At'
        FROM centers c
        LEFT JOIN partners p ON c.partner_id = p.id
        ${whereClause}
        ORDER BY c.created_at DESC`,
        queryParams
      );

      return centers;
    } catch (error) {
      console.error('Error in exportCenters:', error);
      throw error;
    }
  }
}

module.exports = new CenterService();
