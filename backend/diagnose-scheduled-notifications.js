/**
 * SCHEDULED NOTIFICATIONS DIAGNOSTIC TOOL
 *
 * This script investigates the current state of scheduled notifications:
 * 1. Checks if cron service is working
 * 2. Lists all scheduled notifications
 * 3. Shows execution history
 * 4. Verifies notification delivery to partners
 * 5. Checks database tables
 */

require('dotenv').config();
const db = require('./src/database/connection');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80) + '\n');
}

async function checkDatabase() {
  section('1. DATABASE CONNECTION CHECK');

  try {
    const [result] = await db.query('SELECT 1 as test');
    log('✅ Database connection successful', 'green');
    return true;
  } catch (error) {
    log('❌ Database connection failed: ' + error.message, 'red');
    return false;
  }
}

async function checkTables() {
  section('2. TABLE STRUCTURE CHECK');

  try {
    // Check scheduled_refurbishment_notifications table
    const [scheduledTable] = await db.query(`
      SHOW TABLES LIKE 'scheduled_refurbishment_notifications'
    `);

    if (scheduledTable.length > 0) {
      log('✅ scheduled_refurbishment_notifications table exists', 'green');

      const [columns] = await db.query(`
        DESCRIBE scheduled_refurbishment_notifications
      `);
      log(`   Table has ${columns.length} columns`, 'blue');
    } else {
      log('❌ scheduled_refurbishment_notifications table NOT FOUND', 'red');
      return false;
    }

    // Check executions table
    const [executionsTable] = await db.query(`
      SHOW TABLES LIKE 'scheduled_notification_executions'
    `);

    if (executionsTable.length > 0) {
      log('✅ scheduled_notification_executions table exists', 'green');
    } else {
      log('⚠️  scheduled_notification_executions table NOT FOUND', 'yellow');
    }

    return true;
  } catch (error) {
    log('❌ Error checking tables: ' + error.message, 'red');
    return false;
  }
}

async function listScheduledNotifications() {
  section('3. SCHEDULED NOTIFICATIONS LIST');

  try {
    const [notifications] = await db.query(`
      SELECT 
        sn.id,
        sn.status,
        sn.frequency,
        sn.auto_send,
        sn.send_count,
        sn.scheduled_at,
        sn.next_send_at,
        sn.last_sent_at,
        sn.is_manual_request,
        p.name as partner_name,
        c.center_name,
        sn.created_at,
        sn.updated_at
      FROM scheduled_refurbishment_notifications sn
      LEFT JOIN partners p ON sn.partner_id = p.id
      LEFT JOIN centers c ON sn.center_id = c.id
      ORDER BY sn.created_at DESC
      LIMIT 20
    `);

    if (notifications.length === 0) {
      log('⚠️  No scheduled notifications found in database', 'yellow');
      log('   This could mean:', 'blue');
      log('   - No notifications have been scheduled yet', 'blue');
      log('   - They were scheduled but already completed and cleaned up', 'blue');
      return;
    }

    log(`Found ${notifications.length} scheduled notification(s):\n`, 'green');

    notifications.forEach((notif, index) => {
      console.log(`${index + 1}. ID: ${notif.id.substring(0, 8)}...`);
      console.log(`   Partner: ${notif.partner_name || 'N/A'}`);
      console.log(`   Center: ${notif.center_name || 'N/A'}`);
      console.log(`   Status: ${notif.status}`);
      console.log(`   Frequency: ${notif.frequency}`);
      console.log(`   Auto-Send: ${notif.auto_send ? 'YES' : 'NO'}`);
      console.log(`   Send Count: ${notif.send_count}`);
      console.log(`   Is Manual Request: ${notif.is_manual_request ? 'YES' : 'NO'}`);
      console.log(`   Scheduled At: ${notif.scheduled_at}`);
      console.log(`   Next Send: ${notif.next_send_at || 'N/A'}`);
      console.log(`   Last Sent: ${notif.last_sent_at || 'Never'}`);
      console.log(`   Created: ${notif.created_at}`);
      console.log(`   Updated: ${notif.updated_at}`);
      console.log('');
    });

    // Status breakdown
    const statusCounts = notifications.reduce((acc, notif) => {
      acc[notif.status] = (acc[notif.status] || 0) + 1;
      return acc;
    }, {});

    log('\nStatus Breakdown:', 'cyan');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
  } catch (error) {
    log('❌ Error listing notifications: ' + error.message, 'red');
  }
}

