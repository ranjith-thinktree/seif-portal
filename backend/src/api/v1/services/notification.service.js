const pool = require('../../../database/connection').pool;

/**
 * Notification Service
 * Handles database operations for notifications
 */

/**
 * Notification types
 */
const NOTIFICATION_TYPES = {
  UPLOAD: 'upload',
  REVIEW: 'review',
  SYSTEM: 'system',
  CENTER_CREATED: 'center_created',
  CENTER_APPROVED: 'center_approved',
};

/**
 * Alert types
 */
const ALERT_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

/**
 * Create notification for user(s)
 */
const createNotification = async (notificationData) => {
  try {
    const {
      recipientId,
      recipientRole,
      type,
      alertType = ALERT_TYPES.INFO,
      title,
      message,
      remark = null,
      payload = null,
      relatedEntityType = null,
      relatedEntityId = null,
      sentVia = 'platform',
    } = notificationData;

    // Generate UUID for notification
    const notificationId = (await pool.query('SELECT UUID() as id'))[0][0].id;

    await pool.query(
      `INSERT INTO notifications 
      (id, recipient_id, recipient_role, type, alert_type, title, message, remark, 
       payload, related_entity_type, related_entity_id, is_read, sent_via, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW())`,
      [
        notificationId,
        recipientId,
        recipientRole,
        type,
        alertType,
        title,
        message,
        remark,
        payload ? JSON.stringify(payload) : null,
        relatedEntityType,
        relatedEntityId,
        sentVia,
      ]
    );

    // Fetch the created notification
    const [notifications] = await pool.query('SELECT * FROM notifications WHERE id = ?', [
      notificationId,
    ]);

    return notifications[0];
  } catch (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }
};

/**
 * Create notifications for multiple users
 */
const createBulkNotifications = async (recipientIds, notificationData) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const notifications = [];

    for (const recipientId of recipientIds) {
      // Generate UUID for each notification
      const notificationId = (await connection.query('SELECT UUID() as id'))[0][0].id;

      await connection.query(
        `INSERT INTO notifications 
        (id, recipient_id, recipient_role, type, alert_type, title, message, remark, 
         payload, related_entity_type, related_entity_id, is_read, sent_via, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW())`,
        [
          notificationId,
          recipientId,
          notificationData.recipientRole,
          notificationData.type,
          notificationData.alertType || ALERT_TYPES.INFO,
          notificationData.title,
          notificationData.message,
          notificationData.remark || null,
          notificationData.payload ? JSON.stringify(notificationData.payload) : null,
          notificationData.relatedEntityType || null,
          notificationData.relatedEntityId || null,
          notificationData.sentVia || 'platform',
        ]
      );

      notifications.push({ id: notificationId, recipientId });
    }

    await connection.commit();

    return notifications;
  } catch (error) {
    await connection.rollback();
    throw new Error(`Failed to create bulk notifications: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * Get notifications for user with pagination and filters
 */
const getUserNotifications = async (userId, role, filters = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      isRead,
      search,
      days = 180,
      status,
      sortBy = 'newest',
    } = filters;
    const offset = (page - 1) * limit;

    // Filter by recipient_id and optionally by recipient_role
    // This handles cases where recipient_role might be NULL
    let whereClause = 'WHERE (recipient_id = ? OR (recipient_role = ? AND recipient_id IS NULL))';
    const params = [userId, role];

    // Filter by date (last 180 days)
    whereClause += ' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
    params.push(days);

    // Filter by type
    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    // Filter by read status
    if (isRead !== undefined) {
      whereClause += ' AND is_read = ?';
      params.push(isRead ? 1 : 0);
    }

    // Filter by status (alert_type or check payload for status)
    if (status && status !== 'all') {
      if (status === 'approved') {
        whereClause += ' AND (alert_type = ? OR JSON_EXTRACT(payload, "$.status") = ?)';
        params.push('data_approval', 'approved');
      } else if (status === 'rejected') {
        whereClause += ' AND (alert_type = ? OR JSON_EXTRACT(payload, "$.status") = ?)';
        params.push('data_reject', 'rejected');
      } else if (status === 'pending') {
        whereClause +=
          ' AND (JSON_EXTRACT(payload, "$.status") = ? OR (JSON_EXTRACT(payload, "$.status") IS NULL AND alert_type = ?))';
        params.push('pending', 'info');
      }
    }

    // Search in title or message
    if (search && search.trim()) {
      whereClause += ' AND (title LIKE ? OR message LIKE ?)';
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern);
    }

    // Determine sort order
    let orderByClause = 'ORDER BY created_at DESC';
    if (sortBy === 'oldest') {
      orderByClause = 'ORDER BY created_at ASC';
    } else if (sortBy === 'status') {
      orderByClause = 'ORDER BY alert_type DESC, created_at DESC';
    }

    // Get notifications
    const [notifications] = await pool.query(
      `SELECT 
        id, recipient_id, recipient_role, type, alert_type, title, message, 
        remark, payload, related_entity_type, related_entity_id, is_read, 
        read_at, sent_via, email_sent_at, created_at
      FROM notifications
      ${whereClause}
      ${orderByClause}
      LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    // Get total count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
      params
    );

    // Parse payload JSON
    const parsedNotifications = notifications.map((notif) => ({
      ...notif,
      payload: notif.payload ? JSON.parse(notif.payload) : null,
      is_read: Boolean(notif.is_read),
    }));

    return {
      notifications: parsedNotifications,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`);
  }
};

/**
 * Get unread notification count
 */
const getUnreadCount = async (userId, role) => {
  try {
    const [result] = await pool.query(
      `SELECT COUNT(*) as count 
      FROM notifications 
      WHERE (recipient_id = ? OR (recipient_role = ? AND recipient_id IS NULL)) AND is_read = 0 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 180 DAY)`,
      [userId, role]
    );

    return result[0].count;
  } catch (error) {
    throw new Error(`Failed to get unread count: ${error.message}`);
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId, role) => {
  try {
    const [result] = await pool.query(
      `UPDATE notifications 
      SET is_read = 1, read_at = NOW() 
      WHERE id = ? AND (recipient_id = ? OR (recipient_role = ? AND recipient_id IS NULL))`,
      [notificationId, userId, role]
    );

    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId, role) => {
  try {
    const [result] = await pool.query(
      `UPDATE notifications 
      SET is_read = 1, read_at = NOW() 
      WHERE (recipient_id = ? OR (recipient_role = ? AND recipient_id IS NULL)) AND is_read = 0`,
      [userId, role]
    );

    return result.affectedRows;
  } catch (error) {
    throw new Error(`Failed to mark all notifications as read: ${error.message}`);
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId, userId, role) => {
  try {
    const [result] = await pool.query(
      `DELETE FROM notifications 
      WHERE id = ? AND (recipient_id = ? OR (recipient_role = ? AND recipient_id IS NULL))`,
      [notificationId, userId, role]
    );

    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Failed to delete notification: ${error.message}`);
  }
};

