const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');

/**
 * Refurbishment Service
 * Handles all refurbishment-related business logic
 */
class RefurbishmentService {
  /**
   * Get centers eligible for refurbishment based on time-based criteria
   * 
   * Eligibility Formula:
   * - For centers with previous refurbishment: 
   *   (CURRENT_DATE - last_refurbishment_date) >= refurbishment_frequency_months
   * - For new centers (never refurbished):
   *   (CURRENT_DATE - year_of_establishment) >= refurbishment_frequency_months
   * 
   * @returns {Promise<Object>} Object with centers array and totalCount
   */
  static async getEligibleCenters(limit = 50, offset = 0) {
    try {
      // First, get total count of eligible centers
      const countQuery = `
        SELECT COUNT(*) as total
        FROM centers c
        WHERE c.status = 'active'
        AND (
          (c.last_refurbishment_date IS NOT NULL 
            AND TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE()) >= c.refurbishment_frequency_months)
          OR
          (c.last_refurbishment_date IS NULL 
            AND TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE()) >= c.refurbishment_frequency_months)
        )
      `;

      const [[{ total }]] = await db.query(countQuery);

      // Then get paginated results
      const query = `
        SELECT 
          c.id,
          c.center_name,
          c.partner_id,
          p.name as partner_name,
          c.year_of_establishment,
          c.last_refurbishment_date,
          c.refurbishment_frequency_months,
          c.city,
          c.state,
          c.region,
          c.center_type,
          c.status,
          CASE
            WHEN c.last_refurbishment_date IS NOT NULL THEN
              TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE())
            ELSE
              TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE())
          END as months_since_last_refurbishment,
          CASE
            WHEN c.last_refurbishment_date IS NOT NULL THEN
              TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE()) >= c.refurbishment_frequency_months
            ELSE
              TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE()) >= c.refurbishment_frequency_months
          END as is_eligible
        FROM centers c
        LEFT JOIN partners p ON c.partner_id = p.id
        WHERE c.status = 'active'
        HAVING is_eligible = 1
        ORDER BY months_since_last_refurbishment DESC
        LIMIT ? OFFSET ?
      `;

      const [centers] = await db.query(query, [limit, offset]);

      return {
        centers,
        totalCount: total,
      };
    } catch (error) {
      console.error('Error fetching eligible centers:', error);
      throw error;
    }
  }

  /**
   * Get all centers with refurbishment status (eligible + ineligible)
   * 
   * @returns {Promise<Object>} Object with centers array and counts
   */
  static async getAllCentersWithStatus() {
    try {
      const query = `
        SELECT 
          c.id,
          c.center_name,
          c.partner_id,
          p.name as partner_name,
          c.year_of_establishment,
          c.last_refurbishment_date,
          c.refurbishment_frequency_months,
          c.city,
          c.state,
          c.region,
          c.center_type,
          c.status,
          CASE
            WHEN c.last_refurbishment_date IS NOT NULL THEN
              TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE())
            ELSE
              TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE())
          END as months_since_last_refurbishment,
          CASE
            WHEN c.last_refurbishment_date IS NOT NULL THEN
              TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE()) >= c.refurbishment_frequency_months
            ELSE
              TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE()) >= c.refurbishment_frequency_months
          END as is_eligible
        FROM centers c
        LEFT JOIN partners p ON c.partner_id = p.id
        WHERE c.status = 'active'
        ORDER BY is_eligible DESC, months_since_last_refurbishment DESC
      `;

      const [centers] = await db.query(query);

      const eligible = centers.filter(c => c.is_eligible === 1);
      const ineligible = centers.filter(c => c.is_eligible === 0);

      return {
        centers,
        totalCount: centers.length,
        eligibleCount: eligible.length,
        ineligibleCount: ineligible.length,
      };
    } catch (error) {
      console.error('Error fetching centers with status:', error);
      throw error;
    }
  }

  /**
   * Get recently refurbished centers (last refurbishment within X months)
   * 
   * @param {number} withinMonths - Number of months to look back (default: 12)
   * @returns {Promise<Object>} Object with centers array and totalCount
   */
  static async getRecentlyRefurbishedCenters(withinMonths = 12) {
    try {
      const query = `
        SELECT 
          c.id,
          c.center_name,
          c.partner_id,
          p.name as partner_name,
          c.year_of_establishment,
          c.last_refurbishment_date,
          c.refurbishment_frequency_months,
          c.city,
          c.state,
          c.region,
          c.center_type,
          c.status,
          TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE()) as months_since_last_refurbishment
        FROM centers c
        LEFT JOIN partners p ON c.partner_id = p.id
        WHERE c.status = 'active'
          AND c.last_refurbishment_date IS NOT NULL
          AND TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE()) <= ?
        ORDER BY c.last_refurbishment_date DESC
      `;

      const [centers] = await db.query(query, [withinMonths]);

      return {
        centers,
        totalCount: centers.length,
        withinMonths,
      };
    } catch (error) {
      console.error('Error fetching recently refurbished centers:', error);
      throw error;
    }
  }

  /**
   * Check if a specific center is eligible for refurbishment
   * 
   * @param {string} centerId - UUID of the center
   * @returns {Promise<Object>} Object with center details and eligibility status
   */
  static async checkCenterEligibility(centerId) {
    try {
      const query = `
        SELECT 
          c.id,
          c.center_name,
          c.partner_id,
          p.name as partner_name,
          c.year_of_establishment,
          c.last_refurbishment_date,
          c.refurbishment_frequency_months,
          c.status,
          CASE
            WHEN c.last_refurbishment_date IS NOT NULL THEN
              TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE())
            ELSE
              TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE())
          END as months_since_last_refurbishment,
          CASE
            WHEN c.last_refurbishment_date IS NOT NULL THEN
              TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE()) >= c.refurbishment_frequency_months
            ELSE
              TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE()) >= c.refurbishment_frequency_months
          END as is_eligible
        FROM centers c
        LEFT JOIN partners p ON c.partner_id = p.id
        WHERE c.id = ?
      `;

      const [centers] = await db.query(query, [centerId]);

      if (centers.length === 0) {
        return null;
      }

      return centers[0];
    } catch (error) {
      console.error('Error checking center eligibility:', error);
      throw error;
    }
  }
}

module.exports = RefurbishmentService;