async function checkPendingNotifications() {
  section('4. PENDING NOTIFICATIONS (Due for Execution)');

  try {
    const [pending] = await db.query(`
      SELECT 
        sn.id,
        sn.frequency,
        sn.next_send_at,
        sn.auto_send,
        p.name as partner_name,
        c.center_name,
        TIMESTAMPDIFF(MINUTE, NOW(), sn.next_send_at) as minutes_until
      FROM scheduled_refurbishment_notifications sn
      LEFT JOIN partners p ON sn.partner_id = p.id
      LEFT JOIN centers c ON sn.center_id = c.id
      WHERE sn.status IN ('pending', 'active')
        AND sn.auto_send = 1
        AND sn.next_send_at <= NOW()
      ORDER BY sn.next_send_at ASC
    `);

    if (pending.length === 0) {
      log('✅ No notifications currently due for execution', 'green');
      log('   This is normal if:', 'blue');
      log('   - Cron job is running and processing notifications on time', 'blue');
      log('   - All scheduled notifications are in the future', 'blue');
      return;
    }

    log(`⚠️  Found ${pending.length} notification(s) DUE FOR EXECUTION:`, 'yellow');
    log('   These SHOULD be sent by the cron job!', 'yellow');
    console.log('');

    pending.forEach((notif, index) => {
      console.log(`${index + 1}. Partner: ${notif.partner_name}`);
      console.log(`   Center: ${notif.center_name}`);
      console.log(`   Next Send: ${notif.next_send_at}`);
      console.log(`   Minutes Overdue: ${Math.abs(notif.minutes_until)}`);
      console.log('');
    });

    log('⚠️  ACTION REQUIRED:', 'red');
    log('   If cron job is running, these should be processed within 5 minutes', 'yellow');
    log('   If they remain unprocessed, check server logs for errors', 'yellow');
  } catch (error) {
    log('❌ Error checking pending: ' + error.message, 'red');
  }
}

async function checkExecutionHistory() {
  section('5. EXECUTION HISTORY');

  try {
    const [executions] = await db.query(`
      SELECT 
        e.id,
        e.executed_at,
        e.status,
        e.error_message,
        sn.frequency,
        p.name as partner_name,
        c.center_name,
        n.title as notification_title
      FROM scheduled_notification_executions e
      JOIN scheduled_refurbishment_notifications sn ON e.scheduled_notification_id = sn.id
      LEFT JOIN partners p ON sn.partner_id = p.id
      LEFT JOIN centers c ON sn.center_id = c.id
      LEFT JOIN notifications n ON e.notification_id = n.id
      ORDER BY e.executed_at DESC
      LIMIT 10
    `);

    if (executions.length === 0) {
      log('⚠️  No execution history found', 'yellow');
      log('   This means:', 'blue');
      log('   - Cron job has NOT executed any notifications yet', 'blue');
      log('   - OR no notifications have been due for execution', 'blue');
      return;
    }

    log(`Found ${executions.length} recent execution(s):\n`, 'green');

    executions.forEach((exec, index) => {
      const statusColor = exec.status === 'success' ? 'green' : 'red';
      const statusIcon = exec.status === 'success' ? '✅' : '❌';

      console.log(`${index + 1}. ${statusIcon} Executed At: ${exec.executed_at}`);
      console.log(`   Partner: ${exec.partner_name || 'N/A'}`);
      console.log(`   Center: ${exec.center_name || 'N/A'}`);
      log(`   Status: ${exec.status}`, statusColor);
      if (exec.error_message) {
        log(`   Error: ${exec.error_message}`, 'red');
      }
      console.log('');
    });

    // Success rate
    const successCount = executions.filter((e) => e.status === 'success').length;
    const successRate = ((successCount / executions.length) * 100).toFixed(1);

    log(
      `\nSuccess Rate: ${successRate}% (${successCount}/${executions.length})`,
      successRate >= 90 ? 'green' : 'yellow'
    );
  } catch (error) {
    log('❌ Error checking execution history: ' + error.message, 'red');
  }
}

