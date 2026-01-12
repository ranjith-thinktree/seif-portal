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
      // Ensure page and limit are valid integers
      const validPage = Math.max(1, parseInt(page) || 1);
      const validLimit = Math.max(1, Math.min(1000, parseInt(limit) || 10));
      const offset = (validPage - 1) * validLimit;

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

      // Partner filter (supports array for multi-select)
      if (partner_id) {
        const partnerIds = Array.isArray(partner_id) ? partner_id : [partner_id];
        if (partnerIds.length > 0) {
          whereConditions.push(`c.partner_id IN (${partnerIds.map(() => '?').join(',')})`);
          queryParams.push(...partnerIds);
        }
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
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total 
        FROM centers c
        LEFT JOIN partners p ON c.partner_id = p.id
        ${whereClause}`,
        queryParams
      );
      const total = countResult[0].total;

      // Get paginated data - use direct integers for LIMIT/OFFSET
      const [centers] = await db.query(
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
        LIMIT ${validLimit} OFFSET ${offset}`,
        queryParams
      );

      return {
        data: centers,
        pagination: {
          page: validPage,
          limit: validLimit,
          total,
          totalPages: Math.ceil(total / validLimit),
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

      const [centers] = await db.query(
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
      const [batches] = await db.query(
        `SELECT 
          b.*,
          (SELECT COUNT(*) FROM students WHERE batch_id = b.id) as enrolled_students
        FROM batches b
        WHERE b.center_id = ?
        ORDER BY b.batch_start_date DESC`,
        [centerId]
      );

      center.batches = batches;

      // Get courses for this center
      const [courses] = await db.query(
        `SELECT 
          c.id, c.course_name, c.course_code
        FROM center_courses cc
        JOIN courses c ON cc.course_id = c.id
        WHERE cc.center_id = ?`,
        [centerId]
      );

      center.courses = courses;

      return center;
    } catch (error) {
      console.error('Error in getCenterById:', error);
      throw error;
    }
  }

  /**
   * Create a new center
   * @param {Object} centerData - Center data
   * @param {string} createdByRole - Role of user creating center
   * @returns {Promise<Object>} Created center
   */
  async createCenter(centerData, createdByRole) {
    try {
      console.log('📝 Creating center with data:', JSON.stringify(centerData, null, 2));

      // Validate required fields
      if (!centerData.partner_id) {
        throw new Error('partner_id is required');
      }
      if (!centerData.center_name) {
        throw new Error('center_name is required');
      }

      // Check if center already exists (same name + partner)
      const [existing] = await db.query(
        `SELECT id, center_name, approval_status FROM centers 
         WHERE partner_id = ? AND center_name = ?
         LIMIT 1`,
        [centerData.partner_id, centerData.center_name]
      );

      if (existing && existing.length > 0) {
        throw new Error(
          `Center "${centerData.center_name}" already exists with status: ${existing[0].approval_status}`
        );
      }

      const centerId = uuidv4();

      const {
        partner_id,
        center_name,
        center_type,
        region,
        city,
        state,
        country,
        country_id,
        state_id,
        city_id,
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
        course_ids = [], // Array of course IDs
      } = centerData;

      // Partners create centers with pending approval
      // Admins create centers with auto-approval
      const approval_status =
        createdByRole === 'ADMIN' || createdByRole === 'SUPER_ADMIN' ? 'approved' : 'pending';

      // Set status based on approval
      // Partners: inactive until approved, Admins: active immediately
      const centerStatus =
        createdByRole === 'ADMIN' || createdByRole === 'SUPER_ADMIN' ? 'active' : 'inactive';

      // Convert undefined to null for MySQL compatibility
      await db.query(
        `INSERT INTO centers (
          id, partner_id, center_name, center_type, region,
          country_id, state_id, city_id, country, city, state, address,
          year_of_establishment, status, approval_status, center_head, mobile_number,
          email, latitude, longitude, refurbishment_eligible,
          refurbishment_frequency_months, last_refurbishment_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          centerId,
          partner_id || null,
          center_name || null,
          center_type || null,
          region || null,
          country_id || null,
          state_id || null,
          city_id || null,
          country || null,
          city || null,
          state || null,
          address || null,
          year_of_establishment || null,
          centerStatus, // Use computed status
          approval_status,
          center_head || null,
          mobile_number || null,
          email || null,
          latitude || null,
          longitude || null,
          refurbishment_eligible,
          refurbishment_frequency_months || null,
          last_refurbishment_date || null,
        ]
      );

      // Insert center-course relationships
      if (course_ids && course_ids.length > 0) {
        const courseInserts = course_ids.map((courseId) =>
          db.query(`INSERT INTO center_courses (id, center_id, course_id) VALUES (?, ?, ?)`, [
            uuidv4(),
            centerId,
            courseId,
          ])
        );
        await Promise.all(courseInserts);
      }

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
        'country_id',
        'state_id',
        'city_id',
        'country',
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
          // Convert undefined to null for MySQL
          values.push(updateData[field] === undefined ? null : updateData[field]);
        }
      });

      // Handle course updates if provided
      if (updateData.course_ids !== undefined) {
        // Delete existing course relationships
        await db.query('DELETE FROM center_courses WHERE center_id = ?', [centerId]);

        // Insert new course relationships
        if (updateData.course_ids && updateData.course_ids.length > 0) {
          const courseInserts = updateData.course_ids.map((courseId) =>
            db.query(`INSERT INTO center_courses (id, center_id, course_id) VALUES (?, ?, ?)`, [
              uuidv4(),
              centerId,
              courseId,
            ])
          );
          await Promise.all(courseInserts);
        }
      }

      if (updates.length > 0) {
        values.push(centerId);
        await db.query(`UPDATE centers SET ${updates.join(', ')} WHERE id = ?`, values);
      }

      return await this.getCenterById(centerId);
    } catch (error) {
      console.error('Error in updateCenter:', error);
      throw error;
    }
  }

  /**
   * Get center deletion impact (check what data will be affected)
   * @param {string} id - Center ID
   * @returns {Promise<Object>} Impact report
   */
  async getCenterDeletionImpact(id) {
    try {
      const centerId = convertToUUID(id);

      const existingCenter = await this.getCenterById(centerId);
      if (!existingCenter) {
        throw new Error('Center not found');
      }

      // Check production batches
      const [batches] = await db.query(
        'SELECT COUNT(*) as count FROM batches WHERE center_id = ?',
        [centerId]
      );

      // Check production students
      const [students] = await db.query(
        'SELECT COUNT(*) as count FROM students WHERE center_id = ?',
        [centerId]
      );

      // Check pending uploaded batches
      const [uploadedBatches] = await db.query(
        'SELECT COUNT(*) as count FROM uploaded_batches WHERE uploaded_center_id = ?',
        [centerId]
      );

      // Check pending uploaded students
      const [uploadedStudents] = await db.query(
        'SELECT COUNT(*) as count FROM uploaded_students WHERE uploaded_center_id = ?',
        [centerId]
      );

      // Check center courses
      const [centerCourses] = await db.query(
        'SELECT COUNT(*) as count FROM center_courses WHERE center_id = ?',
        [centerId]
      );

      const impact = {
        center: existingCenter,
        canDelete: true,
        blockingReasons: [],
        warnings: [],
        counts: {
          batches: batches[0]?.count || 0,
          students: students[0]?.count || 0,
          uploadedBatches: uploadedBatches[0]?.count || 0,
          uploadedStudents: uploadedStudents[0]?.count || 0,
          courses: centerCourses[0]?.count || 0,
        },
      };

      // Check for blocking conditions
      if (impact.counts.batches > 0) {
        impact.canDelete = false;
        impact.blockingReasons.push(
          `Center has ${impact.counts.batches} active batch${impact.counts.batches > 1 ? 'es' : ''}`
        );
      }

      if (impact.counts.students > 0) {
        impact.canDelete = false;
        impact.blockingReasons.push(
          `Center has ${impact.counts.students} enrolled student${impact.counts.students > 1 ? 's' : ''}`
        );
      }

      if (impact.counts.uploadedBatches > 0) {
        impact.canDelete = false;
        impact.blockingReasons.push(
          `Center has ${impact.counts.uploadedBatches} pending batch upload${impact.counts.uploadedBatches > 1 ? 's' : ''}`
        );
      }

      if (impact.counts.uploadedStudents > 0) {
        impact.canDelete = false;
        impact.blockingReasons.push(
          `Center has ${impact.counts.uploadedStudents} pending student upload${impact.counts.uploadedStudents > 1 ? 's' : ''}`
        );
      }

      // Warnings (things that will be deleted but don't block)
      if (impact.counts.courses > 0) {
        impact.warnings.push(
          `${impact.counts.courses} course assignment${impact.counts.courses > 1 ? 's' : ''} will be removed`
        );
      }

      return impact;
    } catch (error) {
      console.error('Error in getCenterDeletionImpact:', error);
      throw error;
    }
  }

  /**
   * Delete center (with strict validation)
   * @param {string} id - Center ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteCenter(id) {
    try {
      const centerId = convertToUUID(id);

      // Get deletion impact first
      const impact = await this.getCenterDeletionImpact(id);

      // Block deletion if there are any blocking reasons
      if (!impact.canDelete) {
        const reasons = impact.blockingReasons.join('. ');
        throw new Error(
          `Cannot delete center: ${reasons}. Please delete all batches and students first, and review or reject all pending uploads.`
        );
      }

      // All checks passed - safe to delete
      // Delete center_courses first (foreign key constraint)
      await db.query('DELETE FROM center_courses WHERE center_id = ?', [centerId]);

      // Then delete the center
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
            status = 'active',
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
      // MySQL db.query() returns [rows, fields], so we need to destructure the rows
      const [
        [partners],
        [regions],
        [cities],
        [states],
        [centerTypes],
        [years],
        [statuses],
        [approvalStatuses],
      ] = await Promise.all([
        // Partners (only for non-partner roles)
        role !== 'PARTNER'
          ? db.query(
              `SELECT DISTINCT p.id as value, p.name as label 
               FROM centers c 
               INNER JOIN partners p ON c.partner_id = p.id
               ${whereCondition}
               ORDER BY p.name ASC`,
              queryParams
            )
          : Promise.resolve([[]]),
        // Regions
        db.query(
          `SELECT DISTINCT region as value, region as label 
           FROM centers c 
           ${whereCondition}
           ${whereCondition ? 'AND' : 'WHERE'} region IS NOT NULL AND region != ''
           ORDER BY region ASC`,
          queryParams
        ),
        // Cities
        db.query(
          `SELECT DISTINCT city as value, city as label 
           FROM centers c 
           ${whereCondition}
           ${whereCondition ? 'AND' : 'WHERE'} city IS NOT NULL AND city != ''
           ORDER BY city ASC`,
          queryParams
        ),
        // States
        db.query(
          `SELECT DISTINCT state as value, state as label 
           FROM centers c 
           ${whereCondition}
           ${whereCondition ? 'AND' : 'WHERE'} state IS NOT NULL AND state != ''
           ORDER BY state ASC`,
          queryParams
        ),
        // Center Types
        db.query(
          `SELECT DISTINCT center_type as value, center_type as label 
           FROM centers c 
           ${whereCondition}
           ${whereCondition ? 'AND' : 'WHERE'} center_type IS NOT NULL AND center_type != ''
           ORDER BY center_type ASC`,
          queryParams
        ),
        // Years
        db.query(
          `SELECT DISTINCT year_of_establishment as value, year_of_establishment as label 
           FROM centers c 
           ${whereCondition}
           ${whereCondition ? 'AND' : 'WHERE'} year_of_establishment IS NOT NULL
           ORDER BY year_of_establishment DESC`,
          queryParams
        ),
        // Status
        db.query(
          `SELECT DISTINCT status as value, 
           CONCAT(UPPER(SUBSTRING(status, 1, 1)), SUBSTRING(status, 2)) as label 
           FROM centers c 
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
               FROM centers 
               WHERE approval_status IS NOT NULL
               ORDER BY approval_status ASC`
            )
          : Promise.resolve([[]]),
      ]);

      return {
        partners: partners.map((p) => ({ value: p.value, label: p.label })),
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

      const [centers] = await db.query(
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

  /**
   * Get all active courses
   * @returns {Promise<Array>} List of courses
   */
  async getAllCourses() {
    try {
      const [courses] = await db.query(
        `SELECT id, course_name, course_code, description, duration_months
        FROM courses
        WHERE is_active = 1
        ORDER BY course_name ASC`
      );

      return courses;
    } catch (error) {
      console.error('Error in getAllCourses:', error);
      throw error;
    }
  }

  /**
   * Bulk delete centers with dependency checking
   * @param {Array<string>} ids - Array of center IDs to delete
   * @param {string} role - User role
   * @param {string} userPartnerId - Partner ID of the user (for PARTNER role)
   * @returns {Promise<Object>} Deletion results with success/failure details
   */
  async bulkDeleteCenters(ids, role, userPartnerId = null) {
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
      const centerUUIDs = ids.map((id) => convertToUUID(id));

      // Validate all centers exist and check authorization
      for (const centerId of centerUUIDs) {
        try {
          const center = await this.getCenterById(centerId);
          if (!center) {
            results.failed.push({
              id: centerId,
              readable_id: centerId,
              name: 'Unknown',
              reason: 'Center not found',
            });
            continue;
          }

          // Authorization check for PARTNER role
          if (role === 'PARTNER' && center.partner_id !== userPartnerId) {
            results.failed.push({
              id: centerId,
              readable_id: center.center_id,
              name: center.center_name,
              reason: 'Not authorized to delete this center',
            });
            continue;
          }

          // Check for dependencies
          const impact = await this.getCenterDeletionImpact(centerId);

          if (!impact.canDelete) {
            const reasons = impact.blockingReasons.join('. ');
            results.failed.push({
              id: centerId,
              readable_id: center.center_id,
              name: center.center_name,
              reason: reasons,
            });
            continue;
          }

          // All checks passed - safe to delete
          // Delete center_courses first (foreign key constraint)
          await db.query('DELETE FROM center_courses WHERE center_id = ?', [centerId]);

          // Then delete the center
          await db.query('DELETE FROM centers WHERE id = ?', [centerId]);

          results.success.push({
            id: centerId,
            readable_id: center.center_id,
            name: center.center_name,
          });
        } catch (error) {
          results.failed.push({
            id: centerId,
            readable_id: centerId,
            name: 'Unknown',
            reason: error.message,
          });
        }
      }

      results.summary.successful = results.success.length;
      results.summary.failed = results.failed.length;

      return results;
    } catch (error) {
      console.error('Error in bulkDeleteCenters:', error);
      throw error;
    }
  }
}

module.exports = new CenterService();