/**
 * Get notification by ID
 */
const getNotificationById = async (notificationId, userId, role) => {
  try {
    const [notifications] = await pool.query(
      `SELECT 
        id, recipient_id, recipient_role, type, alert_type, title, message, 
        remark, payload, related_entity_type, related_entity_id, is_read, 
        read_at, sent_via, email_sent_at, created_at
      FROM notifications
      WHERE id = ? AND (recipient_id = ? OR (recipient_role = ? AND recipient_id IS NULL))`,
      [notificationId, userId, role]
    );

    if (notifications.length === 0) {
      return null;
    }

    const notification = notifications[0];
    return {
      ...notification,
      payload: notification.payload ? JSON.parse(notification.payload) : null,
      is_read: Boolean(notification.is_read),
    };
  } catch (error) {
    throw new Error(`Failed to fetch notification: ${error.message}`);
  }
};

/**
 * Create upload notification for admins
 */
const createUploadNotification = async (uploadData) => {
  try {
    const { uploadId, partnerId, partnerName, fileName, totalRecords } = uploadData;

    // Get all admin users
    const [admins] = await pool.query(
      "SELECT id FROM users WHERE role IN ('ADMIN', 'SUPER_ADMIN') AND status = 'active'"
    );

    if (admins.length === 0) {
      return [];
    }

    const adminIds = admins.map((admin) => admin.id);

    const notificationData = {
      recipientRole: 'admin',
      type: NOTIFICATION_TYPES.UPLOAD,
      alertType: ALERT_TYPES.INFO,
      title: 'New Data Upload',
      message: `${partnerName} has uploaded a new data file: ${fileName} (${totalRecords} records)`,
      remark: 'Requires review and approval',
      payload: {
        uploadId,
        partnerId,
        partnerName,
        fileName,
        totalRecords,
      },
      relatedEntityType: 'data_upload',
      relatedEntityId: uploadId,
      sentVia: 'platform',
    };

    const notifications = await createBulkNotifications(adminIds, notificationData);

    return notifications;
  } catch (error) {
    console.error('Failed to create upload notification:', error.message);
    return [];
  }
};

