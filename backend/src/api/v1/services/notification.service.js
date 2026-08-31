const pool = require('../../../database/connection').pool;
const { emitToRole } = require('../../../websocket/socket');

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

const ADMIN_FAMILY = ['ADMIN', 'SUPER_ADMIN'];

const normalizeRole = (role) => String(role || '').trim().toUpperCase();

/**
 * Roles that may see notifications stored for a given user role.
 * ADMIN and SUPER_ADMIN share admin-targeted inbox items.
 */
const getVisibleRoleAliases = (role) => {
  const normalized = normalizeRole(role);
  if (ADMIN_FAMILY.includes(normalized)) {
    return [...ADMIN_FAMILY];
  }
  if (normalized === 'SEIF_READONLY' || normalized === 'SEIF_READONLY_DOWNLOAD') {
    return ['SEIF_READONLY', 'SEIF_READONLY_DOWNLOAD'];
  }
  return normalized ? [normalized] : [];
};

/**
 * Inbox rows this user is allowed to see:
 * - personal: recipient_id = user, and role is unset or in their role family
 * - broadcast: recipient_id is null and recipient_role is in their role family
 */
const buildRecipientVisibility = (userId, role, alias = '') => {
  const prefix = alias ? `${alias}.` : '';
  const aliases = getVisibleRoleAliases(role);
  const normalized = normalizeRole(role);
  const seesAllCertificateReady =
    ADMIN_FAMILY.includes(normalized) ||
    normalized === 'ESSCI' ||
    normalized === 'SEIF_READONLY' ||
    normalized === 'SEIF_READONLY_DOWNLOAD';

  const certificateReadyClause = seesAllCertificateReady
    ? ` OR ${prefix}type = 'certificate_ready'`
    : '';

  if (aliases.length === 0) {
    return {
      clause: `(${prefix}recipient_id = ?${certificateReadyClause})`,
      params: [userId],
    };
  }

  const placeholders = aliases.map(() => '?').join(', ');
  return {
    clause: `(
      (${prefix}recipient_id = ?
        AND (${prefix}recipient_role IS NULL OR UPPER(${prefix}recipient_role) IN (${placeholders})))
      OR
      (${prefix}recipient_id IS NULL AND UPPER(${prefix}recipient_role) IN (${placeholders}))
      ${certificateReadyClause}
    )`,
    params: [userId, ...aliases, ...aliases],
  };
};

const buildInboxVisibilityClause = (role, alias = '') => {
  const prefix = alias ? `${alias}.` : '';
  const normalized = normalizeRole(role);

  if (ADMIN_FAMILY.includes(normalized)) {
    return ` AND (${prefix}alert_type NOT LIKE 'refurbishment%' OR ${prefix}alert_type IS NULL)`;
  }

  return '';
};

const buildPartnerFacingCertHideClause = (role, alias = '') => {
  const prefix = alias ? `${alias}.` : '';
  const normalized = normalizeRole(role);
  // Partner-copy certification alerts must never appear on admin/ESSCI/readonly inboxes
  if (
    ADMIN_FAMILY.includes(normalized) ||
    normalized === 'ESSCI' ||
    normalized === 'SEIF_READONLY' ||
    normalized === 'SEIF_READONLY_DOWNLOAD'
  ) {
    return ` AND NOT (
      ${prefix}type IN (
        'certification_submitted',
        'certification_approved',
        'certification_rejected',
        'certification_essci_step1'
      )
      AND LOWER(COALESCE(${prefix}alert_type, '')) IN ('success', 'sent', 'error')
    )`;
  }
  return '';
};

const inboxDedupeKey = (item) => {
  const entityType = item.related_entity_type || item.notification_type || '';
  const entityId = item.related_entity_id || item.upload_id || item.center_id || '';
  const kind = item.type || item.notification_type || '';
  if (entityType && entityId) {
    return `${entityType}|${entityId}|${kind}`;
  }
  return item.id;
};

const preferInboxNotification = (current, candidate, role) => {
  const normalized = normalizeRole(role);
  const score = (item) => {
    const tag = String(item.alert_type || '').toLowerCase();
    if (normalized === 'PARTNER' || normalized === 'ESSCI') {
      return tag === 'info' ? 0 : 1;
    }
    if (ADMIN_FAMILY.includes(normalized)) {
      return tag === 'info' ? 1 : 0;
    }
    return 0;
  };

  const currentScore = score(current);
  const candidateScore = score(candidate);
  if (candidateScore !== currentScore) {
    return candidateScore > currentScore ? candidate : current;
  }

  return new Date(candidate.created_at) > new Date(current.created_at) ? candidate : current;
};