async function checkPartnerNotifications() {
  section('6. PARTNER NOTIFICATION RECORDS');

  try {
    // Check recent notifications sent to partners
    const [notifications] = await db.query(`
      SELECT 
        n.id,
        n.created_at,
        n.title,
        n.message,
        n.is_read,
        n.sent_via,
        u.email as partner_email,
        p.name as partner_name,
        c.center_name
      FROM notifications n
      JOIN users u ON n.recipient_id = u.id
      LEFT JOIN partners p ON u.partner_id = p.id
      LEFT JOIN centers c ON n.related_entity_id = c.id
      WHERE n.type = 'alert' 
        AND n.alert_type = 'refurbishment'
        AND n.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY n.created_at DESC
      LIMIT 10
    `);

    if (notifications.length === 0) {
      log('⚠️  No refurbishment notifications found in last 7 days', 'yellow');
      log('   This means partners have NOT received any notifications', 'yellow');
      log('   Possible reasons:', 'blue');
      log('   - No scheduled notifications have been executed yet', 'blue');
      log('   - Cron job is not running', 'blue');
      log('   - auto_send is disabled', 'blue');
      return;
    }

    log(`✅ Found ${notifications.length} notification(s) sent to partners:\n`, 'green');

    notifications.forEach((notif, index) => {
      console.log(`${index + 1}. Sent At: ${notif.created_at}`);
      console.log(`   Partner: ${notif.partner_name}`);
      console.log(`   Email: ${notif.partner_email}`);
      console.log(`   Center: ${notif.center_name || 'N/A'}`);
      console.log(`   Title: ${notif.title}`);
      console.log(`   Read: ${notif.is_read ? 'YES' : 'NO'}`);
      console.log(`   Sent Via: ${notif.sent_via}`);
      console.log('');
    });

    const readCount = notifications.filter((n) => n.is_read).length;
    const readRate = ((readCount / notifications.length) * 100).toFixed(1);

    log(`\nRead Rate: ${readRate}% (${readCount}/${notifications.length})`, 'cyan');
  } catch (error) {
    log('❌ Error checking partner notifications: ' + error.message, 'red');
  }
}

async function checkCronStatus() {
  section('7. CRON JOB STATUS CHECK');

  log('Note: This script cannot directly check if cron job is running', 'yellow');
  log('       It only analyzes the database to infer cron status\n', 'yellow');

  try {
    // Check if there are recent executions (within last 10 minutes)
    const [recentExec] = await db.query(`
      SELECT 
        COUNT(*) as count,
        MAX(executed_at) as last_execution
      FROM scheduled_notification_executions
      WHERE executed_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
    `);

    if (recentExec[0].count > 0) {
      log(`✅ Cron job appears to be RUNNING`, 'green');
      log(`   Last execution: ${recentExec[0].last_execution}`, 'green');
      log(`   Executions in last 10 min: ${recentExec[0].count}`, 'green');
    } else {
      log('⚠️  No recent executions found (last 10 minutes)', 'yellow');
      log('   This could mean:', 'blue');
      log('   - Cron job is running but no notifications were due', 'blue');
      log('   - OR cron job is NOT running', 'blue');
    }

    // Check server start time from process
    log('\nTo verify cron job is running:', 'cyan');
    log('1. Check server console logs for "[CronService] Started 2 cron jobs"', 'blue');
    log(
      '2. Check for "[CronService] Checking for pending notifications..." every 5 minutes',
      'blue'
    );
    log('3. Run: Get-Process -Name node | Select-Object Id, StartTime', 'blue');
  } catch (error) {
    log('❌ Error checking cron status: ' + error.message, 'red');
  }
}