/**
 * Create review notification for partner
 */
const createReviewNotification = async (reviewData) => {
  try {
    const { uploadId, partnerId, partnerName, fileName, status, reviewerName, remarks } =
      reviewData;

    // Get partner user ID
    const [partners] = await pool.query(
      "SELECT id FROM users WHERE partner_id = ? AND role = ? AND status = 'active' LIMIT 1",
      [partnerId, 'PARTNER']
    );

    if (partners.length === 0) {
      return null;
    }

    const statusText = status === 'approved' ? 'approved' : 'rejected';
    const alertType = status === 'approved' ? ALERT_TYPES.SUCCESS : ALERT_TYPES.ERROR;

    const notificationData = {
      recipientId: partners[0].id,
      recipientRole: 'partner',
      type: NOTIFICATION_TYPES.REVIEW,
      alertType,
      title: `Upload ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
      message: `Your upload "${fileName}" has been ${statusText} by ${reviewerName}`,
      remark: remarks || null,
      payload: {
        uploadId,
        status,
        reviewerName,
        remarks,
      },
      relatedEntityType: 'data_upload',
      relatedEntityId: uploadId,
      sentVia: 'platform',
    };

    const notification = await createNotification(notificationData);

    return notification;
  } catch (error) {
    console.error('Failed to create review notification:', error.message);
    return null;
  }
};

/**
 * Get grouped notifications by upload_id
 * Groups multiple center notifications from same upload into one
 */
const getGroupedNotifications = async (userId, role, filters = {}) => {
  try {
    const { page = 1, limit = 20, search, days = 180, status, sortBy = 'newest' } = filters;
    const offset = (page - 1) * limit;

    // Build where clause
    let whereClause =
      'WHERE (n.recipient_id = ? OR (n.recipient_role = ? AND n.recipient_id IS NULL))';
    const params = [userId, role];

    whereClause += ' AND n.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
    params.push(days);

    if (search && search.trim()) {
      whereClause += ' AND (n.title LIKE ? OR n.message LIKE ?)';
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern);
    }

    // Get center notifications (individual, not grouped)
    const centerQuery = `
      SELECT 
        n.id,
        n.related_entity_id as center_id,
        n.created_at,
        n.type,
        n.alert_type,
        n.title,
        n.message,
        n.remark,
        n.is_read,
        n.payload,
        'center' as notification_type
      FROM notifications n
      ${whereClause}
        AND n.related_entity_type = 'center'
        AND n.type IN ('center_created', 'center_approved')
      ORDER BY n.created_at ${sortBy === 'oldest' ? 'ASC' : 'DESC'}
    `;

    // Get grouped upload notifications
    const uploadQuery = `
      SELECT 
        n.related_entity_id as upload_id,
        MAX(n.id) as latest_notification_id,
        MAX(n.created_at) as latest_created_at,
        COUNT(DISTINCT uc.id) as total_centers,
        SUM(CASE WHEN uc.review_status = 'approved' THEN 1 ELSE 0 END) as approved_centers,
        SUM(CASE WHEN uc.review_status = 'rejected' THEN 1 ELSE 0 END) as rejected_centers,
        SUM(CASE WHEN uc.review_status = 'pending' THEN 1 ELSE 0 END) as pending_centers,
        MAX(n.is_read) as is_read,
        (SELECT n2.payload FROM notifications n2 WHERE n2.related_entity_id = n.related_entity_id LIMIT 1) as payload_json,
        du.version,
        du.parent_upload_id,
        'upload' as notification_type
      FROM notifications n
      LEFT JOIN uploaded_centers uc ON uc.data_upload_id = n.related_entity_id
      LEFT JOIN data_uploads du ON du.id = n.related_entity_id
      ${whereClause}
        AND n.related_entity_type = 'data_upload'
        AND n.type IN ('upload', 'review')
      GROUP BY n.related_entity_id, du.version, du.parent_upload_id
      ORDER BY latest_created_at ${sortBy === 'oldest' ? 'ASC' : 'DESC'}
    `;

    // Execute both queries
    const [centerNotifications] = await pool.query(centerQuery, params);
    const [uploadGroupedResults] = await pool.query(uploadQuery, params);

    // Process center notifications (simple format)
    const processedfCenterNotifications = centerNotifications.map((notif) => {
      const payload = notif.payload ? JSON.parse(notif.payload) : {};
      return {
        id: notif.id,
        center_id: notif.center_id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        remark: notif.remark,
        alert_type: notif.alert_type,
        is_read: Boolean(notif.is_read),
        created_at: notif.created_at,
        related_entity_type: 'center',
        related_entity_id: notif.center_id,
        notification_type: 'center',
        payload: {
          ...payload,
          actionUrl: payload.actionUrl || '/review/pending-centers',
        },
      };
    });

    // Process each grouped upload notification with actual status across versions
    const processedUploadNotifications = await Promise.all(
      uploadGroupedResults.map(async (group) => {
        // Get actual current status across all versions
        const actualStatus = await getActualCenterStatus(group.upload_id);

        console.log(`📊 Notification for upload ${group.upload_id} (v${group.version}):`, {
          originalCounts: {
            approved: group.approved_centers,
            rejected: group.rejected_centers,
            pending: group.pending_centers,
          },
          actualStatus,
        });

        const totalCenters = actualStatus.total || 0;
        const approved = actualStatus.approved || 0;
        const rejected = actualStatus.rejected || 0;
        const pending = actualStatus.pending || 0;

        // Determine aggregated status based on ACTUAL current status
        let aggregatedStatus = 'pending';
        let alertType = 'info';

        if (totalCenters > 0) {
          if (approved === totalCenters) {
            aggregatedStatus = 'approved';
            alertType = 'success';
          } else if (rejected === totalCenters) {
            aggregatedStatus = 'rejected';
            alertType = 'error';
          } else if (approved > 0 && (rejected > 0 || pending > 0)) {
            aggregatedStatus = 'partial_approved';
            alertType = 'warning';
          } else if (pending === totalCenters) {
            aggregatedStatus = 'pending';
            alertType = 'info';
          }
        }

        const payload = group.payload_json ? JSON.parse(group.payload_json) : {};
        const partnerName = payload.partnerName || 'Partner';
        const fileName = payload.fileName || 'Data Upload';

        return {
          id: group.latest_notification_id,
          upload_id: group.upload_id,
          title: `Data Upload: ${totalCenters} centers (${approved} approved, ${rejected} rejected, ${pending} pending)`,
          message: `${partnerName} uploaded ${fileName}`,
          alert_type: alertType,
          aggregated_status: aggregatedStatus,
          total_centers: totalCenters,
          approved_centers: approved,
          rejected_centers: rejected,
          pending_centers: pending,
          is_read: Boolean(group.is_read),
          created_at: group.latest_created_at,
          version: group.version || 1,
          parent_upload_id: group.parent_upload_id,
          related_entity_type: 'data_upload',
          related_entity_id: group.upload_id,
          notification_type: 'upload',
          payload: {
            ...payload,
            uploadId: group.upload_id,
            totalCenters,
            approvedCenters: approved,
            rejectedCenters: rejected,
            pendingCenters: pending,
          },
        };
      })
    );

    // Merge center and upload notifications, sort by created_at
    const allNotifications = [...processedfCenterNotifications, ...processedUploadNotifications];
    allNotifications.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
    });

    // Apply status filter if provided
    let filteredNotifications = allNotifications;
    if (status && status !== 'all') {
      filteredNotifications = allNotifications.filter((notif) => {
        return notif.aggregated_status === status || notif.alert_type === status;
      });
    }

    // Apply pagination
    const paginatedNotifications = filteredNotifications.slice(offset, offset + limit);

    return {
      notifications: paginatedNotifications,
      pagination: {
        page,
        limit,
        total: filteredNotifications.length,
        totalPages: Math.ceil(filteredNotifications.length / limit),
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch grouped notifications: ${error.message}`);
  }
};

