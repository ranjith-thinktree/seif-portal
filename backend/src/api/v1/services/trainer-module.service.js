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

const mapModuleRow = (row) => ({
  ...row,
  is_active: Boolean(row.is_active),
});

class TrainerModuleService {
  async getModules({
    page = 1,
    limit = 10,
    search = '',
    is_active,
    sort_by = 'module_name',
    sort_order = 'asc',
  }) {
    const validPage = Math.max(1, parseInt(page, 10) || 1);
    const validLimit = Math.max(1, Math.min(1000, parseInt(limit, 10) || 10));
    const offset = (validPage - 1) * validLimit;

    const allowedSortFields = [
      'module_name',
      'module_code',
      'duration_months',
      'is_active',
      'created_at',
      'updated_at',
    ];
    const validSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'module_name';
    const validSortOrder = String(sort_order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const whereConditions = [];
    const queryParams = [];

    if (search) {
      whereConditions.push('(module_name LIKE ? OR module_code LIKE ? OR description LIKE ?)');
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
      `SELECT COUNT(*) AS total FROM trainer_modules ${whereClause}`,
      queryParams
    );
    const total = Number(countResult[0]?.total || 0);

    const [rows] = await pool.query(
      `SELECT
         id,
         module_name,
         module_code,
         description,
         duration_months,
         is_active,
         created_at,
         updated_at
       FROM trainer_modules
       ${whereClause}
       ORDER BY ${validSortBy} ${validSortOrder}
       LIMIT ? OFFSET ?`,
      [...queryParams, validLimit, offset]
    );

    return {
      data: rows.map(mapModuleRow),
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / validLimit)),
      },
    };
  }

  async getModuleById(moduleId) {
    if (!UUID_PATTERN.test(moduleId)) {
      return null;
    }

    const [rows] = await pool.query(
      `SELECT
         id,
         module_name,
         module_code,
         description,
         duration_months,
         is_active,
         created_at,
         updated_at
       FROM trainer_modules
       WHERE id = ?
       LIMIT 1`,
      [moduleId]
    );

    if (rows.length === 0) {
      return null;
    }

    return mapModuleRow(rows[0]);
  }

  async createModule({ module_name, module_code, description, duration_months, is_active = true }) {
    const normalizedName = normalizeOptionalString(module_name);
    const normalizedCode = normalizeOptionalString(module_code);
    const normalizedDescription = normalizeOptionalString(description);
    const normalizedDuration =
      duration_months === undefined || duration_months === null || duration_months === ''
        ? null
        : Number(duration_months);
    const normalizedIsActive =
      is_active === true || is_active === 'true' || is_active === 1 || is_active === '1';

    await this.ensureUniqueModuleFields({
      module_name: normalizedName,
      module_code: normalizedCode,
    });

    const moduleId = uuidv4();
    await pool.query(
      `INSERT INTO trainer_modules (
        id,
        module_name,
        module_code,
        description,
        duration_months,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        moduleId,
        normalizedName,
        normalizedCode,
        normalizedDescription,
        normalizedDuration,
        normalizedIsActive ? 1 : 0,
      ]
    );

    return this.getModuleById(moduleId);
  }

  async updateModule(moduleId, updates) {
    const existingModule = await this.getModuleById(moduleId);
    if (!existingModule) {
      return null;
    }

    const nextValues = {
      module_name:
        updates.module_name !== undefined
          ? normalizeOptionalString(updates.module_name)
          : existingModule.module_name,
      module_code:
        updates.module_code !== undefined
          ? normalizeOptionalString(updates.module_code)
          : existingModule.module_code,
      description:
        updates.description !== undefined
          ? normalizeOptionalString(updates.description)
          : existingModule.description,
      duration_months:
        updates.duration_months !== undefined
          ? updates.duration_months === null || updates.duration_months === ''
            ? null
            : Number(updates.duration_months)
          : existingModule.duration_months,
      is_active:
        updates.is_active !== undefined
          ? updates.is_active === true ||
            updates.is_active === 'true' ||
            updates.is_active === 1 ||
            updates.is_active === '1'
          : existingModule.is_active,
    };

    await this.ensureUniqueModuleFields(
      {
        module_name: nextValues.module_name,
        module_code: nextValues.module_code,
      },
      moduleId
    );

    await pool.query(
      `UPDATE trainer_modules
       SET module_name = ?,
           module_code = ?,
           description = ?,
           duration_months = ?,
           is_active = ?
       WHERE id = ?`,
      [
        nextValues.module_name,
        nextValues.module_code,
        nextValues.description,
        nextValues.duration_months,
        nextValues.is_active ? 1 : 0,
        moduleId,
      ]
    );

    return this.getModuleById(moduleId);
  }

  async deleteModule(moduleId) {
    const existingModule = await this.getModuleById(moduleId);
    if (!existingModule) {
      return null;
    }

    await pool.query('DELETE FROM trainer_modules WHERE id = ?', [moduleId]);
    return true;
  }

  async ensureUniqueModuleFields({ module_name, module_code }, ignoreModuleId = null) {
    const duplicateChecks = [];

    if (module_name) {
      duplicateChecks.push({ field: 'module_name', value: module_name, label: 'Module name' });
    }

    if (module_code) {
      duplicateChecks.push({ field: 'module_code', value: module_code, label: 'Module code' });
    }

    for (const check of duplicateChecks) {
      const params = [check.value];
      let query = `SELECT id FROM trainer_modules WHERE ${check.field} = ?`;

      if (ignoreModuleId) {
        query += ' AND id <> ?';
        params.push(ignoreModuleId);
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

module.exports = new TrainerModuleService();
