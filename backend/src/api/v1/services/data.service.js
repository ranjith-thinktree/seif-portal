const db = require('../../../database/connection');

/**
 * Data Service
 * Handles business logic for data management overview
 */
class DataService {
  /**
   * Get overview statistics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Statistics data
   */
  async getOverviewStats({ role, partner_id }) {
    try {
      let stats = {};

      if (role === 'PARTNER') {
        // Partner-specific statistics
        stats = await this.getPartnerStats(partner_id);
      } else {
        // Global statistics for Admin/ESSCI/SEIF_READONLY
        stats = await this.getGlobalStats();
      }

      return stats;
    } catch (error) {
      console.error('Error in getOverviewStats:', error);
      throw error;
    }
  }

  /**
   * Get global statistics (for Admin/ESSCI/SEIF_READONLY)
   */
  async getGlobalStats() {
    try {
      // Total Partners
      const [partners] = await db.query(
        `SELECT COUNT(*) as total FROM partners WHERE status = 'active'`
      );
      const totalPartners = partners[0]?.total || 0;

      // Total Partners Pending Approval
      const [partnersPending] = await db.query(
        `SELECT COUNT(*) as total FROM partners WHERE approval_status = 'pending'`
      );
      const pendingPartnerApprovals = partnersPending[0]?.total || 0;

      // Total Centers
      const [centers] = await db.query(
        `SELECT COUNT(*) as total FROM centers WHERE status = 'active'`
      );
      const totalCenters = centers[0]?.total || 0;

      // Total Centers Pending Approval
      const [centersPending] = await db.query(
        `SELECT COUNT(*) as total FROM centers WHERE approval_status = 'pending'`
      );
      const pendingCenterApprovals = centersPending[0]?.total || 0;

      // Total Batches
      const [batches] = await db.query(
        `SELECT COUNT(*) as total FROM batches WHERE status = 'active'`
      );
      const totalBatches = batches[0]?.total || 0;

      // Total Students
      const [students] = await db.query(`SELECT COUNT(*) as total FROM students`);
      const totalStudents = students[0]?.total || 0;

      // Female Students
      const [femaleStudents] = await db.query(
        `SELECT COUNT(*) as total FROM students WHERE gender = 'Female'`
      );
      const totalFemaleStudents = femaleStudents[0]?.total || 0;

      // Male Students
      const [maleStudents] = await db.query(
        `SELECT COUNT(*) as total FROM students WHERE gender = 'Male'`
      );
      const totalMaleStudents = maleStudents[0]?.total || 0;

      // Active Uploads (Pending Review)
      const [activeUploads] = await db.query(
        `SELECT COUNT(*) as total FROM data_uploads WHERE status = 'pending'`
      );
      const pendingUploads = activeUploads[0]?.total || 0;

      // Data Upload Success Rate (approved / total)
      const [uploadStats] = await db.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
        FROM data_uploads WHERE status IN ('approved', 'rejected')`
      );
      const uploadTotal = uploadStats[0]?.total || 1; // Avoid division by zero
      const uploadApproved = uploadStats[0]?.approved || 0;
      const uploadSuccessRate = Math.round((uploadApproved / uploadTotal) * 100);

      return {
        total_partners: totalPartners,
        pending_partner_approvals: pendingPartnerApprovals,
        total_centers: totalCenters,
        pending_center_approvals: pendingCenterApprovals,
        total_batches: totalBatches,
        total_students: totalStudents,
        total_female_students: totalFemaleStudents,
        total_male_students: totalMaleStudents,
        pending_uploads: pendingUploads,
        upload_success_rate: uploadSuccessRate,
        // Placeholder for future: youth entrepreneurs, trainers trained
        youth_entrepreneurs: 0,
        trainers_trained: 0,
      };
    } catch (error) {
      console.error('Error in getGlobalStats:', error);
      throw error;
    }
  }

  /**
   * Get partner-specific statistics
   */
  async getPartnerStats(partnerId) {
    try {
      // Total Centers (for this partner)
      const [centers] = await db.query(
        `SELECT COUNT(*) as total FROM centers WHERE partner_id = ? AND status = 'active'`,
        [partnerId]
      );
      const totalCenters = centers[0]?.total || 0;

      // Pending Center Approvals (for this partner)
      const [centersPending] = await db.query(
        `SELECT COUNT(*) as total FROM centers WHERE partner_id = ? AND approval_status = 'pending'`,
        [partnerId]
      );
      const pendingCenterApprovals = centersPending[0]?.total || 0;

      // Total Batches (for this partner)
      const [batches] = await db.query(
        `SELECT COUNT(*) as total FROM batches WHERE partner_id = ? AND status = 'active'`,
        [partnerId]
      );
      const totalBatches = batches[0]?.total || 0;

      // Total Students (for this partner)
      const [students] = await db.query(
        `SELECT COUNT(*) as total FROM students WHERE partner_id = ?`,
        [partnerId]
      );
      const totalStudents = students[0]?.total || 0;

      // Female Students (for this partner)
      const [femaleStudents] = await db.query(
        `SELECT COUNT(*) as total FROM students WHERE partner_id = ? AND gender = 'Female'`,
        [partnerId]
      );
      const totalFemaleStudents = femaleStudents[0]?.total || 0;

      // Male Students (for this partner)
      const [maleStudents] = await db.query(
        `SELECT COUNT(*) as total FROM students WHERE partner_id = ? AND gender = 'Male'`,
        [partnerId]
      );
      const totalMaleStudents = maleStudents[0]?.total || 0;

      // Pending Uploads (for this partner)
      const [activeUploads] = await db.query(
        `SELECT COUNT(*) as total FROM data_uploads WHERE partner_id = ? AND status = 'pending'`,
        [partnerId]
      );
      const pendingUploads = activeUploads[0]?.total || 0;

      return {
        total_centers: totalCenters,
        pending_center_approvals: pendingCenterApprovals,
        total_batches: totalBatches,
        total_students: totalStudents,
        total_female_students: totalFemaleStudents,
        total_male_students: totalMaleStudents,
        pending_uploads: pendingUploads,
        // Partners don't need these
        total_partners: 0,
        pending_partner_approvals: 0,
        youth_entrepreneurs: 0,
        trainers_trained: 0,
        upload_success_rate: 0,
      };
    } catch (error) {
      console.error('Error in getPartnerStats:', error);
      throw error;
    }
  }
}

module.exports = new DataService();
