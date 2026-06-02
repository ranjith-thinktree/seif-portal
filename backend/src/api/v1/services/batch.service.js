const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');
const { convertToUUID } = require('../../../utils/uuid.util');

/**
 * Batch Service
 * Handles all business logic for batch management
 */
class BatchService {
  /**
   * Get all batches with pagination and filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Batches data with pagination
   */
  async getAllBatches({
    page = 1,
    limit = 10,
    search = '',
    status = '',
    center_id = '',
    partner_id = '',
    role = '',
    user_partner_id = '',
  }) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      if (role === 'PARTNER') {
        whereConditions.push('b.partner_id = ?');
        queryParams.push(user_partner_id);
      }

      // Center filter (supports array for multi-select)
      if (center_id) {
        const centerIds = Array.isArray(center_id) ? center_id : [center_id];
        if (centerIds.length > 0) {
          whereConditions.push(`b.center_id IN (${centerIds.map(() => '?').join(',')})`);
          queryParams.push(...centerIds);
        }
      }

      // Partner filter (supports array for multi-select)
      if (partner_id) {
        const partnerIds = Array.isArray(partner_id) ? partner_id : [partner_id];
        if (partnerIds.length > 0) {
          whereConditions.push(`b.partner_id IN (${partnerIds.map(() => '?').join(',')})`);
          queryParams.push(...partnerIds);
        }
      }

      // Status filter
      if (status) {
        whereConditions.push('b.status = ?');
        queryParams.push(status);
      }

      // Search filter
      if (search) {
        whereConditions.push('(b.batch_number LIKE ? OR c.center_name LIKE ? OR p.name LIKE ?)');
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const [countRows] = await db.query(
        `SELECT COUNT(*) as total 
        FROM batches b
        LEFT JOIN centers c ON b.center_id = c.id
        LEFT JOIN partners p ON b.partner_id = p.id
        ${whereClause}`,
        queryParams
      );
      const total = countRows[0]?.total || 0;

      // Get paginated data
      const validLimit = parseInt(limit);
      const validOffset = parseInt(offset);
      const [batchRows] = await db.query(
        `SELECT 
          b.*,
          c.center_name,
          p.name as partner_name,
          (SELECT COUNT(*) FROM students WHERE batch_id = b.id) as total_students,
          (SELECT COUNT(*) FROM students WHERE batch_id = b.id AND gender = 'Male') as male_students,
          (SELECT COUNT(*) FROM students WHERE batch_id = b.id AND gender = 'Female') as female_students
        FROM batches b
        LEFT JOIN centers c ON b.center_id = c.id
        LEFT JOIN partners p ON b.partner_id = p.id
        ${whereClause}
        ORDER BY b.batch_start_date DESC
        LIMIT ${validLimit} OFFSET ${validOffset}`,
        queryParams
      );

      return {
        data: batchRows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getAllBatches:', error);
      throw error;
    }
  }

  /**
   * Get batch by ID
   * @param {string} id - Batch ID
   * @returns {Promise<Object>} Batch data
   */
  async getBatchById(id) {
    try {
      const batchId = convertToUUID(id);

      const batches = await db.query(
        `SELECT 
          b.*,
          c.center_name,
          c.city as center_city,
          c.state as center_state,
          p.name as partner_name,
          (SELECT COUNT(*) FROM students WHERE batch_id = b.id) as enrolled_students
        FROM batches b
        LEFT JOIN centers c ON b.center_id = c.id
        LEFT JOIN partners p ON b.partner_id = p.id
        WHERE b.id = ?`,
        [batchId]
      );

      if (batches.length === 0) {
        return null;
      }

      return batches[0];
    } catch (error) {
      console.error('Error in getBatchById:', error);
      throw error;
    }
  }

