/**
 * Test MySQL Events Setup
 * Verifies that the notification queue system is working correctly
 */

const db = require('./src/database/connection');

async function testSetup() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     MYSQL EVENTS NOTIFICATION QUEUE - SETUP TEST              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Test 1: Check if event scheduler is enabled
    console.log('1️⃣  Checking Event Scheduler Status...');
    console.log('='.repeat(70));
    const [schedulerStatus] = await db.query(`SHOW VARIABLES LIKE 'event_scheduler'`);

    if (schedulerStatus.length === 0) {
      console.log('❌ ERROR: Cannot check event_scheduler variable');
    } else {
      const isEnabled = schedulerStatus[0].Value.toUpperCase() === 'ON';
      console.log(`Event Scheduler: ${schedulerStatus[0].Value}`);

      if (isEnabled) {
        console.log('✅ Event scheduler is ENABLED\n');
      } else {
        console.log('❌ Event scheduler is DISABLED');
        console.log('\nTo enable:');
        console.log('1. For AWS RDS: Set event_scheduler=ON in Parameter Group');
        console.log('2. Or run: SET GLOBAL event_scheduler = ON;\n');
      }
    }

    // Test 2: Check if notification_queue table exists
    console.log('\n2️⃣  Checking notification_queue table...');
    console.log('='.repeat(70));
    const [queueTableExists] = await db.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'notification_queue'
    `);

    if (queueTableExists[0].count === 0) {
      console.log('❌ ERROR: notification_queue table does not exist');
      console.log('Run migration: backend/migrations/add_mysql_event_notification_queue.sql\n');
      var queueCount = [{ count: 0 }];
    } else {
      console.log('✅ notification_queue table exists');

      var [queueCount] = await db.query('SELECT COUNT(*) as count FROM notification_queue');
      console.log(`Current queue depth: ${queueCount[0].count} item(s)\n`);
    }

    // Test 3: Check if MySQL Event exists
    console.log('\n3️⃣  Checking MySQL Event...');
    console.log('='.repeat(70));
    const [eventInfo] = await db.query(`
      SELECT 
        EVENT_NAME,
        STATUS,
        EVENT_TYPE,
        INTERVAL_VALUE,
        INTERVAL_FIELD,
        STARTS,
        LAST_EXECUTED,
        CREATED,
        LAST_ALTERED
      FROM INFORMATION_SCHEMA.EVENTS
      WHERE EVENT_SCHEMA = DATABASE()
        AND EVENT_NAME = 'process_scheduled_notifications'
    `);

    if (eventInfo.length === 0) {
      console.log('❌ ERROR: process_scheduled_notifications event does not exist');
      console.log('Run migration: backend/migrations/add_mysql_event_notification_queue.sql\n');
    } else {
      const event = eventInfo[0];
      console.log('✅ MySQL Event exists:');
      console.log(`   Name: ${event.EVENT_NAME}`);
      console.log(`   Status: ${event.STATUS}`);
      console.log(`   Schedule: Every ${event.INTERVAL_VALUE} ${event.INTERVAL_FIELD}`);
      console.log(`   Created: ${event.CREATED}`);
      console.log(`   Last Executed: ${event.LAST_EXECUTED || 'Never'}\n`);

      if (event.STATUS !== 'ENABLED') {
        console.log('⚠️  WARNING: Event exists but is DISABLED');
        console.log('To enable: ALTER EVENT process_scheduled_notifications ENABLE;\n');
      }
    }

    // Test 4: Check event execution log
    console.log('\n4️⃣  Checking Event Execution History...');
    console.log('='.repeat(70));
    const [logTableExists] = await db.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'mysql_event_execution_log'
    `);

    var recentLogs = [];
    if (logTableExists[0].count === 0) {
      console.log('⚠️  WARNING: mysql_event_execution_log table does not exist');
      console.log('Run migration to create it\n');
    } else {
      [recentLogs] = await db.query(`
        SELECT 
          event_name,
          executed_at,
          rows_processed,
          error_message
        FROM mysql_event_execution_log
        WHERE event_name = 'process_scheduled_notifications'
        ORDER BY executed_at DESC
        LIMIT 5
      `);

      if (recentLogs.length === 0) {
        console.log('ℹ️  No execution history yet (event may not have run)');
        console.log('   Wait for next 1-minute cycle or trigger manually\n');
      } else {
        console.log(`✅ Found ${recentLogs.length} recent execution(s):`);
        console.table(
          recentLogs.map((log) => ({
            'Executed At': new Date(log.executed_at).toLocaleString(),
            'Rows Queued': log.rows_processed,
            Status: log.error_message ? '❌ Error' : '✅ Success',
            Error: log.error_message ? log.error_message.substring(0, 50) : '-',
          }))
        );
      }
    }

    // Test 5: Check scheduled notifications
    console.log('\n5️⃣  Checking Scheduled Notifications...');
    console.log('='.repeat(70));
    const [scheduledNotifs] = await db.query(`
      SELECT 
        id,
        partner_id,
        center_id,
        status,
        auto_send,
        next_send_at,
        send_count
      FROM scheduled_refurbishment_notifications
      WHERE status IN ('pending', 'active')
        AND auto_send = 1
    `);

    console.log(`Found ${scheduledNotifs.length} active scheduled notification(s)`);

    if (scheduledNotifs.length > 0) {
      const now = new Date();
      const dueNotifs = scheduledNotifs.filter(
        (n) => n.next_send_at && new Date(n.next_send_at) <= now
      );

      console.log(`   - ${dueNotifs.length} are DUE NOW (should be in queue)`);
      console.log(`   - ${scheduledNotifs.length - dueNotifs.length} scheduled for future\n`);

      if (dueNotifs.length > 0) {
        console.log('Due notifications:');
        console.table(
          dueNotifs.map((n) => ({
            ID: n.id.substring(0, 8) + '...',
            'Next Send': new Date(n.next_send_at).toLocaleString(),
            Status: n.status,
            'Send Count': n.send_count,
          }))
        );
      }
    }

    // Test 6: Cross-check queue vs scheduled
    console.log('\n6️⃣  Cross-Checking Queue vs Scheduled...');
    console.log('='.repeat(70));
    const [queueItems] = await db.query(`
      SELECT scheduled_notification_id, created_at
      FROM notification_queue
    `);

    if (queueItems.length === 0) {
      console.log('ℹ️  Queue is empty');

      const now = new Date();
      const dueNotifs = scheduledNotifs.filter(
        (n) => n.next_send_at && new Date(n.next_send_at) <= now
      );

      if (dueNotifs.length > 0) {
        console.log(`⚠️  But ${dueNotifs.length} notification(s) are DUE!`);
        console.log('   Possible causes:');
        console.log("   - MySQL Event hasn't run yet (wait 1 minute)");
        console.log('   - Event scheduler is disabled');
        console.log('   - Event has errors (check mysql_event_execution_log)');
      } else {
        console.log('✅ No notifications are due yet - queue should be empty');
      }
    } else {
      console.log(`✅ Queue contains ${queueItems.length} item(s) ready for processing`);
      console.table(
        queueItems.map((item) => ({
          'Scheduled Notif ID': item.scheduled_notification_id.substring(0, 8) + '...',
          'Queued At': new Date(item.created_at).toLocaleString(),
        }))
      );
    }

    // Test 7: System Health Summary
    console.log('\n7️⃣  System Health Summary');
    console.log('='.repeat(70));

    const health = {
      eventSchedulerEnabled: schedulerStatus[0]?.Value.toUpperCase() === 'ON',
      queueTableExists: queueTableExists[0].count > 0,
      eventExists: eventInfo.length > 0,
      eventEnabled: eventInfo[0]?.STATUS === 'ENABLED',
      queueDepth: queueCount[0].count,
      scheduledNotifications: scheduledNotifs.length,
      recentExecutions: recentLogs.length,
    };

    const allGood =
      health.eventSchedulerEnabled &&
      health.queueTableExists &&
      health.eventExists &&
      health.eventEnabled;

    if (allGood) {
      console.log('✅ ALL SYSTEMS OPERATIONAL');
      console.log('\nThe notification queue system is ready:');
      console.log('  ✓ MySQL Event Scheduler is ON');
      console.log('  ✓ Queue table exists');
      console.log('  ✓ MySQL Event exists and is enabled');
      console.log('  ✓ Event will run every 1 minute');
      console.log('\nNext steps:');
      console.log('  1. Deploy optimized cron.service.js');
      console.log('  2. Restart backend server');
      console.log('  3. Monitor queue via: SELECT * FROM notification_queue;');
    } else {
      console.log('⚠️  SETUP INCOMPLETE');
      console.log('\nIssues found:');
      if (!health.eventSchedulerEnabled) console.log('  ❌ Event Scheduler is OFF');
      if (!health.queueTableExists) console.log('  ❌ Queue table missing');
      if (!health.eventExists) console.log('  ❌ MySQL Event missing');
      if (!health.eventEnabled) console.log('  ❌ MySQL Event disabled');
      console.log('\nRun the migration script to fix issues.');
    }

    console.log('\n' + '='.repeat(70));
    console.log('Test complete!\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testSetup();
