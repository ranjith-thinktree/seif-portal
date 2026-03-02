const db = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

/**
 * RefurbishmentPackage Model
 * Handles database operations for refurbishment_packages table
 */

class RefurbishmentPackageModel {
  /**
   * Find all packages with optional filters
   */
  static async findAll(filters = {}) {
    const { is_active, search, category, limit = 100, offset = 0 } = filters;

    let query = 'SELECT * FROM refurbishment_packages WHERE 1=1';
    const params = [];

    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(is_active ? 1 : 0);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (package_name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY display_order ASC, package_name ASC';
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Find all packages with course names (optimized for display)
   */
  static async findAllWithCourses(filters = {}) {
    const { is_active, search, limit = 100, offset = 0 } = filters;

    let query = `
      SELECT 
        rp.*,
        GROUP_CONCAT(c.course_name ORDER BY c.course_name ASC SEPARATOR ', ') as course_names,
        GROUP_CONCAT(c.id ORDER BY c.course_name ASC SEPARATOR ',') as course_ids
      FROM refurbishment_packages rp
      LEFT JOIN course_packages cp ON rp.id = cp.package_id
      LEFT JOIN courses c ON cp.course_id = c.id
      WHERE 1=1
    `;

    const params = [];

    if (is_active !== undefined) {
      query += ' AND rp.is_active = ?';
      params.push(is_active ? 1 : 0);
    }

    if (search) {
      query += ' AND (rp.package_name LIKE ? OR rp.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY rp.id';
    query += ' ORDER BY rp.display_order ASC, rp.package_name ASC';
    query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    const [rows] = await db.query(query, params);

    // Convert course_ids string to array for frontend use
    // Use camelCase for frontend compatibility
    return rows.map((row) => ({
      ...row,
      courseIds: row.course_ids ? row.course_ids.split(',') : [],
      course_names: row.course_names || '', // Keep as comma-separated string
    }));
  }

  /**
   * Count total packages with filters
   */
  static async count(filters = {}) {
    const { is_active, search, category } = filters;

    let query = 'SELECT COUNT(*) as total FROM refurbishment_packages WHERE 1=1';
    const params = [];

    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(is_active ? 1 : 0);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (package_name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await db.query(query, params);
    return rows[0].total;
  }

  /**
   * Find package by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM refurbishment_packages WHERE id = ?';
    const [rows] = await db.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Find package by name
   */
  static async findByName(package_name) {
    const query = 'SELECT * FROM refurbishment_packages WHERE package_name = ?';
    const [rows] = await db.query(query, [package_name]);
    return rows[0] || null;
  }

  /**
   * Create new package
   */
  static async create(packageData) {
    const {
      package_name,
      description,
      is_active = true,
      display_order = 999,
      images = null,
    } = packageData;

    const id = uuidv4();

    const query = `
      INSERT INTO refurbishment_packages (
        id, package_name, description, images, is_active, display_order,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;

    await db.query(query, [
      id,
      package_name,
      description,
      images ? JSON.stringify(images) : null,
      is_active ? 1 : 0,
      display_order,
    ]);

    return this.findById(id);
  }

  /**
   * Update package
   */
  static async update(id, packageData) {
    const { package_name, description, is_active, display_order, images } = packageData;

    const updates = [];
    const params = [];

    if (package_name !== undefined) {
      updates.push('package_name = ?');
      params.push(package_name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (images !== undefined) {
      updates.push('images = ?');
      params.push(images ? JSON.stringify(images) : null);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (display_order !== undefined) {
      updates.push('display_order = ?');
      params.push(display_order);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    const query = `
      UPDATE refurbishment_packages
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    await db.query(query, params);
    return this.findById(id);
  }

  /**
   * Delete package (soft delete by setting is_active = false)
   */
  static async softDelete(id) {
    const query = `
      UPDATE refurbishment_packages
      SET is_active = 0, updated_at = NOW()
      WHERE id = ?
    `;

    const [result] = await db.query(query, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Hard delete package (only if not linked to any course)
   */
  static async hardDelete(id) {
    // Check if package is linked to any course
    const [links] = await db.query(
      'SELECT COUNT(*) as count FROM course_packages WHERE package_id = ?',
      [id]
    );

    if (links[0].count > 0) {
      throw new Error(
        'Cannot delete package that is linked to courses. Unlink first or use soft delete.'
      );
    }

    const query = 'DELETE FROM refurbishment_packages WHERE id = ?';
    const [result] = await db.query(query, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Get package with course links
   */
  static async findByIdWithCourses(id) {
    const query = `
      SELECT 
        rp.*,
        GROUP_CONCAT(
          JSON_OBJECT(
            'course_id', c.id,
            'course_name', c.course_name,
            'course_code', c.course_code
          )
        ) as courses
      FROM refurbishment_packages rp
      LEFT JOIN course_packages cp ON rp.id = cp.package_id
      LEFT JOIN courses c ON cp.course_id = c.id
      WHERE rp.id = ?
      GROUP BY rp.id
    `;

    const [rows] = await db.query(query, [id]);

    if (rows.length === 0) {
      return null;
    }

    const pkg = rows[0];

    // Parse courses JSON
    if (pkg.courses) {
      try {
        pkg.courses = JSON.parse(`[${pkg.courses}]`);
      } catch (err) {
        pkg.courses = [];
      }
    } else {
      pkg.courses = [];
    }

    return pkg;
  }

  /**
   * Get next available display_order
   */
  static async getNextDisplayOrder() {
    const query =
      'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM refurbishment_packages';
    const [rows] = await db.query(query);
    return rows[0].next_order;
  }

  /**
   * Reorder packages
   */
  static async reorder(orderMap) {
    // orderMap is { package_id: new_display_order }
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      for (const [id, display_order] of Object.entries(orderMap)) {
        await connection.query(
          'UPDATE refurbishment_packages SET display_order = ?, updated_at = NOW() WHERE id = ?',
          [display_order, id]
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = RefurbishmentPackageModel;
