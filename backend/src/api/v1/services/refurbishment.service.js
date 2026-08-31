const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');
const { emitToUser, emitToRole } = require('../../../websocket/socket');
const emailService = require('../../../utils/email.util');
const { NotFoundError } = require('../../../utils/error.util');

/** Human-readable refurbishment lifecycle labels (DB status keys unchanged). */
const REFURBISHMENT_STATUS_LABELS = {
  submitted: 'Submitted',
  sent_back: 'Sent Back',
  approved: 'Approved',
  material_procurement: 'Material Procurement Completed',
  installation_in_progress: 'Installation In Progress',
  refurbishment_started: 'In Progress',
  completed: 'Completed',
  rejected: 'Rejected',
  acknowledgement_pending: 'Acknowledgement Pending',
  ready_to_complete: 'Ready to Complete',
};

/**
 * Refurbishment Service
 * Handles all refurbishment-related business logic
 */
class RefurbishmentService {
  static async getRefurbishmentSettings() {
    const DEFAULTS = {
      default_custom_message: 'Custom Message',
      first_cycle_years: '5',
      repeat_cycle_years: '3',
    };

    const [rows] = await db.query(
      `SELECT setting_key, setting_value
       FROM refurbishment_settings
       WHERE setting_key IN ('default_custom_message', 'first_cycle_years', 'repeat_cycle_years')`
    );

    const mapped = rows.reduce((acc, row) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});

