'use strict';

const db = require('../../../database/connection');
const { DatabaseError } = require('../../../utils/error.util');
const { v4: uuidv4 } = require('uuid');

/**
 * KPI keys recognised by the system.
 * These must match the seeds in 20250403_create_kpi_settings.sql
 */
const VALID_KPI_KEYS = [
  'youth_trained',
  'trainers_trained',
  'edp',
  'youth_employed',
  'partners',
  'centers',
  'states_uts',
  'greater_india',
  'nsi',
  'alumni',
];

class KpiService {
  /**
   * Get all KPI settings for a given financial year.
   * Returns merged rows: if a per-year row exists it takes precedence over 'all';
   * otherwise the 'all' row is returned.
   *
   * @param {string} year - 'all' or 'YYYY-YY'
   * @returns {Object} Map of kpiKey → { customValue, isVisible, financialYear }
   */
  static async getSettings(year = 'all') {
    try {
      // Fetch default 'all' settings and per-year settings together
      const [rows] = await db.query(
        `SELECT kpi_key, financial_year, custom_value, is_visible, sort_order
         FROM kpi_settings
         WHERE financial_year IN (?, 'all')
         ORDER BY financial_year ASC`,
        [year]
      );

      // Build merged map: year-specific overrides 'all'
      const map = {};

      // First pass: populate with 'all' defaults (includes sort_order)
      rows.forEach((row) => {
        if (row.financial_year === 'all') {
          map[row.kpi_key] = {
            customValue: row.custom_value,
            isVisible: row.is_visible === 1,
            sortOrder: row.sort_order ?? 99,
            financialYear: 'all',
          };
        }
      });

      // Second pass: override with year-specific values (keep sortOrder from 'all' row)
      if (year !== 'all') {
        rows.forEach((row) => {
          if (row.financial_year === year) {
            map[row.kpi_key] = {
              customValue: row.custom_value,
              isVisible: row.is_visible === 1,
              sortOrder: map[row.kpi_key]?.sortOrder ?? row.sort_order ?? 99,
              financialYear: year,
            };
          }
        });
      }

      // Ensure all known KPI keys are present (in case seeds missing)
      VALID_KPI_KEYS.forEach((key, idx) => {
        if (!map[key]) {
          map[key] = { customValue: 0, isVisible: true, sortOrder: idx + 1, financialYear: 'all' };
        }
      });

      return map;
    } catch (error) {
      console.error('[KpiService] getSettings error:', error);
      throw new DatabaseError('Failed to fetch KPI settings');
    }
  }

  /**
   * Upsert a single KPI setting.
   * @param {string} kpiKey     - one of VALID_KPI_KEYS
   * @param {string} year       - 'all' or 'YYYY-YY'
   * @param {number|null} customValue
   * @param {boolean|null} isVisible
   * @param {string} userId
   */
  static async upsertSetting(kpiKey, year = 'all', customValue, isVisible, userId) {
    if (!VALID_KPI_KEYS.includes(kpiKey)) {
      throw new Error(`Invalid KPI key: ${kpiKey}`);
    }

    try {
      // Check if row exists
      const [existing] = await db.query(
        'SELECT id FROM kpi_settings WHERE kpi_key = ? AND financial_year = ?',
        [kpiKey, year]
      );

      if (existing.length > 0) {
        const updates = [];
        const params = [];

        if (customValue !== undefined && customValue !== null) {
          updates.push('custom_value = ?');
          params.push(parseInt(customValue, 10));
        }
        if (isVisible !== undefined && isVisible !== null) {
          updates.push('is_visible = ?');
          params.push(isVisible ? 1 : 0);
        }
        updates.push('updated_by = ?', 'updated_at = NOW()');
        params.push(userId, existing[0].id);

        await db.query(`UPDATE kpi_settings SET ${updates.join(', ')} WHERE id = ?`, params);
      } else {
        await db.query(
          `INSERT INTO kpi_settings (id, kpi_key, financial_year, custom_value, is_visible, updated_by, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            uuidv4(),
            kpiKey,
            year,
            customValue !== undefined && customValue !== null ? parseInt(customValue, 10) : 0,
            isVisible !== undefined && isVisible !== null ? (isVisible ? 1 : 0) : 1,
            userId,
          ]
        );
      }
    } catch (error) {
      console.error('[KpiService] upsertSetting error:', error);
      throw new DatabaseError('Failed to update KPI setting');
    }
  }

  /**
   * Reorder KPI cards. Accepts an ordered array of kpi keys and updates
   * sort_order on the 'all' rows so dashboard and settings reflect the new order.
   * @param {string[]} orderedKeys - Keys in desired display order (index 0 = first)
   */
  static async reorderSettings(orderedKeys) {
    if (!Array.isArray(orderedKeys) || orderedKeys.length === 0) {
      throw new Error('orderedKeys must be a non-empty array');
    }

    // Validate all keys
    for (const key of orderedKeys) {
      if (!VALID_KPI_KEYS.includes(key)) {
        throw new Error(`Invalid KPI key in reorder request: ${key}`);
      }
    }

    try {
      // Build a CASE expression to update all in one query
      const cases = orderedKeys.map((key, idx) => `WHEN ? THEN ?`).join(' ');
      const params = [];
      orderedKeys.forEach((key, idx) => params.push(key, idx + 1));
      params.push(...orderedKeys); // for the IN clause

      await db.query(
        `UPDATE kpi_settings
         SET sort_order = CASE kpi_key ${cases} END
         WHERE kpi_key IN (${orderedKeys.map(() => '?').join(',')})
           AND financial_year = 'all'`,
        params
      );
    } catch (error) {
      console.error('[KpiService] reorderSettings error:', error);
      throw new DatabaseError('Failed to reorder KPI settings');
    }
  }

  /**
   * Get actual live DB counts for each KPI key (without custom value offset).
   * Used in the Settings panel to show admins the real numbers.
   * @returns {Object} Map of kpiKey → liveDbCount
   */
  static async getLiveValues() {
    try {
      const [students] = await db.query(
        `SELECT COUNT(*) as total FROM uploaded_students WHERE approval_status = 'approved'`
      );
      const [partners] = await db.query(
        `SELECT COUNT(*) as total FROM partners WHERE status = 'active'`
      );
      const [centers] = await db.query(
        `SELECT COUNT(*) as total FROM centers WHERE status = 'active'`
      );
      const [employments] = await db.query(`SELECT COUNT(*) as total FROM employment`);
      const [states] = await db.query(
        `SELECT COUNT(DISTINCT state) as total FROM centers WHERE status = 'active'`
      );
      const [edp] = await db.query(
        `SELECT COUNT(DISTINCT us.id) as total
         FROM uploaded_students us
         WHERE us.approval_status = 'approved' AND us.course_name LIKE '%EDP%'`
      );

      return {
        youth_trained: students[0]?.total || 0,
        trainers_trained: 0, // custom value only, no DB source
        edp: edp[0]?.total || 0,
        youth_employed: employments[0]?.total || 0,
        partners: partners[0]?.total || 0,
        centers: centers[0]?.total || 0,
        states_uts: states[0]?.total || 0,
        greater_india: 0, // custom value only
        nsi: 0, // custom value only
        alumni: 0, // custom value only
      };
    } catch (error) {
      console.error('[KpiService] getLiveValues error:', error);
      throw new DatabaseError('Failed to fetch live KPI values');
    }
  }
}

module.exports = { KpiService, VALID_KPI_KEYS };
