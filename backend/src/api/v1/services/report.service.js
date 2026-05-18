const { v4: uuidv4 } = require('uuid');
const db = require('../../../database/connection');

const ALL_REPORTING_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SEIF_READONLY', 'SEIF_READONLY_DOWNLOAD'];

const DATASETS = {
  core_joined: {
    fromClause: `
      FROM partners p
      LEFT JOIN centers c ON c.partner_id = p.id
      LEFT JOIN batches b ON b.center_id = c.id
      LEFT JOIN students s ON s.batch_id = b.id
      LEFT JOIN employment e ON e.student_id = s.id
      LEFT JOIN trainers t ON t.center_id = c.id
      LEFT JOIN center_courses cc ON cc.center_id = c.id
      LEFT JOIN courses cr ON cr.id = cc.course_id
      LEFT JOIN refurbishment_requests rr ON rr.center_id = c.id
    `,
    fields: {
      partner_id: 'p.id',
      partner_name: 'p.name',
      partner_status: 'p.status',
      center_id: 'c.id',
      center_name: 'c.center_name',
      center_type: 'c.center_type',
      center_state: 'c.state',
      center_city: 'c.city',
      center_region: 'c.region',
      batch_id: 'b.id',
      batch_number: 'b.batch_number',
      batch_status: 'b.status',
      student_id: 's.id',
      student_name: 's.student_name',
      student_gender: 's.gender',
      student_state: 's.state',
      student_city: 's.city',
      course_name: 'cr.course_name',
      employment_status: 'e.employment_status',
      salary_per_month: 'e.salary_per_month',
      trainer_id: 't.id',
      trainer_name: 't.trainer_name',
      trainer_status: 't.status',
      refurbishment_request_id: 'rr.id',
      refurbishment_status: 'rr.status',
      created_partner_at: 'p.created_at',
      created_center_at: 'c.created_at',
      created_batch_at: 'b.created_at',
      created_student_at: 's.created_at',
    },
  },
};

const normalizeArray = (value, fallback = []) => {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (_err) {
    return fallback;
  }
};

const parseJsonColumn = (row) => ({
  ...row,
  selected_fields: normalizeArray(row.selected_fields),
  group_by_fields: normalizeArray(row.group_by_fields),
  metrics: normalizeArray(row.metrics),
  filters: normalizeArray(row.filters),
  visible_roles: normalizeArray(row.visible_roles, ALL_REPORTING_ROLES),
  is_published: !!row.is_published,
});

class ReportService {
  static getDatasetMetadata() {
    return Object.entries(DATASETS).map(([key, meta]) => ({
      key,
      fields: Object.keys(meta.fields),
      metrics: ['count', 'sum', 'avg', 'min', 'max'],
    }));
  }

  static async listDefinitions(currentUser) {
    const [rows] = await db.query(
      `SELECT *
       FROM report_definitions
       WHERE deleted_at IS NULL
       ORDER BY updated_at DESC`
    );

    const parsed = (rows || []).map(parseJsonColumn);
    const { role, id: userId } = currentUser;

    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      return parsed;
    }