/**
 * Get actual current status of centers across all versions
 * If a center was rejected in V1 but approved in V2, return 'approved'
 * This checks the ENTIRE version chain (parent + all children)
 */
const getActualCenterStatus = async (uploadId) => {
  try {
    const [uploadInfo] = await pool.query(
      'SELECT version, parent_upload_id FROM data_uploads WHERE id = ?',
      [uploadId]
    );

    if (uploadInfo.length === 0) {
      return { approved: 0, rejected: 0, pending: 0, total: 0 };
    }

    const upload = uploadInfo[0];

    // Determine the root upload ID (could be this upload or its parent)
    const rootUploadId = upload.parent_upload_id || uploadId;

    // Get ALL uploads in this version chain (root + all children)
    const [allVersions] = await pool.query(
      `SELECT id FROM data_uploads 
       WHERE id = ? OR parent_upload_id = ?
       ORDER BY version ASC`,
      [rootUploadId, rootUploadId]
    );

    if (allVersions.length === 0) {
      return { approved: 0, rejected: 0, pending: 0, total: 0 };
    }

    const uploadIds = allVersions.map((v) => v.id);

    // Get center statuses grouped by csv_center_id (logical center across versions)
    const [centerStatuses] = await pool.query(
      `SELECT 
        csv_center_id,
        MAX(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as ever_approved,
        MAX(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as ever_rejected,
        MAX(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as has_pending
       FROM uploaded_centers
       WHERE data_upload_id IN (?)
       GROUP BY csv_center_id`,
      [uploadIds]
    );

    let approved = 0;
    let rejected = 0;
    let pending = 0;

    centerStatuses.forEach((center) => {
      // If ever approved (even in later version), count as approved
      if (center.ever_approved === 1) {
        approved++;
      }
      // If never approved but has pending version, count as pending
      else if (center.has_pending === 1) {
        pending++;
      }
      // If never approved and only rejected, count as rejected
      else if (center.ever_rejected === 1) {
        rejected++;
      }
    });

    return {
      approved,
      rejected,
      pending,
      total: centerStatuses.length,
    };
  } catch (error) {
    console.error('Error in getActualCenterStatus:', error);
    return { approved: 0, rejected: 0, pending: 0, total: 0 };
  }
};

