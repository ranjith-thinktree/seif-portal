const db = require('../../../database/connection');
const { DatabaseError } = require('../../../utils/error.util');
const { KpiService } = require('./kpi.service');

/**
 * Dashboard Service
 * Provides dashboard statistics for different user roles
 */
class DashboardService {
  /**
   * Get partner dashboard statistics
   * @param {string} partnerId - Partner UUID
   * @returns {Object} Partner dashboard data
   */
  static async getPartnerDashboard(partnerId) {
    try {
      // Get total centers count
      const [centersResult] = await db.query(
        'SELECT COUNT(*) as total FROM centers WHERE partner_id = ? AND status = ?',
        [partnerId, 'active']
      );
      const totalCenters = centersResult[0].total;

      // Get total batches count
      const [batchesResult] = await db.query(
        'SELECT COUNT(*) as total FROM batches WHERE partner_id = ?',
        [partnerId]
      );
      const totalBatches = batchesResult[0].total;

      // Get total students from uploaded_students (approved)
      const [studentsResult] = await db.query(
        `SELECT COUNT(*) as total 
         FROM uploaded_students 
         WHERE partner_id = ? AND approval_status = ?`,
        [partnerId, 'approved']
      );
      const totalStudents = studentsResult[0].total;

      // Get pending uploads
      const [pendingUploadsResult] = await db.query(
        `SELECT COUNT(*) as total 
         FROM data_uploads 
         WHERE partner_id = ? AND status = ?`,
        [partnerId, 'pending']
      );
      const pendingUploads = pendingUploadsResult[0].total;

      // Get approved uploads count
      const [approvedUploadsResult] = await db.query(
        `SELECT COUNT(*) as total 
         FROM data_uploads 
         WHERE partner_id = ? AND status = ?`,
        [partnerId, 'approved']
      );
      const approvedUploads = approvedUploadsResult[0].total;

      // Get rejected uploads count
      const [rejectedUploadsResult] = await db.query(
        `SELECT COUNT(*) as total 
         FROM data_uploads 
         WHERE partner_id = ? AND status = ?`,
        [partnerId, 'rejected']
      );
      const rejectedUploads = rejectedUploadsResult[0].total;

      // Get active requests count
      const [activeRequestsResult] = await db.query(
        `SELECT COUNT(*) as total 
         FROM requests 
         WHERE partner_id = ? AND status IN (?, ?, ?)`,
        [partnerId, 'pending', 'partner_submitted', 'in_review']
      );
      const activeRequests = activeRequestsResult[0].total;

      // Get recent uploads (last 5)
      const [recentUploads] = await db.query(
        `SELECT id, file_name, status, created_at, total_records
         FROM data_uploads 
         WHERE partner_id = ? 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [partnerId]
      );

      // Get refurbishment eligible centers
      const [eligibleCenters] = await db.query(
        `SELECT COUNT(*) as total 
         FROM centers 
         WHERE partner_id = ? AND refurbishment_eligible = ? AND status = ?`,
        [partnerId, 1, 'active']
      );
      const refurbishmentEligibleCenters = eligibleCenters[0].total;

      return {
        statistics: {
          totalCenters,
          totalBatches,
          totalStudents,
          pendingUploads,
          approvedUploads,
          rejectedUploads,
          activeRequests,
          refurbishmentEligibleCenters,
        },
        recentUploads,
      };
    } catch (error) {
      console.error('Error in getPartnerDashboard:', error);
      throw new DatabaseError('Failed to fetch partner dashboard data');
    }
  }

  /**
   * Get admin dashboard statistics
   * @returns {Object} Admin dashboard data
   */
  static async getAdminDashboard() {
    try {
      // Get total partners count
      const [partnersResult] = await db.query(
        'SELECT COUNT(*) as total FROM partners WHERE status = ?',
        ['active']
      );
      const totalPartners = partnersResult[0].total;

      // Get total centers count
      const [centersResult] = await db.query(
        'SELECT COUNT(*) as total FROM centers WHERE status = ?',
        ['active']
      );
      const totalCenters = centersResult[0].total;

      // Get total batches count
      const [batchesResult] = await db.query('SELECT COUNT(*) as total FROM batches');
      const totalBatches = batchesResult[0].total;

      // Get total students count (approved)
      const [studentsResult] = await db.query(
        `SELECT COUNT(*) as total 
         FROM uploaded_students 
         WHERE approval_status = ?`,
        ['approved']
      );
      const totalStudents = studentsResult[0].total;

      // Get pending uploads for review
      const [pendingUploadsResult] = await db.query(
        `SELECT COUNT(*) as total 
         FROM data_uploads 
         WHERE status = ?`,
        ['pending']
      );
      const pendingUploads = pendingUploadsResult[0].total;

      // Get pending requests
      const [pendingRequestsResult] = await db.query(
        `SELECT COUNT(*) as total 
         FROM requests 
         WHERE status IN (?, ?)`,
        ['pending', 'partner_submitted']
      );
      const pendingRequests = pendingRequestsResult[0].total;

      // Get refurbishment eligible centers
      const [eligibleCentersResult] = await db.query(
        `SELECT COUNT(*) as total 
         FROM centers 
         WHERE refurbishment_eligible = ? AND status = ?`,
        [1, 'active']
      );
      const refurbishmentEligibleCenters = eligibleCentersResult[0].total;

      // Get recent uploads (last 10)
      const [recentUploads] = await db.query(
        `SELECT du.id, du.file_name, du.status, du.created_at, du.total_records,
                p.name as partner_name
         FROM data_uploads du
         JOIN partners p ON du.partner_id = p.id
         ORDER BY du.created_at DESC 
         LIMIT 10`
      );

      // Get centers by region
      const [centersByRegion] = await db.query(
        `SELECT region, COUNT(*) as count 
         FROM centers 
         WHERE status = ? 
         GROUP BY region`,
        ['active']
      );

      // Get centers by state (top 10)
      const [centersByState] = await db.query(
        `SELECT state, COUNT(*) as count 
         FROM centers 
         WHERE status = ? 
         GROUP BY state 
         ORDER BY count DESC 
         LIMIT 10`,
        ['active']
      );

      return {
        statistics: {
          totalPartners,
          totalCenters,
          totalBatches,
          totalStudents,
          pendingUploads,
          pendingRequests,
          refurbishmentEligibleCenters,
        },
        recentUploads,
        centersByRegion,
        centersByState,
      };
    } catch (error) {
      console.error('Error in getAdminDashboard:', error);
      throw new DatabaseError('Failed to fetch admin dashboard data');
    }
  }

  /**
   * Get SEIF/ESSCI read-only dashboard statistics
   * @param {Object} filters - Optional filters (state, region, year)
   * @returns {Object} SEIF dashboard data with aggregated statistics
   */
  static async getSEIFDashboard(filters = {}) {
    try {
      const { state, region, year } = filters;

      // Build WHERE clauses based on filters
      let centerWhereClause = 'WHERE c.status = ?';
      let centerParams = ['active'];

      if (state) {
        centerWhereClause += ' AND c.state = ?';
        centerParams.push(state);
      }

      if (region) {
        centerWhereClause += ' AND c.region = ?';
        centerParams.push(region);
      }

      // Get total centers with filters
      const [centersResult] = await db.query(
        `SELECT COUNT(*) as total FROM centers c ${centerWhereClause}`,
        centerParams
      );
      const totalCenters = centersResult[0].total;

      // Get total partners (active only)
      const [partnersResult] = await db.query(
        'SELECT COUNT(*) as total FROM partners WHERE status = ?',
        ['active']
      );
      const totalPartners = partnersResult[0].total;

      // Get total batches with filters
      let batchWhereClause = '';
      let batchParams = [];

      if (state || region) {
        batchWhereClause = `WHERE b.center_id IN (
          SELECT id FROM centers c ${centerWhereClause}
        )`;
        batchParams = [...centerParams];
      }

      if (year) {
        batchWhereClause += batchWhereClause ? ' AND ' : 'WHERE ';
        batchWhereClause += 'YEAR(b.batch_start_date) = ?';
        batchParams.push(year);
      }

      const [batchesResult] = await db.query(
        `SELECT COUNT(*) as total FROM batches b ${batchWhereClause}`,
        batchParams
      );
      const totalBatches = batchesResult[0].total;

      // Get total students (approved)
      let studentWhereClause = 'WHERE us.approval_status = ?';
      let studentParams = ['approved'];

      if (state || region) {
        studentWhereClause += ` AND us.uploaded_center_id IN (
          SELECT uc.id FROM uploaded_centers uc
          JOIN centers c ON uc.approved_center_id = c.id
          ${centerWhereClause}
        )`;
        studentParams.push(...centerParams);
      }

      const [studentsResult] = await db.query(
        `SELECT COUNT(*) as total FROM uploaded_students us ${studentWhereClause}`,
        studentParams
      );
      const totalStudents = studentsResult[0].total;

      // Get centers by region
      const [centersByRegion] = await db.query(
        `SELECT region, COUNT(*) as count 
         FROM centers c
         ${centerWhereClause}
         GROUP BY region`,
        centerParams
      );

      // Get centers by state
      const [centersByState] = await db.query(
        `SELECT state, COUNT(*) as count 
         FROM centers c
         ${centerWhereClause}
         GROUP BY state 
         ORDER BY count DESC`,
        centerParams
      );

      // Get centers by type
      const [centersByType] = await db.query(
        `SELECT center_type, COUNT(*) as count 
         FROM centers c
         ${centerWhereClause}
         GROUP BY center_type`,
        centerParams
      );

      // Get student gender distribution
      const [genderDistribution] = await db.query(
        `SELECT 
           SUM(male_students) as male,
           SUM(female_students) as female
         FROM batches b
         ${batchWhereClause}`,
        batchParams
      );

      // Get batches by year (last 5 years)
      const [batchesByYear] = await db.query(
        `SELECT 
           YEAR(b.batch_start_date) as year,
           COUNT(*) as count
         FROM batches b
         ${batchWhereClause}
         GROUP BY YEAR(b.batch_start_date)
         ORDER BY year DESC
         LIMIT 5`,
        batchParams
      );

      return {
        statistics: {
          totalCenters,
          totalPartners,
          totalBatches,
          totalStudents,
          maleStudents: genderDistribution[0]?.male || 0,
          femaleStudents: genderDistribution[0]?.female || 0,
        },
        centersByRegion,
        centersByState,
        centersByType,
        batchesByYear,
        filters: {
          state: state || null,
          region: region || null,
          year: year || null,
        },
      };
    } catch (error) {
      console.error('Error in getSEIFDashboard:', error);
      throw new DatabaseError('Failed to fetch SEIF dashboard data');
    }
  }

  /**
   * Get consolidated analytics for admin dashboard
   * @param {string|null} year - Year filter in 'YYYY-YY' format or null for all years
   * @returns {Object} Consolidated analytics with stats, trends, and breakdowns
   */
  static async getConsolidatedAnalytics(year = null) {
    try {
      // Get total active partners
      const [partnersResult] = await db.query(
        'SELECT COUNT(*) as total FROM partners WHERE status = ?',
        ['active']
      );
      const totalPartners = partnersResult[0].total;

      // Get total active centers
      const [centersResult] = await db.query(
        'SELECT COUNT(*) as total FROM centers WHERE status = ?',
        ['active']
      );
      const totalCenters = centersResult[0].total;

      // Get total students (approved)
      const [studentsResult] = await db.query(
        `SELECT COUNT(*) as total 
         FROM uploaded_students 
         WHERE approval_status = ?`,
        ['approved']
      );
      const totalStudents = studentsResult[0].total;

      // Get total states and UTs covered
      const [statesResult] = await db.query(
        `SELECT COUNT(DISTINCT state) as total 
         FROM centers 
         WHERE status = ?`,
        ['active']
      );
      const totalStates = statesResult[0].total;

      // Get gender distribution
      const [genderResult] = await db.query(
        `SELECT 
           SUM(male_students) as male,
           SUM(female_students) as female
         FROM batches`
      );
      const maleStudents = genderResult[0]?.male || 0;
      const femaleStudents = genderResult[0]?.female || 0;

      // Get total employments (records in the employment table)
      const [employmentsResult] = await db.query(`SELECT COUNT(*) as total FROM employment`);
      const totalEmployments = employmentsResult[0]?.total || 0;

      // Get count of students in EDP courses
      const [edpResult] = await db.query(
        `SELECT COUNT(DISTINCT us.id) as total
         FROM uploaded_students us
         WHERE us.approval_status = ?
           AND us.course_name LIKE ?`,
        ['approved', '%EDP%']
      );
      const edpCount = edpResult[0]?.total || 0;

      // Get course breakdown
      const [courseBreakdown] = await db.query(
        `SELECT 
           c.course_name,
           COUNT(DISTINCT cc.center_id) as center_count
         FROM courses c
         LEFT JOIN center_courses cc ON c.id = cc.course_id
         GROUP BY c.id, c.course_name
         ORDER BY center_count DESC`
      );

      // If year is "all" or null, get yearly data
      let yearlyData = {};
      let monthlyBreakdown = null;

      if (!year || year === 'all') {
        // Get yearly centers count (last 4 years: 2022-23, 2023-24, 2024-25, 2025-26)
        const [centersYearly] = await db.query(
          `SELECT 
             CASE 
               WHEN YEAR(created_at) = 2022 THEN '2022-23'
               WHEN YEAR(created_at) = 2023 THEN '2023-24'
               WHEN YEAR(created_at) = 2024 THEN '2024-25'
               WHEN YEAR(created_at) = 2025 THEN '2025-26'
               ELSE 'Other'
             END as year_label,
             COUNT(*) as count
           FROM centers
           WHERE status = ?
           GROUP BY year_label
           ORDER BY year_label`,
          ['active']
        );

        // Get yearly students count
        const [studentsYearly] = await db.query(
          `SELECT 
             CASE 
               WHEN YEAR(b.batch_start_date) = 2022 THEN '2022-23'
               WHEN YEAR(b.batch_start_date) = 2023 THEN '2023-24'
               WHEN YEAR(b.batch_start_date) = 2024 THEN '2024-25'
               WHEN YEAR(b.batch_start_date) = 2025 THEN '2025-26'
               ELSE 'Other'
             END as year_label,
             SUM(total_students) as count
           FROM batches b
           GROUP BY year_label
           ORDER BY year_label`
        );

        // Convert to object for easy access
        const centersMap = {};
        centersYearly.forEach((row) => {
          centersMap[row.year_label] = row.count;
        });

        const studentsMap = {};
        studentsYearly.forEach((row) => {
          studentsMap[row.year_label] = row.count;
        });

        yearlyData = {
          centers2022: centersMap['2022-23'] || 0,
          centers2023: centersMap['2023-24'] || 0,
          centers2024: centersMap['2024-25'] || 0,
          centers2025: centersMap['2025-26'] || 0,
          students2022: studentsMap['2022-23'] || 0,
          students2023: studentsMap['2023-24'] || 0,
          students2024: studentsMap['2024-25'] || 0,
          students2025: studentsMap['2025-26'] || 0,
        };
      } else {
        // Get monthly breakdown for specific year (e.g., "2024-25")
        // Extract start year from format "YYYY-YY"
        const startYear = parseInt(year.split('-')[0]);

        const [monthlyData] = await db.query(
          `SELECT 
             DATE_FORMAT(b.batch_start_date, '%b %Y') as month,
             MONTH(b.batch_start_date) as month_num,
             COUNT(DISTINCT c.id) as centers,
             SUM(b.total_students) as students
           FROM batches b
           LEFT JOIN centers c ON b.center_id = c.id
           WHERE YEAR(b.batch_start_date) >= ? AND YEAR(b.batch_start_date) <= ?
           GROUP BY month_num, month
           ORDER BY month_num`,
          [startYear, startYear + 1]
        );

        monthlyBreakdown = monthlyData;
      }

      // Fetch KPI settings (custom values + visibility) merged for this year
      const kpiSettings = await KpiService.getSettings(year || 'all');

      return {
        // Basic statistics for StatCards
        totalPartners,
        totalCenters,
        totalStudents,
        totalEmployments,
        totalStates,
        maleStudents,
        femaleStudents,

        // Extended KPI fields
        edpCount,

        // Course breakdown for tooltip
        courseBreakdown,

        // KPI settings (admin-controlled custom values + visibility)
        kpiSettings,

        // Yearly data (for "all" years view)
        ...yearlyData,

        // Monthly breakdown (for specific year view)
        monthlyBreakdown,
      };
    } catch (error) {
      console.error('Error in getConsolidatedAnalytics:', error);
      throw new DatabaseError('Failed to fetch consolidated analytics');
    }
  }

  /**
   * Get centers grouped by year of establishment
   * @param {string|null} year - Specific year or null for all years
   * @returns {Object} Centers grouped by establishment year
   */
  static async getCentersByEstablishment(year = null) {
    try {
      let query = `
        SELECT 
          year_of_establishment,
          COUNT(*) as center_count
        FROM centers
        WHERE status = ?
      `;

      const params = ['active'];

      if (year && year !== 'all') {
        query += ` AND year_of_establishment = ?`;
        params.push(year);
      }

      query += ` GROUP BY year_of_establishment ORDER BY year_of_establishment`;

      const [results] = await db.query(query, params);

      // Transform to object format with year as key
      const establishmentData = {};
      results.forEach((row) => {
        establishmentData[row.year_of_establishment] = parseInt(row.center_count) || 0;
      });

      return establishmentData;
    } catch (error) {
      console.error('Error in getCentersByEstablishment:', error);
      throw new DatabaseError('Failed to fetch centers by establishment year');
    }
  }

  /**
   * Get state-wise statistics for India Map visualization
   * Returns centers, trainers, trainees, and female trainees count per state
   * @param {string|null} year - Specific year filter or null for all years
   * @returns {Object} State statistics with state code as key
   */
  static async getStateStats(year = null) {
    try {
      // Note: This query assumes you have trainers and students tables
      // If these tables don't exist yet, we'll only query centers for now
      let query = `
        SELECT 
          c.state,
          COUNT(DISTINCT c.id) as center_count
        FROM centers c
        WHERE c.status = ?
      `;

      const params = ['active'];

      // Add year filter if provided
      if (year && year !== 'all') {
        query += ` AND c.year_of_establishment = ?`;
        params.push(year);
      }

      query += ` GROUP BY c.state ORDER BY c.state`;

      const [results] = await db.query(query, params);

      // Transform to object format with state_code as key
      const stateStats = {};

      // Map to store processed state codes
      const STATE_CODE_MAP = {
        'Jammu and Kashmir': 'JK',
        'Jammu & Kashmir': 'JK',
        'Himachal Pradesh': 'HP',
        Punjab: 'PB',
        Chandigarh: 'CH',
        Uttarakhand: 'UK',
        Haryana: 'HR',
        Delhi: 'DL',
        Rajasthan: 'RJ',
        'Uttar Pradesh': 'UP',
        Bihar: 'BR',
        Sikkim: 'SK',
        'Arunachal Pradesh': 'AR',
        Nagaland: 'NL',
        Manipur: 'MN',
        Mizoram: 'MZ',
        Tripura: 'TR',
        Meghalaya: 'ML',
        Assam: 'AS',
        'West Bengal': 'WB',
        Jharkhand: 'JH',
        Odisha: 'OD',
        Chhattisgarh: 'CG',
        'Madhya Pradesh': 'MP',
        Gujarat: 'GJ',
        Maharashtra: 'MH',
        'Andhra Pradesh': 'AP',
        Karnataka: 'KA',
        Goa: 'GA',
        Kerala: 'KL',
        'Tamil Nadu': 'TN',
        Telangana: 'TG',
        'Andaman and Nicobar Islands': 'AN',
        'Andaman & Nicobar': 'AN',
        Puducherry: 'PY',
        Lakshadweep: 'LD',
        'Dadra and Nagar Haveli and Daman and Diu': 'DN',
        'Dadra & Nagar Haveli and Daman & Diu': 'DN',
        Ladakh: 'LA',
      };

      // Normalize state name to handle variations, typos, and case differences
      const normalizeStateName = (stateName) => {
        if (!stateName) return null;

        // Normalize the state name
        let normalized = stateName.trim();

        // Handle common typos and variations
        const variations = {
          Lakshdweep: 'Lakshadweep',
          Maharastra: 'Maharashtra',
          'J&K': 'Jammu and Kashmir',
          Andaman: 'Andaman and Nicobar Islands',
        };

        // Check if it's a known variation
        if (variations[normalized]) {
          normalized = variations[normalized];
        }

        // Try exact match first
        if (STATE_CODE_MAP[normalized]) {
          return normalized;
        }

        // Try case-insensitive match
        const stateMapKeys = Object.keys(STATE_CODE_MAP);
        const caseInsensitiveMatch = stateMapKeys.find(
          (key) => key.toLowerCase() === normalized.toLowerCase()
        );

        if (caseInsensitiveMatch) {
          return caseInsensitiveMatch;
        }

        return normalized;
      };

      results.forEach((row) => {
        // Normalize and get state code from map
        const normalizedStateName = normalizeStateName(row.state);
        const stateCode = STATE_CODE_MAP[normalizedStateName];

        // Skip if we can't determine state code
        if (!stateCode) {
          console.warn(`Unable to determine state code for: ${row.state}`);
          return;
        }

        stateStats[stateCode] = {
          name: row.state || 'Unknown',
          centers: parseInt(row.center_count) || 0,
          trainers: 0, // TODO: Add JOIN with trainers table when available
          trainees: 0, // TODO: Add JOIN with students table when available
          femaleTrainees: 0, // TODO: Add from students table when available
          hasData: parseInt(row.center_count) > 0,
        };
      });

      return stateStats;
    } catch (error) {
      console.error('Error in getStateStats:', error);
      throw new DatabaseError('Failed to fetch state statistics');
    }
  }

  /**
   * Get detailed course (lab) breakdown for a specific state
   * @param {string} stateName - Full state name (e.g. 'Karnataka')
   * @param {string|null} year - Year filter or null for all
   * @returns {Object} { stateName, centerCount, courseBreakdown: [{courseName, studentCount, percentage}] }
   */
  static async getStateDetail(stateName, year = null) {
    try {
      // Center count for this state
      let centerQuery = `SELECT COUNT(*) as total FROM centers WHERE state = ? AND status = ?`;
      const centerParams = [stateName, 'active'];
      if (year && year !== 'all') {
        centerQuery += ` AND year_of_establishment = ?`;
        centerParams.push(year);
      }
      const [centerResult] = await db.query(centerQuery, centerParams);
      const centerCount = centerResult[0]?.total || 0;

      // Course breakdown from uploaded_students via uploaded_centers.state
      let courseQuery = `
        SELECT 
          us.course_name,
          COUNT(*) as student_count
        FROM uploaded_students us
        JOIN uploaded_centers uc ON us.uploaded_center_id = uc.id
        WHERE uc.state = ?
          AND us.approval_status = 'approved'
          AND us.course_name IS NOT NULL
          AND us.course_name != ''
      `;
      const courseParams = [stateName];

      if (year && year !== 'all') {
        courseQuery += ` AND YEAR(us.created_at) = ?`;
        courseParams.push(year);
      }

      courseQuery += ` GROUP BY us.course_name ORDER BY student_count DESC LIMIT 20`;

      const [courseRows] = await db.query(courseQuery, courseParams);

      const totalStudents = courseRows.reduce((sum, r) => sum + parseInt(r.student_count), 0);

      const courseBreakdown = courseRows.map((r) => ({
        courseName: r.course_name,
        studentCount: parseInt(r.student_count),
        percentage: totalStudents > 0 ? Math.round((r.student_count / totalStudents) * 100) : 0,
      }));

      return {
        stateName,
        centerCount,
        totalStudents,
        courseBreakdown,
      };
    } catch (error) {
      console.error('Error in getStateDetail:', error);
      throw new DatabaseError('Failed to fetch state detail');
    }
  }
}

module.exports = DashboardService;