  /**
   * Create new batch
   * @param {Object} batchData - Batch data
   * @returns {Promise<Object>} Created batch
   */
  async createBatch(batchData) {
    try {
      const batchId = uuidv4();

      const {
        center_id,
        partner_id,
        batch_number,
        batch_start_date,
        batch_complete_date,
        total_students,
        male_students,
        female_students,
        status = 'active',
      } = batchData;

      // Verify center belongs to partner
      const centers = await db.query('SELECT id FROM centers WHERE id = ? AND partner_id = ?', [
        center_id,
        partner_id,
      ]);

      if (centers.length === 0) {
        throw new Error('Center not found or does not belong to this partner');
      }

      await db.query(
        `INSERT INTO batches (
          id, center_id, partner_id, batch_number, batch_start_date,
          batch_complete_date, total_students, male_students, female_students, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          batchId,
          center_id,
          partner_id,
          batch_number,
          batch_start_date,
          batch_complete_date,
          total_students,
          male_students,
          female_students,
          status,
        ]
      );

      return await this.getBatchById(batchId);
    } catch (error) {
      console.error('Error in createBatch:', error);
      throw error;
    }
  }

  /**
   * Update batch
   * @param {string} id - Batch ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated batch
   */
  async updateBatch(id, updateData) {
    try {
      const batchId = convertToUUID(id);

      const existingBatch = await this.getBatchById(batchId);
      if (!existingBatch) {
        throw new Error('Batch not found');
      }

      const updates = [];
      const values = [];

      const allowedFields = [
        'batch_number',
        'batch_start_date',
        'batch_complete_date',
        'total_students',
        'male_students',
        'female_students',
        'status',
      ];

      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(updateData[field]);
        }
      });

      if (updates.length === 0) {
        return existingBatch;
      }

      values.push(batchId);

      await db.query(`UPDATE batches SET ${updates.join(', ')} WHERE id = ?`, values);

      return await this.getBatchById(batchId);
    } catch (error) {
      console.error('Error in updateBatch:', error);
      throw error;
    }
  }

  /**
   * Delete batch (cascade-deletes linked students, employment records, and comments)
   * @param {string} id - Batch ID
   * @returns {Promise<{studentsDeleted: number}>} Deletion summary
   */
  async deleteBatch(id) {
    try {
      const batchId = convertToUUID(id);

      const existingBatch = await this.getBatchById(batchId);
      if (!existingBatch) {
        throw new Error('Batch not found');
      }

      const result = await db.transaction(async (connection) => {
        // Fetch student IDs that belong to this batch
        const [studentRows] = await connection.query('SELECT id FROM students WHERE batch_id = ?', [
          batchId,
        ]);

        let studentsDeleted = 0;

        if (studentRows.length > 0) {
          const studentIds = studentRows.map((s) => s.id);
          const placeholders = studentIds.map(() => '?').join(',');

          // Delete employment records linked to these students
          await connection.query(
            `DELETE FROM employment WHERE student_id IN (${placeholders})`,
            studentIds
          );

          // Delete student comments linked to these students
          await connection.query(
            `DELETE FROM student_comments WHERE student_id IN (${placeholders})`,
            studentIds
          );

          // Delete the students themselves
          await connection.query(`DELETE FROM students WHERE batch_id = ?`, [batchId]);

          studentsDeleted = studentRows.length;
        }

        // Delete the batch
        await connection.query('DELETE FROM batches WHERE id = ?', [batchId]);

        return { studentsDeleted };
      });

      return result;
    } catch (error) {
      console.error('Error in deleteBatch:', error);
      throw error;
    }
  }

  /**
   * Get batches by center ID
   * @param {string} centerId - Center ID
   * @returns {Promise<Array>} Array of batches
   */
  async getBatchesByCenter(centerId) {
    try {
      const centerUuid = convertToUUID(centerId);

      const [batches] = await db.query(
        `SELECT 
          b.*,
          c.partner_id,
          (SELECT COUNT(*) FROM students WHERE batch_id = b.id) as enrolled_students
        FROM batches b
        JOIN centers c ON c.id = b.center_id
        WHERE b.center_id = ?
        ORDER BY b.batch_start_date DESC`,
        [centerUuid]
      );

      return batches;
    } catch (error) {
      console.error('Error in getBatchesByCenter:', error);
      throw error;
    }
  }

  /**
   * Get filter options for batches
   * @param {Object} options - Filter constraints (role, partner_id)
   * @returns {Promise<Object>} Filter options
   */
  async getBatchFilterOptions({ role, user_partner_id }) {
    try {
      const whereClause = role === 'PARTNER' ? 'WHERE id = ?' : '';
      const queryParams = role === 'PARTNER' ? [user_partner_id] : [];

      // Get all partners (not just those with batches)
      const partners = await db.query(
        `SELECT id, name 
        FROM partners
        ${whereClause}
        ORDER BY name ASC`,
        queryParams
      );

      // Get all centers (optionally filtered by partner for PARTNER role)
      const centerWhereClause = role === 'PARTNER' ? 'WHERE partner_id = ?' : '';
      const centers = await db.query(
        `SELECT id, center_name 
        FROM centers
        ${centerWhereClause}
        ORDER BY center_name ASC`,
        queryParams
      );

      // Get unique statuses
      const statuses = ['active', 'completed', 'cancelled'];

      return {
        partners: partners.map((p) => ({ value: p.id, label: p.name })),
        centers: centers.map((c) => ({ value: c.id, label: c.center_name })),
        statuses: statuses.map((s) => ({
          value: s,
          label: s.charAt(0).toUpperCase() + s.slice(1),
        })),
      };
    } catch (error) {
      console.error('Error in getBatchFilterOptions:', error);
      throw error;
    }
  }

  /**
   * Export batches to CSV
   * @param {Object} options - Export options
   * @returns {Promise<String>} CSV data
   */
  async exportBatches({
    search = '',
    status = '',
    center_id = '',
    partner_id = '',
    role = '',
    user_partner_id = '',
  }) {
    try {
      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      if (role === 'PARTNER') {
        whereConditions.push('b.partner_id = ?');
        queryParams.push(user_partner_id);
      }

      // Center filter (supports array for multi-select)
      if (center_id) {
        const centerIds = Array.isArray(center_id) ? center_id : [center_id];
        if (centerIds.length > 0) {
          whereConditions.push(`b.center_id IN (${centerIds.map(() => '?').join(',')})`);
          queryParams.push(...centerIds);
        }
      }

      // Partner filter (supports array for multi-select)
      if (partner_id) {
        const partnerIds = Array.isArray(partner_id) ? partner_id : [partner_id];
        if (partnerIds.length > 0) {
          whereConditions.push(`b.partner_id IN (${partnerIds.map(() => '?').join(',')})`);
          queryParams.push(...partnerIds);
        }
      }

      // Status filter
      if (status) {
        whereConditions.push('b.status = ?');
        queryParams.push(status);
      }

      // Search filter
      if (search) {
        whereConditions.push('(b.batch_number LIKE ? OR c.center_name LIKE ? OR p.name LIKE ?)');
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get all batches for export
      const batches = await db.query(
        `SELECT 
          b.batch_number as 'Batch Number',
          c.center_name as 'Center Name',
          p.name as 'Partner Name',
          DATE_FORMAT(b.batch_start_date, '%Y-%m-%d') as 'Start Date',
          DATE_FORMAT(b.batch_complete_date, '%Y-%m-%d') as 'End Date',
          b.total_students as 'Total Students',
          b.male_students as 'Total Male',
          b.female_students as 'Total Female',
          b.status as 'Status'
        FROM batches b
        LEFT JOIN centers c ON b.center_id = c.id
        LEFT JOIN partners p ON b.partner_id = p.id
        ${whereClause}
        ORDER BY b.batch_start_date DESC`,
        queryParams
      );

      return batches;
    } catch (error) {
      console.error('Error in exportBatches:', error);
      throw error;
    }
  }

  /**
   * Bulk delete batches with dependency checking
   * @param {Array<string>} ids - Array of batch IDs to delete
   * @param {string} role - User role
   * @param {string} userPartnerId - Partner ID of the user (for PARTNER role)
   * @returns {Promise<Object>} Deletion results with success/failure details
   */
  async bulkDeleteBatches(ids, role, userPartnerId = null) {
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
      const batchUUIDs = ids.map((id) => convertToUUID(id));

      // Validate all batches exist and check authorization
      for (const batchId of batchUUIDs) {
        try {
          const batch = await this.getBatchById(batchId);
          if (!batch) {
            results.failed.push({
              id: batchId,
              readable_id: batchId,
              name: 'Unknown',
              reason: 'Batch not found',
            });
            continue;
          }

          // Authorization check for PARTNER role
          if (role === 'PARTNER' && batch.partner_id !== userPartnerId) {
            results.failed.push({
              id: batchId,
              readable_id: batch.batch_number,
              name: batch.batch_number,
              reason: 'Not authorized to delete this batch',
            });
            continue;
          }

          // Cascade-delete students, employment records, and comments for this batch
          await db.transaction(async (connection) => {
            const [studentRows] = await connection.query(
              'SELECT id FROM students WHERE batch_id = ?',
              [batchId]
            );

            if (studentRows.length > 0) {
              const studentIds = studentRows.map((s) => s.id);
              const placeholders = studentIds.map(() => '?').join(',');

              await connection.query(
                `DELETE FROM employment WHERE student_id IN (${placeholders})`,
                studentIds
              );
              await connection.query(
                `DELETE FROM student_comments WHERE student_id IN (${placeholders})`,
                studentIds
              );
              await connection.query('DELETE FROM students WHERE batch_id = ?', [batchId]);
            }

            await connection.query('DELETE FROM batches WHERE id = ?', [batchId]);
          });

          results.success.push({
            id: batchId,
            readable_id: batch.batch_number,
            name: batch.batch_number,
          });
        } catch (error) {
          results.failed.push({
            id: batchId,
            readable_id: batchId,
            name: 'Unknown',
            reason: error.message,
          });
        }
      }

      results.summary.successful = results.success.length;
      results.summary.failed = results.failed.length;

      return results;
    } catch (error) {
      console.error('Error in bulkDeleteBatches:', error);
      throw error;
    }
  }
}

module.exports = new BatchService();