/**
 * Get detailed center list for a grouped notification with actual status across versions
 */
const getUploadCenterDetails = async (uploadId, userId, role) => {
  try {
    // Verify user has access to this upload
    const [uploads] = await pool.query(
      `SELECT du.* FROM data_uploads du
       JOIN users u ON (du.partner_id = u.partner_id OR u.role IN ('ADMIN', 'SUPER_ADMIN'))
       WHERE du.id = ? AND u.id = ?`,
      [uploadId, userId]
    );

    if (uploads.length === 0) {
      throw new Error('Upload not found or access denied');
    }

    const upload = uploads[0];

    // Determine the root upload ID to get all version centers
    const rootUploadId = upload.parent_upload_id || uploadId;

    // Get ALL uploads in this version chain
    const [allVersions] = await pool.query(
      `SELECT id FROM data_uploads 
       WHERE id = ? OR parent_upload_id = ?
       ORDER BY version ASC`,
      [rootUploadId, rootUploadId]
    );

    const uploadIds = allVersions.map((v) => v.id);

    // Get all centers across all versions with their actual status
    const [allCenters] = await pool.query(
      `SELECT 
        uc.csv_center_id,
        MAX(uc.id) as id,
        MAX(uc.center_name) as center_name,
        MAX(uc.city) as city,
        MAX(uc.state) as state,
        MAX(uc.rejection_reason) as rejection_reason,
        MAX(uc.reviewed_at) as reviewed_at,
        MAX(uc.approved_center_id) as approved_center_id,
        MAX(CASE WHEN uc.review_status = 'approved' THEN 1 ELSE 0 END) as ever_approved,
        MAX(CASE WHEN uc.review_status = 'rejected' THEN 1 ELSE 0 END) as ever_rejected,
        MAX(CASE WHEN uc.review_status = 'pending' THEN 1 ELSE 0 END) as has_pending,
        (SELECT COUNT(*) FROM uploaded_students us 
         WHERE us.uploaded_center_id IN (
           SELECT id FROM uploaded_centers WHERE csv_center_id = uc.csv_center_id AND data_upload_id IN (?)
         )) as student_count
       FROM uploaded_centers uc
       WHERE uc.data_upload_id IN (?)
       GROUP BY uc.csv_center_id
       ORDER BY center_name ASC`,
      [uploadIds, uploadIds]
    );

    // Determine actual current status for each center
    const centersWithActualStatus = allCenters.map((center) => {
      let actualStatus = 'pending';

      if (center.ever_approved === 1) {
        actualStatus = 'approved';
      } else if (center.has_pending === 1) {
        actualStatus = 'pending';
      } else if (center.ever_rejected === 1) {
        actualStatus = 'rejected';
      }

      return {
        id: center.id,
        center_name: center.center_name,
        city: center.city,
        state: center.state,
        review_status: actualStatus,
        rejection_reason: center.rejection_reason,
        reviewed_at: center.reviewed_at,
        approved_center_id: center.approved_center_id,
        student_count: center.student_count || 0,
      };
    });

    return {
      upload: uploads[0],
      centers: centersWithActualStatus,
    };
  } catch (error) {
    throw new Error(`Failed to fetch upload center details: ${error.message}`);
  }
};

