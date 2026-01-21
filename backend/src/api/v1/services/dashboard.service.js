const db = require('../../../database/connection');
const { DatabaseError } = require('../../../utils/error.util');

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
      const [batchesResult] = await db.query(
        'SELECT COUNT(*) as total FROM batches'
      );
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
}

module.exports = DashboardService;
