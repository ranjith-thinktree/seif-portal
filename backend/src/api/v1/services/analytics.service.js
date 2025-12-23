const db = require('../../../database/connection');

/**
 * Analytics Service
 * Handles consolidated student analytics with advanced filtering
 */
class AnalyticsService {
  /**
   * Get consolidated student analytics
   * @param {Object} filters - Financial year, partner, center, gender filters
   * @returns {Promise<Object>} Consolidated analytics data
   */
  async getConsolidatedAnalytics(filters = {}) {
    try {
      const { financialYear, partnerId, centerId, gender } = filters;

      // Build WHERE clause dynamically
      let whereConditions = [];
      let queryParams = [];

      // Financial Year filter (April to March)
      if (financialYear && financialYear !== 'all') {
        const startYear = parseInt(financialYear.split('-')[0]);
        const endYear = parseInt(financialYear.split('-')[1]);
        whereConditions.push(
          `((YEAR(s.enrollment_date) = ? AND MONTH(s.enrollment_date) >= 4) OR (YEAR(s.enrollment_date) = ? AND MONTH(s.enrollment_date) <= 3))`
        );
        queryParams.push(startYear, endYear);
      }

      // Partner filter
      if (partnerId && partnerId !== 'all') {
        whereConditions.push('s.partner_id = ?');
        queryParams.push(partnerId);
      }

      // Center filter
      if (centerId && centerId !== 'all') {
        whereConditions.push('s.center_id = ?');
        queryParams.push(centerId);
      }

      // Gender filter
      if (gender && gender !== 'all') {
        whereConditions.push('s.gender = ?');
        queryParams.push(gender);
      }

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // 1. Get Summary Statistics
      // Use FROM dual to ensure subqueries always execute even with 0 students
      const summaryQuery = `SELECT 
          COALESCE((SELECT COUNT(*) FROM students s ${whereClause}), 0) as total_students,
          COALESCE((SELECT SUM(CASE WHEN gender = 'Male' THEN 1 ELSE 0 END) FROM students s ${whereClause}), 0) as male_students,
          COALESCE((SELECT SUM(CASE WHEN gender = 'Female' THEN 1 ELSE 0 END) FROM students s ${whereClause}), 0) as female_students,
          (SELECT COUNT(*) FROM partners WHERE status = 'active') as total_partners,
          (SELECT COUNT(*) FROM centers WHERE status = 'active') as total_centers,
          COALESCE((SELECT SUM(CASE WHEN s.employment_status IN ('Employed', 'Self-Employed', 'Entrepreneur') THEN 1 ELSE 0 END) FROM students s ${whereClause}), 0) as total_employments
        FROM dual`;
      
      console.log('📊 Analytics Query:', summaryQuery);
      console.log('📊 Query Params:', queryParams.concat(queryParams, queryParams, queryParams));
      
      const summaryStats = await db.query(
        summaryQuery,
        queryParams.concat(queryParams, queryParams, queryParams)
      );

      // 2. Get Partner-wise Breakdown
      const partnerBreakdown = await db.query(
        `SELECT 
          p.id as partner_id,
          p.name as partner_name,
          COUNT(*) as total_students,
          SUM(CASE WHEN s.gender = 'Male' THEN 1 ELSE 0 END) as male_students,
          SUM(CASE WHEN s.gender = 'Female' THEN 1 ELSE 0 END) as female_students,
          COUNT(DISTINCT s.center_id) as centers_count
        FROM students s
        LEFT JOIN partners p ON s.partner_id = p.id
        ${whereClause}
        GROUP BY p.id, p.name
        ORDER BY total_students DESC`,
        queryParams
      );

      // 3. Get Center-wise Breakdown
      const centerBreakdown = await db.query(
        `SELECT 
          c.id as center_id,
          c.center_name,
          p.name as partner_name,
          COUNT(*) as total_students,
          SUM(CASE WHEN s.gender = 'Male' THEN 1 ELSE 0 END) as male_students,
          SUM(CASE WHEN s.gender = 'Female' THEN 1 ELSE 0 END) as female_students,
          c.city,
          c.state
        FROM students s
        LEFT JOIN centers c ON s.center_id = c.id
        LEFT JOIN partners p ON s.partner_id = p.id
        ${whereClause}
        GROUP BY c.id, c.center_name, p.name, c.city, c.state
        ORDER BY total_students DESC`,
        queryParams
      );

      // 4. Get Year-wise Trend (Last 5 financial years)
      const yearlyTrend = await db.query(
        `SELECT 
          CASE 
            WHEN MONTH(enrollment_date) >= 4 THEN CONCAT(YEAR(enrollment_date), '-', YEAR(enrollment_date) + 1)
            ELSE CONCAT(YEAR(enrollment_date) - 1, '-', YEAR(enrollment_date))
          END as financial_year,
          COUNT(*) as total_students,
          SUM(CASE WHEN gender = 'Male' THEN 1 ELSE 0 END) as male_students,
          SUM(CASE WHEN gender = 'Female' THEN 1 ELSE 0 END) as female_students,
          SUM(CASE WHEN employment_status IN ('Employed', 'Self-Employed', 'Entrepreneur') THEN 1 ELSE 0 END) as total_employments
        FROM students
        ${whereClause ? whereClause.replace(/s\./g, '') : ''}
        GROUP BY financial_year
        ORDER BY financial_year DESC
        LIMIT 5`,
        queryParams
      );

      // 5. Get Gender Distribution for Chart
      const genderDistribution = await db.query(
        `SELECT 
          gender,
          COUNT(*) as count
        FROM students s
        ${whereClause}
        GROUP BY gender`,
        queryParams
      );

      // 6. Get Available Financial Years
      const availableYears = await db.query(
        `SELECT DISTINCT
          CASE 
            WHEN MONTH(enrollment_date) >= 4 THEN CONCAT(YEAR(enrollment_date), '-', YEAR(enrollment_date) + 1)
            ELSE CONCAT(YEAR(enrollment_date) - 1, '-', YEAR(enrollment_date))
          END as financial_year
        FROM students
        ORDER BY financial_year DESC`
      );

      return {
        summary: summaryStats[0] || {
          total_students: 0,
          male_students: 0,
          female_students: 0,
          total_partners: 0,
          total_centers: 0,
          total_employments: 0,
        },
        partnerBreakdown: Array.isArray(partnerBreakdown) ? partnerBreakdown : [],
        centerBreakdown: Array.isArray(centerBreakdown) ? centerBreakdown : [],
        yearlyTrend: Array.isArray(yearlyTrend) ? yearlyTrend : [],
        genderDistribution: Array.isArray(genderDistribution) ? genderDistribution : [],
        availableYears: Array.isArray(availableYears)
          ? availableYears.map((y) => y.financial_year)
          : [],
      };
    } catch (error) {
      console.error('Error in getConsolidatedAnalytics:', error);
      throw error;
    }
  }

  /**
   * Get filter options (Partners and Centers for dropdowns)
   */
  async getFilterOptions() {
    try {
      // Get all partners (not just active - show all for filtering)
      const partners = await db.query(
        `SELECT id, name 
         FROM partners 
         ORDER BY name ASC`
      );

      // Get all centers (show all for filtering, not just approved)
      const centers = await db.query(
        `SELECT c.id, c.center_name, p.name as partner_name 
         FROM centers c
         LEFT JOIN partners p ON c.partner_id = p.id
         ORDER BY c.center_name ASC`
      );

      return {
        partners: Array.isArray(partners) ? partners : [],
        centers: Array.isArray(centers) ? centers : [],
      };
    } catch (error) {
      console.error('Error in getFilterOptions:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();
