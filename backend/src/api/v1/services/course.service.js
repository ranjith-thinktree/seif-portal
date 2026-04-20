const { pool } = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const normalizeOptionalString = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmedValue = String(value).trim();
  return trimmedValue === '' ? null : trimmedValue;
};

const mapCourseRow = (row) => ({
  ...row,
  is_active: Boolean(row.is_active),
  centers_count: Number(row.centers_count || 0),
  packages_count: Number(row.packages_count || 0),
});

class CourseService {
  async getCourses({
    page = 1,
    limit = 10,
    search = '',
    is_active,
    sort_by = 'course_name',
    sort_order = 'asc',
  }) {
    const validPage = Math.max(1, parseInt(page, 10) || 1);
    const validLimit = Math.max(1, Math.min(1000, parseInt(limit, 10) || 10));
    const offset = (validPage - 1) * validLimit;

    const allowedSortFields = [
      'course_name',
      'course_code',
      'duration_months',
      'is_active',
      'created_at',
      'updated_at',
    ];
    const validSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'course_name';
    const validSortOrder = String(sort_order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const whereConditions = [];
    const queryParams = [];

    if (search) {
      whereConditions.push('(course_name LIKE ? OR course_code LIKE ? OR description LIKE ?)');
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    if (is_active !== undefined && is_active !== null && is_active !== '') {
      const normalizedIsActive =
        is_active === true || is_active === 'true' || is_active === '1' || is_active === 1 ? 1 : 0;
      whereConditions.push('is_active = ?');
      queryParams.push(normalizedIsActive);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM courses
       ${whereClause}`,
      queryParams
    );
    const total = Number(countResult[0]?.total || 0);

    const [rows] = await pool.query(
      `SELECT
         c.id,
         c.course_name,
         c.course_code,
         c.description,
         c.duration_months,
         c.is_active,
         c.created_at,
         c.updated_at,
         (
           SELECT COUNT(DISTINCT cc.center_id)
           FROM center_courses cc
           WHERE cc.course_id = c.id
         ) AS centers_count,
         (
           SELECT COUNT(DISTINCT cp.package_id)
           FROM course_packages cp
           WHERE cp.course_id = c.id
         ) AS packages_count
       FROM courses c
       ${whereClause}
       ORDER BY c.${validSortBy} ${validSortOrder}
       LIMIT ? OFFSET ?`,
      [...queryParams, validLimit, offset]
    );

    return {
      data: rows.map(mapCourseRow),
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / validLimit)),
      },
    };
  }

  async getCourseById(courseId) {
    if (!UUID_PATTERN.test(courseId)) {
      return null;
    }

    const [rows] = await pool.query(
      `SELECT
         c.id,
         c.course_name,
         c.course_code,
         c.description,
         c.duration_months,
         c.is_active,
         c.created_at,
         c.updated_at,
         (
           SELECT COUNT(DISTINCT cc.center_id)
           FROM center_courses cc
           WHERE cc.course_id = c.id
         ) AS centers_count,
         (
           SELECT COUNT(DISTINCT cp.package_id)
           FROM course_packages cp
           WHERE cp.course_id = c.id
         ) AS packages_count
       FROM courses c
       WHERE c.id = ?
       LIMIT 1`,
      [courseId]
    );

    if (rows.length === 0) {
      return null;
    }

    return mapCourseRow(rows[0]);
  }

  async createCourse({ course_name, course_code, description, duration_months, is_active = true }) {
    const normalizedName = normalizeOptionalString(course_name);
    const normalizedCode = normalizeOptionalString(course_code);
    const normalizedDescription = normalizeOptionalString(description);
    const normalizedDuration =
      duration_months === undefined || duration_months === null || duration_months === ''
        ? null
        : Number(duration_months);
    const normalizedIsActive =
      is_active === true || is_active === 'true' || is_active === 1 || is_active === '1';

    await this.ensureUniqueCourseFields({
      course_name: normalizedName,
      course_code: normalizedCode,
    });

    const courseId = uuidv4();
    await pool.query(
      `INSERT INTO courses (
        id,
        course_name,
        course_code,
        description,
        duration_months,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        courseId,
        normalizedName,
        normalizedCode,
        normalizedDescription,
        normalizedDuration,
        normalizedIsActive ? 1 : 0,
      ]
    );

    return this.getCourseById(courseId);
  }

  async updateCourse(courseId, updates) {
    const existingCourse = await this.getCourseById(courseId);
    if (!existingCourse) {
      return null;
    }

    const nextValues = {
      course_name:
        updates.course_name !== undefined
          ? normalizeOptionalString(updates.course_name)
          : existingCourse.course_name,
      course_code:
        updates.course_code !== undefined
          ? normalizeOptionalString(updates.course_code)
          : existingCourse.course_code,
      description:
        updates.description !== undefined
          ? normalizeOptionalString(updates.description)
          : existingCourse.description,
      duration_months:
        updates.duration_months !== undefined
          ? updates.duration_months === null || updates.duration_months === ''
            ? null
            : Number(updates.duration_months)
          : existingCourse.duration_months,
      is_active:
        updates.is_active !== undefined
          ? updates.is_active === true ||
            updates.is_active === 'true' ||
            updates.is_active === 1 ||
            updates.is_active === '1'
          : existingCourse.is_active,
    };

    await this.ensureUniqueCourseFields(
      {
        course_name: nextValues.course_name,
        course_code: nextValues.course_code,
      },
      courseId
    );

    await pool.query(
      `UPDATE courses
       SET course_name = ?,
           course_code = ?,
           description = ?,
           duration_months = ?,
           is_active = ?
       WHERE id = ?`,
      [
        nextValues.course_name,
        nextValues.course_code,
        nextValues.description,
        nextValues.duration_months,
        nextValues.is_active ? 1 : 0,
        courseId,
      ]
    );

    return this.getCourseById(courseId);
  }

  async ensureUniqueCourseFields({ course_name, course_code }, ignoreCourseId = null) {
    const duplicateChecks = [];

    if (course_name) {
      duplicateChecks.push({ field: 'course_name', value: course_name, label: 'Course name' });
    }

    if (course_code) {
      duplicateChecks.push({ field: 'course_code', value: course_code, label: 'Course code' });
    }

    for (const check of duplicateChecks) {
      const params = [check.value];
      let query = `SELECT id FROM courses WHERE ${check.field} = ?`;

      if (ignoreCourseId) {
        query += ' AND id <> ?';
        params.push(ignoreCourseId);
      }

      query += ' LIMIT 1';

      const [rows] = await pool.query(query, params);
      if (rows.length > 0) {
        const error = new Error(`${check.label} already exists`);
        error.statusCode = 409;
        throw error;
      }
    }
  }
}

module.exports = new CourseService();
