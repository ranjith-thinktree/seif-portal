const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');

/**
 * Scheduled Notification Service
 * Handles scheduled refurbishment notifications with auto-send capability
 */
class ScheduledNotificationService {
  /**
   * Create a new scheduled notification
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} Created notification
   */
  static async createScheduledNotification(data) {
    const {
      partnerId,
      centerId,
      scheduledAt,
      frequency = 'instant',
      customIntervalDays = null,
      maxOccurrences = null,
      customDay = null,
      customTime = null,
      message,
      packages = [],
      upgradation_packages = [],
      autoSend = true,
      createdBy,
      isManualRequest = false, // NEW: Distinguish manual requests from scheduled notifications
    } = data;

    const id = uuidv4();
    const now = new Date();

    // Calculate next_send_at based on frequency
    const nextSendAt = this.calculateNextSendAt(
      scheduledAt,
      frequency,
      customDay,
      customTime,
      customIntervalDays
    );

    const query = `
      INSERT INTO scheduled_refurbishment_notifications (
        id, partner_id, center_id, scheduled_at, frequency, 
        custom_interval_days, max_occurrences,
        custom_day, custom_time, message, packages, upgradation_packages, auto_send, 
        status, next_send_at, send_count, created_by, is_manual_request, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0, ?, ?, ?)
    `;

    await db.query(query, [
      id,
      partnerId,
      centerId,
      scheduledAt,
      frequency,
      customIntervalDays,
      maxOccurrences,
      customDay,
      customTime,
      message,
      JSON.stringify(packages),
      JSON.stringify(upgradation_packages),
      autoSend ? 1 : 0,
      nextSendAt,
      createdBy,
      isManualRequest ? 1 : 0, // NEW: Store manual request flag
      now,
    ]);

    return this.getScheduledNotificationById(id);
  }

  /**
   * Get scheduled notification by ID
   * @param {string} id - Notification ID
   * @returns {Promise<Object>} Notification object
   */
  static async getScheduledNotificationById(id) {
    const query = `
      SELECT 
        sn.*,
        IF(sn.is_manual_request = 1, 0, 1) as is_scheduled,
        p.name as partner_name,
        c.center_name,
        u.full_name as created_by_name
      FROM scheduled_refurbishment_notifications sn
      LEFT JOIN partners p ON sn.partner_id = p.id
      LEFT JOIN centers c ON sn.center_id = c.id
      LEFT JOIN users u ON sn.created_by = u.id
      WHERE sn.id = ?
    `;

    const [rows] = await db.query(query, [id]);
    if (rows.length === 0) {
      throw new Error('Scheduled notification not found');
    }

    const notification = rows[0];

    // Parse packages JSON
    if (notification.packages) {
      try {
        notification.packages = JSON.parse(notification.packages);
      } catch (e) {
        notification.packages = [];
      }
    }

    // Parse upgradation_packages JSON
    if (notification.upgradation_packages) {
      try {
        notification.upgradation_packages = JSON.parse(notification.upgradation_packages);
      } catch (e) {
        notification.upgradation_packages = [];
      }
    } else {
      notification.upgradation_packages = [];
    }

    return notification;
  }