/**
 * Send notification to all admins
 */
const sendNotificationToAdmins = async (notificationData) => {
  try {
    // Get all admin and super admin users
    const [admins] = await pool.query(
      `SELECT id FROM users WHERE role IN ('ADMIN', 'SUPER_ADMIN') AND status = 'active'`
    );

    if (admins.length === 0) {
      console.warn('No active admins found to send notification');
      return [];
    }

    const adminIds = admins.map((admin) => admin.id);

    // Create notifications for all admins
    return await createBulkNotifications(adminIds, {
      recipientRole: 'ADMIN',
      ...notificationData,
    });
  } catch (error) {
    throw new Error(`Failed to send notification to admins: ${error.message}`);
  }
};

/**
 * Notify admins when partner creates a new center
 */
const notifyAdminsAboutNewCenter = async (centerId, partnerId) => {
  try {
    console.log('🔔 Starting notification for center:', centerId, 'partner:', partnerId);

    // Get center details
    const [centers] = await pool.query(
      `SELECT c.*, p.name as partner_name 
       FROM centers c 
       LEFT JOIN partners p ON c.partner_id = p.id 
       WHERE c.id = ?`,
      [centerId]
    );

    if (centers.length === 0) {
      console.warn('⚠️ Center not found for notification:', centerId);
      return { success: false, error: 'Center not found' };
    }

    const center = centers[0];
    console.log('📋 Center details:', { name: center.center_name, partner: center.partner_name });

    const result = await sendNotificationToAdmins({
      type: NOTIFICATION_TYPES.CENTER_CREATED,
      alertType: ALERT_TYPES.INFO,
      title: '🏢 New Center Pending Approval',
      message: `Partner "${center.partner_name}" created center "${center.center_name}" - Review Required`,
      remark: `${center.center_name} | ${center.city}, ${center.state}`,
      relatedEntityType: 'center',
      relatedEntityId: centerId,
      payload: {
        centerId,
        partnerId,
        centerName: center.center_name,
        partnerName: center.partner_name,
        city: center.city,
        state: center.state,
        actionUrl: '/review/pending-centers',
      },
    });

    console.log('✅ Notification result:', result);
    return { success: true, count: result?.length || 0 };
  } catch (error) {
    console.error('❌ Error notifying admins about new center:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Notify partner when their center is approved
 */
const notifyPartnerAboutCenterApproval = async (centerId, partnerId) => {
  try {
    // Get center and partner details
    const [centers] = await pool.query(
      `SELECT c.*, p.name as partner_name, p.contact_email 
       FROM centers c 
       LEFT JOIN partners p ON c.partner_id = p.id 
       WHERE c.id = ?`,
      [centerId]
    );

    if (centers.length === 0) return;

    const center = centers[0];

    // Get partner user
    const [users] = await pool.query(
      'SELECT id FROM users WHERE partner_id = ? AND role = "PARTNER" LIMIT 1',
      [partnerId]
    );

    if (users.length === 0) return;

    const userId = users[0].id;

    // Create in-app notification
    await createNotification({
      recipientId: userId,
      recipientRole: 'PARTNER',
      type: NOTIFICATION_TYPES.CENTER_APPROVED,
      alertType: ALERT_TYPES.SUCCESS,
      title: '✅ Center Approved',
      message: `Your center "${center.center_name}" has been approved and is now active.`,
      remark: `You can now upload student data for this center.`,
      relatedEntityType: 'center',
      relatedEntityId: centerId,
      payload: {
        centerId,
        centerName: center.center_name,
        city: center.city,
        state: center.state,
      },
    });

    // Send email notification
    const emailService = require('../../../utils/email.util');
    await emailService.sendCenterApprovalEmail({
      email: center.contact_email,
      name: center.partner_name,
      centerName: center.center_name,
      centerCode: center.center_code || center.id.substring(0, 8).toUpperCase(),
    });

    return true;
  } catch (error) {
    console.error('Error notifying partner about center approval:', error);
    // Don't throw - notification failure shouldn't break approval
  }
};

module.exports = {
  NOTIFICATION_TYPES,
  ALERT_TYPES,
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationById,
  createUploadNotification,
  createReviewNotification,
  getGroupedNotifications,
  getUploadCenterDetails,
  getActualCenterStatus,
  sendNotificationToAdmins,
  notifyAdminsAboutNewCenter,
  notifyPartnerAboutCenterApproval,
};