    return parsed.filter(
      (row) =>
        row.is_published &&
        row.visible_roles.includes(role) &&
        (row.owner_user_id === userId || row.is_published)
    );
  }

  static sanitizeDefinitionPayload(payload, currentUser, existing = null) {
    const datasetKey = payload.dataset_key || existing?.dataset_key || 'core_joined';
    const dataset = DATASETS[datasetKey];
    if (!dataset) {
      throw new Error('Invalid dataset_key');
    }

    const selectedFields = normalizeArray(
      payload.selected_fields,
      existing?.selected_fields || [
        'partner_name',
        'center_name',
        'batch_number',
        'student_name',
        'employment_status',
        'trainer_name',
      ]
    ).filter((field) => !!dataset.fields[field]);

    if (!selectedFields.length) {
      throw new Error('At least one selected field is required');
    }

    const groupByFields = normalizeArray(
      payload.group_by_fields,
      existing?.group_by_fields || []
    ).filter((field) => !!dataset.fields[field]);

    const rawMetrics = normalizeArray(payload.metrics, existing?.metrics || []);
    const metrics = rawMetrics
      .filter((m) => m && dataset.fields[m.field])
      .filter((m) =>
        ['count', 'sum', 'avg', 'min', 'max'].includes(String(m.type || '').toLowerCase())
      )
      .map((m, idx) => ({
        type: String(m.type).toLowerCase(),
        field: m.field,
        alias: m.alias || `${String(m.type).toLowerCase()}_${m.field}_${idx + 1}`,
      }));

    const rawFilters = normalizeArray(payload.filters, existing?.filters || []);
    const filters = rawFilters
      .filter((f) => f && dataset.fields[f.field])
      .filter((f) =>
        ['eq', 'neq', 'contains', 'gte', 'lte'].includes(String(f.operator || 'eq').toLowerCase())
      )
      .map((f) => ({
        field: f.field,
        operator: String(f.operator || 'eq').toLowerCase(),
        value: f.value,
      }));

    const visibleRoles = normalizeArray(
      payload.visible_roles,
      existing?.visible_roles || ALL_REPORTING_ROLES
    ).filter((role) => ALL_REPORTING_ROLES.includes(role));

    const defaultFormat = ['csv', 'excel', 'pdf'].includes(
      String(payload.default_format || '').toLowerCase()
    )
      ? String(payload.default_format).toLowerCase()
      : existing?.default_format || 'csv';

    return {
      name: payload.name || existing?.name,
      description: payload.description || existing?.description || '',
      dataset_key: datasetKey,
      selected_fields: selectedFields,
      group_by_fields: groupByFields,
      metrics,
      filters,
      visible_roles: visibleRoles.length ? visibleRoles : ALL_REPORTING_ROLES,
      is_published:
        payload.is_published !== undefined
          ? !!payload.is_published
          : (existing?.is_published ?? true),
      default_format: defaultFormat,
      owner_user_id: existing?.owner_user_id || currentUser.id,
    };
  }

  static async createDefinition(payload, currentUser) {
    const definition = this.sanitizeDefinitionPayload(payload, currentUser);
    const id = uuidv4();

    await db.query(
      `INSERT INTO report_definitions (
        id, name, description, dataset_key, selected_fields, group_by_fields,
        metrics, filters, visible_roles, is_published, default_format, owner_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        definition.name,
        definition.description,
        definition.dataset_key,
        JSON.stringify(definition.selected_fields),
        JSON.stringify(definition.group_by_fields),
        JSON.stringify(definition.metrics),
        JSON.stringify(definition.filters),
        JSON.stringify(definition.visible_roles),
        definition.is_published ? 1 : 0,
        definition.default_format,
        definition.owner_user_id,
      ]
    );

    return this.getDefinitionById(id);
  }

  static async getDefinitionById(id) {
    const [rows] = await db.query(
      `SELECT * FROM report_definitions WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    if (!rows?.length) return null;
    return parseJsonColumn(rows[0]);
  }

  static async updateDefinition(id, payload, currentUser) {
    const existing = await this.getDefinitionById(id);
    if (!existing) throw new Error('Report definition not found');

    const definition = this.sanitizeDefinitionPayload(payload, currentUser, existing);

    await db.query(
      `UPDATE report_definitions
       SET name = ?, description = ?, dataset_key = ?, selected_fields = ?, group_by_fields = ?,
           metrics = ?, filters = ?, visible_roles = ?, is_published = ?, default_format = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        definition.name,
        definition.description,
        definition.dataset_key,
        JSON.stringify(definition.selected_fields),
        JSON.stringify(definition.group_by_fields),
        JSON.stringify(definition.metrics),
        JSON.stringify(definition.filters),
        JSON.stringify(definition.visible_roles),
        definition.is_published ? 1 : 0,
        definition.default_format,
        id,
      ]
    );

    return this.getDefinitionById(id);
  }

  static async deleteDefinition(id) {
    const [result] = await db.query(
      `UPDATE report_definitions
       SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    return result?.affectedRows > 0;
  }

  static assertAccess(definition, currentUser, forExport = false) {
    const { role } = currentUser;

    if (!definition) {
      throw new Error('Report definition not found');
    }

    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      return;
    }

    if (!definition.is_published || !definition.visible_roles.includes(role)) {
      throw new Error('Access denied');
    }

    if (forExport && role === 'SEIF_READONLY') {
      throw new Error('Export not allowed for this role');
    }
  }

  static buildWhereClause(definition, dataset) {
    const conditions = [];
    const params = [];

    for (const filter of definition.filters || []) {
      const column = dataset.fields[filter.field];
      if (!column) continue;

      if (filter.operator === 'eq') {
        conditions.push(`${column} = ?`);
        params.push(filter.value);
      } else if (filter.operator === 'neq') {
        conditions.push(`${column} <> ?`);
        params.push(filter.value);
      } else if (filter.operator === 'contains') {
        conditions.push(`${column} LIKE ?`);
        params.push(`%${String(filter.value || '')}%`);
      } else if (filter.operator === 'gte') {
        conditions.push(`${column} >= ?`);
        params.push(filter.value);
      } else if (filter.operator === 'lte') {
        conditions.push(`${column} <= ?`);
        params.push(filter.value);
      }
    }

    return {
      whereSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
      params,
    };
  }

  static buildSelectSql(definition, dataset) {
    const dimensionColumns = (definition.selected_fields || []).map(
      (field) => `${dataset.fields[field]} AS \`${field}\``
    );

    const metricColumns = (definition.metrics || []).map((metric) => {
      const sourceCol = dataset.fields[metric.field];
      const alias = metric.alias || `${metric.type}_${metric.field}`;
      const type = metric.type.toLowerCase();

      if (type === 'count') return `COUNT(${sourceCol}) AS \`${alias}\``;
      if (type === 'sum') return `SUM(${sourceCol}) AS \`${alias}\``;
      if (type === 'avg') return `AVG(${sourceCol}) AS \`${alias}\``;
      if (type === 'min') return `MIN(${sourceCol}) AS \`${alias}\``;
      return `MAX(${sourceCol}) AS \`${alias}\``;
    });

    return [...dimensionColumns, ...metricColumns];
  }

  static async runDefinition(id, currentUser) {
    const definition = await this.getDefinitionById(id);
    this.assertAccess(definition, currentUser, false);

    const dataset = DATASETS[definition.dataset_key];
    const selectCols = this.buildSelectSql(definition, dataset);

    if (!selectCols.length) {
      throw new Error('Invalid report definition: no selected fields');
    }

    const { whereSql, params } = this.buildWhereClause(definition, dataset);

    const groupBy = (definition.group_by_fields || [])
      .map((field) => dataset.fields[field])
      .filter(Boolean);

    const groupBySql = groupBy.length ? `GROUP BY ${groupBy.join(', ')}` : '';

    const sql = `
      SELECT ${selectCols.join(', ')}
      ${dataset.fromClause}
      ${whereSql}
      ${groupBySql}
      LIMIT 5000
    `;

    const [rows] = await db.query(sql, params);

    return {
      definition,
      rows: rows || [],
    };
  }

  static async exportDefinition(id, currentUser) {
    const definition = await this.getDefinitionById(id);
    this.assertAccess(definition, currentUser, true);
    return this.runDefinition(id, currentUser);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Methods (Impact & Performance Dashboard)
// ─────────────────────────────────────────────────────────────────────────────

class AnalyticsService {
  /**
   * Build a WHERE fragment that filters by financial year (April–March)
   * based on batches.batch_start_date.
   * @param {string} year – 'all' / undefined / 'YYYY-YY'
   * @param {string} batchAlias – SQL alias for the batches table (default 'b')
   */
  static yearWhere(year, batchAlias = 'b') {
    if (!year || year === 'all') return { sql: '', params: [] };
    const startYear = parseInt(year.split('-')[0], 10);
    return {
      sql: `AND ((YEAR(${batchAlias}.batch_start_date) = ? AND MONTH(${batchAlias}.batch_start_date) >= 4) OR (YEAR(${batchAlias}.batch_start_date) = ? AND MONTH(${batchAlias}.batch_start_date) <= 3))`,
      params: [startYear, startYear + 1],
    };
  }

  /** KPI summary cards + yearly sparkline trend */
  static async getKpiSummary(year) {
    const { sql: yw, params: yp } = this.yearWhere(year);
    // states_uts uses alias b2 – needs its own yearWhere so SQL references b2.batch_start_date
    const { sql: yw2, params: yp2 } = this.yearWhere(year, 'b2');
    const isFiltered = !!(year && year !== 'all');

    // When a specific year is selected, partners and centers are counted only if
    // they had batches running in that financial year. For "all years", use the
    // simpler active-status count (which includes partners/centers with no batches).
    const partnersSql = isFiltered
      ? `(SELECT COUNT(DISTINCT p.id) FROM partners p
           JOIN centers c ON c.partner_id = p.id
           JOIN batches b ON b.center_id = c.id
           WHERE p.status = 'active' ${yw})`
      : `(SELECT COUNT(*) FROM partners WHERE status = 'active')`;

    const centersSql = isFiltered
      ? `(SELECT COUNT(DISTINCT c.id) FROM centers c
           JOIN batches b ON b.center_id = c.id
           WHERE c.status = 'active' ${yw})`
      : `(SELECT COUNT(*) FROM centers WHERE status = 'active')`;

    // EDP: always LEFT JOIN through students → batches so the year filter works.
    // When year = 'all', yw = '' so the joins are irrelevant and all approved EDP
    // rows are counted. When a year is specified, only rows whose student had a
    // batch starting in that FY are counted.
    const edpSql = `(SELECT COUNT(DISTINCT us.id) FROM uploaded_students us
           LEFT JOIN students s  ON s.id  = us.approved_student_id
           LEFT JOIN batches  b  ON b.id  = s.batch_id
           WHERE us.approval_status = 'approved' AND us.course_name LIKE '%EDP%' ${yw})`;

    // Build params: each subquery that contains ${yw} needs one yp set;
    // states_uts uses ${yw2} and needs yp2.
    // isFiltered=false → yw/yw2 = '' → no ? placeholders → params = []
    const queryParams = isFiltered
      ? [...yp, ...yp, ...yp, ...yp, ...yp, ...yp, ...yp2]
      : //  ^ partners ^ centers ^ youth ^ female ^ employed ^ edp ^ states_uts
        [];

    const [[totals]] = await db.query(
      `SELECT
        ${partnersSql} AS training_partners,
        ${centersSql}  AS training_centers,
        (SELECT COUNT(s.id) FROM students s
           LEFT JOIN batches b ON s.batch_id = b.id WHERE 1=1 ${yw}) AS youth_trained,
        (SELECT COUNT(s.id) FROM students s
           LEFT JOIN batches b ON s.batch_id = b.id
           WHERE s.gender = 'Female' ${yw}) AS female_trainees,
        (SELECT COUNT(DISTINCT e.id) FROM employment e
           JOIN students s ON e.student_id = s.id
           LEFT JOIN batches b ON s.batch_id = b.id
           WHERE e.employment_status IN ('Employed','Self-Employed','Entrepreneur') ${yw}) AS youth_employed,
        (SELECT COUNT(*) FROM trainers WHERE status = 'active') AS trainers_trained,
        ${edpSql} AS edp,
        (SELECT COUNT(DISTINCT s2.state) FROM students s2
           LEFT JOIN batches b2 ON s2.batch_id = b2.id
           WHERE s2.state IS NOT NULL AND s2.state <> '' ${yw2}) AS states_uts
      FROM dual`,
      queryParams
    );

    // Merge custom-value KPIs (greater_india, nsi, alumni, trainers_trained, edp)
    // Note: custom values are year-independent (admin-set global figures).
    // For year-specific views, custom values are NOT added on top (they represent
    // all-time programme totals that can't be split by year).
    const [kpiRows] = await db.query(
      `SELECT kpi_key, custom_value, custom_label
       FROM kpi_settings
       WHERE financial_year = 'all' AND kpi_key IN ('greater_india','nsi','alumni','trainers_trained','edp')`
    );
    const kpiMap = {};
    kpiRows.forEach((r) => {
      kpiMap[r.kpi_key] = r;
    });

    if (!isFiltered) {
      // Only merge custom values when showing all-time totals
      totals.trainers_trained =
        (Number(totals.trainers_trained) || 0) +
        (Number(kpiMap.trainers_trained?.custom_value) || 0);
      totals.edp = (Number(totals.edp) || 0) + (Number(kpiMap.edp?.custom_value) || 0);
    }
    totals.greater_india = Number(kpiMap.greater_india?.custom_value) || 0;
    totals.nsi = Number(kpiMap.nsi?.custom_value) || 0;
    totals.alumni = Number(kpiMap.alumni?.custom_value) || 0;

    return { totals };
  }

  /** Male / Female / Other breakdown */
  static async getGenderBreakdown(year) {
    const { sql: yw, params: yp } = this.yearWhere(year);
    const [rows] = await db.query(
      `SELECT
        SUM(CASE WHEN s.gender = 'Male'   THEN 1 ELSE 0 END) AS male,
        SUM(CASE WHEN s.gender = 'Female' THEN 1 ELSE 0 END) AS female,
        SUM(CASE WHEN s.gender NOT IN ('Male','Female') OR s.gender IS NULL THEN 1 ELSE 0 END) AS other
       FROM students s
       LEFT JOIN batches b ON s.batch_id = b.id
       WHERE 1=1 ${yw}`,
      yp
    );
    const r = rows[0] || { male: 0, female: 0, other: 0 };
    return [
      { name: 'Male', value: Number(r.male) },
      { name: 'Female', value: Number(r.female) },
      ...(Number(r.other) > 0 ? [{ name: 'Other', value: Number(r.other) }] : []),
    ];
  }

  /** Top-15 states by student count */
  static async getStateDistribution(year) {
    const { sql: yw, params: yp } = this.yearWhere(year);
    const [rows] = await db.query(
      `SELECT s.state, COUNT(*) AS students
       FROM students s
       LEFT JOIN batches b ON s.batch_id = b.id
       WHERE s.state IS NOT NULL AND s.state <> '' ${yw}
       GROUP BY s.state
       ORDER BY students DESC
       LIMIT 15`,
      yp
    );
    return rows;
  }

  /** Salary-band performance distribution */
  static async getEmploymentDistribution(year) {
    const { sql: yw, params: yp } = this.yearWhere(year);
    const [rows] = await db.query(
      `SELECT
        CASE
          WHEN e.salary_per_month IS NULL OR e.salary_per_month = 0 THEN 'Not Reported'
          WHEN e.salary_per_month < 12000                            THEN 'Below ₹12k'
          WHEN e.salary_per_month <= 15000                           THEN '₹12k–15k'
          ELSE 'Above ₹15k'
        END AS band,
        COUNT(*) AS count
       FROM employment e
       JOIN students s ON e.student_id = s.id
       LEFT JOIN batches b ON s.batch_id = b.id
       WHERE 1=1 ${yw}
       GROUP BY band
       ORDER BY FIELD(band, 'Below ₹12k','₹12k–15k','Above ₹15k','Not Reported')`,
      yp
    );
    return rows;
  }

  /** Per-course: enrolled, employed, entrepreneur counts + completion % */
  static async getCoursePerformance(year) {
    const { sql: yw, params: yp } = this.yearWhere(year);
    const [rows] = await db.query(
      `SELECT
        cr.course_name,
        COUNT(DISTINCT s.id)  AS enrolled,
        COUNT(DISTINCT CASE WHEN e.employment_status IN ('Employed','Self-Employed','Entrepreneur') THEN s.id END) AS employed,
        COUNT(DISTINCT CASE WHEN e.employment_status IN ('Self-Employed','Entrepreneur')            THEN s.id END) AS entrepreneurs,
        ROUND(
          COUNT(DISTINCT CASE WHEN e.employment_status IN ('Employed','Self-Employed','Entrepreneur') THEN s.id END)
          * 100.0 / NULLIF(COUNT(DISTINCT s.id), 0)
        , 1) AS completion_rate
       FROM courses cr
       LEFT JOIN center_courses cc ON cc.course_id = cr.id
       LEFT JOIN centers c         ON c.id = cc.center_id
       LEFT JOIN batches b         ON b.center_id = c.id
       LEFT JOIN students s        ON s.batch_id = b.id
       LEFT JOIN employment e      ON e.student_id = s.id
       WHERE 1=1 ${yw}
       GROUP BY cr.id, cr.course_name
       HAVING enrolled > 0
       ORDER BY enrolled DESC
       LIMIT 10`,
      yp
    );
    return rows;
  }

  /** Year-over-year trend: enrollment, employment, female — all financial years */
  static async getAnalyticsTrend() {
    const [rows] = await db.query(
      `SELECT
        CASE
          WHEN MONTH(b.batch_start_date) >= 4
            THEN CONCAT(YEAR(b.batch_start_date), '-', LPAD(MOD(YEAR(b.batch_start_date)+1, 100), 2, '0'))
          ELSE
            CONCAT(YEAR(b.batch_start_date)-1, '-', LPAD(MOD(YEAR(b.batch_start_date), 100), 2, '0'))
        END AS fy,
        COUNT(DISTINCT s.id) AS enrolled,
        SUM(CASE WHEN s.gender = 'Female' THEN 1 ELSE 0 END) AS female,
        COUNT(DISTINCT CASE
          WHEN e.employment_status IN ('Employed','Self-Employed','Entrepreneur') THEN e.id
        END) AS employed
       FROM students s
       LEFT JOIN batches b ON s.batch_id = b.id
       LEFT JOIN employment e ON e.student_id = s.id
       WHERE b.batch_start_date IS NOT NULL
         AND b.batch_start_date >= '2020-04-01'
       GROUP BY fy
       ORDER BY fy`
    );
    return rows.map((r) => ({
      fy: r.fy,
      enrolled: Number(r.enrolled),
      female: Number(r.female),
      employed: Number(r.employed),
    }));
  }

  /** Per-partner: students, placement %, entrepreneurship %, center score */
  static async getPartnerPerformance(year) {
    const { sql: yw, params: yp } = this.yearWhere(year);
    const [rows] = await db.query(
      `SELECT
        p.name AS partner_name,
        COUNT(DISTINCT c.id)  AS centers,
        COUNT(DISTINCT s.id)  AS students_trained,
        COUNT(DISTINCT CASE WHEN e.employment_status IN ('Employed','Self-Employed','Entrepreneur') THEN s.id END) AS placed,
        COUNT(DISTINCT CASE WHEN e.employment_status IN ('Self-Employed','Entrepreneur')            THEN s.id END) AS entrepreneurs,
        ROUND(
          COUNT(DISTINCT CASE WHEN e.employment_status IN ('Employed','Self-Employed','Entrepreneur') THEN s.id END)
          * 100.0 / NULLIF(COUNT(DISTINCT s.id), 0)
        , 1) AS placement_pct,
        ROUND(
          COUNT(DISTINCT CASE WHEN e.employment_status IN ('Self-Employed','Entrepreneur') THEN s.id END)
          * 100.0 / NULLIF(COUNT(DISTINCT s.id), 0)
        , 1) AS entrepreneurship_pct,
        ROUND(
          COUNT(DISTINCT CASE WHEN e.employment_status IN ('Employed','Self-Employed','Entrepreneur') THEN s.id END)
          * 10.0 / NULLIF(COUNT(DISTINCT s.id), 0)
        , 1) AS center_score
       FROM partners p
       LEFT JOIN centers  c ON c.partner_id = p.id
       LEFT JOIN batches  b ON b.center_id  = c.id
       LEFT JOIN students s ON s.batch_id   = b.id
       LEFT JOIN employment e ON e.student_id = s.id
       WHERE p.status = 'active' ${yw}
       GROUP BY p.id, p.name
       HAVING students_trained > 0
       ORDER BY students_trained DESC
       LIMIT 15`,
      yp
    );
    return rows;
  }

  /** Build a simple year WHERE for the centers table using batch_start_date */
  static centerYearJoinWhere(year) {
    if (!year || year === 'all') return { needsBatch: false, sql: '', params: [] };
    const startYear = parseInt(year.split('-')[0], 10);
    return {
      needsBatch: true,
      sql: `AND ((YEAR(b.batch_start_date) = ? AND MONTH(b.batch_start_date) >= 4)
        OR (YEAR(b.batch_start_date) = ? AND MONTH(b.batch_start_date) <= 3))`,
      params: [startYear, startYear + 1],
    };
  }

  /** Centers by state (top 15) */
  static async getCentersByState(year) {
    const { needsBatch, sql: yw, params: yp } = this.centerYearJoinWhere(year);
    const joinSql = needsBatch ? 'JOIN batches b ON b.center_id = c.id' : '';
    const [rows] = await db.query(
      `SELECT c.state, COUNT(DISTINCT c.id) AS centers
       FROM centers c ${joinSql}
       WHERE c.status = 'active' AND c.state IS NOT NULL AND c.state <> '' ${yw}
       GROUP BY c.state ORDER BY centers DESC LIMIT 15`,
      yp
    );
    return rows;
  }

  /** Centers active per financial year (growth trend) */
  static async getCenterGrowthTrend() {
    const [rows] = await db.query(
      `SELECT
         CASE
           WHEN MONTH(b.batch_start_date) >= 4
             THEN CONCAT(YEAR(b.batch_start_date), '-', LPAD(MOD(YEAR(b.batch_start_date)+1,100),2,'0'))
           ELSE
             CONCAT(YEAR(b.batch_start_date)-1, '-', LPAD(MOD(YEAR(b.batch_start_date),100),2,'0'))
         END AS fy,
         COUNT(DISTINCT c.id) AS centers
       FROM centers c
       JOIN batches b ON b.center_id = c.id
       WHERE b.batch_start_date IS NOT NULL
         AND b.batch_start_date >= '2020-04-01'
         AND c.status = 'active'
       GROUP BY fy ORDER BY fy`
    );
    return rows.map((r) => ({ fy: r.fy, centers: Number(r.centers) }));
  }

  /** Centers by type */
  static async getCentersByType(year) {
    const { needsBatch, sql: yw, params: yp } = this.centerYearJoinWhere(year);
    const joinSql = needsBatch ? 'JOIN batches b ON b.center_id = c.id' : '';
    const [rows] = await db.query(
      `SELECT c.center_type, COUNT(DISTINCT c.id) AS centers
       FROM centers c ${joinSql}
       WHERE c.status = 'active' AND c.center_type IS NOT NULL AND c.center_type <> '' ${yw}
       GROUP BY c.center_type ORDER BY centers DESC`,
      yp
    );
    return rows;
  }

  /** Centers by region */
  static async getCentersByRegion(year) {
    const { needsBatch, sql: yw, params: yp } = this.centerYearJoinWhere(year);
    const joinSql = needsBatch ? 'JOIN batches b ON b.center_id = c.id' : '';
    const [rows] = await db.query(
      `SELECT c.region, COUNT(DISTINCT c.id) AS centers
       FROM centers c ${joinSql}
       WHERE c.status = 'active' AND c.region IS NOT NULL AND c.region <> '' ${yw}
       GROUP BY c.region ORDER BY centers DESC`,
      yp
    );
    return rows;
  }

  /** Top 15 centers by students trained */
  static async getCenterPerformance(year) {
    const { sql: yw, params: yp } = this.yearWhere(year);
    const [rows] = await db.query(
      `SELECT
         c.center_name,
         p.name AS partner_name,
         c.state,
         COUNT(DISTINCT s.id) AS students_trained,
         COUNT(DISTINCT CASE WHEN e.employment_status IN ('Employed','Self-Employed','Entrepreneur') THEN s.id END) AS placed,
         ROUND(
           COUNT(DISTINCT CASE WHEN e.employment_status IN ('Employed','Self-Employed','Entrepreneur') THEN s.id END)
           * 100.0 / NULLIF(COUNT(DISTINCT s.id), 0)
         , 1) AS placement_pct
       FROM centers c
       LEFT JOIN partners p ON p.id = c.partner_id
       LEFT JOIN batches b ON b.center_id = c.id
       LEFT JOIN students s ON s.batch_id = b.id
       LEFT JOIN employment e ON e.student_id = s.id
       WHERE c.status = 'active' ${yw}
       GROUP BY c.id, c.center_name, p.name, c.state
       HAVING students_trained > 0
       ORDER BY students_trained DESC
       LIMIT 15`,
      yp
    );
    return rows;
  }
}

// ─── PreferenceService ───────────────────────────────────────────────────────
class PreferenceService {
  static DEFAULT_LAYOUT = [
    'india_map',
    'gender_pie',
    'yoy_trend',
    'salary_dist',
    'state_dist',
    'course_table',
    'course_chart',
    'partner_table',
    'center_state_dist',
    'center_growth_trend',
    'center_type_chart',
    'center_region_chart',
    'center_performance',
  ];

  static async getLayout(userId) {
    const [rows] = await db.query(
      `SELECT pref_value FROM user_preferences
       WHERE user_id = ? AND pref_key = 'report_section_order'
       LIMIT 1`,
      [userId]
    );
    if (!rows.length || !rows[0].pref_value) {
      return this.DEFAULT_LAYOUT;
    }
    try {
      const parsed = JSON.parse(rows[0].pref_value);
      // Merge in any new sections that weren't saved yet
      const merged = [
        ...parsed.filter((s) => this.DEFAULT_LAYOUT.includes(s)),
        ...this.DEFAULT_LAYOUT.filter((s) => !parsed.includes(s)),
      ];
      return merged;
    } catch {
      return this.DEFAULT_LAYOUT;
    }
  }

  static async saveLayout(userId, order) {
    const valid = order.filter((s) => this.DEFAULT_LAYOUT.includes(s));
    const id = uuidv4();
    await db.query(
      `INSERT INTO user_preferences (id, user_id, pref_key, pref_value)
       VALUES (?, ?, 'report_section_order', ?)
       ON DUPLICATE KEY UPDATE pref_value = VALUES(pref_value), updated_at = NOW()`,
      [id, userId, JSON.stringify(valid)]
    );
    return valid;
  }

  // ─── Unified preferences (layout rows + config + kpiOrder) ────────────────
  static async getPreferences(userId) {
    const [rows] = await db.query(
      `SELECT pref_key, pref_value FROM user_preferences
       WHERE user_id = ? AND pref_key IN ('report_preferences', 'report_section_order')`,
      [userId]
    );
    const byKey = {};
    for (const r of rows) {
      try {
        byKey[r.pref_key] = JSON.parse(r.pref_value);
      } catch {
        /* ignore */
      }
    }

    // Prefer the new unified key
    if (byKey.report_preferences) {
      const prefs = byKey.report_preferences;
      // Merge in any new sections added since last save
      if (Array.isArray(prefs.layoutRows)) {
        const storedIds = new Set(
          prefs.layoutRows.flatMap((r) => (r.slots || []).map((s) => s.id))
        );
        const newIds = this.DEFAULT_LAYOUT.filter((id) => !storedIds.has(id));
        if (newIds.length) {
          prefs.layoutRows = [
            ...prefs.layoutRows,
            ...newIds.map((id) => ({ slots: [{ id, flex: 10 }] })),
          ];
        }
      }
      return prefs;
    }

    // Legacy fallback: flat order only
    if (byKey.report_section_order) {
      const flat = byKey.report_section_order;
      const merged = [
        ...flat.filter((s) => this.DEFAULT_LAYOUT.includes(s)),
        ...this.DEFAULT_LAYOUT.filter((s) => !flat.includes(s)),
      ];
      return { layoutRows: merged.map((id) => ({ slots: [{ id, flex: 10 }] })) };
    }

    return null; // No saved preferences — frontend will use defaults
  }

  static async savePreferences(userId, { layoutRows, config, kpiOrder }) {
    const id = uuidv4();
    const value = JSON.stringify({ layoutRows, config, kpiOrder });
    await db.query(
      `INSERT INTO user_preferences (id, user_id, pref_key, pref_value)
       VALUES (?, ?, 'report_preferences', ?)
       ON DUPLICATE KEY UPDATE pref_value = VALUES(pref_value), updated_at = NOW()`,
      [id, userId, value]
    );
  }
}

module.exports = { ReportService, AnalyticsService, PreferenceService };