async function recommendations() {
  section('8. RECOMMENDATIONS & NEXT STEPS');

  try {
    const [stats] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM scheduled_refurbishment_notifications) as total_scheduled,
        (SELECT COUNT(*) FROM scheduled_refurbishment_notifications WHERE status = 'pending') as pending,
        (SELECT COUNT(*) FROM scheduled_refurbishment_notifications WHERE status = 'active') as active,
        (SELECT COUNT(*) FROM scheduled_refurbishment_notifications WHERE status = 'completed') as completed,
        (SELECT COUNT(*) FROM scheduled_refurbishment_notifications WHERE auto_send = 1) as auto_send_enabled,
        (SELECT COUNT(*) FROM scheduled_notification_executions) as total_executions,
        (SELECT COUNT(*) FROM scheduled_notification_executions WHERE status = 'success') as successful_executions,
        (SELECT COUNT(*) FROM notifications WHERE alert_type = 'refurbishment' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as recent_partner_notifications
    `);

    const data = stats[0];

    log('System Status Summary:', 'cyan');
    console.log(`  Total Scheduled: ${data.total_scheduled}`);
    console.log(`  Pending: ${data.pending}`);
    console.log(`  Active: ${data.active}`);
    console.log(`  Completed: ${data.completed}`);
    console.log(`  Auto-Send Enabled: ${data.auto_send_enabled}`);
    console.log(`  Total Executions: ${data.total_executions}`);
    console.log(`  Successful Executions: ${data.successful_executions}`);
    console.log(`  Partner Notifications (7 days): ${data.recent_partner_notifications}\n`);

    // Analysis
    if (data.total_scheduled === 0) {
      log('⚠️  No scheduled notifications in system', 'red');
      log('   RECOMMENDATION: Create test notification from admin dashboard', 'yellow');
    } else if (data.total_executions === 0) {
      log('⚠️  Notifications exist but NONE have been executed', 'red');
      log('   LIKELY CAUSE: Cron job is NOT running', 'red');
      log('   RECOMMENDATION:', 'yellow');
      log('   1. Check if backend server is running', 'blue');
      log('   2. Check server startup logs for cron service', 'blue');
      log('   3. Restart server if needed', 'blue');
    } else if (data.recent_partner_notifications === 0 && data.total_executions > 0) {
      log('⚠️  Executions happened but NO partner notifications', 'red');
      log('   LIKELY CAUSE: Notification delivery is failing', 'red');
      log('   RECOMMENDATION: Check execution errors in database', 'yellow');
    } else if (data.recent_partner_notifications > 0) {
      log('✅ System is WORKING CORRECTLY', 'green');
      log('   Partners ARE receiving notifications', 'green');
      log('   Continue monitoring execution history', 'blue');
    }
  } catch (error) {
    log('❌ Error generating recommendations: ' + error.message, 'red');
  }
}

async function runDiagnostics() {
  log('╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         SCHEDULED NOTIFICATIONS DIAGNOSTIC TOOL                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════════╝', 'cyan');

  try {
    const dbOk = await checkDatabase();
    if (!dbOk) {
      log('\n❌ Cannot proceed without database connection', 'red');
      process.exit(1);
    }

    const tablesOk = await checkTables();
    if (!tablesOk) {
      log('\n❌ Required tables not found', 'red');
      process.exit(1);
    }

    await listScheduledNotifications();
    await checkPendingNotifications();
    await checkExecutionHistory();
    await checkPartnerNotifications();
    await checkCronStatus();
    await recommendations();

    section('DIAGNOSTIC COMPLETE');
    log('For more details, check:', 'cyan');
    log('  - Server console logs', 'blue');
    log('  - Database tables directly', 'blue');
    log('  - WebSocket connection logs', 'blue');
  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    await db.closePool();
    process.exit(0);
  }
}

// Run diagnostics
runDiagnostics();