    return {
      defaultCustomMessage: mapped.default_custom_message || DEFAULTS.default_custom_message,
      firstCycleYears: parseInt(mapped.first_cycle_years || DEFAULTS.first_cycle_years, 10),
      repeatCycleYears: parseInt(mapped.repeat_cycle_years || DEFAULTS.repeat_cycle_years, 10),
    };
  }

  static async updateRefurbishmentSettings({
    defaultCustomMessage,
    firstCycleYears,
    repeatCycleYears,
    userId,
  }) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const upsertSetting = async (key, value) => {
        await connection.query(
          `INSERT INTO refurbishment_settings (id, setting_key, setting_value, updated_by, updated_at)
           VALUES (?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             setting_value = VALUES(setting_value),
             updated_by = VALUES(updated_by),
             updated_at = NOW()`,
          [uuidv4(), key, String(value), userId || null]
        );
      };

      await upsertSetting('default_custom_message', defaultCustomMessage);
      await upsertSetting('first_cycle_years', firstCycleYears);
      await upsertSetting('repeat_cycle_years', repeatCycleYears);

      await connection.commit();
      return this.getRefurbishmentSettings();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get centers eligible for refurbishment based on time-based criteria
   *
   * Eligibility Rules:
   * - New centers (never refurbished): eligible after 5 years (60 months) from year_of_establishment
   * - Previously refurbished centers: eligible again after 3 years (36 months) from last_refurbishment_date
   *   (repeats every 3 years for all subsequent cycles)
   *
   * @returns {Promise<Object>} Object with centers array and totalCount
   */
  static async getEligibleCenters(limit = 50, offset = 0) {
    try {
      const settings = await this.getRefurbishmentSettings();
      // First refurbishment: configurable years from establishment
      const FIRST_CYCLE_MONTHS = settings.firstCycleYears * 12;
      // Subsequent refurbishments: configurable repeat years from last refurbishment
      const REPEAT_CYCLE_MONTHS = settings.repeatCycleYears * 12;

      // First, get total count of eligible centers
      const countQuery = `
        SELECT COUNT(*) as total
        FROM centers c
        WHERE c.status = 'active'
        AND c.year_of_establishment IS NOT NULL
        AND (
          (c.last_refurbishment_date IS NOT NULL
            AND TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE()) >= ${REPEAT_CYCLE_MONTHS})
          OR
          (c.last_refurbishment_date IS NULL
            AND TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE()) >= ${FIRST_CYCLE_MONTHS})
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
          CASE
            WHEN c.last_refurbishment_date IS NOT NULL THEN ${REPEAT_CYCLE_MONTHS}
            ELSE ${FIRST_CYCLE_MONTHS}
          END as refurbishment_frequency_months,
          c.city,
          c.state,
          c.region,
          c.center_type,
          c.status,
          sn.last_notified_at,
          sn.total_send_count,
          CASE
            WHEN c.last_refurbishment_date IS NOT NULL THEN
              TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE())
            ELSE
              TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE())
          END as months_since_last_refurbishment,
          CASE
            WHEN c.last_refurbishment_date IS NOT NULL THEN
              TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE()) >= ${REPEAT_CYCLE_MONTHS}
            ELSE
              TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE()) >= ${FIRST_CYCLE_MONTHS}
          END as is_eligible
        FROM centers c
        LEFT JOIN partners p ON c.partner_id = p.id
        LEFT JOIN (
          SELECT center_id, MAX(last_sent_at) as last_notified_at,
                 SUM(send_count) as total_send_count
          FROM scheduled_refurbishment_notifications
          WHERE last_sent_at IS NOT NULL
          GROUP BY center_id
        ) sn ON sn.center_id = c.id
        WHERE c.status = 'active'
          AND c.year_of_establishment IS NOT NULL
        HAVING is_eligible = 1
        ORDER BY months_since_last_refurbishment DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;

      const [centers] = await db.query(query, []);

      console.log(
        `[RefurbishmentService] Retrieved ${centers.length} eligible centers (total: ${total})`
      );

      return {
        centers,
        totalCount: total,
      };
    } catch (error) {
      console.error('[RefurbishmentService] Error fetching eligible centers:', error);
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
      const settings = await this.getRefurbishmentSettings();
      const FIRST_CYCLE_MONTHS = settings.firstCycleYears * 12;
      const REPEAT_CYCLE_MONTHS = settings.repeatCycleYears * 12;

      const query = `
        SELECT
          c.id,
          c.center_name,
          c.partner_id,
          p.name as organization_name,
          c.year_of_establishment,
          c.last_refurbishment_date,
          CASE
            WHEN c.last_refurbishment_date IS NOT NULL THEN ${REPEAT_CYCLE_MONTHS}
            ELSE ${FIRST_CYCLE_MONTHS}
          END as refurbishment_frequency_months,
          c.city,
          c.state,
          c.region,
          c.center_type,
          c.status,
          CASE
            WHEN c.year_of_establishment IS NULL THEN NULL
            WHEN c.last_refurbishment_date IS NOT NULL THEN
              TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE())
            ELSE
              TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE())
          END as months_since_last_refurbishment,
          CASE
            WHEN c.year_of_establishment IS NULL THEN 0
            WHEN c.last_refurbishment_date IS NOT NULL THEN
              TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE()) >= ${REPEAT_CYCLE_MONTHS}
            ELSE
              TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE()) >= ${FIRST_CYCLE_MONTHS}
          END as is_eligible
        FROM centers c
        LEFT JOIN partners p ON c.partner_id = p.id
        WHERE c.status = 'active'
        ORDER BY is_eligible DESC, months_since_last_refurbishment DESC
      `;

      const [centers] = await db.query(query);

      const eligible = centers.filter((c) => c.is_eligible === 1);
      const ineligible = centers.filter((c) => c.is_eligible === 0);

      console.log(
        `[RefurbishmentService] Retrieved ${centers.length} centers: ${eligible.length} eligible, ${ineligible.length} ineligible`
      );

      return {
        centers,
        totalCount: centers.length,
        eligibleCount: eligible.length,
        ineligibleCount: ineligible.length,
      };
    } catch (error) {
      console.error('[RefurbishmentService] Error fetching centers with status:', error);
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
      // Default refurbishment frequency: 36 months (3 years) if not set
      const DEFAULT_FREQUENCY = 36;

      const effectiveRefurbDateSql = `
        CASE
          WHEN c.last_refurbishment_date IS NULL THEN rr_latest.latest_completion
          WHEN rr_latest.latest_completion IS NULL THEN c.last_refurbishment_date
          WHEN c.last_refurbishment_date >= rr_latest.latest_completion THEN c.last_refurbishment_date
          ELSE rr_latest.latest_completion
        END
      `;

      const query = `
        SELECT 
          c.id,
          c.center_name,
          c.partner_id,
          p.name as partner_name,
          c.year_of_establishment,
          ${effectiveRefurbDateSql} as last_refurbishment_date,
          COALESCE(c.refurbishment_frequency_months, ${DEFAULT_FREQUENCY}) as refurbishment_frequency_months,
          c.city,
          c.state,
          c.region,
          c.center_type,
          c.status,
          rr_latest.latest_request_id,
          TIMESTAMPDIFF(MONTH, ${effectiveRefurbDateSql}, CURDATE()) as months_since_last_refurbishment
        FROM centers c
        LEFT JOIN partners p ON c.partner_id = p.id
        LEFT JOIN (
          SELECT rr.center_id, MIN(rr.id) AS latest_request_id, MAX(rr.completed_at) AS latest_completion
          FROM refurbishment_requests rr
          INNER JOIN (
            SELECT center_id, MAX(completed_at) AS latest_completion
            FROM refurbishment_requests
            WHERE status = 'completed' AND completed_at IS NOT NULL
            GROUP BY center_id
          ) rr_max ON rr_max.center_id = rr.center_id AND rr_max.latest_completion = rr.completed_at
          WHERE rr.status = 'completed'
          GROUP BY rr.center_id
        ) rr_latest ON rr_latest.center_id = c.id
        WHERE c.status = 'active'
          AND ${effectiveRefurbDateSql} IS NOT NULL
          AND TIMESTAMPDIFF(MONTH, ${effectiveRefurbDateSql}, CURDATE()) <= ?
        ORDER BY last_refurbishment_date DESC
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
      // Default refurbishment frequency: 36 months (3 years) if not set
      const DEFAULT_FREQUENCY = 36;

      const query = `
        SELECT 
          c.id,
          c.center_name,
          c.partner_id,
          p.name as partner_name,
          c.year_of_establishment,
          c.last_refurbishment_date,
          COALESCE(c.refurbishment_frequency_months, ${DEFAULT_FREQUENCY}) as refurbishment_frequency_months,
          c.status,
          CASE
            WHEN c.year_of_establishment IS NULL THEN NULL
            WHEN c.last_refurbishment_date IS NOT NULL THEN
              TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE())
            ELSE
              TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE())
          END as months_since_last_refurbishment,
          CASE
            WHEN c.year_of_establishment IS NULL THEN 0
            WHEN c.last_refurbishment_date IS NOT NULL THEN
              TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE()) >= COALESCE(c.refurbishment_frequency_months, ${DEFAULT_FREQUENCY})
            ELSE
              TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE()) >= COALESCE(c.refurbishment_frequency_months, ${DEFAULT_FREQUENCY})
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

  /**
   * Get refurbishment request details for partner
   * Includes center details, courses, and admin-selected packages
   *
   * @param {string} requestId - Request UUID
   * @param {string} partnerId - Partner UUID (from JWT)
   * @returns {Promise<Object|null>} Request details with courses and packages, or null if not found
   */
  static async getPartnerRequestDetails(requestId, partnerId) {
    try {
      // ── 1. Get core request + security check ──
      const [reqRows] = await db.query(
        `SELECT
           rr.id AS refurbishment_request_id,
           rr.request_id,
           rr.center_id,
           rr.status,
           rr.is_upgradation_requested,
           rr.justification,
           rr.admin_remarks,
           rr.rejection_reason,
           rr.approved_at,
           rr.material_procurement_at,
           rr.installation_in_progress_at,
           rr.completed_at,
           rr.rejected_at,
           rr.partner_completion_description,
           rr.created_at,
           rr.updated_at,
           rr.completion_notified_at,
           rr.partner_completed_at,
           rr.partner_acknowledgment_consent,
           rr.partner_acknowledgment_consent_at,
           rr.partner_acknowledgment_consent_text,
           rr.package_modification_summary,
           c.center_name,
           c.partner_id,
           p.name  AS partner_name,
           r.request_number
         FROM refurbishment_requests rr
         JOIN centers c ON c.id = rr.center_id
         JOIN partners p ON p.id = c.partner_id
         LEFT JOIN requests r ON r.id = rr.request_id
         WHERE rr.id = ?`,
        [requestId]
      );

      if (!reqRows || reqRows.length === 0) return null;

      const req = reqRows[0];

      // Security check
      if (req.partner_id !== partnerId) return null;

      // ── 2. Partner-selected packages grouped by course ──
      const [pkgRows] = await db.query(
        `SELECT
           rrcp.course_id,
           rrcp.package_id,
           rrcp.justification AS partner_justification,
           co.course_name,
           rp.package_name,
           rp.description,
           rp.images
         FROM refurbishment_request_course_packages rrcp
         JOIN courses co ON co.id = rrcp.course_id
         JOIN refurbishment_packages rp ON rp.id = rrcp.package_id
         WHERE rrcp.refurbishment_request_id = ?
         ORDER BY co.course_name, rp.package_name`,
        [requestId]
      );

      // ── 3. Partner-uploaded attachments ──
      const [attachRows] = await db.query(
        `SELECT course_id, file_url, file_name, file_size_bytes, file_mime_type
         FROM refurbishment_request_course_attachments
         WHERE refurbishment_request_id = ?
         ORDER BY created_at`,
        [requestId]
      );

      // Build attachment map by course_id
      const attachByCourse = {};
      for (const att of attachRows) {
        if (!attachByCourse[att.course_id]) attachByCourse[att.course_id] = [];
        attachByCourse[att.course_id].push({
          url: att.file_url,
          name: att.file_name,
          size: att.file_size_bytes,
          type: att.file_mime_type,
        });
      }

      // Group packages by course
      const courseMap = new Map();
      for (const row of pkgRows) {
        if (!courseMap.has(row.course_id)) {
          courseMap.set(row.course_id, {
            course_id: row.course_id,
            course_name: row.course_name,
            packages: [],
            uploaded_images: attachByCourse[row.course_id] || [],
          });
        }
        courseMap.get(row.course_id).packages.push({
          package_id: row.package_id,
          package_name: row.package_name,
          description: row.description,
          images: row.images || '[]',
          justification: row.partner_justification || '',
        });
      }

      // ── 3b. Admin-added packages (merged into courseMap with added_by_admin flag) ──
      const [adminPkgRows] = await db.query(
        `SELECT
           aap.course_id,
           aap.package_id,
           rp.package_name,
           rp.description,
           rp.images,
           co.course_name
         FROM refurbishment_admin_added_packages aap
         JOIN refurbishment_packages rp ON rp.id = aap.package_id
         JOIN courses co ON co.id = aap.course_id
         WHERE aap.refurbishment_request_id = ?
         ORDER BY co.course_name, rp.package_name`,
        [requestId]
      );

      for (const row of adminPkgRows) {
        if (!courseMap.has(row.course_id)) {
          courseMap.set(row.course_id, {
            course_id: row.course_id,
            course_name: row.course_name,
            packages: [],
            uploaded_images: attachByCourse[row.course_id] || [],
          });
        }
        const alreadyPresent = courseMap
          .get(row.course_id)
          .packages.some((p) => p.package_id === row.package_id);
        if (!alreadyPresent) {
          courseMap.get(row.course_id).packages.push({
            package_id: row.package_id,
            package_name: row.package_name,
            description: row.description,
            images: row.images || '[]',
            justification: '',
            added_by_admin: true,
          });
        }
      }

      const hasAdminModifications = adminPkgRows.length > 0;
      const packageModifications = RefurbishmentService.parsePackageModificationSummary(
        req.package_modification_summary
      );

      // ── 4. Upgradation details (if requested) ──
      let upgradation = null;
      if (req.is_upgradation_requested) {
        const [roomRows] = await db.query(
          `SELECT id, length_feet, breadth_feet, height_feet, justification
           FROM refurbishment_upgradation_rooms
           WHERE refurbishment_request_id = ?
           ORDER BY created_at`,
          [requestId]
        );

        let photos = [];
        if (roomRows.length > 0) {
          const roomIds = roomRows.map((r) => r.id);
          const roomPlaceholders = roomIds.map(() => '?').join(',');
          const [photoRows] = await db.query(
            `SELECT upgradation_room_id, file_url, file_name
             FROM refurbishment_upgradation_photos
             WHERE upgradation_room_id IN (${roomPlaceholders})`,
            roomIds
          );
          photos = photoRows;
        }

        const [upgradPkgRows] = await db.query(
          `SELECT urap.package_id, rp.package_name, rp.description, rp.images
           FROM refurbishment_upgradation_request_packages urap
           JOIN refurbishment_packages rp ON rp.id = urap.package_id
           WHERE urap.refurbishment_request_id = ?`,
          [requestId]
        );

        upgradation = {
          rooms: roomRows.map((r) => ({
            ...r,
            photos: photos.filter((p) => p.upgradation_room_id === r.id),
          })),
          selected_packages: upgradPkgRows,
        };
      }

      const [partnerAckFiles] = await db.query(
        `SELECT file_url, file_name, file_mime_type, created_at
         FROM refurbishment_request_course_attachments
         WHERE refurbishment_request_id = ?
           AND attachment_type = 'partner_completion'
         ORDER BY created_at`,
        [requestId]
      );

      const timelineRecord = {
        status: req.status,
        created_at: req.created_at,
        updated_at: req.updated_at,
        approved_at: req.approved_at,
        material_procurement_at: req.material_procurement_at,
        installation_in_progress_at: req.installation_in_progress_at,
        completed_at: req.completed_at,
        rejected_at: req.rejected_at,
        admin_remarks: req.admin_remarks,
        rejection_reason: req.rejection_reason,
        completion_notified_at: req.completion_notified_at,
        partner_completed_at: req.partner_completed_at,
        partner_completion_description: req.partner_completion_description,
        completion_statement: null,
      };

      const statusTimeline =
        RefurbishmentService.buildRefurbishmentStatusTimeline(timelineRecord);
      const partnerAcknowledgment = req.partner_completed_at
        ? {
            submitted_at: req.partner_completed_at,
            statement: req.partner_completion_description || '',
            consent: req.partner_acknowledgment_consent === 1,
            consent_at: req.partner_acknowledgment_consent_at || null,
            consent_text: req.partner_acknowledgment_consent_text || null,
            files: partnerAckFiles.map((file) => ({
              url: file.file_url,
              name: file.file_name,
              type: file.file_mime_type,
            })),
          }
        : null;

      return {
        request: {
          id: req.refurbishment_request_id,
          status: req.status,
          center_name: req.center_name,
          partner_name: req.partner_name,
          justification: req.justification,
          admin_remarks: req.admin_remarks,
          rejection_reason: req.rejection_reason,
          approved_at: req.approved_at,
          material_procurement_at: req.material_procurement_at || null,
          installation_in_progress_at: req.installation_in_progress_at || null,
          completed_at: req.completed_at || null,
          created_at: req.created_at,
          updated_at: req.updated_at,
          request_number: req.request_number,
          completion_notified_at: req.completion_notified_at || null,
          partner_completed_at: req.partner_completed_at || null,
          partner_completion_description: req.partner_completion_description || null,
          is_upgradation_requested: !!req.is_upgradation_requested,
          has_admin_modifications:
            hasAdminModifications || packageModifications.hasChanges,
        },
        package_modifications: packageModifications,
        status_timeline: statusTimeline,
        partner_acknowledgment: partnerAcknowledgment,
        courses: Array.from(courseMap.values()),
        upgradation_requested: !!req.is_upgradation_requested,
        upgradation,
      };
    } catch (error) {
      console.error('Error getting partner request details:', error);
      throw error;
    }
  }

  /**
   * Submit partner's selections for refurbishment request
   * Handles transaction with course packages, attachments, and optional upgradation
   *
   * @param {Object} data - Submission data
   * @param {string} data.requestId - Request UUID
   * @param {string} data.partnerId - Partner UUID
   * @param {string} data.userId - User UUID
   * @param {Array} data.courses - Array of course selections
   * @param {Object|null} data.upgradation - Optional upgradation request
   * @returns {Promise<Object>} Updated request object
   */
  static async submitPartnerRefurbishmentSelections(data) {
    const { requestId, partnerId, userId, courses, upgradation } = data;

    const connection = await db.getConnection();

    try {
      // Start transaction
      await connection.beginTransaction();

      // 1. Security check: Verify partner owns this request
      const [ownershipRows] = await connection.query(
        `SELECT c.partner_id, rr.id as refurbishment_request_id
         FROM refurbishment_requests rr
         JOIN centers c ON c.id = rr.center_id
         WHERE rr.request_id = ?`,
        [requestId]
      );

      if (ownershipRows.length === 0) {
        throw new Error('Request not found');
      }

      if (ownershipRows[0].partner_id !== partnerId) {
        throw new Error('Access denied: Request does not belong to this partner');
      }

      const refurbishmentRequestId = ownershipRows[0].refurbishment_request_id;

      // 2. Validate package selections (ensure all package_ids in admin pre-selections)
      for (const course of courses) {
        for (const packageId of course.package_ids) {
          const [validationRows] = await connection.query(
            `SELECT COUNT(*) as count
             FROM refurbishment_admin_selected_packages
             WHERE request_id = ?
               AND course_id = ?
               AND package_id = ?`,
            [requestId, course.course_id, packageId]
          );

          if (validationRows[0].count === 0) {
            throw new Error(
              `Invalid package selection: Package ${packageId} not in admin pre-selections for course ${course.course_id}`
            );
          }
        }
      }

      // 3. Update request status to 'partner_submitted'
      await connection.query(
        `UPDATE requests 
         SET status = 'partner_submitted', 
             updated_at = NOW()
         WHERE id = ?`,
        [requestId]
      );

      // 4. Insert course packages (for each course, for each package)
      for (const course of courses) {
        for (const packageId of course.package_ids) {
          const packageUuid = uuidv4();
          await connection.query(
            `INSERT INTO refurbishment_request_course_packages (
               id, refurbishment_request_id, course_id, package_id,
               justification, created_at
             ) VALUES (?, ?, ?, ?, ?, NOW())`,
            [packageUuid, refurbishmentRequestId, course.course_id, packageId, course.justification]
          );
        }
      }

      // 5. Insert course attachments (for each course, for each attachment)
      for (const course of courses) {
        if (course.attachments && course.attachments.length > 0) {
          for (const attachmentUrl of course.attachments) {
            const fileName = attachmentUrl.split('/').pop();
            const attachmentUuid = uuidv4();
            await connection.query(
              `INSERT INTO refurbishment_request_course_attachments (
                 id, refurbishment_request_id, course_id,
                 file_url, file_name, uploaded_by, created_at
               ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
              [
                attachmentUuid,
                refurbishmentRequestId,
                course.course_id,
                attachmentUrl,
                fileName,
                userId,
              ]
            );
          }
        }
      }

      // 6. Handle upgradation if requested
      if (upgradation) {
        // Update refurbishment_requests
        await connection.query(
          `UPDATE refurbishment_requests
           SET is_upgradation_requested = 1
           WHERE id = ?`,
          [refurbishmentRequestId]
        );

        // Insert room details
        const roomUuid = uuidv4();
        await connection.query(
          `INSERT INTO refurbishment_upgradation_rooms (
             id, refurbishment_request_id,
             length_feet, breadth_feet, height_feet,
             justification, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            roomUuid,
            refurbishmentRequestId,
            parseFloat(upgradation.length_feet || upgradation.length) || 0,
            parseFloat(upgradation.breadth_feet || upgradation.breadth) || 0,
            parseFloat(upgradation.height_feet || upgradation.height) || 0,
            upgradation.justification || null,
          ]
        );

        // Insert room photos
        if (upgradation.photos && upgradation.photos.length > 0) {
          for (const photoUrl of upgradation.photos) {
            const fileName = photoUrl.split('/').pop();
            const photoUuid = uuidv4();
            await connection.query(
              `INSERT INTO refurbishment_upgradation_photos (
                 id, upgradation_room_id,
                 file_url, file_name, created_at
               ) VALUES (?, ?, ?, ?, NOW())`,
              [photoUuid, roomUuid, photoUrl, fileName]
            );
          }
        }
      }

      // 7. Create admin notification
      const notificationUuid = uuidv4();
      await connection.query(
        `INSERT INTO notifications (
           id, recipient_role, type, alert_type,
           title, message, remark,
           related_entity_type, related_entity_id,
           is_read, created_at
         ) VALUES (
           ?, 'ADMIN', 'alert', 'refurbishment',
           'Partner Submitted Refurbishment Request',
           'Partner has submitted their selections for refurbishment request',
           NULL,
           'request', ?,
           0, NOW()
         )`,
        [notificationUuid, requestId]
      );

      // 8. Commit transaction
      await connection.commit();

      try {
        const [meta] = await db.query(
          `SELECT p.name AS partner_name, c.center_name
           FROM refurbishment_requests rr
           JOIN centers c ON c.id = rr.center_id
           JOIN partners p ON p.id = c.partner_id
           WHERE rr.id = ?
           LIMIT 1`,
          [refurbishmentRequestId]
        );
        const { fireEmail } = require('../../../services/emailDispatch.service');
        fireEmail(
          'refurbishment.submitted_admin',
          {
            partnerName: meta?.[0]?.partner_name,
            centerName: meta?.[0]?.center_name,
            date: new Date().toLocaleDateString('en-IN'),
          },
          { audience: 'admin' }
        );
      } catch (emailErr) {
        console.warn('[email] refurbishment submitted email skipped:', emailErr.message);
      }

      // 9. Emit real-time WebSocket notification to all ADMIN users
      try {
        const socketPayload = {
          id: notificationUuid,
          type: 'alert',
          alert_type: 'refurbishment',
          title: 'Partner Submitted Refurbishment Request',
          message: 'Partner has submitted their selections for refurbishment request',
          related_entity_type: 'request',
          related_entity_id: requestId,
          is_read: false,
          created_at: new Date().toISOString(),
        };
        emitToRole('ADMIN', 'notification:new', socketPayload);
        emitToRole('SUPER_ADMIN', 'notification:new', socketPayload);
      } catch (socketError) {
        console.error(
          '[RefurbishmentService] Failed to emit socket notification to admins:',
          socketError.message
        );
      }

      // 10. Return updated request
      const [updatedRows] = await connection.query(
        `SELECT r.id, r.status, r.updated_at
         FROM requests r
         WHERE r.id = ?`,
        [requestId]
      );

      return {
        request_id: requestId,
        status: updatedRows[0].status,
        updated_at: updatedRows[0].updated_at,
      };
    } catch (error) {
      // Rollback transaction on any error
      await connection.rollback();
      console.error('Error submitting partner refurbishment selections:', error);
      throw error;
    } finally {
      // Release connection
      connection.release();
    }
  }

  /**
   * Get partner's refurbishment requests
   * Returns paginated list with optional status filter
   *
   * @param {Object} params - Query parameters
   * @param {string} params.partnerId - Partner UUID
   * @param {number} params.limit - Results per page
   * @param {number} params.offset - Pagination offset
   * @param {string|undefined} params.status - Optional status filter
   * @returns {Promise<Object>} { requests: Array, total: number, page: number, totalPages: number }
   */
  static async getPartnerRefurbishmentRequests({
    partnerId,
    limit = 10,
    offset = 0,
    status,
    excludeStatus,
  }) {
    try {
      let baseWhere = `c.partner_id = ?`;
      const params = [partnerId];
      const countParams = [partnerId];

      if (status) {
        baseWhere += ` AND rr.status = ?`;
        params.push(status);
        countParams.push(status);
      }
      if (excludeStatus) {
        baseWhere += ` AND rr.status != ?`;
        params.push(excludeStatus);
        countParams.push(excludeStatus);
      }

      const query = `
        SELECT
          rr.id                                                                         AS request_id,
          CONCAT('REQ-', YEAR(rr.created_at), '-', UPPER(SUBSTRING(rr.id, 1, 8)))
                                                                                        AS requestId,
          rr.refurbishment_type                                                         AS type,
          COALESCE(
            rr.request_type,
            CASE
              WHEN srn.frequency = 'instant' OR srn.is_manual_request = 1 THEN 'instant request'
              ELSE 'schedule request'
            END,
            'schedule request'
          )                                                                             AS request_type,
          srn.frequency,
          rr.status,
          rr.created_at,
          rr.updated_at,
          rr.admin_remarks,
          rr.rejection_reason,
          rr.rejected_at,
          rr.rejected_by,
          rr.approved_at,
          rr.completed_at,
          rr.completion_statement,
          rr.partner_completion_description,
          rr.partner_completed_at,
          rr.partner_acknowledgment_consent,
          rr.partner_acknowledgment_consent_at,
          rr.partner_acknowledgment_consent_text,
          rr.completion_notified_at,
          rr.is_upgradation_requested,
          c.center_name,
          c.address                                                                     AS center_address
        FROM refurbishment_requests rr
        JOIN centers c ON c.id = rr.center_id
        LEFT JOIN requests r ON r.id = rr.request_id
        LEFT JOIN scheduled_refurbishment_notifications srn ON srn.id = rr.request_id
        WHERE ${baseWhere}
        ORDER BY rr.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM refurbishment_requests rr
        JOIN centers c ON c.id = rr.center_id
        WHERE ${baseWhere}
      `;

      const [[{ total }]] = await db.query(countQuery, countParams);
      const [rows] = await db.query(query, params);

      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);

      return { requests: rows, total, page, totalPages };
    } catch (error) {
      console.error('Error getting partner refurbishment requests:', error);
      throw error;
    }
  }

  /**
   * Get refurbishment statistics for a specific year
   * Used by "Last Refurbished" summary card
   * @param {number} year - Year to get statistics for (e.g., 2024)
   * @returns {Promise<Object>} { year: 2024, totalRefurbished: 45 }
   */
  static async getRefurbishmentStatsByYear(year) {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM centers
        WHERE YEAR(last_refurbishment_date) = ?
          AND status = 'active'
      `;

      const [[{ total }]] = await db.query(query, [year]);

      console.log(`[RefurbishmentService] Year ${year} stats: ${total} centers refurbished`);

      return {
        year: parseInt(year),
        totalRefurbished: parseInt(total),
      };
    } catch (error) {
      console.error('[RefurbishmentService] Error fetching year stats:', error);
      throw error;
    }
  }

  /**
   * Centers refurbished within an inclusive calendar date range (last_refurbishment_date).
   * Additive for Reports period modes; does not change getRefurbishmentStatsByYear.
   */
  static async getRefurbishmentStatsByDateRange(fromDate, toDate) {
    try {
      const from = String(fromDate || '').trim();
      const to = String(toDate || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        throw new Error('fromDate and toDate must be YYYY-MM-DD');
      }
      if (from > to) {
        throw new Error('fromDate must be on or before toDate');
      }

      const query = `
        SELECT COUNT(*) as total
        FROM centers
        WHERE last_refurbishment_date IS NOT NULL
          AND DATE(last_refurbishment_date) BETWEEN ? AND ?
          AND status = 'active'
      `;
      const [[{ total }]] = await db.query(query, [from, to]);

      return {
        fromDate: from,
        toDate: to,
        totalRefurbished: parseInt(total, 10) || 0,
      };
    } catch (error) {
      console.error('[RefurbishmentService] Error fetching date-range stats:', error);
      throw error;
    }
  }

  /**
   * Get all available refurbishment packages
   * Optionally filter by course
   * @param {string|null} courseId - Optional course ID to filter packages
   * @returns {Promise<Object>} { packages: [], totalCount: 10 }
   */
  static async getRefurbishmentPackages(courseId = null, category = null) {
    try {
      let query = `
        SELECT 
          rp.id,
          rp.package_name as name,
          rp.description,
          rp.category,
          rp.images,
          rp.is_active as isActive,
          rp.display_order as displayOrder,
          rp.created_at as createdAt,
          rp.updated_at,
          GROUP_CONCAT(DISTINCT c.course_name ORDER BY c.course_name ASC SEPARATOR ', ') as course_names,
          GROUP_CONCAT(DISTINCT pc.course_id) as courseIds
        FROM refurbishment_packages rp
        LEFT JOIN package_courses pc ON pc.package_id = rp.id
        LEFT JOIN courses c ON pc.course_id = c.id
        WHERE rp.is_active = 1
      `;
      const params = [];

      // Optional course filter
      if (courseId) {
        query += ` AND pc.course_id = ?`;
        params.push(courseId);
      }

      // Optional category filter ('refurbishment' | 'upgradation')
      if (category) {
        query += ` AND rp.category = ?`;
        params.push(category);
      }

      query += ` GROUP BY rp.id ORDER BY rp.display_order ASC, rp.package_name ASC`;

      const [packages] = await db.query(query, params);

      // Parse courseIds string to array and keep original string as courses
      const parsedPackages = packages.map((pkg) => ({
        ...pkg,
        courses: pkg.courseIds || '', // Keep original comma-separated string for table display
        courseIds: pkg.courseIds ? pkg.courseIds.split(',') : [],
      }));

      return {
        packages: parsedPackages,
        totalCount: parsedPackages.length,
      };
    } catch (error) {
      console.error('[RefurbishmentService] Error fetching packages:', error);
      throw error;
    }
  }

  /**
   * Get refurbishment alerts (partner responses to notifications)
   * @param {number} limit - Number of records per page
   * @param {number} offset - Offset for pagination
   * @param {string|null} status - Optional status filter
   * @returns {Promise<Object>} { alerts: [], totalCount: 100 }
   */
  static async getRefurbishmentAlerts(limit = 50, offset = 0, status = null) {
    try {
      // Count query — include both 'refurbishment_response' (partner submissions) and
      // legacy 'refurbishment' eligibility alerts sent to ADMIN role.
      let countQuery = `
        SELECT COUNT(*) as total
        FROM notifications n
        WHERE n.alert_type IN ('refurbishment_response', 'refurbishment')
          AND n.recipient_role = 'ADMIN'
      `;
      const countParams = [];

      if (status) {
        countQuery += ` AND n.is_read = ?`;
        countParams.push(status === 'read' ? 1 : 0);
      }

      const [[{ total }]] = await db.query(countQuery, countParams);

      // Data query
      // Partner submissions have related_entity_type = 'refurbishment_request' and
      // related_entity_id = refurbishment_requests.id, so we join through that table
      // (not through 'requests') to get center & partner information.
      let query = `
        SELECT
          n.id,
          n.created_at,
          n.alert_type,
          n.related_entity_type,
          n.related_entity_id,
          n.title,
          n.message,
          n.remark,
          n.is_read,
          rr.status AS request_status,
          p.name        AS organization_name,
          c.center_name
        FROM notifications n
        LEFT JOIN refurbishment_requests rr
          ON rr.id = n.related_entity_id
          AND n.related_entity_type = 'refurbishment_request'
        LEFT JOIN centers  c   ON c.id   = rr.center_id
        LEFT JOIN partners p   ON p.id   = c.partner_id
        WHERE n.alert_type IN ('refurbishment_response', 'refurbishment')
          AND n.recipient_role = 'ADMIN'
      `;
      const params = [];

      if (status) {
        query += ` AND n.is_read = ?`;
        params.push(status === 'read' ? 1 : 0);
      }

      query += ` ORDER BY n.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

      const [alerts] = await db.query(query, params);

      console.log(`[RefurbishmentService] Retrieved ${alerts.length} alerts (total: ${total})`);

      return {
        alerts,
        totalCount: total,
      };
    } catch (error) {
      console.error('[RefurbishmentService] Error fetching alerts:', error);
      throw error;
    }
  }

  /**
   * Get active refurbishment requests
   * @param {number} limit - Number of records per page
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} { requests: [], totalCount: 50 }
   */
  static async getActiveRefurbishmentRequests(limit = 50, offset = 0) {
    try {
      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM requests r
        INNER JOIN refurbishment_requests rr ON rr.request_id = r.id
        WHERE r.type = 'refurbishment'
          AND r.status IN ('pending', 'partner_submitted', 'in_review')
      `;

      const [[{ total }]] = await db.query(countQuery);

      // Default refurbishment frequency: 36 months (3 years) if not set
      const DEFAULT_FREQUENCY = 36;

      // Data query - Get last notification sent from scheduled_notification_executions
      const query = `
        SELECT 
          r.id,
          r.request_number,
          p.name as organization_name,
          c.center_name as centerName,
          r.title as reason,
          COALESCE(c.refurbishment_frequency_months, ${DEFAULT_FREQUENCY}) as frequency,
          r.updated_at as lastUpdate,
          r.status,
          MAX(sne.executed_at) as lastAlertSent
        FROM requests r
        INNER JOIN refurbishment_requests rr ON rr.request_id = r.id
        INNER JOIN centers c ON c.id = rr.center_id
        INNER JOIN partners p ON p.id = c.partner_id
        LEFT JOIN scheduled_refurbishment_notifications srn ON srn.center_id = c.id 
          AND srn.status IN ('active', 'completed')
        LEFT JOIN scheduled_notification_executions sne ON sne.scheduled_notification_id = srn.id 
          AND sne.status = 'success'
        WHERE r.type = 'refurbishment'
          AND r.status IN ('pending', 'partner_submitted', 'in_review')
        GROUP BY r.id, r.request_number, p.name, c.center_name, r.title, 
                 c.refurbishment_frequency_months, r.updated_at, r.status
        ORDER BY r.updated_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;

      const [requests] = await db.query(query, []);

      console.log(
        `[RefurbishmentService] Retrieved ${requests.length} active requests (total: ${total})`
      );

      return {
        requests,
        totalCount: total,
      };
    } catch (error) {
      console.error('[RefurbishmentService] Error fetching active requests:', error);
      throw error;
    }
  }

  /**
   * Get past refurbishment requests (completed/rejected)
   * @param {number} limit - Number of records per page
   * @param {number} offset - Offset for pagination
   * @param {number|null} year - Optional year filter
   * @returns {Promise<Object>} { requests: [], totalCount: 200 }
   */
  static async getPastRefurbishmentRequests(
    limit = 50,
    offset = 0,
    year = null,
    fromDate = null,
    toDate = null
  ) {
    try {
      // Past Requests includes submitted plus actioned statuses.
      // Status lives on refurbishment_requests (not the legacy requests table).
      const activeStatuses = [
        'submitted',
        'sent_back',
        'approved',
        'material_procurement',
        'installation_in_progress',
        'refurbishment_started',
        'completed',
        'rejected',
      ];
      const placeholders = activeStatuses.map(() => '?').join(', ');

      const from = fromDate && /^\d{4}-\d{2}-\d{2}$/.test(String(fromDate).trim())
        ? String(fromDate).trim()
        : null;
      const to = toDate && /^\d{4}-\d{2}-\d{2}$/.test(String(toDate).trim())
        ? String(toDate).trim()
        : null;
      const useRange = Boolean(from && to && from <= to);

      let countQuery = `
        SELECT COUNT(*) as total
        FROM refurbishment_requests rr
        JOIN centers c ON c.id = rr.center_id
        JOIN partners p ON p.id = c.partner_id
        WHERE rr.status IN (${placeholders})
      `;
      const countParams = [...activeStatuses];

      if (useRange) {
        countQuery += ` AND DATE(rr.updated_at) BETWEEN ? AND ?`;
        countParams.push(from, to);
      } else if (year) {
        countQuery += ` AND YEAR(rr.updated_at) = ?`;
        countParams.push(year);
      }

      const [[{ total }]] = await db.query(countQuery, countParams);

      let query = `
        SELECT
          rr.id,
          CONCAT('REQ-', YEAR(rr.created_at), '-', UPPER(SUBSTRING(rr.id, 1, 8))) AS requestId,
          rr.refurbishment_type                      AS type,
          COALESCE(
            rr.request_type,
            CASE
              WHEN srn.frequency = 'instant' OR srn.is_manual_request = 1 THEN 'instant request'
              ELSE 'schedule request'
            END,
            'schedule request'
          ) AS request_type,
          c.center_name,
          rr.created_at,
          rr.updated_at,
          rr.status,
          rr.approved_at,
          rr.material_procurement_at,
          rr.installation_in_progress_at,
          rr.completed_at,
          rr.completion_notified_at,
          rr.partner_completed_at,
          rr.partner_acknowledgment_consent,
          rr.rejection_reason,
          rr.completion_statement,
          rr.admin_remarks,
          p.name                                     AS organization_name,
          p.id                                       AS partner_id
        FROM refurbishment_requests rr
        JOIN centers c ON c.id = rr.center_id
        JOIN partners p ON p.id = c.partner_id
        LEFT JOIN scheduled_refurbishment_notifications srn ON srn.id = rr.request_id
        WHERE rr.status IN (${placeholders})
      `;
      const params = [...activeStatuses];

      if (useRange) {
        query += ` AND DATE(rr.updated_at) BETWEEN ? AND ?`;
        params.push(from, to);
      } else if (year) {
        query += ` AND YEAR(rr.updated_at) = ?`;
        params.push(year);
      }

      query += ` ORDER BY rr.updated_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

      const [requests] = await db.query(query, params);

      const [[{ readyToCompleteCount }]] = await db.query(
        `SELECT COUNT(*) AS readyToCompleteCount
         FROM refurbishment_requests rr
         WHERE rr.status NOT IN ('completed', 'rejected')
           AND rr.partner_completed_at IS NOT NULL`,
      );

      const enrichedRequests = requests.map((row) => {
        const displayStatus = RefurbishmentService.getRefurbishmentDisplayStatus(row);
        return {
          ...row,
          display_status: displayStatus.key,
          display_status_label: displayStatus.label,
        };
      });

      console.log(
        `[RefurbishmentService] Retrieved ${requests.length} past requests (total: ${total})`
      );

      return {
        requests: enrichedRequests,
        totalCount: total,
        readyToCompleteCount: readyToCompleteCount || 0,
      };
    } catch (error) {
      console.error('[RefurbishmentService] Error fetching past requests:', error);
      throw error;
    }
  }

  /**
   * Send refurbishment notification to partner
   * Creates notification record (tracking handled by scheduled_notification_executions table)
   * @param {string} centerId - Center UUID
   * @param {string} partnerId - Partner UUID
   * @param {string} message - Optional custom message
   * @returns {Promise<Object>} { notificationId, sentAt }
   */
  static async sendRefurbishmentNotification(centerId, partnerId, message = null) {
    try {
      const notificationId = uuidv4();
      const sentAt = new Date();

      // Create notification
      const settings = await this.getRefurbishmentSettings();
      const defaultMessage = message || settings.defaultCustomMessage;

      // Find the active partner user first (in-app notification recipient)
      const [partnerUserRows] = await db.query(
        `SELECT u.id, u.email, u.full_name, p.name as partner_name, p.contact_email, p.contact_person
         FROM users u
         LEFT JOIN partners p ON u.partner_id = p.id
         WHERE u.partner_id = ?
           AND UPPER(u.role) = 'PARTNER'
           AND LOWER(u.status) = 'active'
         LIMIT 1`,
        [partnerId]
      );

      if (partnerUserRows.length === 0) {
        console.warn(
          `[RefurbishmentService] No active PARTNER user found for partner ${partnerId}`
        );
        return { notificationId, sentAt };
      }

      const recipientId = partnerUserRows[0].id;
      const partnerName =
        partnerUserRows[0].partner_name || partnerUserRows[0].full_name || 'Partner';
      // Partner-facing eligibility email: organisation primary contact only
      const partnerEmail =
        partnerUserRows[0].contact_email || partnerUserRows[0].email || null;
      const partnerContactName =
        partnerUserRows[0].contact_person || partnerName;

      // Fetch center name for email
      const [centerRows] = await db.query(`SELECT center_name FROM centers WHERE id = ? LIMIT 1`, [
        centerId,
      ]);
      const centerName = centerRows[0]?.center_name || 'Your Center';

      await db.query(
        `INSERT INTO notifications (
          id, recipient_id, type, alert_type, title, message, 
          related_entity_type, related_entity_id, is_read, sent_via, created_at
        ) VALUES (?, ?, 'alert', 'refurbishment', 'Refurbishment Eligibility Notification', ?,
          'center', ?, 0, 'in_app', ?)`,
        [notificationId, recipientId, defaultMessage, centerId, sentAt]
      );

      // Emit real-time WebSocket notification
      emitToUser(recipientId, 'notification:new', {
        id: notificationId,
        type: 'alert',
        alert_type: 'refurbishment',
        title: 'Refurbishment Eligibility Notification',
        message: defaultMessage,
        related_entity_type: 'center',
        related_entity_id: centerId,
        is_read: false,
        created_at: sentAt.toISOString(),
      });

      // Note: Notification tracking is now handled by scheduled_notification_executions table
      // No need to update centers table anymore

      // Send eligibility email to partner primary contact (template #1)
      if (partnerEmail) {
        const due = new Date();
        due.setDate(due.getDate() + 14);
        const { fireEmail } = require('../../../services/emailDispatch.service');
        fireEmail(
          'refurbishment.eligible_partner',
          {
            partnerName,
            centerName,
            year: emailService.getCurrentFinancialYearLabel(),
            dueDate: due.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
          },
          { audience: 'partner', partnerId, extraEmails: [partnerEmail] }
        );
      }

      console.log(
        `[RefurbishmentService] Notification sent to partner ${partnerId} for center ${centerId}`
      );

      return {
        notificationId,
        sentAt,
      };
    } catch (error) {
      console.error('[RefurbishmentService] Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Create refurbishment request with selected packages
   * @param {Object} requestData - Request data including packages
   * @returns {Promise<Object>} { requestId, status }
   */
  static async createRefurbishmentRequestWithPackages(requestData) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const {
        partnerId,
        centerId,
        reason,
        description,
        packages = [], // Array of { packageId, quantity, notes }
        fileUrl = null,
        autoNotify = false,
      } = requestData;

      const requestId = uuidv4();
      const refurbishmentRequestId = uuidv4();
      const requestNumber = `REF-${Date.now()}`;

      // 1. Create main request
      await connection.query(
        `
        INSERT INTO requests (
          id, request_number, type, partner_id, center_id, 
          title, description, status, created_by, created_at
        ) VALUES (?, ?, 'refurbishment', ?, ?, ?, ?, 'pending', ?, NOW())
      `,
        [requestId, requestNumber, partnerId, centerId, reason, description, partnerId]
      );

      // 2. Create refurbishment request
      await connection.query(
        `
        INSERT INTO refurbishment_requests (
          id, request_id, center_id, refurbishment_type
        ) VALUES (?, ?, ?, 'refurbishment')
      `,
        [refurbishmentRequestId, requestId, centerId]
      );

      // 3. Add selected packages
      if (packages.length > 0) {
        const packageValues = packages.map((pkg) => [
          uuidv4(),
          refurbishmentRequestId,
          pkg.packageId,
          pkg.quantity || 1,
          pkg.notes || null,
        ]);

        await connection.query(
          `
          INSERT INTO refurbishment_request_packages (
            id, refurbishment_request_id, package_id, quantity, notes
          ) VALUES ?
        `,
          [packageValues]
        );
      }

      // 4. Create notification for partner
      const notificationId = uuidv4();
      const notifTitle = 'New Refurbishment Request Created';
      const notifMessage =
        description || 'A new refurbishment request has been created for your center.';

      // Get partner user ID for targeted notification
      const [pUsers] = await connection.query(
        `SELECT id FROM users WHERE partner_id = ? AND role = 'PARTNER' AND status = 'active' LIMIT 1`,
        [partnerId]
      );

      let partnerUserId = null;
      if (pUsers && pUsers.length > 0) {
        partnerUserId = pUsers[0].id;
        await connection.query(
          `INSERT INTO notifications (
            id, recipient_id, type, alert_type, title, message,
            related_entity_type, related_entity_id, is_read, sent_via, created_at
          ) VALUES (?, ?, 'alert', 'refurbishment_request', ?, ?, 'center', ?, 0, 'in_app', NOW())`,
          [notificationId, partnerUserId, notifTitle, notifMessage, centerId]
        );
      }

      await connection.commit();

      // Emit real-time WebSocket notification after commit
      if (partnerUserId) {
        emitToUser(partnerUserId, 'notification:new', {
          id: notificationId,
          type: 'alert',
          alert_type: 'refurbishment_request',
          title: notifTitle,
          message: notifMessage,
          related_entity_type: 'center',
          related_entity_id: centerId,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }

      console.log(
        `[RefurbishmentService] Created refurbishment request ${requestNumber} with ${packages.length} packages`
      );

      return {
        requestId,
        requestNumber,
        status: 'pending',
        createdAt: new Date(),
      };
    } catch (error) {
      await connection.rollback();
      console.error('[RefurbishmentService] Error creating refurbishment request:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Create a new refurbishment package
   * @param {Object} packageData - Package details
   * @returns {Promise<Object>} Created package
   */
  static async createPackage(packageData) {
    const { name, description, courses, images, category = 'refurbishment' } = packageData;
    const { v4: uuidv4 } = require('uuid');
    const packageId = uuidv4();

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Prepare images JSON
      const imagesJson = images && images.length > 0 ? JSON.stringify(images) : null;

      // Validate category
      const validCategory = ['refurbishment', 'upgradation'].includes(category)
        ? category
        : 'refurbishment';

      // Insert package
      const packageQuery = `
        INSERT INTO refurbishment_packages 
        (id, package_name, description, category, images, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `;
      await connection.query(packageQuery, [
        packageId,
        name,
        description,
        validCategory,
        imagesJson,
      ]);

      // Insert package courses
      if (courses && courses.length > 0) {
        const courseQuery = `
          INSERT INTO package_courses (package_id, course_id)
          VALUES ?
        `;
        const courseValues = courses.map((courseId) => [packageId, courseId]);
        await connection.query(courseQuery, [courseValues]);
      }

      await connection.commit();

      // Fetch created package
      const [rows] = await db.query(
        `SELECT p.id, p.package_name as name, p.description, p.images,
                p.is_active, p.display_order, p.created_at, p.updated_at,
                GROUP_CONCAT(pc.course_id) as courses
         FROM refurbishment_packages p
         LEFT JOIN package_courses pc ON p.id = pc.package_id
         WHERE p.id = ?
         GROUP BY p.id`,
        [packageId]
      );

      return rows[0];
    } catch (error) {
      await connection.rollback();
      console.error('[RefurbishmentService] Error creating package:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update an existing package
   * @param {string} packageId - Package ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated package
   */
  static async updatePackage(packageId, updates) {
    const { name, description, courses, images, category } = updates;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Update package fields
      const updateFields = [];
      const updateValues = [];

      if (name !== undefined) {
        updateFields.push('package_name = ?');
        updateValues.push(name);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }
      if (category !== undefined) {
        const validCategory = ['refurbishment', 'upgradation'].includes(category)
          ? category
          : 'refurbishment';
        updateFields.push('category = ?');
        updateValues.push(validCategory);
      }
      if (images !== undefined) {
        updateFields.push('images = ?');
        updateValues.push(images && images.length > 0 ? JSON.stringify(images) : null);
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = NOW()');
        updateValues.push(packageId);

        const updateQuery = `
          UPDATE refurbishment_packages 
          SET ${updateFields.join(', ')}
          WHERE id = ?
        `;
        await connection.query(updateQuery, updateValues);
      }

      // Update courses if provided
      if (courses !== undefined && Array.isArray(courses)) {
        // Delete existing courses
        await connection.query('DELETE FROM package_courses WHERE package_id = ?', [packageId]);

        // Insert new courses
        if (courses.length > 0) {
          const courseQuery = `
            INSERT INTO package_courses (package_id, course_id)
            VALUES ?
          `;
          const courseValues = courses.map((courseId) => [packageId, courseId]);
          await connection.query(courseQuery, [courseValues]);
        }
      }

      await connection.commit();

      // Fetch updated package
      const [rows] = await db.query(
        `SELECT p.id, p.package_name as name, p.description, p.images,
                p.is_active, p.display_order, p.created_at, p.updated_at,
                GROUP_CONCAT(pc.course_id) as courses
         FROM refurbishment_packages p
         LEFT JOIN package_courses pc ON p.id = pc.package_id
         WHERE p.id = ?
         GROUP BY p.id`,
        [packageId]
      );

      return rows[0];
    } catch (error) {
      await connection.rollback();
      console.error('[RefurbishmentService] Error updating package:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete a package
   * @param {string} packageId - Package ID
   * @param {boolean} hardDelete - Permanently delete (true) or soft delete (false)
   * @returns {Promise<Object>} Result
   */
  static async deletePackage(packageId, hardDelete = false) {
    try {
      if (hardDelete) {
        // Hard delete: Remove from database
        await db.query('DELETE FROM package_courses WHERE package_id = ?', [packageId]);
        await db.query('DELETE FROM refurbishment_packages WHERE id = ?', [packageId]);
      } else {
        // Soft delete: Mark as inactive
        await db.query(
          'UPDATE refurbishment_packages SET is_active = 0, updated_at = NOW() WHERE id = ?',
          [packageId]
        );
      }

      return { deleted: true, hardDelete };
    } catch (error) {
      console.error('[RefurbishmentService] Error deleting package:', error);
      throw error;
    }
  }

  /* ==================== ADMIN WORKFLOW METHODS ==================== */

  /**
   * Resolve refurbishment_requests row from either:
   *  - refurbishment_requests.id (Past Requests tab)
   *  - scheduled_refurbishment_notifications.id stored in rr.request_id (Alerts / Active Requests)
   *
   * @param {import('mysql2/promise').PoolConnection} connection
   * @param {string} requestId
   * @returns {Promise<{id: string, center_id: string, status?: string}|null>}
   */
  static async resolveRefurbishmentRequest(connection, requestId) {
    const [byPrimary] = await connection.query(
      'SELECT id, center_id, status FROM refurbishment_requests WHERE id = ? LIMIT 1',
      [requestId]
    );
    if (byPrimary?.length) return byPrimary[0];

    const [byNotification] = await connection.query(
      `SELECT rr.id, rr.center_id, rr.status
       FROM refurbishment_requests rr
       WHERE rr.request_id = ?
       ORDER BY rr.created_at DESC
       LIMIT 1`,
      [requestId]
    );
    if (byNotification?.length) return byNotification[0];

    return null;
  }

  static getRefurbishmentDisplayStatus(record = {}) {
    const STATUS_LABELS = REFURBISHMENT_STATUS_LABELS;

    if (record.status === 'completed') {
      return {
        key: 'completed',
        label: STATUS_LABELS.completed,
        badgeKey: 'completed',
      };
    }
    if (record.status === 'rejected') {
      return {
        key: 'rejected',
        label: STATUS_LABELS.rejected,
        badgeKey: 'rejected',
      };
    }
    if (record.partner_completed_at) {
      return {
        key: 'ready_to_complete',
        label: STATUS_LABELS.ready_to_complete,
        badgeKey: 'ready_to_complete',
      };
    }
    if (record.completion_notified_at) {
      return {
        key: 'acknowledgement_pending',
        label: STATUS_LABELS.acknowledgement_pending,
        badgeKey: 'acknowledgement_pending',
      };
    }

    const status = record.status;
    return {
      key: status,
      label: STATUS_LABELS[status] || status,
      badgeKey: status,
    };
  }

  static buildPartnerAcknowledgmentConsentText(includeUpgradation = false) {
    const upgradationClause = includeUpgradation
      ? ' and all upgradation work requested as part of this application'
      : '';
    return (
      `I hereby acknowledge that all refurbishment work${upgradationClause} for this center ` +
      'has been completed as per the approved scope, and the information and documents I am ' +
      'submitting are true and accurate.'
    );
  }

  static async resolvePackageModificationSummary(
    connection,
    requestId,
    removedPackageIds = [],
    adminAddedPackages = []
  ) {
    const removed = [];
    const added = [];

    if (removedPackageIds?.length > 0) {
      const removeIds = removedPackageIds.map((r) =>
        typeof r === 'object' ? r.packageId : r
      );
      if (removeIds.length > 0) {
        const removePlaceholders = removeIds.map(() => '?').join(',');
        const [rows] = await connection.query(
          `SELECT rrcp.package_id, rp.package_name, co.course_name, co.id AS course_id
           FROM refurbishment_request_course_packages rrcp
           JOIN refurbishment_packages rp ON rp.id = rrcp.package_id
           JOIN courses co ON co.id = rrcp.course_id
           WHERE rrcp.refurbishment_request_id = ?
             AND rrcp.package_id IN (${removePlaceholders})`,
          [requestId, ...removeIds]
        );
        removed.push(...rows.map((row) => ({ ...row, scope: 'course' })));
      }
    }

    if (adminAddedPackages?.length > 0) {
      for (const pkg of adminAddedPackages) {
        const packageId = typeof pkg === 'object' ? pkg.packageId : pkg;
        const courseId = typeof pkg === 'object' ? pkg.courseId : null;
        if (!courseId) continue;
        const [rows] = await connection.query(
          `SELECT rp.id AS package_id, rp.package_name, co.course_name, co.id AS course_id
           FROM refurbishment_packages rp
           JOIN courses co ON co.id = ?
           WHERE rp.id = ?
           LIMIT 1`,
          [courseId, packageId]
        );
        if (rows?.[0]) added.push({ ...rows[0], scope: 'course' });
      }
    }

    return {
      added,
      removed,
      hasChanges: added.length > 0 || removed.length > 0,
      approved_at: new Date().toISOString(),
    };
  }

  static async resolveUpgradationPackageRows(connection, packageIds = []) {
    if (!packageIds?.length) return [];
    const placeholders = packageIds.map(() => '?').join(',');
    const [rows] = await connection.query(
      `SELECT
         rp.id AS package_id,
         rp.package_name,
         GROUP_CONCAT(DISTINCT c.course_name ORDER BY c.course_name SEPARATOR ', ') AS course_name
       FROM refurbishment_packages rp
       LEFT JOIN package_courses pc ON pc.package_id = rp.id
       LEFT JOIN courses c ON c.id = pc.course_id
       WHERE rp.id IN (${placeholders})
       GROUP BY rp.id, rp.package_name`,
      packageIds
    );
    return rows.map((row) => ({
      ...row,
      scope: 'upgradation',
      course_id: null,
    }));
  }

  static async resolveUpgradationModificationSummary(
    connection,
    requestId,
    finalPackageIds = null
  ) {
    if (!Array.isArray(finalPackageIds)) {
      return { added: [], removed: [] };
    }

    const [currentRows] = await connection.query(
      `SELECT package_id
       FROM refurbishment_upgradation_request_packages
       WHERE refurbishment_request_id = ?`,
      [requestId]
    );
    const currentIds = new Set(currentRows.map((row) => row.package_id));
    const finalIds = new Set(finalPackageIds);

    const removedIds = [...currentIds].filter((id) => !finalIds.has(id));
    const addedIds = [...finalIds].filter((id) => !currentIds.has(id));

    const removed = await RefurbishmentService.resolveUpgradationPackageRows(
      connection,
      removedIds
    );
    const added = await RefurbishmentService.resolveUpgradationPackageRows(
      connection,
      addedIds
    );

    return { added, removed };
  }

  static formatPackageModificationLabel(pkg) {
    const name = pkg.package_name || 'Package';
    if (pkg.scope === 'upgradation') {
      return `${name} (Upgradation)`;
    }
    return `${name} (${pkg.course_name || 'Course'})`;
  }

  static buildPackageModificationMessage(summary, centerName) {
    const lines = [`Your refurbishment request for ${centerName} has been approved.`];
    if (summary?.removed?.length) {
      lines.push(
        `Removed packages: ${summary.removed
          .map((p) => RefurbishmentService.formatPackageModificationLabel(p))
          .join(', ')}.`
      );
    }
    if (summary?.added?.length) {
      lines.push(
        `Added packages: ${summary.added
          .map((p) => RefurbishmentService.formatPackageModificationLabel(p))
          .join(', ')}.`
      );
    }
    if (!summary?.removed?.length && !summary?.added?.length) {
      lines.push('All selected packages were approved as submitted.');
    }
    return lines.join(' ');
  }

  static parsePackageModificationSummary(raw) {
    if (!raw) {
      return { added: [], removed: [], hasChanges: false, approved_at: null };
    }
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const added = Array.isArray(parsed?.added) ? parsed.added : [];
      const removed = Array.isArray(parsed?.removed) ? parsed.removed : [];
      return {
        added,
        removed,
        hasChanges: Boolean(parsed?.hasChanges) || added.length > 0 || removed.length > 0,
        approved_at: parsed?.approved_at || null,
      };
    } catch {
      return { added: [], removed: [], hasChanges: false, approved_at: null };
    }
  }

  static buildRefurbishmentStatusTimeline(record, options = {}) {
    const hideCompletedEvents = options.hideCompletedEvents !== false;

    if (!record) return { current_status: null, current_status_label: null, events: [] };

    const STATUS_LABELS = REFURBISHMENT_STATUS_LABELS;

    const status = record.status;
    const events = [];

    const addEvent = (event) => {
      if (!event) return;
      if (event.requireDate && !event.occurred_at) return;
      events.push(event);
    };

    addEvent({
      key: 'submitted',
      status: 'submitted',
      label: STATUS_LABELS.submitted,
      occurred_at: record.created_at,
      detail: null,
    });

    if (status === 'sent_back') {
      addEvent({
        key: 'sent_back',
        status: 'sent_back',
        label: STATUS_LABELS.sent_back,
        occurred_at: record.updated_at,
        detail: record.admin_remarks || null,
      });
    }

    if (status === 'rejected') {
      addEvent({
        key: 'rejected',
        status: 'rejected',
        label: STATUS_LABELS.rejected,
        occurred_at: record.rejected_at || record.updated_at,
        detail: record.rejection_reason || null,
      });
    } else {
      const lifecycle = [
        { key: 'approved', label: STATUS_LABELS.approved, dateField: 'approved_at' },
        {
          key: 'material_procurement',
          label: STATUS_LABELS.material_procurement,
          dateField: 'material_procurement_at',
        },
        {
          key: 'installation_in_progress',
          label: STATUS_LABELS.installation_in_progress,
          dateField: 'installation_in_progress_at',
        },
      ];

      const workflowStatus =
        status === 'refurbishment_started' ? 'installation_in_progress' : status;
      const lifecycleKeys = [...lifecycle.map((s) => s.key), 'partner_acknowledgment'];
      const currentIdx = lifecycleKeys.indexOf(workflowStatus);
      const completedFlow = status === 'completed';

      lifecycle.forEach((step, idx) => {
        const reached =
          completedFlow ||
          currentIdx >= idx ||
          (step.key === 'approved' && record.approved_at);
        if (!reached) return;

        let occurredAt = step.dateField ? record[step.dateField] : null;
        if (!occurredAt && workflowStatus === step.key) occurredAt = record.updated_at;
        if (!occurredAt && completedFlow) occurredAt = record.updated_at;

        let label = step.label;

        addEvent({
          key: step.key,
          status: step.key,
          label,
          occurred_at: occurredAt,
          detail: null,
        });
      });

      const installationDone =
        Boolean(record.installation_in_progress_at) ||
        ['installation_in_progress', 'refurbishment_started', 'completed'].includes(status) ||
        Boolean(record.completion_notified_at) ||
        Boolean(record.partner_completed_at);

      if (installationDone || record.completion_notified_at || record.partner_completed_at) {
        let partnerAckLabel = 'Partner Acknowledgement';
        let partnerAckDate = null;
        let partnerAckDetail = null;

        if (record.partner_completed_at) {
          partnerAckLabel = 'Partner Acknowledgement Submitted';
          partnerAckDate = record.partner_completed_at;
          partnerAckDetail = record.partner_completion_description || null;
        } else if (record.completion_notified_at) {
          partnerAckLabel = 'Partner Acknowledgement Pending';
          partnerAckDate = record.completion_notified_at;
          partnerAckDetail =
            'Waiting for the partner to submit their acknowledgment statement, files, and consent.';
        }

        addEvent({
          key: 'partner_acknowledgment',
          status: 'partner_acknowledgment',
          label: partnerAckLabel,
          occurred_at: partnerAckDate,
          detail: partnerAckDetail,
          requireDate: false,
        });
      }
    }

    if (!hideCompletedEvents && record.completed_at) {
      addEvent({
        key: 'completed',
        status: 'completed',
        label: STATUS_LABELS.completed,
        occurred_at: record.completed_at,
        detail: record.completion_statement || null,
      });
    }

    const sortedEvents = events.sort((a, b) => {
      const ta = a.occurred_at ? new Date(a.occurred_at).getTime() : 0;
      const tb = b.occurred_at ? new Date(b.occurred_at).getTime() : 0;
      if (ta && tb) return ta - tb;
      if (ta) return -1;
      if (tb) return 1;
      return 0;
    });

    const displayStatus = RefurbishmentService.getRefurbishmentDisplayStatus(record);

    sortedEvents.forEach((event, index) => {
      if (displayStatus.key === 'acknowledgement_pending') {
        event.is_current = event.key === 'partner_acknowledgment';
      } else if (displayStatus.key === 'ready_to_complete') {
        event.is_current = event.key === 'partner_acknowledgment';
      } else if (displayStatus.key === 'completed') {
        event.is_current = false;
      } else {
        const workflowStatus =
          status === 'refurbishment_started' ? 'installation_in_progress' : status;
        event.is_current =
          event.status === workflowStatus || event.status === status;
      }
      event.is_latest = index === sortedEvents.length - 1;
    });

    if (sortedEvents.length > 0 && !sortedEvents.some((e) => e.is_current)) {
      const pendingAck = sortedEvents.find((e) => e.key === 'partner_acknowledgment');
      if (pendingAck) pendingAck.is_current = true;
      else sortedEvents[sortedEvents.length - 1].is_current = true;
    }

    return {
      current_status: displayStatus.key,
      current_status_label: displayStatus.label,
      events: sortedEvents,
    };
  }

  static buildRefurbishmentCompletionSummary(record, partnerFiles = [], adminFiles = []) {
    return {
      admin: record.completed_at
        ? {
            completed_at: record.completed_at,
            completed_by_name: record.completed_by_name || null,
            statement: record.completion_statement || null,
            files: adminFiles,
          }
        : null,
      partner: record.partner_completed_at
        ? {
            submitted_at: record.partner_completed_at,
            description: record.partner_completion_description || null,
            consent: record.partner_acknowledgment_consent === 1,
            consent_at: record.partner_acknowledgment_consent_at || null,
            consent_text: record.partner_acknowledgment_consent_text || null,
            files: partnerFiles,
          }
        : null,
      completion_notified_at: record.completion_notified_at || null,
    };
  }

  /**
   * Get refurbishment request details for admin review
   * @param {string} requestId - Refurbishment request ID
   * @param {string} adminUserId - Admin user ID (for authorization)
   * @returns {Promise<Object>} Complete request details with partner selections, images, etc.
   */
  static async getRefurbishmentRequestForReview(requestId, adminUserId) {
    const connection = await db.getConnection();

    try {
      // Get admin user role
      const [admin] = await connection.query(
        'SELECT role FROM users WHERE id = ? AND role IN ("ADMIN", "SUPER_ADMIN")',
        [adminUserId]
      );

      if (!admin || admin.length === 0) {
        throw new Error('Unauthorized: Admin access required');
      }

      // Get main request details.
      // The requestId can be either:
      //   a) refurbishment_requests.id  (used by Past Requests tab)
      //   b) scheduled_refurbishment_notifications.id  (used by Active Requests tab — FK stored in rr.request_id)
      // Try both lookups so both tabs work through the same modal.
      const detailQuery = `
        SELECT 
          rr.id,
          rr.request_id,
          rr.center_id,
          rr.refurbishment_type,
          rr.status,
          rr.justification,
          rr.admin_remarks,
          rr.rejection_reason,
          rr.rejected_at,
          rr.rejected_by,
          rr.approved_at,
          rr.material_procurement_at,
          rr.installation_in_progress_at,
          rr.approved_by,
          rr.started_at,
          rr.completed_at,
          rr.completed_by,
          rr.completion_statement,
          rr.completion_notified_at,
          rr.partner_completed_at,
          rr.partner_completion_description,
          rr.partner_acknowledgment_consent,
          rr.partner_acknowledgment_consent_at,
          rr.partner_acknowledgment_consent_text,
          rr.is_upgradation_requested,
          rr.created_at,
          rr.updated_at,
          c.center_name,
          c.center_id AS center_code,
          c.city AS location_city,
          c.state AS location_state,
          p.id AS partner_id,
          p.name AS partner_name,
          r.request_number,
          ua.full_name AS approved_by_name,
          uc.full_name AS completed_by_name,
          ur.full_name AS rejected_by_name
        FROM refurbishment_requests rr
        JOIN centers c ON rr.center_id = c.id
        JOIN partners p ON c.partner_id = p.id
        LEFT JOIN requests r ON r.id = rr.request_id
        LEFT JOIN users ua ON ua.id = rr.approved_by
        LEFT JOIN users uc ON uc.id = rr.completed_by
        LEFT JOIN users ur ON ur.id = rr.rejected_by
        WHERE rr.id = ?
      `;

      let [requestData] = await connection.query(detailQuery, [requestId]);

      // Fallback: try treating requestId as a scheduled_refurbishment_notifications.id
      if (!requestData || requestData.length === 0) {
        const fallbackQuery = `
          SELECT 
            rr.id,
            rr.request_id,
            rr.center_id,
            rr.refurbishment_type,
            rr.status,
            rr.justification,
            rr.admin_remarks,
            rr.rejection_reason,
            rr.rejected_at,
            rr.rejected_by,
            rr.approved_at,
            rr.material_procurement_at,
            rr.installation_in_progress_at,
            rr.approved_by,
            rr.started_at,
            rr.completed_at,
            rr.completed_by,
            rr.completion_statement,
            rr.completion_notified_at,
            rr.partner_completed_at,
            rr.partner_completion_description,
            rr.partner_acknowledgment_consent,
            rr.partner_acknowledgment_consent_at,
            rr.partner_acknowledgment_consent_text,
            rr.is_upgradation_requested,
            rr.created_at,
            rr.updated_at,
            c.center_name,
            c.center_id AS center_code,
            c.city AS location_city,
            c.state AS location_state,
            p.id AS partner_id,
            p.name AS partner_name,
            srn.request_number,
            ua.full_name AS approved_by_name,
            uc.full_name AS completed_by_name,
            ur.full_name AS rejected_by_name
          FROM refurbishment_requests rr
          JOIN centers c ON rr.center_id = c.id
          JOIN partners p ON c.partner_id = p.id
          LEFT JOIN scheduled_refurbishment_notifications srn ON srn.id = rr.request_id
          LEFT JOIN users ua ON ua.id = rr.approved_by
          LEFT JOIN users uc ON uc.id = rr.completed_by
          LEFT JOIN users ur ON ur.id = rr.rejected_by
          WHERE rr.request_id = ?
          ORDER BY rr.created_at DESC
          LIMIT 1
        `;
        [requestData] = await connection.query(fallbackQuery, [requestId]);
      }

      if (!requestData || requestData.length === 0) {
        // Check if this is a scheduled notification ID with no partner response yet
        const [srnCheck] = await connection.query(
          'SELECT id, partner_responded FROM scheduled_refurbishment_notifications WHERE id = ? LIMIT 1',
          [requestId]
        );
        if (srnCheck && srnCheck.length > 0 && !srnCheck[0].partner_responded) {
          throw new NotFoundError(
            'The partner has not responded to this notification yet. There is no submission to review.'
          );
        }
        throw new NotFoundError('Refurbishment request not found');
      }

      const request = requestData[0];

      // Get partner-selected packages grouped by course
      const [partnerPackages] = await connection.query(
        `
        SELECT 
          rrcp.id,
          rrcp.course_id,
          rrcp.package_id,
          rrcp.quantity,
          rrcp.justification,
          c.course_name,
          rp.package_name,
          rp.description,
          rp.images
        FROM refurbishment_request_course_packages rrcp
        JOIN courses c ON rrcp.course_id = c.id
        JOIN refurbishment_packages rp ON rrcp.package_id = rp.id
        WHERE rrcp.refurbishment_request_id = ?
        ORDER BY c.course_name, rp.package_name
      `,
        [request.id]
      );

      // Get partner-uploaded images / documents
      const [partnerImages] = await connection.query(
        `
        SELECT 
          id,
          course_id,
          package_id,
          file_url,
          file_name,
          file_size_bytes,
          file_mime_type,
          attachment_type,
          uploaded_by,
          created_at
        FROM refurbishment_request_course_attachments
        WHERE refurbishment_request_id = ?
        ORDER BY created_at
      `,
        [request.id]
      );

      const isPackageImageAttachment = (att) => {
        const mime = (att.file_mime_type || '').toLowerCase();
        const name = (att.file_name || '').toLowerCase();
        const attachmentType = (att.attachment_type || '').toLowerCase();
        if (
          attachmentType === 'refurbishment_submission' ||
          attachmentType === 'upgradation_submission'
        ) {
          return false;
        }
        if (!att.package_id) return false;
        if (!mime.startsWith('image/')) return false;
        return (
          !name.includes('refurbishment-document') &&
          !name.includes('upgradation-document') &&
          !name.includes('refurbishment_document') &&
          !name.includes('upgradation_document')
        );
      };

      const resolveSupportingDocumentType = (att) => {
        const attachmentType = (att.attachment_type || '').toLowerCase();
        const name = (att.file_name || '').toLowerCase();
        if (attachmentType === 'upgradation_submission' || name.includes('upgradation')) {
          return 'upgradation';
        }
        if (
          attachmentType === 'refurbishment_submission' ||
          name.includes('refurbishment-document') ||
          name.includes('refurbishment_document') ||
          name.includes('refurbishment')
        ) {
          return 'refurbishment';
        }
        // Legacy rows use partner_before for partner submission files without package_id.
        if (!att.package_id && attachmentType === 'partner_before') {
          return 'refurbishment';
        }
        return 'other';
      };

      const isGlobalSubmissionAttachment = (att) => {
        const attachmentType = (att.attachment_type || '').toLowerCase();
        if (
          attachmentType === 'refurbishment_submission' ||
          attachmentType === 'upgradation_submission'
        ) {
          return true;
        }
        if (!att.package_id && attachmentType === 'partner_before') {
          return true;
        }
        const name = (att.file_name || '').toLowerCase();
        return (
          name.includes('refurbishment-document') ||
          name.includes('upgradation-document') ||
          name.includes('refurbishment_document') ||
          name.includes('upgradation_document')
        );
      };

      const mapUpload = (att) => ({
        id: att.id,
        url: att.file_url,
        name: att.file_name,
        size: att.file_size_bytes,
        type: att.file_mime_type,
        attachment_type: att.attachment_type || null,
      });

      const imagesByPackageId = {};
      const supportingDocuments = [];

      partnerImages.forEach((att) => {
        if (att.attachment_type === 'partner_completion' || att.attachment_type === 'admin_completion') {
          return;
        }

        const mapped = mapUpload(att);

        // Global submission documents and any file without package_id stay at request level.
        if (isGlobalSubmissionAttachment(att) || !att.package_id) {
          supportingDocuments.push({
            ...mapped,
            document_type: resolveSupportingDocumentType(att),
          });
          return;
        }

        if (isPackageImageAttachment(att)) {
          if (!imagesByPackageId[att.package_id]) {
            imagesByPackageId[att.package_id] = [];
          }
          imagesByPackageId[att.package_id].push(mapped);
          return;
        }

        supportingDocuments.push({
          ...mapped,
          document_type: resolveSupportingDocumentType(att),
        });
      });

      // Get admin-added packages (if any)
      const [adminPackages] = await connection.query(
        `
        SELECT 
          raap.id,
          raap.course_id,
          raap.package_id,
          raap.quantity,
          raap.added_by,
          raap.created_at,
          c.course_name,
          rp.package_name,
          rp.description,
          rp.images,
          u.full_name AS added_by_name
        FROM refurbishment_admin_added_packages raap
        JOIN courses c ON raap.course_id = c.id
        JOIN refurbishment_packages rp ON raap.package_id = rp.id
        JOIN users u ON raap.added_by = u.id
        WHERE raap.refurbishment_request_id = ?
        ORDER BY c.course_name, rp.package_name
      `,
        [request.id]
      );

      // Completion evidence uploaded by admin or partner
      const [completionAttachments] = await connection.query(
        `
        SELECT 
          id,
          course_id,
          file_url,
          file_name,
          file_size_bytes,
          file_mime_type,
          attachment_type,
          uploaded_by,
          created_at
        FROM refurbishment_request_course_attachments
        WHERE refurbishment_request_id = ?
          AND attachment_type IN ('admin_completion', 'partner_completion')
        ORDER BY created_at
      `,
        [request.id]
      );

      const partnerCompletionFiles = completionAttachments
        .filter((att) => att.attachment_type === 'partner_completion')
        .map(mapUpload);
      const adminCompletionFiles = completionAttachments
        .filter((att) => att.attachment_type === 'admin_completion')
        .map(mapUpload);

      const statusTimeline = RefurbishmentService.buildRefurbishmentStatusTimeline(request);
      const completionSummary = RefurbishmentService.buildRefurbishmentCompletionSummary(
        request,
        partnerCompletionFiles,
        adminCompletionFiles
      );

      // Get all available courses for this center (for admin to add more packages)
      const [availableCourses] = await connection.query(
        `
        SELECT DISTINCT
          c.id AS course_id,
          c.course_name
        FROM center_courses cc
        JOIN courses c ON cc.course_id = c.id
        WHERE cc.center_id = ?
        ORDER BY c.course_name
      `,
        [request.center_id]
      );

      // Get upgradation room details (if any)
      const [upgradationRooms] = await connection.query(
        `
        SELECT 
          r.id,
          r.length_feet,
          r.breadth_feet,
          r.height_feet,
          r.justification,
          r.created_at
        FROM refurbishment_upgradation_rooms r
        WHERE r.refurbishment_request_id = ?
        ORDER BY r.created_at
      `,
        [request.id]
      );

      // Get upgradation photos (for each room)
      let upgradationPhotos = [];
      if (upgradationRooms.length > 0) {
        const roomIds = upgradationRooms.map((r) => `'${r.id}'`).join(',');
        const [photos] = await connection.query(
          `SELECT id, upgradation_room_id, file_url, file_name, created_at
           FROM refurbishment_upgradation_photos
           WHERE upgradation_room_id IN (${roomIds})`
        );
        upgradationPhotos = photos;
      }

      // Get upgradation selected packages (by partner)
      const [upgradationSelectedPkgs] = await connection.query(
        `
        SELECT 
          urap.id,
          urap.package_id,
          rp.package_name,
          rp.description,
          rp.images,
          rp.category,
          GROUP_CONCAT(DISTINCT c.course_name ORDER BY c.course_name SEPARATOR ', ') AS course_names,
          GROUP_CONCAT(DISTINCT pc.course_id) AS courseIds
        FROM refurbishment_upgradation_request_packages urap
        JOIN refurbishment_packages rp ON urap.package_id = rp.id
        LEFT JOIN package_courses pc ON pc.package_id = rp.id
        LEFT JOIN courses c ON pc.course_id = c.id
        WHERE urap.refurbishment_request_id = ?
        GROUP BY urap.id, urap.package_id, rp.package_name, rp.description, rp.images, rp.category
        ORDER BY rp.package_name
      `,
        [request.id]
      );

      // Get admin-selected upgradation packages (by admin for this request)
      // Table: refurbishment_admin_selected_packages (cols: id, request_id, course_id, package_id, created_at)
      const [adminUpgradationPkgs] = await connection.query(
        `
        SELECT
          raup.id,
          raup.package_id,
          rp.package_name,
          rp.description,
          rp.images,
          rp.category,
          raup.created_at,
          GROUP_CONCAT(DISTINCT c.course_name ORDER BY c.course_name SEPARATOR ', ') AS course_names,
          GROUP_CONCAT(DISTINCT pc.course_id) AS courseIds
        FROM refurbishment_admin_selected_packages raup
        JOIN refurbishment_packages rp ON raup.package_id = rp.id
        LEFT JOIN package_courses pc ON pc.package_id = rp.id
        LEFT JOIN courses c ON pc.course_id = c.id
        WHERE raup.request_id = ?
          AND rp.category = 'upgradation'
        GROUP BY raup.id, raup.package_id, rp.package_name, rp.description, rp.images, rp.category, raup.created_at
        ORDER BY rp.package_name
      `,
        [request.id]
      );

      // Group partner packages by course (attach per-package partner uploads + justification)
      const packagesByCourse = {};
      partnerPackages.forEach((pkg) => {
        if (!packagesByCourse[pkg.course_id]) {
          packagesByCourse[pkg.course_id] = {
            course_id: pkg.course_id,
            course_name: pkg.course_name,
            packages: [],
          };
        }
        const partner_uploaded_images = imagesByPackageId[pkg.package_id] || [];

        packagesByCourse[pkg.course_id].packages.push({
          ...pkg,
          justification: pkg.justification || '',
          partner_uploaded_images,
        });
      });

      // Group admin packages by course
      const adminPackagesByCourse = {};
      adminPackages.forEach((pkg) => {
        if (!adminPackagesByCourse[pkg.course_id]) {
          adminPackagesByCourse[pkg.course_id] = {
            course_id: pkg.course_id,
            course_name: pkg.course_name,
            packages: [],
          };
        }
        adminPackagesByCourse[pkg.course_id].packages.push(pkg);
      });

      // Legacy map keyed by course (kept for backward compatibility)
      const imagesByPackage = {};
      partnerImages.forEach((img) => {
        if (!isPackageImageAttachment(img)) return;
        const key = img.course_id || 'unknown';
        if (!imagesByPackage[key]) {
          imagesByPackage[key] = [];
        }
        imagesByPackage[key].push(img);
      });

      return {
        request: request,
        partner_packages_by_course: Object.values(packagesByCourse),
        admin_packages_by_course: Object.values(adminPackagesByCourse),
        partner_images: partnerImages,
        supporting_documents: supportingDocuments,
        images_by_package: imagesByPackage,
        completion_images: adminCompletionFiles,
        partner_completion_files: partnerCompletionFiles,
        status_timeline: statusTimeline,
        completion_summary: completionSummary,
        status_dates: {
          approved_at: request.approved_at || null,
          material_procurement_at: request.material_procurement_at || null,
          installation_in_progress_at: request.installation_in_progress_at || null,
          completed_at: request.completed_at || null,
        },
        rejection_summary:
          request.status === 'rejected'
            ? {
                rejected_at: request.rejected_at || null,
                rejected_by_name: request.rejected_by_name || null,
                reason: request.rejection_reason || null,
              }
            : null,
        available_courses: availableCourses,
        upgradation: {
          is_requested:
            request.is_upgradation_requested === 1 || request.is_upgradation_requested === true,
          rooms: upgradationRooms.map((room) => ({
            ...room,
            photos: upgradationPhotos.filter((p) => p.upgradation_room_id === room.id),
          })),
          selected_packages: upgradationSelectedPkgs.map((pkg) => ({
            ...pkg,
            justification: pkg.justification || '',
            courseIds: pkg.courseIds ? pkg.courseIds.split(',') : [],
            partner_uploaded_images: imagesByPackageId[pkg.package_id] || [],
            images: pkg.images
              ? typeof pkg.images === 'string'
                ? JSON.parse(pkg.images)
                : pkg.images
              : [],
          })),
          admin_selected_packages: adminUpgradationPkgs.map((pkg) => ({
            ...pkg,
            courseIds: pkg.courseIds ? pkg.courseIds.split(',') : [],
            images: pkg.images
              ? typeof pkg.images === 'string'
                ? JSON.parse(pkg.images)
                : pkg.images
              : [],
          })),
        },
      };
    } catch (error) {
      console.error(
        '[RefurbishmentService] Error getting refurbishment request for review:',
        error
      );
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all refurbishment requests pending admin review
   * @param {Object} params - Filter parameters (status, partner_id, etc.)
   * @returns {Promise<Object>} List of pending requests with pagination
   */
  static async getPendingReviewRequests(params = {}) {
    try {
      const { status = 'submitted', limit = 50, offset = 0 } = params;

      const [requests] = await db.query(
        `
        SELECT 
          rr.id,
          rr.status,
          rr.created_at,
          c.center_name,
          c.city,
          c.state,
          p.name AS partner_name,
          r.request_number,
          COUNT(DISTINCT rrcp.package_id) AS package_count
        FROM refurbishment_requests rr
        JOIN centers c ON rr.center_id = c.id
        JOIN partners p ON c.partner_id = p.id
        LEFT JOIN requests r ON r.id = rr.request_id
        LEFT JOIN refurbishment_request_course_packages rrcp ON rr.id = rrcp.refurbishment_request_id
        WHERE rr.status = ?
        GROUP BY rr.id
        ORDER BY rr.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `,
        [status]
      );

      const [[countResult]] = await db.query(
        'SELECT COUNT(*) AS total FROM refurbishment_requests WHERE status = ?',
        [status]
      );

      return {
        requests,
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      };
    } catch (error) {
      console.error('[RefurbishmentService] Error getting pending review requests:', error);
      throw error;
    }
  }

  /**
   * Admin adds additional packages to refurbishment request
   * @param {string} requestId - Refurbishment request ID
   * @param {string} adminUserId - Admin user ID
   * @param {Array} selectedPackages - Array of {course_id, package_id, quantity}
   * @returns {Promise<Object>} Success message
   */
  static async addAdminPackages(requestId, adminUserId, selectedPackages) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Verify admin role
      const [admin] = await connection.query(
        'SELECT role FROM users WHERE id = ? AND role IN ("ADMIN", "SUPER_ADMIN")',
        [adminUserId]
      );

      if (!admin || admin.length === 0) {
        throw new Error('Unauthorized: Admin access required');
      }

      // Verify request exists and is in correct status
      const [request] = await connection.query(
        'SELECT id, status FROM refurbishment_requests WHERE id = ?',
        [requestId]
      );

      if (!request || request.length === 0) {
        throw new NotFoundError('Refurbishment request not found');
      }

      if (request[0].status !== 'submitted') {
        throw new Error(`Cannot add packages when status is ${request[0].status}`);
      }

      // Delete existing admin packages for this request (if re-adding)
      await connection.query(
        'DELETE FROM refurbishment_admin_added_packages WHERE refurbishment_request_id = ?',
        [requestId]
      );

      // Insert new admin packages
      for (const pkg of selectedPackages) {
        const packageId = uuidv4();

        await connection.query(
          `
          INSERT INTO refurbishment_admin_added_packages (
            id,
            refurbishment_request_id,
            course_id,
            package_id,
            quantity,
            added_by,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
          [packageId, requestId, pkg.course_id, pkg.package_id, pkg.quantity || 1, adminUserId]
        );
      }

      await connection.commit();

      return {
        success: true,
        packages_added: selectedPackages.length,
      };
    } catch (error) {
      await connection.rollback();
      console.error('[RefurbishmentService] Error adding admin packages:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get available upgradation and lab packages for a refurbishment request's center,
   * filtered by the courses the center runs.  Also returns the current admin
   * selections so the front-end can pre-tick them.
   *
   * @param {string} requestId - Refurbishment request ID
   * @returns {Promise<Object>} { available_packages, admin_selected_ids }
   */
  static async getUpgradationPackagesForRequest(requestId) {
    const connection = await db.getConnection();
    try {
      const req = await RefurbishmentService.resolveRefurbishmentRequest(
        connection,
        requestId,
      );
      if (!req) throw new NotFoundError('Refurbishment request not found');

      const resolvedRequestId = req.id;

      // Get all courses for this center
      const [centerCourses] = await connection.query(
        `SELECT course_id FROM center_courses WHERE center_id = ?`,
        [req.center_id]
      );
      const centerCourseIds = centerCourses.map((r) => r.course_id);

      // Active upgradation + lab (refurbishment) packages for the center's courses.
      let pkgQuery = `
        SELECT
          rp.id,
          rp.package_name AS name,
          rp.description,
          rp.category,
          rp.images,
          rp.is_active AS isActive,
          rp.display_order AS displayOrder,
          GROUP_CONCAT(DISTINCT c.course_name ORDER BY c.course_name SEPARATOR ', ') AS course_names,
          GROUP_CONCAT(DISTINCT pc.course_id) AS courseIds
        FROM refurbishment_packages rp
        LEFT JOIN package_courses pc ON pc.package_id = rp.id
        LEFT JOIN courses c ON pc.course_id = c.id
        WHERE rp.category IN ('upgradation', 'refurbishment')
          AND rp.is_active = 1`;

      const params = [];
      if (centerCourseIds.length > 0) {
        const placeholders = centerCourseIds.map(() => '?').join(',');
        pkgQuery += ` AND (pc.course_id IN (${placeholders}) OR NOT EXISTS (
          SELECT 1 FROM package_courses pc2 WHERE pc2.package_id = rp.id
        ))`;
        params.push(...centerCourseIds);
      }
      pkgQuery += ` GROUP BY rp.id ORDER BY FIELD(rp.category, 'upgradation', 'refurbishment'), rp.display_order ASC, rp.package_name ASC`;

      const [packages] = await connection.query(pkgQuery, params);

      // Current admin selections for this request
      const [adminSelections] = await connection.query(
        `SELECT package_id FROM refurbishment_upgradation_request_packages
         WHERE refurbishment_request_id = ?`,
        [resolvedRequestId]
      );
      const adminSelectedIds = adminSelections.map((r) => r.package_id);

      return {
        available_packages: packages.map((pkg) => ({
          ...pkg,
          courseIds: pkg.courseIds ? pkg.courseIds.split(',') : [],
          images: pkg.images
            ? typeof pkg.images === 'string'
              ? JSON.parse(pkg.images)
              : pkg.images
            : [],
        })),
        admin_selected_ids: adminSelectedIds,
      };
    } catch (error) {
      console.error(
        '[RefurbishmentService] Error getting upgradation packages for request:',
        error
      );
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Save (replace) admin's upgradation package selections for a request.
   *
   * @param {string} requestId    - Refurbishment request ID
   * @param {string} adminUserId  - Admin performing the action
   * @param {string[]} packageIds - Array of upgradation package IDs to select
   * @param {Object} [notes={}]   - Optional map of packageId → note string
   * @returns {Promise<Object>} { success, packages_saved }
   */
  static async saveAdminUpgradationPackages(requestId, adminUserId, packageIds, notes = {}) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Verify admin role
      const [[admin]] = await connection.query(
        'SELECT role FROM users WHERE id = ? AND role IN ("ADMIN", "SUPER_ADMIN")',
        [adminUserId]
      );
      if (!admin) throw new Error('Unauthorized: Admin access required');

      const request = await RefurbishmentService.resolveRefurbishmentRequest(
        connection,
        requestId,
      );
      if (!request) throw new NotFoundError('Refurbishment request not found');

      const resolvedRequestId = request.id;

      // Delete current admin selections for this request
      await connection.query(
        'DELETE FROM refurbishment_upgradation_request_packages WHERE refurbishment_request_id = ?',
        [resolvedRequestId]
      );

      // Insert new selections
      for (const pkgId of packageIds) {
        await connection.query(
          `INSERT INTO refurbishment_upgradation_request_packages
             (id, refurbishment_request_id, package_id)
           VALUES (?, ?, ?)`,
          [uuidv4(), resolvedRequestId, pkgId]
        );
      }

      await connection.commit();
      return { success: true, packages_saved: packageIds.length };
    } catch (error) {
      await connection.rollback();
      console.error('[RefurbishmentService] Error saving admin upgradation packages:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Admin approves refurbishment request
   * @param {string} requestId - Refurbishment request ID
   * @param {string} adminUserId - Admin user ID
   * @param {string} adminRemarks - Optional remarks from admin
   * @returns {Promise<Object>} Success message
   */
  static async approveRefurbishmentRequest(
    requestId,
    adminUserId,
    adminRemarks = null,
    removedPackageIds = [],
    adminAddedPackages = [],
    finalUpgradationPackageIds = null
  ) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Verify admin role
      const [admin] = await connection.query(
        'SELECT role, full_name FROM users WHERE id = ? AND role IN ("ADMIN", "SUPER_ADMIN")',
        [adminUserId]
      );

      if (!admin || admin.length === 0) {
        throw new Error('Unauthorized: Admin access required');
      }

      // Get request details
      const [request] = await connection.query(
        `
        SELECT 
          rr.id,
          rr.status,
          rr.center_id,
          c.center_name,
          p.id AS partner_id,
          p.name AS partner_name,
          r.request_number
        FROM refurbishment_requests rr
        JOIN centers c ON rr.center_id = c.id
        JOIN partners p ON c.partner_id = p.id
        LEFT JOIN requests r ON r.id = rr.request_id
        WHERE rr.id = ?
      `,
        [requestId]
      );

      if (!request || request.length === 0) {
        throw new NotFoundError('Refurbishment request not found');
      }

      if (request[0].status !== 'submitted') {
        throw new Error(`Cannot approve request with status: ${request[0].status}`);
      }

      const requestData = request[0];

      const packageSummary = await RefurbishmentService.resolvePackageModificationSummary(
        connection,
        requestId,
        removedPackageIds,
        adminAddedPackages
      );

      if (Array.isArray(finalUpgradationPackageIds)) {
        const upgSummary = await RefurbishmentService.resolveUpgradationModificationSummary(
          connection,
          requestId,
          finalUpgradationPackageIds
        );
        packageSummary.added.push(...upgSummary.added);
        packageSummary.removed.push(...upgSummary.removed);
        packageSummary.hasChanges =
          packageSummary.hasChanges ||
          upgSummary.added.length > 0 ||
          upgSummary.removed.length > 0;
      }

      // ── Apply package modifications BEFORE approval ──────────────────
      // 1. Remove partner-selected packages that admin has rejected
      if (removedPackageIds && removedPackageIds.length > 0) {
        const removeIds = removedPackageIds.map((r) => (typeof r === 'object' ? r.packageId : r));
        if (removeIds.length > 0) {
          const removePlaceholders = removeIds.map(() => '?').join(',');
          await connection.query(
            `DELETE FROM refurbishment_request_course_packages
             WHERE refurbishment_request_id = ? AND package_id IN (${removePlaceholders})`,
            [requestId, ...removeIds]
          );
        }
      }

      // 2. Persist admin-added packages to the dedicated table
      if (adminAddedPackages && adminAddedPackages.length > 0) {
        for (const pkg of adminAddedPackages) {
          const pkgId = uuidv4();
          await connection.query(
            `INSERT IGNORE INTO refurbishment_admin_added_packages
               (id, refurbishment_request_id, course_id, package_id, quantity, added_by, created_at)
             VALUES (?, ?, ?, ?, 1, ?, NOW())`,
            [pkgId, requestId, pkg.courseId, pkg.packageId, adminUserId]
          );
        }
      }

      // 3. Apply admin's final upgradation package list (partner kept + admin added − removed)
      if (Array.isArray(finalUpgradationPackageIds)) {
        await connection.query(
          'DELETE FROM refurbishment_upgradation_request_packages WHERE refurbishment_request_id = ?',
          [requestId]
        );
        for (const packageId of finalUpgradationPackageIds) {
          await connection.query(
            `INSERT INTO refurbishment_upgradation_request_packages
               (id, refurbishment_request_id, package_id)
             VALUES (?, ?, ?)`,
            [uuidv4(), requestId, packageId]
          );
        }
      }

      // Update request status to approved
      await connection.query(
        `
        UPDATE refurbishment_requests
        SET status = 'approved',
            approved_by = ?,
            approved_at = NOW(),
            admin_remarks = ?,
            package_modification_summary = ?,
            updated_at = NOW()
        WHERE id = ?
      `,
        [
          adminUserId,
          adminRemarks,
          packageSummary.hasChanges ? JSON.stringify(packageSummary) : null,
          requestId,
        ]
      );

      // Create notification for partner
      const notificationId = uuidv4();
      const requestNumber = requestData.request_number
        ? String(requestData.request_number).toUpperCase()
        : `REF-${requestId.slice(0, 8).toUpperCase()}`;

      const approvalMessage = RefurbishmentService.buildPackageModificationMessage(
        packageSummary,
        requestData.center_name
      );
      const notificationPayload = {
        request_number: requestNumber,
        center_name: requestData.center_name,
        package_modifications: {
          added: packageSummary.added,
          removed: packageSummary.removed,
        },
      };

      // Get partner user ID
      const [partnerUsers] = await connection.query(
        'SELECT id, email FROM users WHERE partner_id = ? AND role = ? AND status = ? LIMIT 1',
        [requestData.partner_id, 'PARTNER', 'active']
      );

      if (partnerUsers && partnerUsers.length > 0) {
        await connection.query(
          `INSERT INTO notifications (
            id, recipient_id, type, alert_type, title, message, payload,
            related_entity_type, related_entity_id, is_read, created_at
          ) VALUES (?, ?, 'alert', 'refurbishment_approved', ?, ?, ?, 'refurbishment_request', ?, 0, NOW())`,
          [
            notificationId,
            partnerUsers[0].id,
            `Refurbishment Request Approved - ${requestNumber}`,
            `${approvalMessage}${adminRemarks ? ` Admin remarks: ${adminRemarks}` : ''}`,
            JSON.stringify(notificationPayload),
            requestId,
          ]
        );
      }

      await connection.commit();

      // Auto-mark the original partner-response notification as read now that it has been approved
      await db.query(
        `UPDATE notifications SET is_read = 1, read_at = NOW()
         WHERE alert_type = 'refurbishment_response'
           AND related_entity_id = ?
           AND related_entity_type = 'refurbishment_request'
           AND is_read = 0`,
        [requestId]
      );

      // Emit real-time WebSocket notification
      if (partnerUsers && partnerUsers.length > 0) {
        emitToUser(partnerUsers[0].id, 'notification:new', {
          id: notificationId,
          type: 'alert',
          alert_type: 'refurbishment_approved',
          title: `Refurbishment Request Approved - ${requestNumber}`,
          message: approvalMessage,
          payload: notificationPayload,
          related_entity_type: 'refurbishment_request',
          related_entity_id: requestId,
          is_read: false,
          created_at: new Date().toISOString(),
        });

        const { fireEmail } = require('../../../services/emailDispatch.service');
        const approvedPackage =
          notificationPayload.package_modifications?.added?.[0]?.package_name ||
          'Package 1';
        fireEmail(
          'refurbishment.approved_partner',
          {
            partnerName: requestData.partner_name,
            centerName: requestData.center_name,
            packageName: approvedPackage,
            date: new Date().toLocaleDateString('en-IN'),
            adminName: 'SEIF Portal',
          },
          { audience: 'partner', partnerId: requestData.partner_id }
        );
      }

      return {
        success: true,
        status: 'approved',
        message: 'Refurbishment request approved successfully',
      };
    } catch (error) {
      await connection.rollback();
      console.error('[RefurbishmentService] Error approving refurbishment request:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Admin rejects refurbishment request
   * @param {string} requestId - Refurbishment request ID
   * @param {string} adminUserId - Admin user ID
   * @param {string} rejectionReason - Reason for rejection
   * @returns {Promise<Object>} Success message
   */
  static async rejectRefurbishmentRequest(requestId, adminUserId, rejectionReason) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Verify admin role
      const [admin] = await connection.query(
        'SELECT role, full_name FROM users WHERE id = ? AND role IN ("ADMIN", "SUPER_ADMIN")',
        [adminUserId]
      );

      if (!admin || admin.length === 0) {
        throw new Error('Unauthorized: Admin access required');
      }

      if (!rejectionReason || rejectionReason.trim() === '') {
        throw new Error('Rejection reason is required');
      }

      // Get request details
      const [request] = await connection.query(
        `
        SELECT 
          rr.id,
          rr.status,
          rr.center_id,
          c.center_name,
          p.id AS partner_id,
          p.name AS partner_name,
          r.request_number
        FROM refurbishment_requests rr
        JOIN centers c ON rr.center_id = c.id
        JOIN partners p ON c.partner_id = p.id
        LEFT JOIN requests r ON r.id = rr.request_id
        WHERE rr.id = ?
      `,
        [requestId]
      );

      if (!request || request.length === 0) {
        throw new NotFoundError('Refurbishment request not found');
      }

      if (request[0].status !== 'submitted') {
        throw new Error(`Cannot reject request with status: ${request[0].status}`);
      }

      const requestData = request[0];

      // Update request status to rejected
      await connection.query(
        `
        UPDATE refurbishment_requests
        SET status = 'rejected',
            rejected_by = ?,
            rejected_at = NOW(),
            rejection_reason = ?,
            updated_at = NOW()
        WHERE id = ?
      `,
        [adminUserId, rejectionReason, requestId]
      );

      // Create notification for partner
      const notificationId = uuidv4();
      const requestNumber = requestData.request_number
        ? String(requestData.request_number).toUpperCase()
        : `REF-${requestId.slice(0, 8).toUpperCase()}`;

      const [partnerUsers] = await connection.query(
        'SELECT id FROM users WHERE partner_id = ? AND role = ? AND status = ? LIMIT 1',
        [requestData.partner_id, 'PARTNER', 'active']
      );

      if (partnerUsers && partnerUsers.length > 0) {
        await connection.query(
          `INSERT INTO notifications (
            id, recipient_id, type, alert_type, title, message,
            related_entity_type, related_entity_id, is_read, created_at
          ) VALUES (?, ?, 'alert', 'refurbishment_rejected', ?, ?, 'center', ?, 0, NOW())`,
          [
            notificationId,
            partnerUsers[0].id,
            `Refurbishment Request Rejected - ${requestNumber}`,
            `Your refurbishment request for ${requestData.center_name} has been rejected. Reason: ${rejectionReason}`,
            requestData.center_id,
          ]
        );
      }

      await connection.commit();

      try {
        const { fireEmail } = require('../../../services/emailDispatch.service');
        fireEmail(
          'refurbishment.rejected_partner',
          {
            partnerName: requestData.partner_name,
            centerName: requestData.center_name,
            adminName: 'SEIF Portal',
          },
          { audience: 'partner', partnerId: requestData.partner_id }
        );
      } catch (e) {
        /* non-blocking */
      }

      // Auto-mark the original partner-response notification as read now that it has been rejected
      await db.query(
        `UPDATE notifications SET is_read = 1, read_at = NOW()
         WHERE alert_type = 'refurbishment_response'
           AND related_entity_id = ?
           AND related_entity_type = 'refurbishment_request'
           AND is_read = 0`,
        [requestId]
      );

      // Emit real-time WebSocket notification
      if (partnerUsers && partnerUsers.length > 0) {
        emitToUser(partnerUsers[0].id, 'notification:new', {
          id: notificationId,
          type: 'alert',
          alert_type: 'refurbishment_rejected',
          title: `Refurbishment Request Rejected - ${requestNumber}`,
          message: `Your refurbishment request for ${requestData.center_name} has been rejected. Reason: ${rejectionReason}`,
          related_entity_type: 'center',
          related_entity_id: requestData.center_id,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }

      return {
        success: true,
        status: 'rejected',
        message: 'Refurbishment request rejected',
      };
    } catch (error) {
      await connection.rollback();
      console.error('[RefurbishmentService] Error rejecting refurbishment request:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Admin sends refurbishment request back to partner for re-submission
   * @param {string} requestId - Refurbishment request ID
   * @param {string} adminUserId - Admin user ID
   * @param {string} sendBackReason - Reason for send-back
   * @returns {Promise<Object>} Success message
   */
  static async sendBackRefurbishmentRequest(requestId, adminUserId, sendBackReason) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [admin] = await connection.query(
        'SELECT role, full_name FROM users WHERE id = ? AND role IN ("ADMIN", "SUPER_ADMIN")',
        [adminUserId]
      );

      if (!admin || admin.length === 0) {
        throw new Error('Unauthorized: Admin access required');
      }

      const [request] = await connection.query(
        `
        SELECT
          rr.id,
          rr.request_id,
          rr.status,
          rr.center_id,
          c.center_name,
          p.id AS partner_id,
          p.name AS partner_name,
          srn.request_number
        FROM refurbishment_requests rr
        JOIN centers c ON rr.center_id = c.id
        JOIN partners p ON c.partner_id = p.id
        LEFT JOIN scheduled_refurbishment_notifications srn ON rr.request_id = srn.id
        WHERE rr.id = ?
      `,
        [requestId]
      );

      if (!request || request.length === 0) {
        throw new NotFoundError('Refurbishment request not found');
      }

      if (request[0].status !== 'submitted') {
        throw new Error(`Cannot send back request with status: ${request[0].status}`);
      }

      const requestData = request[0];

      await connection.query(
        `
        UPDATE refurbishment_requests
        SET status = 'sent_back',
            admin_remarks = ?,
            updated_at = NOW()
        WHERE id = ?
      `,
        [sendBackReason, requestId]
      );

      await connection.query(
        'DELETE FROM refurbishment_admin_added_packages WHERE refurbishment_request_id = ?',
        [requestId]
      );

      if (requestData.request_id) {
        await connection.query(
          'DELETE FROM refurbishment_admin_selected_packages WHERE request_id = ?',
          [requestData.request_id]
        );
      }

      if (requestData.request_id) {
        await connection.query(
          `
          UPDATE scheduled_refurbishment_notifications
          SET partner_responded = 0,
              response_received_at = NULL,
              updated_at = NOW()
          WHERE id = ?
        `,
          [requestData.request_id]
        );
      }

      const [partnerUsers] = await connection.query(
        `SELECT id FROM users
         WHERE partner_id = ?
           AND UPPER(role) = 'PARTNER'
           AND LOWER(status) = 'active'
         LIMIT 1`,
        [requestData.partner_id]
      );

      let notificationId = null;
      if (partnerUsers && partnerUsers.length > 0) {
        notificationId = uuidv4();
        const requestNumber = requestData.request_number
          ? `RQ-${String(requestData.request_number).padStart(6, '0')}`
          : `REF-${requestId.slice(0, 8).toUpperCase()}`;

        const reinitRelatedType = requestData.request_id
          ? 'scheduled_refurbishment_notification'
          : 'center';
        const reinitRelatedId = requestData.request_id || requestData.center_id;

        await connection.query(
          `INSERT INTO notifications (
            id, recipient_id, type, alert_type, title, message,
            related_entity_type, related_entity_id, is_read, created_at
          ) VALUES (?, ?, 'alert', 'refurbishment_reinitiated', ?, ?, ?, ?, 0, NOW())`,
          [
            notificationId,
            partnerUsers[0].id,
            `Refurbishment Resubmission Requested - ${requestNumber}`,
            `Please re-submit the refurbishment request for ${requestData.center_name}. Remarks: ${sendBackReason}`,
            reinitRelatedType,
            reinitRelatedId,
          ]
        );
      }

      await connection.commit();

      try {
        const { fireEmail } = require('../../../services/emailDispatch.service');
        fireEmail(
          'refurbishment.resend_partner',
          {
            partnerName: requestData.partner_name,
            centerName: requestData.center_name,
            adminName: 'SEIF Portal',
          },
          { audience: 'partner', partnerId: requestData.partner_id }
        );
      } catch (e) {
        /* non-blocking */
      }

      if (notificationId && partnerUsers && partnerUsers.length > 0) {
        emitToUser(partnerUsers[0].id, 'notification:new', {
          id: notificationId,
          type: 'alert',
          alert_type: 'refurbishment_reinitiated',
          title: 'Refurbishment Resubmission Requested',
          message: `Please re-submit the refurbishment request for ${requestData.center_name}. Remarks: ${sendBackReason}`,
          related_entity_type: requestData.request_id
            ? 'scheduled_refurbishment_notification'
            : 'center',
          related_entity_id: requestData.request_id || requestData.center_id,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }

      return {
        success: true,
        status: 'sent_back',
        message: 'Request sent back to partner for resubmission',
      };
    } catch (error) {
      await connection.rollback();
      console.error('[RefurbishmentService] Error sending back request:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Admin starts refurbishment work
   * @param {string} requestId - Refurbishment request ID
   * @param {string} adminUserId - Admin user ID
   * @returns {Promise<Object>} Success message
   */
  static async startRefurbishment(requestId, adminUserId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Verify admin role
      const [admin] = await connection.query(
        'SELECT role FROM users WHERE id = ? AND role IN ("ADMIN", "SUPER_ADMIN")',
        [adminUserId]
      );

      if (!admin || admin.length === 0) {
        throw new Error('Unauthorized: Admin access required');
      }

      // Verify request exists and is approved
      const [request] = await connection.query(
        'SELECT id, status FROM refurbishment_requests WHERE id = ?',
        [requestId]
      );

      if (!request || request.length === 0) {
        throw new NotFoundError('Refurbishment request not found');
      }

      if (request[0].status !== 'approved') {
        throw new Error(`Cannot start refurbishment when status is: ${request[0].status}`);
      }

      // Update status to refurbishment_started
      await connection.query(
        `
        UPDATE refurbishment_requests
        SET status = 'refurbishment_started',
            started_by = ?,
            started_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
      `,
        [adminUserId, requestId]
      );

      await connection.commit();

      console.log(`[RefurbishmentService] Refurbishment started for request ${requestId}`);

      return {
        success: true,
        status: 'refurbishment_started',
        message: 'Refurbishment work started',
      };
    } catch (error) {
      await connection.rollback();
      console.error('[RefurbishmentService] Error starting refurbishment:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Admin marks refurbishment as completed
   * @param {string} requestId - Refurbishment request ID
   * @param {string} adminUserId - Admin user ID
   * @param {Object} completionData - {completion_statement, completion_date, completion_images}
   * @returns {Promise<Object>} Success message
   */
  static async completeRefurbishment(requestId, adminUserId, completionData) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Verify admin role
      const [admin] = await connection.query(
        'SELECT role, full_name FROM users WHERE id = ? AND role IN ("ADMIN", "SUPER_ADMIN")',
        [adminUserId]
      );

      if (!admin || admin.length === 0) {
        throw new Error('Unauthorized: Admin access required');
      }

      // Completion statement and files are optional for admin
      const completionStatement = (completionData.completion_statement || '').trim();

      // Get request details
      const [request] = await connection.query(
        `
        SELECT 
          rr.id,
          rr.status,
          rr.center_id,
          c.center_name,
          p.id AS partner_id,
          p.name AS partner_name,
          r.request_number
        FROM refurbishment_requests rr
        JOIN centers c ON rr.center_id = c.id
        JOIN partners p ON c.partner_id = p.id
        LEFT JOIN requests r ON r.id = rr.request_id
        WHERE rr.id = ?
      `,
        [requestId]
      );

      if (!request || request.length === 0) {
        throw new NotFoundError('Refurbishment request not found');
      }

      const completableStatuses = [
        'approved',
        'material_procurement',
        'installation_in_progress',
        'refurbishment_started',
      ];
      if (!completableStatuses.includes(request[0].status)) {
        throw new Error(`Cannot complete refurbishment when status is: ${request[0].status}`);
      }

      const requestData = request[0];
      const completedAt = RefurbishmentService.parseWorkflowStatusDate(
        completionData.completion_date
      );

      const optionalDateUpdates = [];
      const optionalDateValues = [];
      const optionalDateMap = {
        approved_at: completionData.approved_at,
        material_procurement_at: completionData.material_procurement_at,
        installation_in_progress_at: completionData.installation_in_progress_at,
      };

      Object.entries(optionalDateMap).forEach(([column, value]) => {
        if (!value) return;
        optionalDateUpdates.push(`${column} = ?`);
        optionalDateValues.push(RefurbishmentService.parseWorkflowStatusDate(value));
      });

      const optionalDateSql =
        optionalDateUpdates.length > 0 ? `, ${optionalDateUpdates.join(', ')}` : '';

      // Update status to completed
      await connection.query(
        `
        UPDATE refurbishment_requests
        SET status = 'completed',
            completed_by = ?,
            completed_at = ?,
            completion_statement = ?${optionalDateSql},
            updated_at = NOW()
        WHERE id = ?
      `,
        [
          adminUserId,
          completedAt,
          completionStatement || null,
          ...optionalDateValues,
          requestId,
        ]
      );

      // Keep center record in sync so Overview/eligibility use the latest refurbishment date
      await connection.query(
        `
        UPDATE centers
        SET last_refurbishment_date = ?
        WHERE id = ?
          AND (
            last_refurbishment_date IS NULL
            OR last_refurbishment_date < ?
          )
      `,
        [completedAt, requestData.center_id, completedAt]
      );

      // Insert completion images
      if (completionData.completion_images && Array.isArray(completionData.completion_images)) {
        for (const image of completionData.completion_images) {
          const attachmentId = uuidv4();

          await connection.query(
            `
            INSERT INTO refurbishment_request_course_attachments (
              id,
              refurbishment_request_id,
              course_id,
              file_url,
              file_name,
              file_size_bytes,
              file_mime_type,
              uploaded_by,
              attachment_type,
              created_at
            ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'admin_completion', NOW())
          `,
            [
              attachmentId,
              requestId,
              image.url,
              image.name || 'completion_photo.jpg',
              image.size || null,
              image.type || 'image/jpeg',
              adminUserId,
            ]
          );
        }
      }

      // Create notification for partner
      const notificationId = uuidv4();
      const requestNumber = requestData.request_number
        ? String(requestData.request_number).toUpperCase()
        : `REF-${requestId.slice(0, 8).toUpperCase()}`;

      const [partnerUsers] = await connection.query(
        'SELECT id FROM users WHERE partner_id = ? AND role = ? AND status = ? LIMIT 1',
        [requestData.partner_id, 'PARTNER', 'active']
      );

      if (partnerUsers && partnerUsers.length > 0) {
        const completionMessage = completionStatement
          ? `The refurbishment work for ${requestData.center_name} has been completed. ${completionStatement.substring(0, 100)}${completionStatement.length > 100 ? '...' : ''}`
          : `The refurbishment work for ${requestData.center_name} has been completed.`;

        await connection.query(
          `INSERT INTO notifications (
            id, recipient_id, type, alert_type, title, message,
            related_entity_type, related_entity_id, is_read, created_at
          ) VALUES (?, ?, 'alert', 'refurbishment_completed', ?, ?, 'center', ?, 0, NOW())`,
          [
            notificationId,
            partnerUsers[0].id,
            `Refurbishment Completed - ${requestNumber}`,
            completionMessage,
            requestData.center_id,
          ]
        );
      }

      await connection.commit();

      // Auto-mark the original partner-response notification as read now that it has been completed
      await db.query(
        `UPDATE notifications SET is_read = 1, read_at = NOW()
         WHERE alert_type = 'refurbishment_response'
           AND related_entity_id = ?
           AND related_entity_type = 'refurbishment_request'
           AND is_read = 0`,
        [requestId]
      );

      // Emit real-time WebSocket notification
      if (partnerUsers && partnerUsers.length > 0) {
        emitToUser(partnerUsers[0].id, 'notification:new', {
          id: notificationId,
          type: 'alert',
          alert_type: 'refurbishment_completed',
          title: `Refurbishment Completed - ${requestNumber}`,
          message: `The refurbishment work for ${requestData.center_name} has been completed.`,
          related_entity_type: 'center',
          related_entity_id: requestData.center_id,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }

      console.log(
        `[RefurbishmentService] Refurbishment completed for request ${requestNumber} by ${admin[0].full_name}`
      );

      return {
        success: true,
        status: 'completed',
        message: 'Refurbishment marked as completed',
      };
    } catch (error) {
      await connection.rollback();
      console.error('[RefurbishmentService] Error completing refurbishment:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // ── Admin status change ────────────────────────────────────────────────────
  /**
   * Advance refurbishment request to the next lifecycle status.
   * Valid transitions:
   *   approved → material_procurement → installation_in_progress → (use completeRefurbishment for completed)
   * @param {string} requestId
   * @param {string} adminUserId
   * @param {string} newStatus
   */
  static async updateRefurbishmentStepDate(requestId, adminUserId, step, statusDate) {
    const STEP_DATE_FIELDS = {
      approved: 'approved_at',
      material_procurement: 'material_procurement_at',
      installation_in_progress: 'installation_in_progress_at',
    };

    const allowedStatusesByStep = {
      approved: ['approved', 'material_procurement', 'installation_in_progress', 'refurbishment_started'],
      material_procurement: [
        'material_procurement',
        'installation_in_progress',
        'refurbishment_started',
      ],
      installation_in_progress: ['installation_in_progress', 'refurbishment_started'],
    };

    const field = STEP_DATE_FIELDS[step];
    if (!field) throw new Error('Invalid workflow step');

    const [admin] = await db.query(
      'SELECT role FROM users WHERE id = ? AND role IN ("ADMIN", "SUPER_ADMIN")',
      [adminUserId]
    );
    if (!admin || admin.length === 0) throw new Error('Unauthorized: Admin access required');

    const [rows] = await db.query('SELECT id, status FROM refurbishment_requests WHERE id = ?', [
      requestId,
    ]);
    if (!rows || rows.length === 0) throw new NotFoundError('Refurbishment request not found');

    const allowed = allowedStatusesByStep[step] || [];
    if (!allowed.includes(rows[0].status)) {
      throw new Error(`Cannot save ${step} date when status is: ${rows[0].status}`);
    }

    const parsedDate = RefurbishmentService.parseWorkflowStatusDate(statusDate);
    await db.query(
      `UPDATE refurbishment_requests SET ${field} = ?, updated_at = NOW() WHERE id = ?`,
      [parsedDate, requestId]
    );

    return { success: true, step, status_date: parsedDate, field };
  }

  static parseWorkflowStatusDate(value) {
    if (!value) return new Date();
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Invalid status date');
    }
    return parsed;
  }

  static async updateRefurbishmentStatus(requestId, adminUserId, newStatus, options = {}) {
    const VALID_TRANSITIONS = {
      approved: ['material_procurement'],
      material_procurement: ['installation_in_progress'],
      installation_in_progress: [], // must use completeRefurbishment to → completed
      refurbishment_started: ['installation_in_progress', 'material_procurement'],
    };

    const STATUS_DATE_FIELDS = {
      approved: 'approved_at',
      material_procurement: 'material_procurement_at',
      installation_in_progress: 'installation_in_progress_at',
    };

    const [admin] = await db.query(
      'SELECT role FROM users WHERE id = ? AND role IN ("ADMIN", "SUPER_ADMIN")',
      [adminUserId]
    );
    if (!admin || admin.length === 0) throw new Error('Unauthorized: Admin access required');

    const [rows] = await db.query('SELECT id, status FROM refurbishment_requests WHERE id = ?', [
      requestId,
    ]);
    if (!rows || rows.length === 0) throw new NotFoundError('Refurbishment request not found');

    const current = rows[0].status;
    const allowed = VALID_TRANSITIONS[current] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid transition: ${current} → ${newStatus}`);
    }

    const dateField = STATUS_DATE_FIELDS[current];
    const statusDate = RefurbishmentService.parseWorkflowStatusDate(options.status_date);

    if (dateField) {
      await db.query(
        `UPDATE refurbishment_requests
         SET status = ?, ${dateField} = ?, updated_at = NOW()
         WHERE id = ?`,
        [newStatus, statusDate, requestId]
      );
    } else {
      await db.query(
        'UPDATE refurbishment_requests SET status = ?, updated_at = NOW() WHERE id = ?',
        [newStatus, requestId]
      );
    }

    console.log(`[RefurbishmentService] Status updated: ${requestId} → ${newStatus}`);
    return {
      success: true,
      status: newStatus,
      status_date: statusDate,
      status_date_field: dateField || null,
    };
  }

  // ── Partner acknowledgment (admin-initiated) ───────────────────────────────
  /**
   * Admin requests partner acknowledgment before final completion.
   * Sends in-app notification and email to the partner.
   */
  static async requestPartnerAcknowledgment(requestId, adminUserId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [admin] = await connection.query(
        'SELECT role, full_name FROM users WHERE id = ? AND role IN ("ADMIN", "SUPER_ADMIN")',
        [adminUserId]
      );
      if (!admin || admin.length === 0) {
        throw new Error('Unauthorized: Admin access required');
      }

      const [rows] = await connection.query(
        `SELECT
           rr.id,
           rr.status,
           rr.completion_notified_at,
           rr.partner_completed_at,
           c.center_name,
           c.partner_id,
           p.name AS partner_name,
           r.request_number
         FROM refurbishment_requests rr
         JOIN centers c ON c.id = rr.center_id
         JOIN partners p ON p.id = c.partner_id
         LEFT JOIN requests r ON r.id = rr.request_id
         WHERE rr.id = ?`,
        [requestId]
      );

      if (!rows || rows.length === 0) {
        throw new NotFoundError('Refurbishment request not found');
      }

      const request = rows[0];
      const completableStatuses = [
        'approved',
        'material_procurement',
        'installation_in_progress',
        'refurbishment_started',
      ];

      if (!completableStatuses.includes(request.status)) {
        throw new Error(
          `Cannot request partner acknowledgment when status is: ${request.status}`
        );
      }

      if (request.partner_completed_at) {
        throw new Error('Partner has already submitted their acknowledgment');
      }

      if (request.completion_notified_at) {
        throw new Error('Partner acknowledgment has already been requested');
      }

      await connection.query(
        `UPDATE refurbishment_requests
         SET completion_notified_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [requestId]
      );

      const requestNumber = request.request_number
        ? String(request.request_number).toUpperCase()
        : `REF-${requestId.slice(0, 8).toUpperCase()}`;

      const [partnerUsers] = await connection.query(
        `SELECT u.id, u.email
         FROM users u
         WHERE u.partner_id = ? AND u.role = 'PARTNER' AND u.status = 'active'
         LIMIT 1`,
        [request.partner_id]
      );

      const ackMessage =
        `Please submit your acknowledgment for the refurbishment work at ${request.center_name}. ` +
        'Open this alert and click Submit Acknowledgment to upload your statement and supporting files.';

      if (partnerUsers && partnerUsers.length > 0) {
        const notificationId = uuidv4();
        await connection.query(
          `INSERT INTO notifications (
             id, recipient_id, type, alert_type, title, message,
             related_entity_type, related_entity_id, is_read, created_at
           ) VALUES (?, ?, 'alert', 'refurbishment_acknowledgment_due', ?, ?, 'refurbishment_request', ?, 0, NOW())`,
          [
            notificationId,
            partnerUsers[0].id,
            `Acknowledgment Required - ${requestNumber}`,
            ackMessage,
            requestId,
          ]
        );

        if (partnerUsers[0].email) {
          emailService
            .sendRefurbishmentNotificationEmail({
              email: partnerUsers[0].email,
              partnerName: request.partner_name,
              centerName: request.center_name,
              message: ackMessage,
            })
            .catch((emailErr) => {
              console.error(
                '[RefurbishmentService] Failed to send acknowledgment email:',
                emailErr.message
              );
            });
        }
      }

      await connection.commit();

      if (partnerUsers && partnerUsers.length > 0) {
        emitToUser(partnerUsers[0].id, 'notification:new', {
          id: uuidv4(),
          type: 'alert',
          alert_type: 'refurbishment_acknowledgment_due',
          title: `Acknowledgment Required - ${requestNumber}`,
          message: ackMessage,
          related_entity_type: 'refurbishment_request',
          related_entity_id: requestId,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }

      console.log(
        `[RefurbishmentService] Partner acknowledgment requested for ${requestId} by ${admin[0].full_name}`
      );

      return {
        success: true,
        message: 'Partner acknowledgment request sent successfully',
        completion_notified_at: new Date().toISOString(),
      };
    } catch (error) {
      await connection.rollback();
      console.error('[RefurbishmentService] Error requesting partner acknowledgment:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // ── Partner acknowledgment submission ─────────────────────────────────
  /**
   * Partner submits their completion report after receiving the 2-month notification.
   * Only allowed when admin has NOT yet moved status to 'completed'.
   * @param {string} requestId
   * @param {string} partnerId
   * @param {{ description: string, fileUrls: Array<{url,name,type}> }} data
   */
  static async submitPartnerCompletion(requestId, partnerId, data) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const statement = (data.description || '').trim();
      if (!statement) {
        throw new Error('Acknowledgment statement is required');
      }
      if (!Array.isArray(data.fileUrls) || data.fileUrls.length === 0) {
        throw new Error('At least one file is required');
      }
      if (!data.consent) {
        throw new Error('Acknowledgment consent is required');
      }
      const consentText = (data.consentText || '').trim();
      if (!consentText) {
        throw new Error('Acknowledgment consent text is required');
      }

      // Validate ownership
      const [rows] = await connection.query(
        `SELECT
           rr.id,
           rr.status,
           rr.center_id,
           rr.completion_notified_at,
           rr.partner_completed_at,
           rr.is_upgradation_requested,
           c.center_name,
           c.partner_id,
           p.name AS partner_name,
           r.request_number
         FROM refurbishment_requests rr
         JOIN centers c ON c.id = rr.center_id
         JOIN partners p ON p.id = c.partner_id
         LEFT JOIN requests r ON r.id = rr.request_id
         WHERE rr.id = ?`,
        [requestId]
      );
      if (!rows || rows.length === 0) throw new Error('Request not found');
      if (rows[0].partner_id !== partnerId) throw new Error('Access denied');
      if (rows[0].status === 'completed')
        throw new Error('Admin has already marked this request as completed');
      if (rows[0].status === 'rejected')
        throw new Error('Cannot submit acknowledgment for a rejected request');
      if (!rows[0].completion_notified_at) {
        throw new Error('Acknowledgment has not been requested for this request yet');
      }
      if (rows[0].partner_completed_at) {
        throw new Error('Acknowledgment has already been submitted');
      }

      const requestData = rows[0];

      // Save description + timestamp
      await connection.query(
        `UPDATE refurbishment_requests
         SET partner_completion_description = ?,
             partner_completed_at = NOW(),
             partner_acknowledgment_consent = 1,
             partner_acknowledgment_consent_at = NOW(),
             partner_acknowledgment_consent_text = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [statement, consentText, requestId]
      );

      // Save file attachments
      if (Array.isArray(data.fileUrls) && data.fileUrls.length > 0) {
        for (const file of data.fileUrls) {
          await connection.query(
            `INSERT INTO refurbishment_request_course_attachments
               (id, refurbishment_request_id, file_url, file_name, file_size_bytes, file_mime_type, uploaded_by, attachment_type, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'partner_completion', NOW())`,
            [
              uuidv4(),
              requestId,
              file.url,
              file.name || 'acknowledgment_file',
              file.size || null,
              file.type || null,
              data.userId || null,
            ]
          );
        }
      }

      const requestNumber = requestData.request_number
        ? String(requestData.request_number).toUpperCase()
        : `REF-${requestId.slice(0, 8).toUpperCase()}`;

      const adminNotificationId = uuidv4();
      await connection.query(
        `INSERT INTO notifications (
           id, recipient_role, type, alert_type, title, message,
           related_entity_type, related_entity_id, is_read, created_at
         ) VALUES (?, 'ADMIN', 'alert', 'refurbishment_partner_acknowledgment', ?, ?, 'refurbishment_request', ?, 0, NOW())`,
        [
          adminNotificationId,
          `Partner Acknowledgment - ${requestNumber}`,
          `${requestData.partner_name || 'Partner'} submitted acknowledgment for ${requestData.center_name}. Review their statement and files before completing the request.`,
          requestId,
        ]
      );

      await connection.query(
        `UPDATE notifications
         SET alert_type = 'refurbishment_acknowledgment_submitted',
             title = ?,
             message = ?,
             is_read = 1
         WHERE related_entity_id = ?
           AND related_entity_type = 'refurbishment_request'
           AND alert_type = 'refurbishment_acknowledgment_due'`,
        [
          `Acknowledgment Submitted - ${requestNumber}`,
          'Your acknowledgment has been received. Admin will review your statement and files before completing the request.',
          requestId,
        ]
      );

      const [partnerUsers] = await connection.query(
        `SELECT id FROM users
         WHERE partner_id = ? AND role = 'PARTNER' AND status = 'active'
         LIMIT 1`,
        [requestData.partner_id]
      );

      await connection.commit();
      console.log(`[RefurbishmentService] Partner acknowledgment submitted for ${requestId}`);

      try {
        const { fireEmail } = require('../../../services/emailDispatch.service');
        fireEmail(
          'refurbishment.status_admin',
          {
            partnerName: requestData.partner_name,
            centerName: requestData.center_name,
            adminName: 'Admin',
            workStatus: 'Completed',
            supportRequired: 'Nil',
          },
          { audience: 'admin' }
        );
        fireEmail(
          'refurbishment.ack_partner',
          {
            partnerName: requestData.partner_name,
            centerName: requestData.center_name,
          },
          { audience: 'partner', partnerId: requestData.partner_id }
        );
      } catch (e) {
        /* non-blocking */
      }

      try {
        emitToRole('ADMIN', 'notification:new', {
          id: adminNotificationId,
          type: 'alert',
          alert_type: 'refurbishment_partner_acknowledgment',
          title: `Partner Acknowledgment - ${requestNumber}`,
          message: `${requestData.partner_name || 'Partner'} submitted acknowledgment for ${requestData.center_name}.`,
          related_entity_type: 'refurbishment_request',
          related_entity_id: requestId,
          is_read: false,
          created_at: new Date().toISOString(),
        });
        if (partnerUsers?.[0]?.id) {
          emitToUser(partnerUsers[0].id, 'notification:new', {
            type: 'alert',
            alert_type: 'refurbishment_acknowledgment_submitted',
            related_entity_type: 'refurbishment_request',
            related_entity_id: requestId,
            created_at: new Date().toISOString(),
          });
        }
      } catch (socketError) {
        console.error(
          '[RefurbishmentService] Failed to emit partner acknowledgment socket:',
          socketError.message
        );
      }

      return { success: true, message: 'Acknowledgment submitted successfully' };
    } catch (error) {
      await connection.rollback();
      console.error('[RefurbishmentService] Error submitting partner completion:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // ── 2-month completion notification (called by cron) ───────────────────────
  /**
   * Find approved requests where 2 months have elapsed and send partner notifications.
   * Skips if admin already completed or partner already submitted.
   */
  static async sendCompletionNotifications() {
    try {
      // Find all requests: approved for ≥ 2 months, not yet completed, not yet notified
      const [requests] = await db.query(
        `SELECT
           rr.id,
           rr.center_id,
           rr.approved_at,
           c.center_name,
           p.id   AS partner_id,
           p.name AS partner_name
         FROM refurbishment_requests rr
         JOIN centers c ON c.id = rr.center_id
         JOIN partners p ON p.id = c.partner_id
         WHERE rr.status NOT IN ('completed', 'rejected')
           AND rr.approved_at IS NOT NULL
           AND rr.approved_at <= DATE_SUB(NOW(), INTERVAL 2 MONTH)
           AND rr.completion_notified_at IS NULL
           AND rr.partner_completed_at   IS NULL`
      );

      if (!requests || requests.length === 0) {
        console.log('[RefurbishmentService] No requests requiring completion notification');
        return { notified: 0 };
      }

      let notified = 0;
      for (const req of requests) {
        // Get partner user
        const [users] = await db.query(
          'SELECT id FROM users WHERE partner_id = ? AND status = "active" LIMIT 1',
          [req.partner_id]
        );
        if (!users || users.length === 0) continue;

        const notifId = uuidv4();
        await db.query(
          `INSERT INTO notifications
             (id, recipient_id, type, alert_type, title, message,
              related_entity_type, related_entity_id, is_read, created_at)
           VALUES (?, ?, 'alert', 'refurbishment_completion_due',
             'Refurbishment Completion Required',
             ?,
             'refurbishment_request', ?, 0, NOW())`,
          [
            notifId,
            users[0].id,
            `Your refurbishment for ${req.center_name} was approved 2 months ago. Please submit your completion report with photos and documents.`,
            req.id,
          ]
        );

        // Mark notified
        await db.query(
          'UPDATE refurbishment_requests SET completion_notified_at = NOW() WHERE id = ?',
          [req.id]
        );

        notified++;
        console.log(`[RefurbishmentService] Completion notification sent for request ${req.id}`);
      }

      return { notified };
    } catch (error) {
      console.error('[RefurbishmentService] Error sending completion notifications:', error);
      throw error;
    }
  }

  static async getNotificationHistoryForCenter(centerId) {
    const [rows] = await db.query(
      `SELECT
         srn.id,
         srn.request_number,
         srn.message,
         srn.frequency,
         srn.last_sent_at,
         srn.send_count,
         srn.status,
         srn.created_at,
         srn.partner_responded,
         srn.response_received_at,
         u.full_name AS created_by_name
       FROM scheduled_refurbishment_notifications srn
       LEFT JOIN users u ON u.id = srn.created_by
       WHERE srn.center_id = ?
       ORDER BY COALESCE(srn.last_sent_at, srn.created_at) DESC`,
      [centerId]
    );
    return { history: rows, total: rows.length };
  }
}

module.exports = RefurbishmentService;
