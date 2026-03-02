const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');
const { emitToUser } = require('../../../websocket/socket');

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
      // Default refurbishment frequency: 36 months (3 years) if not set
      const DEFAULT_FREQUENCY = 36;

      // First, get total count of eligible centers
      const countQuery = `
        SELECT COUNT(*) as total
        FROM centers c
        WHERE c.status = 'active'
        AND c.year_of_establishment IS NOT NULL
        AND (
          (c.last_refurbishment_date IS NOT NULL 
            AND TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE()) >= COALESCE(c.refurbishment_frequency_months, ${DEFAULT_FREQUENCY}))
          OR
          (c.last_refurbishment_date IS NULL 
            AND TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE()) >= COALESCE(c.refurbishment_frequency_months, ${DEFAULT_FREQUENCY}))
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
          COALESCE(c.refurbishment_frequency_months, ${DEFAULT_FREQUENCY}) as refurbishment_frequency_months,
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
              TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE()) >= COALESCE(c.refurbishment_frequency_months, ${DEFAULT_FREQUENCY})
            ELSE
              TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE()) >= COALESCE(c.refurbishment_frequency_months, ${DEFAULT_FREQUENCY})
          END as is_eligible
        FROM centers c
        LEFT JOIN partners p ON c.partner_id = p.id
        WHERE c.status = 'active'
          AND c.year_of_establishment IS NOT NULL
        HAVING is_eligible = 1
        ORDER BY months_since_last_refurbishment DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;

      const [centers] = await db.query(query, []);

      console.log(
        `[RefurbishmentService] Retrieved ${centers.length} eligible centers (total: ${total}, using default frequency: ${DEFAULT_FREQUENCY} months for centers without frequency set)`
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
      // Default refurbishment frequency: 36 months (3 years) if not set
      const DEFAULT_FREQUENCY = 36;

      const query = `
        SELECT 
          c.id,
          c.center_name,
          c.partner_id,
          p.name as organization_name,
          c.year_of_establishment,
          c.last_refurbishment_date,
          COALESCE(c.refurbishment_frequency_months, ${DEFAULT_FREQUENCY}) as refurbishment_frequency_months,
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
              TIMESTAMPDIFF(MONTH, c.last_refurbishment_date, CURDATE()) >= COALESCE(c.refurbishment_frequency_months, ${DEFAULT_FREQUENCY})
            ELSE
              TIMESTAMPDIFF(MONTH, DATE(CONCAT(c.year_of_establishment, '-01-01')), CURDATE()) >= COALESCE(c.refurbishment_frequency_months, ${DEFAULT_FREQUENCY})
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

      const query = `
        SELECT 
          c.id,
          c.center_name,
          c.partner_id,
          p.name as organization_name,
          c.year_of_establishment,
          c.last_refurbishment_date,
          COALESCE(c.refurbishment_frequency_months, ${DEFAULT_FREQUENCY}) as refurbishment_frequency_months,
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
      // Execute 7-table JOIN query with security check
      const query = `
        SELECT 
          rr.id as refurbishment_request_id,
          rr.request_id,
          rr.center_id,
          rr.is_upgradation_requested,
          c.center_name,
          c.address,
          c.partner_id,
          r.remarks as admin_remarks,
          r.status,
          cc.course_id,
          co.course_name,
          rasp.package_id,
          rp.package_name,
          rp.description
        FROM refurbishment_requests rr
        JOIN requests r ON r.id = rr.request_id
        JOIN centers c ON c.id = rr.center_id
        JOIN center_courses cc ON cc.center_id = c.id
        JOIN courses co ON co.id = cc.course_id
        JOIN refurbishment_admin_selected_packages rasp 
          ON rasp.request_id = rr.request_id
          AND rasp.course_id = cc.course_id
        JOIN refurbishment_packages rp ON rp.id = rasp.package_id
        WHERE rr.request_id = ?
        ORDER BY co.course_name, rp.package_name
      `;

      const [rows] = await db.query(query, [requestId]);

      // Security check: Verify partner owns this request
      if (rows.length === 0) {
        return null; // Request not found
      }

      const firstRow = rows[0];
      if (firstRow.partner_id !== partnerId) {
        return null; // Access denied (not partner's request)
      }

      // Transform data: Group packages by course
      const courseMap = new Map();

      for (const row of rows) {
        if (!courseMap.has(row.course_id)) {
          courseMap.set(row.course_id, {
            course_id: row.course_id,
            course_name: row.course_name,
            packages: [],
          });
        }

        courseMap.get(row.course_id).packages.push({
          package_id: row.package_id,
          package_name: row.package_name,
          description: row.description,
        });
      }

      // Build response object
      return {
        request_id: firstRow.request_id,
        center_id: firstRow.center_id,
        center_name: firstRow.center_name,
        address: firstRow.address,
        admin_remarks: firstRow.admin_remarks,
        status: firstRow.status,
        courses: Array.from(courseMap.values()),
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

      // 9. Return updated request
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
          rr.status,
          rr.created_at,
          rr.updated_at,
          rr.admin_remarks,
          rr.rejection_reason,
          rr.approved_at,
          rr.completed_at,
          rr.completion_statement,
          rr.partner_completion_description,
          rr.partner_completed_at,
          c.center_name,
          c.address                                                                     AS center_address
        FROM refurbishment_requests rr
        JOIN centers c ON c.id = rr.center_id
        LEFT JOIN requests r ON r.id = rr.request_id
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
  static async getPastRefurbishmentRequests(limit = 50, offset = 0, year = null) {
    try {
      // All non-submitted/non-draft requests surfaced in Past Requests.
      // Status lives on refurbishment_requests (not the legacy requests table).
      const activeStatuses = [
        'approved',
        'material_procurement',
        'installation_in_progress',
        'refurbishment_started',
        'completed',
        'rejected',
      ];
      const placeholders = activeStatuses.map(() => '?').join(', ');

      let countQuery = `
        SELECT COUNT(*) as total
        FROM refurbishment_requests rr
        JOIN centers c ON c.id = rr.center_id
        JOIN partners p ON p.id = c.partner_id
        WHERE rr.status IN (${placeholders})
      `;
      const countParams = [...activeStatuses];

      if (year) {
        countQuery += ` AND YEAR(rr.updated_at) = ?`;
        countParams.push(year);
      }

      const [[{ total }]] = await db.query(countQuery, countParams);

      let query = `
        SELECT
          rr.id,
          CONCAT('REQ-', YEAR(rr.created_at), '-', UPPER(SUBSTRING(rr.id, 1, 8))) AS requestId,
          rr.refurbishment_type                      AS type,
          c.center_name                              AS centerName,
          rr.updated_at                              AS lastUpdated,
          rr.status,
          rr.approved_at,
          rr.completed_at,
          rr.rejection_reason,
          rr.completion_statement,
          rr.admin_remarks,
          p.name                                     AS organization_name,
          p.id                                       AS partner_id
        FROM refurbishment_requests rr
        JOIN centers c ON c.id = rr.center_id
        JOIN partners p ON p.id = c.partner_id
        WHERE rr.status IN (${placeholders})
      `;
      const params = [...activeStatuses];

      if (year) {
        query += ` AND YEAR(rr.updated_at) = ?`;
        params.push(year);
      }

      query += ` ORDER BY rr.updated_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

      const [requests] = await db.query(query, params);

      console.log(
        `[RefurbishmentService] Retrieved ${requests.length} past requests (total: ${total})`
      );

      return { requests, totalCount: total };
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
      const defaultMessage =
        message ||
        'Your center is eligible for refurbishment. Please review and submit your requirements.';

      // Find the active partner user first
      const [partnerUserRows] = await db.query(
        `SELECT id FROM users WHERE partner_id = ? AND role = 'PARTNER' AND status = 'active' LIMIT 1`,
        [partnerId]
      );

      if (partnerUserRows.length === 0) {
        console.warn(
          `[RefurbishmentService] No active PARTNER user found for partner ${partnerId}`
        );
        return { notificationId, sentAt };
      }

      const recipientId = partnerUserRows[0].id;

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

      // Get main request details
      const [requestData] = await connection.query(
        `
        SELECT 
          rr.id,
          rr.request_id,
          rr.center_id,
          rr.refurbishment_type,
          rr.status,
          rr.justification,
          rr.admin_remarks,
          rr.rejection_reason,
          rr.approved_at,
          rr.approved_by,
          rr.started_at,
          rr.completed_at,
          rr.completion_statement,
          rr.is_upgradation_requested,
          rr.created_at,
          c.center_name,
          c.center_id AS center_code,
          c.city AS location_city,
          c.state AS location_state,
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

      if (!requestData || requestData.length === 0) {
        throw new Error('Refurbishment request not found');
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
        [requestId]
      );

      // Get partner-uploaded images
      // Note: table has no package_id or attachment_type columns
      const [partnerImages] = await connection.query(
        `
        SELECT 
          id,
          course_id,
          file_url,
          file_name,
          file_size_bytes,
          file_mime_type,
          uploaded_by,
          created_at
        FROM refurbishment_request_course_attachments
        WHERE refurbishment_request_id = ?
        ORDER BY created_at
      `,
        [requestId]
      );

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
        [requestId]
      );

      // Get completion images (if status = completed)
      const [completionImages] = await connection.query(
        `
        SELECT 
          id,
          course_id,
          file_url,
          file_name,
          file_size_bytes,
          file_mime_type,
          uploaded_by,
          created_at
        FROM refurbishment_request_course_attachments
        WHERE refurbishment_request_id = ?
        ORDER BY created_at
      `,
        [requestId]
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
        [requestId]
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
        [requestId]
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
        [requestId]
      );

      // Group partner packages by course
      const packagesByCourse = {};
      partnerPackages.forEach((pkg) => {
        if (!packagesByCourse[pkg.course_id]) {
          packagesByCourse[pkg.course_id] = {
            course_id: pkg.course_id,
            course_name: pkg.course_name,
            packages: [],
          };
        }
        packagesByCourse[pkg.course_id].packages.push(pkg);
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

      // Group images by course (table has no package_id column)
      const imagesByPackage = {};
      partnerImages.forEach((img) => {
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
        images_by_package: imagesByPackage,
        completion_images: completionImages,
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
            courseIds: pkg.courseIds ? pkg.courseIds.split(',') : [],
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
        throw new Error('Refurbishment request not found');
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
   * Get available upgradation packages for a refurbishment request's center,
   * filtered by the courses the center runs.  Also returns the current admin
   * selections so the front-end can pre-tick them.
   *
   * @param {string} requestId - Refurbishment request ID
   * @returns {Promise<Object>} { available_packages, admin_selected_ids }
   */
  static async getUpgradationPackagesForRequest(requestId) {
    const connection = await db.getConnection();
    try {
      // Get center_id for this request
      const [[req]] = await connection.query(
        'SELECT center_id FROM refurbishment_requests WHERE id = ?',
        [requestId]
      );
      if (!req) throw new Error('Refurbishment request not found');

      // Get all courses for this center
      const [centerCourses] = await connection.query(
        `SELECT course_id FROM center_courses WHERE center_id = ?`,
        [req.center_id]
      );
      const centerCourseIds = centerCourses.map((r) => r.course_id);

      // All active upgradation packages (filter by center's courses if any)
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
        WHERE rp.category = 'upgradation'
          AND rp.is_active = 1`;

      const params = [];
      if (centerCourseIds.length > 0) {
        const placeholders = centerCourseIds.map(() => '?').join(',');
        pkgQuery += ` AND (pc.course_id IN (${placeholders}) OR NOT EXISTS (
          SELECT 1 FROM package_courses pc2 WHERE pc2.package_id = rp.id
        ))`;
        params.push(...centerCourseIds);
      }
      pkgQuery += ` GROUP BY rp.id ORDER BY rp.display_order ASC, rp.package_name ASC`;

      const [packages] = await connection.query(pkgQuery, params);

      // Current admin selections for this request
      const [adminSelections] = await connection.query(
        `SELECT package_id FROM refurbishment_upgradation_request_packages
         WHERE refurbishment_request_id = ?`,
        [requestId]
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

      // Verify request exists
      const [[request]] = await connection.query(
        'SELECT id, status FROM refurbishment_requests WHERE id = ?',
        [requestId]
      );
      if (!request) throw new Error('Refurbishment request not found');

      // Delete current admin selections for this request
      await connection.query(
        'DELETE FROM refurbishment_upgradation_request_packages WHERE refurbishment_request_id = ?',
        [requestId]
      );

      // Insert new selections
      for (const pkgId of packageIds) {
        await connection.query(
          `INSERT INTO refurbishment_upgradation_request_packages
             (id, refurbishment_request_id, package_id)
           VALUES (?, ?, ?)`,
          [uuidv4(), requestId, pkgId]
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
  static async approveRefurbishmentRequest(requestId, adminUserId, adminRemarks = null) {
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
        throw new Error('Refurbishment request not found');
      }

      if (request[0].status !== 'submitted') {
        throw new Error(`Cannot approve request with status: ${request[0].status}`);
      }

      const requestData = request[0];

      // Update request status to approved
      await connection.query(
        `
        UPDATE refurbishment_requests
        SET status = 'approved',
            approved_by = ?,
            approved_at = NOW(),
            admin_remarks = ?,
            updated_at = NOW()
        WHERE id = ?
      `,
        [adminUserId, adminRemarks, requestId]
      );

      // Create notification for partner
      const notificationId = uuidv4();
      const requestNumber = requestData.request_number
        ? String(requestData.request_number).toUpperCase()
        : `REF-${requestId.slice(0, 8).toUpperCase()}`;

      // Get partner user ID
      const [partnerUsers] = await connection.query(
        'SELECT id FROM users WHERE partner_id = ? AND role = ? AND status = ? LIMIT 1',
        [requestData.partner_id, 'PARTNER', 'active']
      );

      if (partnerUsers && partnerUsers.length > 0) {
        await connection.query(
          `INSERT INTO notifications (
            id, recipient_id, type, alert_type, title, message,
            related_entity_type, related_entity_id, is_read, created_at
          ) VALUES (?, ?, 'alert', 'refurbishment_approved', ?, ?, 'center', ?, 0, NOW())`,
          [
            notificationId,
            partnerUsers[0].id,
            `Refurbishment Request Approved - ${requestNumber}`,
            `Your refurbishment request for ${requestData.center_name} has been approved by ${admin[0].full_name}.${adminRemarks ? ' Remarks: ' + adminRemarks : ''}`,
            requestData.center_id,
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
          message: `Your refurbishment request for ${requestData.center_name} has been approved by ${admin[0].full_name}.`,
          related_entity_type: 'center',
          related_entity_id: requestData.center_id,
          is_read: false,
          created_at: new Date().toISOString(),
        });
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
        throw new Error('Refurbishment request not found');
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
        throw new Error('Refurbishment request not found');
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

      // Validate completion data
      if (
        !completionData.completion_statement ||
        completionData.completion_statement.trim() === ''
      ) {
        throw new Error('Completion statement is required');
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
        throw new Error('Refurbishment request not found');
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

      // Update status to completed
      await connection.query(
        `
        UPDATE refurbishment_requests
        SET status = 'completed',
            completed_by = ?,
            completed_at = ?,
            completion_statement = ?,
            updated_at = NOW()
        WHERE id = ?
      `,
        [
          adminUserId,
          completionData.completion_date || new Date(),
          completionData.completion_statement,
          requestId,
        ]
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
        await connection.query(
          `INSERT INTO notifications (
            id, recipient_id, type, alert_type, title, message,
            related_entity_type, related_entity_id, is_read, created_at
          ) VALUES (?, ?, 'alert', 'refurbishment_completed', ?, ?, 'center', ?, 0, NOW())`,
          [
            notificationId,
            partnerUsers[0].id,
            `Refurbishment Completed - ${requestNumber}`,
            `The refurbishment work for ${requestData.center_name} has been completed. ${completionData.completion_statement.substring(0, 100)}...`,
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
  static async updateRefurbishmentStatus(requestId, adminUserId, newStatus) {
    const VALID_TRANSITIONS = {
      approved: ['material_procurement'],
      material_procurement: ['installation_in_progress'],
      installation_in_progress: [], // must use completeRefurbishment to → completed
      refurbishment_started: ['installation_in_progress', 'material_procurement'],
    };

    const [admin] = await db.query(
      'SELECT role FROM users WHERE id = ? AND role IN ("ADMIN", "SUPER_ADMIN")',
      [adminUserId]
    );
    if (!admin || admin.length === 0) throw new Error('Unauthorized: Admin access required');

    const [rows] = await db.query('SELECT id, status FROM refurbishment_requests WHERE id = ?', [
      requestId,
    ]);
    if (!rows || rows.length === 0) throw new Error('Refurbishment request not found');

    const current = rows[0].status;
    const allowed = VALID_TRANSITIONS[current] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid transition: ${current} → ${newStatus}`);
    }

    await db.query(
      'UPDATE refurbishment_requests SET status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, requestId]
    );

    console.log(`[RefurbishmentService] Status updated: ${requestId} → ${newStatus}`);
    return { success: true, status: newStatus };
  }

  // ── Partner 2-month completion submission ─────────────────────────────────
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

      // Validate ownership
      const [rows] = await connection.query(
        `SELECT rr.id, rr.status, rr.center_id, c.partner_id
         FROM refurbishment_requests rr
         JOIN centers c ON c.id = rr.center_id
         WHERE rr.id = ?`,
        [requestId]
      );
      if (!rows || rows.length === 0) throw new Error('Request not found');
      if (rows[0].partner_id !== partnerId) throw new Error('Access denied');
      if (rows[0].status === 'completed')
        throw new Error('Admin has already marked this request as completed');
      if (rows[0].status === 'rejected')
        throw new Error('Cannot submit completion for a rejected request');

      // Save description + timestamp
      await connection.query(
        `UPDATE refurbishment_requests
         SET partner_completion_description = ?,
             partner_completed_at           = NOW(),
             updated_at                     = NOW()
         WHERE id = ?`,
        [data.description || '', requestId]
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
              file.name || 'completion_file',
              file.size || null,
              file.type || null,
              data.userId || null,
            ]
          );
        }
      }

      await connection.commit();
      console.log(`[RefurbishmentService] Partner completion submitted for ${requestId}`);
      return { success: true, message: 'Completion report submitted successfully' };
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
}

module.exports = RefurbishmentService;
