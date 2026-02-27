const cron = require('node-cron');
const ScheduledNotificationService = require('../api/v1/services/scheduledNotification.service');

/**
 * Cron Job Service
 * Handles scheduled execution of refurbishment notifications
 * Runs every 5 minutes to check for pending notifications
 */
class CronService {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Start all cron jobs
   */
  start() {
    if (this.isRunning) {
      console.log('[CronService] Already running');
      return;
    }

    console.log('[CronService] Starting scheduled notification cron jobs...');

    // Job 1: Execute pending notifications (every 5 minutes)
    const notificationJob = cron.schedule(
      '*/5 * * * *',
      async () => {
        await this.executePendingNotifications();
      },
      {
        scheduled: true,
        timezone: 'Asia/Kolkata', // Adjust to your timezone
      }
    );

    this.jobs.push({
      name: 'notification-executor',
      job: notificationJob,
    });

    // Job 2: Cleanup completed one-time notifications (daily at 2 AM)
    const cleanupJob = cron.schedule(
      '0 2 * * *',
      async () => {
        await this.cleanupOldNotifications();
      },
      {
        scheduled: true,
        timezone: 'Asia/Kolkata',
      }
    );

    this.jobs.push({
      name: 'notification-cleanup',
      job: cleanupJob,
    });

    this.isRunning = true;
    console.log('[CronService] ✅ Started 2 cron jobs:');
    console.log('  - Notification Executor: Every 5 minutes');
    console.log('  - Cleanup: Daily at 2:00 AM');
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    if (!this.isRunning) {
      console.log('[CronService] Not running');
      return;
    }

    console.log('[CronService] Stopping cron jobs...');

    this.jobs.forEach((jobInfo) => {
      jobInfo.job.stop();
      console.log(`[CronService] Stopped: ${jobInfo.name}`);
    });

    this.jobs = [];
    this.isRunning = false;
    console.log('[CronService] ✅ All jobs stopped');
  }

  /**
   * Execute all pending scheduled notifications
   */
  async executePendingNotifications() {
    try {
      const startTime = Date.now();
      console.log('[CronService] Checking for pending notifications...');

      // Get all notifications due for execution
      const pending = await ScheduledNotificationService.getPendingNotifications();

      if (pending.length === 0) {
        console.log('[CronService] No pending notifications');
        return;
      }

      console.log(`[CronService] Found ${pending.length} pending notification(s)`);

      // Execute each notification
      const results = {
        success: 0,
        failed: 0,
        errors: [],
      };

      for (const notification of pending) {
        try {
          console.log(
            `[CronService] Executing notification ${notification.id} for center: ${notification.center_name}`
          );

          const result = await ScheduledNotificationService.executeScheduledNotification(
            notification.id
          );

          if (result.success) {
            results.success++;
            console.log(
              `[CronService] ✅ Success - Notification sent to ${notification.partner_name}`
            );

            if (result.nextSendAt) {
              console.log(
                `[CronService]    Next send: ${new Date(result.nextSendAt).toLocaleString()}`
              );
            } else {
              console.log(`[CronService]    One-time notification completed`);
            }
          } else {
            results.failed++;
            results.errors.push({
              notificationId: notification.id,
              error: result.error,
            });
            console.error(`[CronService] ❌ Failed - ${notification.id}: ${result.error}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            notificationId: notification.id,
            error: error.message,
          });
          console.error(`[CronService] ❌ Exception executing ${notification.id}:`, error.message);
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `[CronService] Execution complete: ${results.success} success, ${results.failed} failed (${duration}ms)`
      );

      if (results.errors.length > 0) {
        console.error('[CronService] Errors:', JSON.stringify(results.errors, null, 2));
      }
    } catch (error) {
      console.error('[CronService] Fatal error in executePendingNotifications:', error);
    }
  }

  /**
   * Cleanup old completed one-time notifications (older than 30 days)
   */
  async cleanupOldNotifications() {
    try {
      console.log('[CronService] Running cleanup for old completed notifications...');

      const db = require('../database/connection');

      // Delete completed one-time notifications older than 30 days
      const query = `
        DELETE FROM scheduled_refurbishment_notifications
        WHERE status = 'completed' 
          AND frequency = 'one-time'
          AND updated_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
      `;

      const [result] = await db.query(query);
      const deletedCount = result.affectedRows || 0;

      if (deletedCount > 0) {
        console.log(`[CronService] ✅ Cleaned up ${deletedCount} old notification(s)`);
      } else {
        console.log('[CronService] No old notifications to cleanup');
      }
    } catch (error) {
      console.error('[CronService] Error in cleanup:', error);
    }
  }

  /**
   * Manually trigger notification execution (for testing)
   */
  async triggerNow() {
    console.log('[CronService] Manual trigger requested');
    await this.executePendingNotifications();
  }

  /**
   * Get status of all jobs
   */
  getStatus() {
    return {
      running: this.isRunning,
      jobs: this.jobs.map((j) => ({
        name: j.name,
        running: j.job.running || false,
      })),
    };
  }
}

// Singleton instance
const cronService = new CronService();

module.exports = cronService;