const dedupeInboxNotifications = (items, role) => {
  const seen = new Map();
  items.forEach((item) => {
    const key = inboxDedupeKey(item);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, item);
      return;
    }
    seen.set(key, preferInboxNotification(existing, item, role));
  });
  return Array.from(seen.values());
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
      related_entity_type: relatedEntityTypeSnake = null,
      related_entity_id: relatedEntityIdSnake = null,
      target_role: targetRole = null,
    } = notificationData;

    const resolvedRecipientRole = normalizeRole(recipientRole || targetRole) || null;
    const resolvedRelatedEntityType = relatedEntityType || relatedEntityTypeSnake || null;
    const resolvedRelatedEntityId = relatedEntityId || relatedEntityIdSnake || null;

    // Generate UUID for notification
    const notificationId = (await pool.query('SELECT UUID() as id'))[0][0].id;

    await pool.query(
      `INSERT INTO notifications 
      (id, recipient_id, recipient_role, type, alert_type, title, message, remark, 
       payload, related_entity_type, related_entity_id, is_read, sent_via, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW())`,
      [
        notificationId,
        recipientId || null,
        resolvedRecipientRole,
        type,
        alertType,
        title,
        message,
        remark,
        payload ? JSON.stringify(payload) : null,
        resolvedRelatedEntityType,
        resolvedRelatedEntityId,
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
          normalizeRole(notificationData.recipientRole) || null,
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

    const visibility = buildRecipientVisibility(userId, role);
    let whereClause = `WHERE ${visibility.clause}`;
    const params = [...visibility.params];

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

    // Hide admin-only refurbishment alerts from the generic inbox list
    whereClause += buildInboxVisibilityClause(role);
    whereClause += buildPartnerFacingCertHideClause(role);

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
    const visibility = buildRecipientVisibility(userId, role);
    const inboxVisibilityClause =
      buildInboxVisibilityClause(role) + buildPartnerFacingCertHideClause(role);
    const [result] = await pool.query(
      `SELECT COUNT(*) as count 
      FROM notifications 
      WHERE ${visibility.clause} AND is_read = 0 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 180 DAY)
        ${inboxVisibilityClause}`,
      visibility.params
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
    const visibility = buildRecipientVisibility(userId, role);
    const [result] = await pool.query(
      `UPDATE notifications 
      SET is_read = 1, read_at = NOW() 
      WHERE id = ? AND ${visibility.clause}`,
      [notificationId, ...visibility.params]
    );

    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
};

/**
 * Mark notification as unread
 */
const markAsUnread = async (notificationId, userId, role) => {
  try {
    const visibility = buildRecipientVisibility(userId, role);
    const [result] = await pool.query(
      `UPDATE notifications
      SET is_read = 0, read_at = NULL
      WHERE id = ? AND ${visibility.clause}`,
      [notificationId, ...visibility.params]
    );

    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Failed to mark notification as unread: ${error.message}`);
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId, role) => {
  try {
    const visibility = buildRecipientVisibility(userId, role);
    const [result] = await pool.query(
      `UPDATE notifications 
      SET is_read = 1, read_at = NOW() 
      WHERE ${visibility.clause} AND is_read = 0`,
      visibility.params
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
    const visibility = buildRecipientVisibility(userId, role);
    const [result] = await pool.query(
      `DELETE FROM notifications 
      WHERE id = ? AND ${visibility.clause}`,
      [notificationId, ...visibility.params]
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
    const visibility = buildRecipientVisibility(userId, role);
    const [notifications] = await pool.query(
      `SELECT 
        id, recipient_id, recipient_role, type, alert_type, title, message, 
        remark, payload, related_entity_type, related_entity_id, is_read, 
        read_at, sent_via, email_sent_at, created_at
      FROM notifications
      WHERE id = ? AND ${visibility.clause}`,
      [notificationId, ...visibility.params]
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
    const { uploadId, partnerId, partnerName, fileName, totalRecords, entityType } = uploadData;

    const { getActiveAdminIds } = require('../../../services/emailDispatch.service');
    const adminIds = await getActiveAdminIds();

    if (adminIds.length === 0) {
      return [];
    }

    const resolvedEntityType = entityType || 'data_upload';
    const titlePrefixMap = {
      employment_upload: 'Employment ',
      tot_upload: 'TOT ',
    };
    const titlePrefix = titlePrefixMap[resolvedEntityType] || '';

    const notificationData = {
      recipientRole: 'ADMIN',
      type: NOTIFICATION_TYPES.UPLOAD,
      alertType: ALERT_TYPES.INFO,
      title: `New ${titlePrefix}Data Upload`,
      message: `${partnerName} has uploaded a new data file: ${fileName} (${totalRecords} records)`,
      remark: 'Requires review and approval',
      payload: {
        uploadId,
        partnerId,
        partnerName,
        fileName,
        totalRecords,
      },
      relatedEntityType: resolvedEntityType,
      relatedEntityId: uploadId,
      sentVia: 'platform',
    };

    const notifications = await createBulkNotifications(adminIds, notificationData);

    try {
      const { fireEmail } = require('../../../services/emailDispatch.service');
      const emailKey =
        resolvedEntityType === 'employment_upload'
          ? 'employment.new_admin'
          : resolvedEntityType === 'tot_upload'
            ? 'tot.new_admin'
            : 'trainee.new_admin';
      fireEmail(emailKey, { partnerName }, { audience: 'admin' });
    } catch (emailErr) {
      console.warn('[email] upload notification email skipped:', emailErr.message);
    }

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
    const {
      uploadId,
      partnerId,
      partnerName,
      fileName,
      status,
      reviewerName,
      remarks,
      entityType,
    } = reviewData;

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
    const resolvedEntityType = entityType || 'data_upload';
    const titlePrefix = resolvedEntityType === 'employment_upload' ? 'Employment ' : '';

    const notificationData = {
      recipientId: partners[0].id,
      recipientRole: 'PARTNER',
      type: NOTIFICATION_TYPES.REVIEW,
      alertType,
      title: `${titlePrefix}Upload ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
      message: `Your upload "${fileName}" has been ${statusText} by ${reviewerName}`,
      remark: remarks || null,
      payload: {
        uploadId,
        status,
        reviewerName,
        remarks,
      },
      relatedEntityType: resolvedEntityType,
      relatedEntityId: uploadId,
      sentVia: 'platform',
    };

    const notification = await createNotification(notificationData);

    try {
      const { fireEmail } = require('../../../services/emailDispatch.service');
      const approved = status === 'approved';
      let emailKey = approved ? 'trainee.approved_partner' : 'trainee.rejected_partner';
      if (resolvedEntityType === 'employment_upload') {
        emailKey = approved ? 'employment.approved_partner' : 'employment.rejected_partner';
      } else if (resolvedEntityType === 'tot_upload') {
        emailKey = approved ? 'tot.approved_partner' : 'tot.rejected_partner';
      }
      fireEmail(emailKey, { partnerName }, { audience: 'partner', partnerId });
    } catch (emailErr) {
      console.warn('[email] review notification email skipped:', emailErr.message);
    }

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
    const normalizedRole = normalizeRole(role);
    const inboxVisibilityClause =
      buildInboxVisibilityClause(normalizedRole, 'n') +
      buildPartnerFacingCertHideClause(normalizedRole, 'n');
    const visibility = buildRecipientVisibility(userId, role, 'n');

    let whereClause = `WHERE ${visibility.clause}`;
    const params = [...visibility.params];

    whereClause += ' AND n.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
    params.push(days);

    if (search && search.trim()) {
      whereClause += ' AND (n.title LIKE ? OR n.message LIKE ?)';
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern);
    }

    // Get center notifications (individual, not grouped)
    // Excludes refurbishment notifications — those are shown only in the Refurbishment > Alerts tab
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
        ${inboxVisibilityClause}
        AND n.related_entity_type = 'center'
        AND n.type IN ('center_created', 'center_approved', 'alert')
        AND (n.alert_type NOT LIKE 'refurbishment%' OR n.alert_type IS NULL)
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
        ${inboxVisibilityClause}
        AND n.related_entity_type = 'data_upload'
        AND n.type IN ('upload', 'review', 'approval', 'rejection')
      GROUP BY n.related_entity_id, du.version, du.parent_upload_id
      ORDER BY latest_created_at ${sortBy === 'oldest' ? 'ASC' : 'DESC'}
    `;

    // Refurbishment-specific notifications query (all alert_type LIKE 'refurbishment%')
    // Covers: eligibility alerts, new request, approved, rejected, completed, response
    // For 'refurbishment' exact-match (action-required) notifications, we join
    // refurbishment_requests to detect whether the partner already submitted.
    // For acknowledgment alerts we join by request id to detect partner_completed_at.
    const refurbishmentQuery = `
      SELECT 
        n.id,
        n.related_entity_id,
        n.related_entity_type,
        n.created_at,
        n.type,
        n.alert_type,
        n.title,
        n.message,
        n.remark,
        n.is_read,
        n.payload,
        'refurbishment' as notification_type,
        CASE
          WHEN n.alert_type = 'refurbishment'
               AND rr_center.id IS NOT NULL
          THEN 1
          ELSE 0
        END AS partner_responded,
        CASE
          WHEN n.alert_type = 'refurbishment_acknowledgment_submitted' THEN 1
          WHEN n.alert_type = 'refurbishment_acknowledgment_due'
               AND rr_request.partner_completed_at IS NOT NULL
          THEN 1
          ELSE 0
        END AS acknowledgment_submitted
      FROM notifications n
      LEFT JOIN refurbishment_requests rr_center
        ON rr_center.center_id = n.related_entity_id
        AND n.alert_type = 'refurbishment'
      LEFT JOIN refurbishment_requests rr_request
        ON rr_request.id = n.related_entity_id
        AND n.related_entity_type = 'refurbishment_request'
      ${whereClause}
        ${inboxVisibilityClause}
        AND n.alert_type LIKE 'refurbishment%'
      ORDER BY n.created_at ${sortBy === 'oldest' ? 'ASC' : 'DESC'}
    `;

    // Execute all three queries
    const [centerNotifications] = await pool.query(centerQuery, params);
    const [uploadGroupedResults] = await pool.query(uploadQuery, params);
    // Refurbishment notifications only appear in partner inbox;
    // admin sees them in the Refurbishment > Alerts tab instead.
    const [refurbishmentResults] =
      normalizedRole === 'PARTNER' ? await pool.query(refurbishmentQuery, params) : [[]];

    // Employment upload notifications (rejected/approved by admin)
    const employmentQuery = `
      SELECT 
        n.id,
        n.related_entity_id as upload_id,
        n.created_at,
        n.type,
        n.alert_type,
        n.title,
        n.message,
        n.remark,
        n.is_read,
        n.payload,
        eu.review_status as current_review_status,
        'employment' as notification_type
      FROM notifications n
      LEFT JOIN employment_uploads eu ON eu.id = n.related_entity_id
      ${whereClause}
        ${inboxVisibilityClause}
        AND n.related_entity_type = 'employment_upload'
      ORDER BY n.created_at ${sortBy === 'oldest' ? 'ASC' : 'DESC'}
    `;
    const [employmentResults] = await pool.query(employmentQuery, params);

    const totQuery = `
      SELECT 
        n.id,
        n.related_entity_id as upload_id,
        n.created_at,
        n.type,
        n.alert_type,
        n.title,
        n.message,
        n.remark,
        n.is_read,
        n.payload,
        tu.status as current_review_status,
        'tot_upload' as notification_type
      FROM notifications n
      LEFT JOIN tot_uploads tu ON tu.id = n.related_entity_id
      ${whereClause}
        ${inboxVisibilityClause}
        AND n.related_entity_type = 'tot_upload'
      ORDER BY n.created_at ${sortBy === 'oldest' ? 'ASC' : 'DESC'}
    `;
    const [totResults] = await pool.query(totQuery, params);

    // Certification notifications (partner submissions + ESSCI processing updates)
    const certificationQuery = `
      SELECT 
        n.id,
        n.related_entity_id,
        n.related_entity_type,
        n.created_at,
        n.type,
        n.alert_type,
        n.title,
        n.message,
        n.remark,
        n.is_read,
        n.payload,
        'certification' as notification_type
      FROM notifications n
      ${whereClause}
        ${inboxVisibilityClause}
        AND n.related_entity_type IN ('certification_upload', 'certification_pdf')
      ORDER BY n.created_at ${sortBy === 'oldest' ? 'ASC' : 'DESC'}
    `;
    const [certificationResults] = await pool.query(certificationQuery, params);

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

    // Process refurbishment notifications
    const processedRefurbishmentNotifications = refurbishmentResults.map((notif) => {
      const payload = notif.payload ? JSON.parse(notif.payload) : {};
      const acknowledgmentSubmitted = Boolean(notif.acknowledgment_submitted);
      const effectiveAlertType =
        notif.alert_type === 'refurbishment_acknowledgment_due' && acknowledgmentSubmitted
          ? 'refurbishment_acknowledgment_submitted'
          : notif.alert_type;

      return {
        id: notif.id,
        type: notif.type,
        alert_type: effectiveAlertType,
        title:
          effectiveAlertType === 'refurbishment_acknowledgment_submitted' &&
          notif.alert_type === 'refurbishment_acknowledgment_due'
            ? notif.title.replace(/^Acknowledgment Required/i, 'Acknowledgment Submitted')
            : notif.title,
        message:
          effectiveAlertType === 'refurbishment_acknowledgment_submitted' &&
          notif.alert_type === 'refurbishment_acknowledgment_due'
            ? 'Your acknowledgment has been received. Admin will review and complete the request.'
            : notif.message,
        remark: notif.remark,
        is_read: Boolean(notif.is_read) || acknowledgmentSubmitted,
        created_at: notif.created_at,
        related_entity_type: notif.related_entity_type,
        related_entity_id: notif.related_entity_id,
        notification_type: 'refurbishment',
        partner_responded: Boolean(notif.partner_responded),
        acknowledgment_submitted: acknowledgmentSubmitted,
        payload,
      };
    });

    // Process employment upload notifications (individual, not grouped)
    const processedEmploymentNotifications = employmentResults.map((notif) => {
      const payload = notif.payload ? JSON.parse(notif.payload) : {};
      const normalizedStatus =
        notif.current_review_status === 'approved'
          ? 'approved'
          : notif.current_review_status === 'rejected'
            ? 'rejected'
            : 'pending';
      const alertType =
        normalizedStatus === 'approved'
          ? 'success'
          : normalizedStatus === 'rejected'
            ? 'error'
            : 'info';
      return {
        id: notif.id,
        upload_id: notif.upload_id,
        type: notif.type,
        alert_type: alertType,
        aggregated_status: normalizedStatus,
        title: notif.title,
        message: notif.message,
        remark: notif.remark,
        is_read: Boolean(notif.is_read),
        created_at: notif.created_at,
        related_entity_type: 'employment_upload',
        related_entity_id: notif.upload_id,
        notification_type: 'employment',
        payload: {
          ...payload,
          uploadId: notif.upload_id,
          review_status: normalizedStatus,
        },
      };
    });

    const processedTotNotifications = totResults.map((notif) => {
      const payload = notif.payload ? JSON.parse(notif.payload) : {};
      const normalizedStatus =
        notif.current_review_status === 'approved'
          ? 'approved'
          : notif.current_review_status === 'rejected'
            ? 'rejected'
            : 'pending';
      const alertType =
        normalizedStatus === 'approved'
          ? 'success'
          : normalizedStatus === 'rejected'
            ? 'error'
            : 'info';

      return {
        id: notif.id,
        upload_id: notif.upload_id,
        type: notif.type,
        alert_type: alertType,
        aggregated_status: normalizedStatus,
        title: notif.title,
        message: notif.message,
        remark: notif.remark,
        is_read: Boolean(notif.is_read),
        created_at: notif.created_at,
        related_entity_type: 'tot_upload',
        related_entity_id: notif.upload_id,
        notification_type: 'tot_upload',
        payload: {
          ...payload,
          uploadId: notif.upload_id,
          review_status: normalizedStatus,
        },
      };
    });

    // Process certification notifications (individual, not grouped)
    const processedCertificationNotifications = certificationResults.map((notif) => {
      const payload = notif.payload ? JSON.parse(notif.payload) : {};
      return {
        id: notif.id,
        type: notif.type,
        alert_type: notif.alert_type || 'info',
        title: notif.title,
        message: notif.message,
        remark: notif.remark,
        is_read: Boolean(notif.is_read),
        created_at: notif.created_at,
        related_entity_type: notif.related_entity_type,
        related_entity_id: notif.related_entity_id,
        notification_type: 'certification',
        payload,
      };
    });

    // Merge sources, drop duplicate rows for the same action (e.g. INFO + SUCCESS tags)
    const allNotifications = dedupeInboxNotifications(
      [
        ...processedfCenterNotifications,
        ...processedRefurbishmentNotifications,
        ...processedUploadNotifications,
        ...processedEmploymentNotifications,
        ...processedTotNotifications,
        ...processedCertificationNotifications,
      ],
      role
    );
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
    // First check if this is an employment upload (wrong endpoint)
    const [empCheck] = await pool.query('SELECT id FROM employment_uploads WHERE id = ? LIMIT 1', [
      uploadId,
    ]);
    if (empCheck.length > 0) {
      // Employment uploads don't have center details — return empty gracefully
      return { upload: null, centers: [], isEmploymentUpload: true };
    }

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
    const { getActiveAdminIds } = require('../../../services/emailDispatch.service');
    const adminIds = await getActiveAdminIds();

    if (adminIds.length === 0) {
      console.warn('No active admins found to send notification');
      return [];
    }

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

    try {
      const { fireEmail } = require('../../../services/emailDispatch.service');
      fireEmail(
        'center.pending_admin',
        { partnerName: center.partner_name, centerName: center.center_name },
        { audience: 'admin' }
      );
    } catch (emailErr) {
      console.warn('[email] new center email skipped:', emailErr.message);
    }

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
    try {
      const { fireEmail } = require('../../../services/emailDispatch.service');
      fireEmail(
        'center.approved_partner',
        { partnerName: center.partner_name, centerName: center.center_name },
        { audience: 'partner', partnerId }
      );
    } catch (emailErr) {
      console.warn('[email] center approved email skipped:', emailErr.message);
    }

    return true;
  } catch (error) {
    console.error('Error notifying partner about center approval:', error);
    // Don't throw - notification failure shouldn't break approval
  }
};

/**
 * Get refurbishment notification details for partner
 * Fetches RQ-XXXXX number, center details, partner details, and package information
 * @param {string} notificationId - UUID of the notification
 * @param {string} userId -UUID of the user
 * @param {string} partnerId - UUID of the partner
 * @returns {Object} Refurbishment details
 */
const getRefurbishmentDetails = async (notificationId, userId, partnerId) => {
  try {
    // Fetch notification details with join to get scheduled refurbishment notification
    const [result] = await pool.query(
      `
      SELECT 
        n.id AS notification_id,
        n.title,
        n.message,
        n.remark,
        n.created_at AS notification_date,
        srn.id AS refurb_notification_id,
        srn.request_number,
        srn.message AS refurb_message,
        srn.packages,
        srn.upgradation_packages,
        srn.partner_responded,
        srn.response_received_at,
        c.id AS center_id,
        c.center_name,
        c.city,
        c.state,
        p.id AS partner_id,
        p.name AS partner_name
      FROM notifications n
      JOIN users u ON n.recipient_id = u.id
      JOIN scheduled_refurbishment_notifications srn
        ON u.partner_id = srn.partner_id
        AND (
          (n.alert_type = 'refurbishment_reinitiated' AND n.related_entity_id = srn.id)
          OR (
            n.alert_type = 'refurbishment_reinitiated'
            AND n.related_entity_type = 'center'
            AND n.related_entity_id = srn.center_id
          )
          OR (n.alert_type = 'refurbishment' AND n.related_entity_id = srn.center_id)
        )
      JOIN centers c ON srn.center_id = c.id
      JOIN partners p ON srn.partner_id = p.id
      WHERE n.id = ?
        AND u.id = ?
        AND srn.partner_id = ?
        AND n.type = 'alert'
        AND n.alert_type IN ('refurbishment', 'refurbishment_reinitiated')
      ORDER BY
        CASE WHEN n.related_entity_id = srn.id THEN 0 ELSE 1 END,
        (srn.partner_responded = 0) DESC,
        srn.updated_at DESC
      LIMIT 1
    `,
      [notificationId, userId, partnerId]
    );

    if (!result || result.length === 0) {
      throw new Error('Refurbishment notification not found');
    }

    const notification = result[0];

    // Parse course packages JSON
    let packages = [];
    if (notification.packages) {
      try {
        packages = JSON.parse(notification.packages);
      } catch (err) {
        console.error('Error parsing packages JSON:', err);
        packages = [];
      }
    }

    // Parse upgradation packages JSON
    let upgradationPackageEntries = [];
    if (notification.upgradation_packages) {
      try {
        upgradationPackageEntries = JSON.parse(notification.upgradation_packages);
      } catch (err) {
        console.error('Error parsing upgradation_packages JSON:', err);
        upgradationPackageEntries = [];
      }
    }

    // Group packages by course
    const packageIds = packages.map((p) => `'${p.packageId}'`).join(',');
    let coursePackages = [];

    if (packageIds) {
      const [packageDetails] = await pool.query(`
        SELECT 
          rp.id AS package_id,
          rp.package_name,
          rp.description,
          rp.images,
          c.id AS course_id,
          c.course_name
        FROM refurbishment_packages rp
        JOIN package_courses pc ON rp.id = pc.package_id
        JOIN courses c ON pc.course_id = c.id
        WHERE rp.id IN (${packageIds}) AND rp.category = 'refurbishment'
        ORDER BY c.course_name, rp.package_name
      `);

      // Group by course
      const courseMap = new Map();
      packageDetails.forEach((pkg) => {
        if (!courseMap.has(pkg.course_id)) {
          courseMap.set(pkg.course_id, {
            course_id: pkg.course_id,
            course_name: pkg.course_name,
            packages: [],
          });
        }

        const packageInfo = packages.find((p) => p.packageId === pkg.package_id);
        courseMap.get(pkg.course_id).packages.push({
          package_id: pkg.package_id,
          package_name: pkg.package_name,
          description: pkg.description,
          images: pkg.images,
          quantity: packageInfo?.quantity || 1,
          notes: packageInfo?.notes || null,
        });
      });

      coursePackages = Array.from(courseMap.values());
    }

    // Fetch upgradation package details
    // If saved IDs exist use them; otherwise fall back to ALL available upgradation packages
    // (handles notifications created before the upgradation_packages column was populated)
    let upgradationPackages = [];
    if (upgradationPackageEntries.length > 0) {
      const upgPkgIds = upgradationPackageEntries
        .map((p) => (typeof p === 'string' ? `'${p}'` : `'${p.packageId}'`))
        .join(',');
      const [upgPkgDetails] = await pool.query(`
        SELECT id AS package_id, package_name, description, images, category
        FROM refurbishment_packages
        WHERE id IN (${upgPkgIds}) AND category = 'upgradation'
        ORDER BY display_order ASC, package_name ASC
      `);
      upgradationPackages = upgPkgDetails;
    }

    // Fallback: if no upgradation packages resolved, return all available ones
    // so the partner is always shown the upgradation prompt
    if (upgradationPackages.length === 0) {
      const [allUpgPkgs] = await pool.query(`
        SELECT id AS package_id, package_name, description, images, category
        FROM refurbishment_packages
        WHERE category = 'upgradation'
        ORDER BY display_order ASC, package_name ASC
      `);
      upgradationPackages = allUpgPkgs;
    }

    return {
      request_number: notification.request_number
        ? `RQ-${String(notification.request_number).padStart(6, '0')}`
        : 'Pending',
      partner_name: notification.partner_name,
      subject: 'Request for Lab Refurbishment', // Fixed subject as per requirement
      center_name: notification.center_name,
      center_location: `${notification.city}, ${notification.state}`,
      date: notification.notification_date,
      description: notification.message || notification.refurb_message,
      courses: coursePackages,
      upgradation_packages: upgradationPackages,
      has_upgradation_packages: upgradationPackages.length > 0,
      partner_responded: notification.partner_responded === 1,
      response_received_at: notification.response_received_at,
      notification_id: notification.notification_id,
      refurb_notification_id: notification.refurb_notification_id,
      previous_submission: await (async () => {
        // Fetch previous submission data if the request was sent back
        const [prevRequests] = await pool.query(
          `SELECT id, status, admin_remarks FROM refurbishment_requests WHERE request_id = ? ORDER BY created_at DESC LIMIT 1`,
          [notification.refurb_notification_id]
        );
        if (!prevRequests || prevRequests.length === 0) return null;

        const prevReqId = prevRequests[0].id;

        const [prevPackages] = await pool.query(
          `SELECT package_id, justification FROM refurbishment_request_course_packages WHERE refurbishment_request_id = ?`,
          [prevReqId]
        );

        const [prevAttachments] = await pool.query(
          `SELECT course_id, file_url, file_name, file_mime_type FROM refurbishment_request_course_attachments WHERE refurbishment_request_id = ?`,
          [prevReqId]
        );

        // Map package_id → course_id
        let pkgToCourse = {};
        if (prevPackages.length > 0) {
          const pkgIds = prevPackages.map((p) => pool.escape(p.package_id)).join(',');
          const [pkgCourses] = await pool.query(
            `SELECT package_id, course_id FROM package_courses WHERE package_id IN (${pkgIds})`
          );
          pkgCourses.forEach((pc) => {
            pkgToCourse[pc.package_id] = pc.course_id;
          });
        }

        // Separate images from supporting documents by mime type
        const imagesByCourse = {};
        const supportingDocs = [];
        prevAttachments.forEach((att) => {
          if (att.file_mime_type && att.file_mime_type.startsWith('image/')) {
            const cid = att.course_id;
            if (!imagesByCourse[cid]) imagesByCourse[cid] = [];
            imagesByCourse[cid].push({
              url: att.file_url,
              name: att.file_name,
              type: att.file_mime_type,
            });
          } else {
            supportingDocs.push({
              url: att.file_url,
              name: att.file_name,
              type: att.file_mime_type,
            });
          }
        });

        // Fetch upgradation data if any
        const [prevRooms] = await pool.query(
          `SELECT id, length_feet, breadth_feet, height_feet, justification FROM refurbishment_upgradation_rooms WHERE refurbishment_request_id = ? LIMIT 1`,
          [prevReqId]
        );
        let upgradationPrev = null;
        if (prevRooms.length > 0) {
          const roomId = prevRooms[0].id;
          const [roomPhotos] = await pool.query(
            `SELECT file_url, file_name FROM refurbishment_upgradation_photos WHERE upgradation_room_id = ?`,
            [roomId]
          );
          const [upgPkgs] = await pool.query(
            `SELECT package_id FROM refurbishment_upgradation_request_packages WHERE refurbishment_request_id = ?`,
            [prevReqId]
          );
          upgradationPrev = {
            length_feet: String(prevRooms[0].length_feet || ''),
            breadth_feet: String(prevRooms[0].breadth_feet || ''),
            height_feet: String(prevRooms[0].height_feet || ''),
            justification: prevRooms[0].justification || '',
            photos: roomPhotos,
            package_ids: upgPkgs.map((p) => p.package_id),
          };
        }

        return {
          status: prevRequests[0].status,
          admin_remarks: prevRequests[0].admin_remarks,
          packages: prevPackages.map((p) => ({
            package_id: p.package_id,
            justification: p.justification || '',
            existing_images: imagesByCourse[pkgToCourse[p.package_id]] || [],
          })),
          supporting_docs: {
            refurbishment: supportingDocs[0] || null,
            upgradation: supportingDocs[1] || null,
          },
          upgradation: upgradationPrev,
        };
      })(),
    };
  } catch (error) {
    console.error('Error fetching refurbishment details:', error);
    throw error;
  }
};

/**
 * Submit partner refurbishment response
 * Saves partner's package selections and justifications
 * Marks notification and scheduled notification as responded
 * Notif ies admin of partner response
 * @param {string} notificationId - UUID of the notification
 * @param {string} userId - UUID of the user
 * @param {string} partnerId - UUID of the partner
 * @param {Array} selectedPackages - Array of {package_id, justification}
 * @returns {Object} Submission result
 */
const submitRefurbishmentResponse = async (
  notificationId,
  userId,
  partnerId,
  selectedPackages,
  upgradation = null,
  refurbishmentDocument = null,
  upgradationDocument = null
) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get notification and scheduled refurbishment details
    const [notification] = await connection.query(
      `
      SELECT 
        n.id AS notification_id,
        srn.center_id AS center_id,
        srn.id AS refurb_notification_id,
        srn.request_number,
        srn.request_type,
        srn.frequency,
        srn.is_manual_request
      FROM notifications n
      JOIN users u ON n.recipient_id = u.id
      JOIN scheduled_refurbishment_notifications srn
        ON u.partner_id = srn.partner_id
        AND (
          (n.alert_type = 'refurbishment_reinitiated' AND n.related_entity_id = srn.id)
          OR (
            n.alert_type = 'refurbishment_reinitiated'
            AND n.related_entity_type = 'center'
            AND n.related_entity_id = srn.center_id
          )
          OR (n.alert_type = 'refurbishment' AND n.related_entity_id = srn.center_id)
        )
      WHERE n.id = ?
        AND u.id = ?
        AND srn.partner_id = ?
        AND n.type = 'alert'
        AND n.alert_type IN ('refurbishment', 'refurbishment_reinitiated')
        AND srn.partner_responded = 0
      ORDER BY
        CASE WHEN n.related_entity_id = srn.id THEN 0 ELSE 1 END,
        srn.updated_at DESC
      LIMIT 1
    `,
      [notificationId, userId, partnerId]
    );

    if (!notification || notification.length === 0) {
      throw new Error('Notification not found or already responded');
    }

    const notifData = notification[0];
    const uuid = require('uuid');
    const requestType =
      notifData.request_type ||
      (notifData.frequency === 'instant' || notifData.is_manual_request === 1
        ? 'instant request'
        : 'schedule request');

    // Check if a refurbishment_requests record already exists (re-submission after send-back)
    const [existingRequest] = await connection.query(
      'SELECT id FROM refurbishment_requests WHERE request_id = ? LIMIT 1',
      [notifData.refurb_notification_id]
    );

    let refurbishmentRequestId;
    if (existingRequest && existingRequest.length > 0) {
      // Re-submission: clear old child data and update the main record
      refurbishmentRequestId = existingRequest[0].id;

      await connection.query(
        'DELETE FROM refurbishment_request_course_packages WHERE refurbishment_request_id = ?',
        [refurbishmentRequestId]
      );
      await connection.query(
        'DELETE FROM refurbishment_request_course_attachments WHERE refurbishment_request_id = ?',
        [refurbishmentRequestId]
      );
      const [existingRooms] = await connection.query(
        'SELECT id FROM refurbishment_upgradation_rooms WHERE refurbishment_request_id = ?',
        [refurbishmentRequestId]
      );
      for (const room of existingRooms) {
        await connection.query(
          'DELETE FROM refurbishment_upgradation_photos WHERE upgradation_room_id = ?',
          [room.id]
        );
      }
      await connection.query(
        'DELETE FROM refurbishment_upgradation_rooms WHERE refurbishment_request_id = ?',
        [refurbishmentRequestId]
      );
      await connection.query(
        'DELETE FROM refurbishment_upgradation_request_packages WHERE refurbishment_request_id = ?',
        [refurbishmentRequestId]
      );
      await connection.query(
        'DELETE FROM refurbishment_admin_added_packages WHERE refurbishment_request_id = ?',
        [refurbishmentRequestId]
      );
      await connection.query(
        'DELETE FROM refurbishment_admin_selected_packages WHERE request_id = ?',
        [notifData.refurb_notification_id]
      );
      await connection.query(
        `UPDATE refurbishment_requests
         SET status = 'submitted',
             refurbishment_type = 'package_selection',
             request_type = ?,
             justification = 'Partner package selection response',
             is_upgradation_requested = 0,
             admin_remarks = NULL,
             updated_at = NOW()
         WHERE id = ?`,
        [requestType, refurbishmentRequestId]
      );
    } else {
      // First-time submission: insert new record
      refurbishmentRequestId = uuid.v4();
      await connection.query(
        `
        INSERT INTO refurbishment_requests (
          id,
          request_id,
          center_id,
          refurbishment_type,
          request_type,
          justification,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'submitted', NOW(), NOW())
      `,
        [
          refurbishmentRequestId,
          notifData.refurb_notification_id,
          notifData.center_id,
          'package_selection',
          requestType,
          'Partner package selection response',
        ]
      );
    }

    let firstSelectedCourseId = null;

    // Insert package selections with justifications and attachments
    for (const pkg of selectedPackages) {
      const packageEntryId = uuid.v4();

      // Get course_id for this package (from join table package_courses)
      const [packageInfo] = await connection.query(
        `
        SELECT course_id FROM package_courses WHERE package_id = ? LIMIT 1
      `,
        [pkg.package_id]
      );

      if (packageInfo.length > 0) {
        const courseId = packageInfo[0].course_id;
        if (!firstSelectedCourseId) {
          firstSelectedCourseId = courseId;
        }

        // Insert package selection with justification
        await connection.query(
          `
          INSERT INTO refurbishment_request_course_packages (
            id,
            refurbishment_request_id,
            course_id,
            package_id,
            quantity,
            justification,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
          [
            packageEntryId,
            refurbishmentRequestId,
            courseId,
            pkg.package_id,
            1, // Default quantity
            pkg.justification || null, // Optional justification
          ]
        );

        // Insert image attachments for this package (if provided)
        if (pkg.image_urls && Array.isArray(pkg.image_urls) && pkg.image_urls.length > 0) {
          for (const imageUrl of pkg.image_urls) {
            const attachmentId = uuid.v4();

            await connection.query(
              `
              INSERT INTO refurbishment_request_course_attachments (
                id,
                refurbishment_request_id,
                course_id,
                package_id,
                file_url,
                file_name,
                file_size_bytes,
                file_mime_type,
                uploaded_by,
                attachment_type,
                created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'package_attachment', NOW())
            `,
              [
                attachmentId,
                refurbishmentRequestId,
                courseId,
                pkg.package_id,
                imageUrl.url,
                imageUrl.name || 'attachment.jpg',
                imageUrl.size || null,
                imageUrl.type || 'image/jpeg',
                userId,
              ]
            );
          }
        }
      }
    }

    // Persist supporting documents for admin review/download
    const supportingDocuments = [
      {
        doc: refurbishmentDocument,
        attachmentType: 'refurbishment_submission',
        fallbackName: 'refurbishment-document',
        fallbackType: 'application/octet-stream',
      },
      {
        doc: upgradationDocument,
        attachmentType: 'upgradation_submission',
        fallbackName: 'upgradation-document',
        fallbackType: 'application/octet-stream',
      },
    ].filter((entry) => entry.doc && entry.doc.url);

    if (supportingDocuments.length > 0 && firstSelectedCourseId) {
      for (const entry of supportingDocuments) {
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
          [
            uuid.v4(),
            refurbishmentRequestId,
            firstSelectedCourseId,
            entry.doc.url,
            entry.doc.name || entry.fallbackName,
            entry.doc.size || null,
            entry.doc.type || entry.fallbackType,
            userId,
            entry.attachmentType,
          ]
        );
      }
    }

    // Handle upgradation request if provided
    if (upgradation) {
      // Mark request as having upgradation
      await connection.query(
        `UPDATE refurbishment_requests SET is_upgradation_requested = 1, updated_at = NOW() WHERE id = ?`,
        [refurbishmentRequestId]
      );

      // Insert room details
      const roomId = uuid.v4();
      await connection.query(
        `INSERT INTO refurbishment_upgradation_rooms
          (id, refurbishment_request_id, length_feet, breadth_feet, height_feet, justification, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          roomId,
          refurbishmentRequestId,
          parseFloat(upgradation.length_feet) || 0,
          parseFloat(upgradation.breadth_feet) || 0,
          parseFloat(upgradation.height_feet) || 0,
          upgradation.justification || null,
        ]
      );

      // Insert room photos (if any)
      if (Array.isArray(upgradation.photos) && upgradation.photos.length > 0) {
        for (const photo of upgradation.photos) {
          await connection.query(
            `INSERT INTO refurbishment_upgradation_photos
              (id, upgradation_room_id, file_url, file_name, uploaded_by, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [uuid.v4(), roomId, photo.url, photo.name || 'photo.jpg', userId]
          );
        }
      }

      // Insert partner-selected upgradation packages
      if (Array.isArray(upgradation.package_ids) && upgradation.package_ids.length > 0) {
        for (const packageId of upgradation.package_ids) {
          await connection.query(
            `INSERT INTO refurbishment_upgradation_request_packages
              (id, refurbishment_request_id, package_id, created_at)
             VALUES (?, ?, ?, NOW())`,
            [uuid.v4(), refurbishmentRequestId, packageId]
          );
        }
      }
    }

    // Mark scheduled notification as responded
    await connection.query(
      `
      UPDATE scheduled_refurbishment_notifications
      SET partner_responded = 1,
          response_received_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `,
      [notifData.refurb_notification_id]
    );

    // Mark notification as read
    await connection.query(
      `
      UPDATE notifications
      SET is_read = 1,
          read_at = NOW()
      WHERE id = ?
    `,
      [notificationId]
    );

    // Create notification for admins
    const requestNumber =
      notifData.request_number != null
        ? `RQ-${String(notifData.request_number).padStart(6, '0')}`
        : `RQ-${notifData.refurb_notification_id.substring(0, 8).toUpperCase()}`;
    const [center] = await connection.query('SELECT center_name FROM centers WHERE id = ?', [
      notifData.center_id,
    ]);
    const [partner] = await connection.query('SELECT name FROM partners WHERE id = ?', [partnerId]);

    const adminNotificationId = uuid.v4();
    const notificationTitle = `Partner Response - ${requestNumber}`;
    const notificationMessage = `${partner[0]?.name || 'Partner'} has submitted their package selections for ${center[0]?.center_name || 'center'}. ${selectedPackages.length} package(s) selected.${upgradation ? ' Upgradation request included.' : ''}`;
    await connection.query(
      `
      INSERT INTO notifications (
        id,
        recipient_role,
        type,
        alert_type,
        title,
        message,
        related_entity_type,
        related_entity_id,
        is_read,
        created_at
      ) VALUES (?, 'ADMIN', 'alert', 'refurbishment_response', ?, ?, 'refurbishment_request', ?, 0, NOW())
    `,
      [
        adminNotificationId,
        notificationTitle,
        notificationMessage,
        refurbishmentRequestId,
      ]
    );

    await connection.commit();

    try {
      const socketPayload = {
        id: adminNotificationId,
        type: 'alert',
        alert_type: 'refurbishment_response',
        title: notificationTitle,
        message: notificationMessage,
        related_entity_type: 'refurbishment_request',
        related_entity_id: refurbishmentRequestId,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      emitToRole('ADMIN', 'notification:new', socketPayload);
      emitToRole('SUPER_ADMIN', 'notification:new', socketPayload);
    } catch (socketError) {
      console.error(
        'Failed to emit refurbishment response socket notification:',
        socketError.message
      );
    }

    return {
      refurbishment_request_id: refurbishmentRequestId,
      request_number: requestNumber,
      packages_submitted: selectedPackages.length,
      upgradation_requested: !!upgradation,
    };
  } catch (error) {
    await connection.rollback();
    console.error('Error submitting refurbishment response:', error);
    throw error;
  } finally {
    connection.release();
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
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  getNotificationById,
  createUploadNotification,
  createReviewNotification,
  getGroupedNotifications,
  getUploadCenterDetails,
  getRefurbishmentDetails,
  submitRefurbishmentResponse,
  getActualCenterStatus,
  sendNotificationToAdmins,
  notifyAdminsAboutNewCenter,
  notifyPartnerAboutCenterApproval,
};