  /**
   * Get all scheduled notifications with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of notifications
   */
  static async getScheduledNotifications(filters = {}) {
    const {
      partnerId = null,
      centerId = null,
      status = null,
      autoSend = null,
      limit = 50,
      offset = 0,
    } = filters;

    let whereConditions = [];
    let params = [];

    if (partnerId) {
      whereConditions.push('sn.partner_id = ?');
      params.push(partnerId);
    }

    if (centerId) {
      whereConditions.push('sn.center_id = ?');
      params.push(centerId);
    }

    if (status) {
      // Handle comma-separated status values (e.g., "pending,active")
      const statusArray = status.split(',').map((s) => s.trim());
      const placeholders = statusArray.map(() => '?').join(',');
      whereConditions.push(`sn.status IN (${placeholders})`);
      params.push(...statusArray);
    }

    if (autoSend !== null) {
      whereConditions.push('sn.auto_send = ?');
      params.push(autoSend ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        sn.*,
        IF(sn.is_manual_request = 1, 0, 1) as is_scheduled,
        p.name as partner_name,
        c.center_name,
        u.full_name as created_by_name
      FROM scheduled_refurbishment_notifications sn
      LEFT JOIN partners p ON sn.partner_id = p.id
      LEFT JOIN centers c ON sn.center_id = c.id
      LEFT JOIN users u ON sn.created_by = u.id
      ${whereClause}
      ORDER BY sn.next_send_at ASC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    const [rows] = await db.query(query, params);

    // Parse packages JSON for each notification
    return rows.map((notification) => {
      if (notification.packages) {
        try {
          notification.packages = JSON.parse(notification.packages);
        } catch (e) {
          notification.packages = [];
        }
      }
      if (notification.upgradation_packages) {
        try {
          notification.upgradation_packages = JSON.parse(notification.upgradation_packages);
        } catch (e) {
          notification.upgradation_packages = [];
        }
      } else {
        notification.upgradation_packages = [];
      }
      return notification;
    });
  }

  /**
   * Update scheduled notification
   * @param {string} id - Notification ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated notification
   */
  static async updateScheduledNotification(id, updates) {
    const {
      scheduledAt,
      frequency,
      customDay,
      customTime,
      customIntervalDays,
      maxOccurrences,
      message,
      packages,
      upgradation_packages,
      autoSend,
    } = updates;

    let setClause = [];
    let params = [];

    if (scheduledAt !== undefined) {
      setClause.push('scheduled_at = ?');
      params.push(scheduledAt);
    }

    if (frequency !== undefined) {
      setClause.push('frequency = ?');
      params.push(frequency);
    }

    if (customDay !== undefined) {
      setClause.push('custom_day = ?');
      params.push(customDay);
    }

    if (customTime !== undefined) {
      setClause.push('custom_time = ?');
      params.push(customTime);
    }

    if (customIntervalDays !== undefined) {
      setClause.push('custom_interval_days = ?');
      params.push(customIntervalDays);
    }

    if (maxOccurrences !== undefined) {
      setClause.push('max_occurrences = ?');
      params.push(maxOccurrences);
    }

    if (message !== undefined) {
      setClause.push('message = ?');
      params.push(message);
    }

    if (packages !== undefined) {
      setClause.push('packages = ?');
      params.push(JSON.stringify(packages));
    }

    if (upgradation_packages !== undefined) {
      setClause.push('upgradation_packages = ?');
      params.push(JSON.stringify(upgradation_packages));
    }

    if (autoSend !== undefined) {
      setClause.push('auto_send = ?');
      params.push(autoSend ? 1 : 0);
    }

    // Recalculate next_send_at if schedule changed
    if (scheduledAt || frequency || customDay || customTime || customIntervalDays !== undefined) {
      const existing = await this.getScheduledNotificationById(id);
      const nextSendAt = this.calculateNextSendAt(
        scheduledAt || existing.scheduled_at,
        frequency || existing.frequency,
        customDay !== undefined ? customDay : existing.custom_day,
        customTime !== undefined ? customTime : existing.custom_time,
        customIntervalDays !== undefined ? customIntervalDays : existing.custom_interval_days
      );
      setClause.push('next_send_at = ?');
      params.push(nextSendAt);
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    setClause.push('updated_at = NOW()');
    params.push(id);

    const query = `
      UPDATE scheduled_refurbishment_notifications 
      SET ${setClause.join(', ')}
      WHERE id = ?
    `;

    await db.query(query, params);
    return this.getScheduledNotificationById(id);
  }

  /**
   * Mark a notification as immediately sent (used when autoSend=true + instant frequency).
   * Updates status to 'completed', sets send_count=1, last_sent_at=NOW().
   * @param {string} id - Scheduled notification ID
   */
  static async markImmediatelySent(id) {
    const now = new Date();
    await db.query(
      `UPDATE scheduled_refurbishment_notifications
       SET status = 'completed', last_sent_at = ?, send_count = 1, updated_at = NOW()
       WHERE id = ?`,
      [now, id]
    );
  }

  /**
   * Toggle auto-send for a scheduled notification
   * @param {string} id - Notification ID
   * @param {boolean} enabled - True to enable, false to pause
   * @returns {Promise<Object>} Updated notification
   */
  static async toggleAutoSend(id, enabled) {
    const query = `
      UPDATE scheduled_refurbishment_notifications
      SET auto_send = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await db.query(query, [enabled ? 1 : 0, id]);
    return this.getScheduledNotificationById(id);
  }

  /**
   * Cancel a scheduled notification
   * @param {string} id - Notification ID
   * @returns {Promise<Object>} Cancelled notification
   */
  static async cancelScheduledNotification(id) {
    const query = `
      UPDATE scheduled_refurbishment_notifications
      SET status = 'cancelled', auto_send = 0, updated_at = NOW()
      WHERE id = ?
    `;

    await db.query(query, [id]);
    return this.getScheduledNotificationById(id);
  }

  /**
   * Mark that partner has responded to the notification
   * This stops further automatic notifications for this scheduled notification
   * @param {string} id - Scheduled notification ID
   * @returns {Promise<Object>} Updated notification
   */
  static async markPartnerResponse(id) {
    const query = `
      UPDATE scheduled_refurbishment_notifications
      SET 
        partner_responded = 1,
        response_received_at = NOW(),
        status = 'completed',
        auto_send = 0,
        updated_at = NOW()
      WHERE id = ?
    `;

    await db.query(query, [id]);
    return this.getScheduledNotificationById(id);
  }

  /**
   * Get notifications pending execution (called by cron job)
   * @returns {Promise<Array>} Pending notifications
   */
  static async getPendingNotifications() {
    const now = new Date();

    const query = `
      SELECT 
        sn.*,
        p.name as partner_name,
        c.center_name
      FROM scheduled_refurbishment_notifications sn
      LEFT JOIN partners p ON sn.partner_id = p.id
      LEFT JOIN centers c ON sn.center_id = c.id
      WHERE sn.auto_send = 1
        AND sn.status IN ('pending', 'active')
        AND sn.next_send_at <= ?
        AND (sn.partner_responded IS NULL OR sn.partner_responded = 0)
        AND (sn.max_occurrences IS NULL OR sn.send_count < sn.max_occurrences)
      ORDER BY sn.next_send_at ASC
    `;

    const [rows] = await db.query(query, [now]);

    // Parse packages JSON
    return rows.map((notification) => {
      if (notification.packages) {
        try {
          notification.packages = JSON.parse(notification.packages);
        } catch (e) {
          notification.packages = [];
        }
      }
      return notification;
    });
  }

  /**
   * Execute a scheduled notification (send actual notification)
   * @param {string} notificationId - Scheduled notification ID
   * @returns {Promise<Object>} Execution result
   */
  static async executeScheduledNotification(notificationId) {
    const executionId = uuidv4();
    const executedAt = new Date();

    try {
      // Get notification details
      const notification = await this.getScheduledNotificationById(notificationId);

      // Send actual notification (reuse existing service)
      const RefurbishmentService = require('./refurbishment.service');
      const result = await RefurbishmentService.sendRefurbishmentNotification(
        notification.center_id,
        notification.partner_id,
        notification.message
      );

      const notifId = result.notificationId || null;

      // Log successful execution
      await db.query(
        `
        INSERT INTO scheduled_notification_executions (
          id, scheduled_notification_id, executed_at, status, 
          notification_id, created_at
        )
        VALUES (?, ?, ?, 'success', ?, ?)
      `,
        [executionId, notificationId, executedAt, notifId, executedAt]
      );

      // Update scheduled notification
      const sendCount = notification.send_count + 1;
      let status = notification.status === 'pending' ? 'active' : notification.status;

      // Calculate next send time
      const nextSendAt =
        notification.frequency === 'instant'
          ? null
          : this.calculateNextSendAt(
              null,
              notification.frequency,
              notification.custom_day,
              notification.custom_time,
              notification.custom_interval_days,
              executedAt
            );

      // Mark as completed if instant (one-time) or max occurrences reached
      if (notification.frequency === 'instant') {
        status = 'completed';
      } else if (notification.max_occurrences && sendCount >= notification.max_occurrences) {
        // Max occurrences reached
        status = 'completed';
      }

      await db.query(
        `
        UPDATE scheduled_refurbishment_notifications
        SET last_sent_at = ?, next_send_at = ?, send_count = ?, 
            status = ?, updated_at = NOW()
        WHERE id = ?
      `,
        [executedAt, nextSendAt, sendCount, status, notificationId]
      );

      return {
        success: true,
        executionId,
        notificationId: notifId,
        nextSendAt,
      };
    } catch (error) {
      // Log failed execution
      await db.query(
        `
        INSERT INTO scheduled_notification_executions (
          id, scheduled_notification_id, executed_at, status, 
          error_message, created_at
        )
        VALUES (?, ?, ?, 'failed', ?, ?)
      `,
        [executionId, notificationId, executedAt, error.message, executedAt]
      );

      return {
        success: false,
        executionId,
        error: error.message,
      };
    }
  }

  /**
   * Get execution history for a scheduled notification
   * @param {string} notificationId - Scheduled notification ID
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Execution history
   */
  static async getExecutionHistory(notificationId, limit = 50) {
    const query = `
      SELECT 
        e.*,
        n.title as notification_title
      FROM scheduled_notification_executions e
      LEFT JOIN notifications n ON e.notification_id = n.id
      WHERE e.scheduled_notification_id = ?
      ORDER BY e.executed_at DESC
      LIMIT ?
    `;

    const [rows] = await db.query(query, [notificationId, limit]);
    return rows;
  }

  /**
   * Calculate next send time based on frequency
   * @param {Date|string} baseDate - Base date for calculation
   * @param {string} frequency - 'instant', 'daily', 'weekly', 'monthly', 'custom'
   * @param {number} customDay - Day of month/week
   * @param {string} customTime - Time of day (HH:MM:SS)
   * @param {number} customIntervalDays - Number of days for custom frequency
   * @param {Date} fromDate - Calculate from this date (default: now)
   * @returns {Date} Next send time
   */
  static calculateNextSendAt(
    baseDate,
    frequency,
    customDay,
    customTime,
    customIntervalDays = null,
    fromDate = null
  ) {
    const from = fromDate || new Date();
    let nextSend = new Date(baseDate || from);

    // Apply custom time if provided
    if (customTime) {
      const [hours, minutes, seconds] = customTime.split(':').map(Number);
      nextSend.setHours(hours, minutes, seconds || 0, 0);
    }

    // If baseDate is in the past and we're calculating from now, adjust forward
    if (!fromDate && nextSend < from) {
      nextSend = new Date(from);
      if (customTime) {
        const [hours, minutes, seconds] = customTime.split(':').map(Number);
        nextSend.setHours(hours, minutes, seconds || 0, 0);

        // If time has passed today, move to tomorrow
        if (nextSend < from) {
          nextSend.setDate(nextSend.getDate() + 1);
        }
      }
    }

    switch (frequency) {
      case 'daily':
        // If calculating next occurrence, add 1 day
        if (fromDate) {
          nextSend.setDate(nextSend.getDate() + 1);
        }
        break;

      case 'weekly':
        // customDay: 0=Sunday, 1=Monday, ..., 6=Saturday
        if (customDay !== null) {
          const currentDay = nextSend.getDay();
          let daysToAdd = (customDay - currentDay + 7) % 7;

          // If same day and we're calculating next occurrence, add 7 days
          if (daysToAdd === 0 && fromDate) {
            daysToAdd = 7;
          }

          nextSend.setDate(nextSend.getDate() + daysToAdd);
        } else if (fromDate) {
          // No custom day, just add 7 days
          nextSend.setDate(nextSend.getDate() + 7);
        }
        break;

      case 'monthly':
        // customDay: 1-31 (day of month)
        if (customDay !== null) {
          nextSend.setDate(customDay);

          // If date has passed this month or we're calculating next, move to next month
          if (nextSend < from || fromDate) {
            nextSend.setMonth(nextSend.getMonth() + 1);
          }
        } else if (fromDate) {
          // No custom day, add 1 month
          nextSend.setMonth(nextSend.getMonth() + 1);
        }
        break;

      case 'custom':
        // Custom interval in days
        if (customIntervalDays && fromDate) {
          nextSend.setDate(nextSend.getDate() + customIntervalDays);
        }
        // First send is immediate (today), no adjustment needed
        break;

      case 'instant':
      default:
        // No recurrence (one-time)
        break;
    }

    return nextSend;
  }

  /**
   * Delete a scheduled notification (hard delete)
   * @param {string} id - Notification ID
   * @returns {Promise<void>}
   */
  static async deleteScheduledNotification(id) {
    // Executions will be deleted by CASCADE
    const query = `DELETE FROM scheduled_refurbishment_notifications WHERE id = ?`;
    await db.query(query, [id]);
  }
}

module.exports = ScheduledNotificationService;
