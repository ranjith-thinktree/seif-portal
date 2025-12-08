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

      // Center filter
      if (center_id) {
        whereConditions.push('b.center_id = ?');
        queryParams.push(center_id);
      }

      // Partner filter
      if (partner_id) {
        whereConditions.push('b.partner_id = ?');
        queryParams.push(partner_id);
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
      const countResult = await db.query(
        `SELECT COUNT(*) as total 
        FROM batches b
        LEFT JOIN centers c ON b.center_id = c.id
        LEFT JOIN partners p ON b.partner_id = p.id
        ${whereClause}`,
        queryParams
      );
      const total = countResult[0].total;

      // Get paginated data
      const batches = await db.query(
        `SELECT 
          b.*,
          c.center_name,
          p.name as partner_name,
          (SELECT COUNT(*) FROM students WHERE batch_id = b.id) as enrolled_students
        FROM batches b
        LEFT JOIN centers c ON b.center_id = c.id
        LEFT JOIN partners p ON b.partner_id = p.id
        ${whereClause}
        ORDER BY b.batch_start_date DESC
        LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      );

      return {
        data: batches,
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
   * Delete batch
   * @param {string} id - Batch ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteBatch(id) {
    try {
      const batchId = convertToUUID(id);

      const existingBatch = await this.getBatchById(batchId);
      if (!existingBatch) {
        throw new Error('Batch not found');
      }

      // Check if batch has students
      const students = await db.query(
        'SELECT COUNT(*) as count FROM students WHERE batch_id = ?',
        [batchId]
      );

      if (students[0].count > 0) {
        throw new Error(
          'Cannot delete batch with enrolled students. Please remove all students first.'
        );
      }

      await db.query('DELETE FROM batches WHERE id = ?', [batchId]);

      return true;
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

      const batches = await db.query(
        `SELECT 
          b.*,
          (SELECT COUNT(*) FROM students WHERE batch_id = b.id) as enrolled_students
        FROM batches b
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
}

module.exports = new BatchService();
