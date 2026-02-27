/**
 * End-to-End Notification Test
 * Creates a test notification scheduled for 1 minute from now,
 * then monitors the entire flow to verify partner receives it
 */

const db = require('./src/database/connection');
const { v4: uuidv4 } = require('uuid');

async function testNotificationFlow() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║     END-TO-END NOTIFICATION TEST                                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Get a partner and center for testing
    console.log('🔍 STEP 1: Finding test partner and center...');
    console.log('='.repeat(75));

    const [partners] = await db.query(`
      SELECT 
        p.id, 
        p.name, 
        u.id as user_id, 
        u.email,
        (SELECT COUNT(*) FROM centers WHERE partner_id = p.id) as center_count
      FROM partners p
      INNER JOIN users u ON u.partner_id = p.id
      WHERE u.role = 'PARTNER' AND u.status = 'active'
      HAVING center_count > 0
      ORDER BY center_count DESC
      LIMIT 1
    `);

    if (partners.length === 0) {
      console.log('❌ No active partner users with centers found. Cannot run test.');
      process.exit(1);
    }

    const partner = partners[0];
    console.log(`✅ Found partner: ${partner.name}`);
    console.log(`   Partner ID: ${partner.id}`);
    console.log(`   User Email: ${partner.email}`);
    console.log(`   Centers available: ${partner.center_count}`);

    const [centers] = await db.query(
      `
      SELECT id, center_name
      FROM centers
      WHERE partner_id = ?
      LIMIT 1
    `,
      [partner.id]
    );

    const center = centers[0];
    console.log(`✅ Found center: ${center.center_name}`);
    console.log(`   Center ID: ${center.id}\n`);

    // Step 2: Create a scheduled notification for 1 minute from now
    console.log('📅 STEP 2: Creating scheduled notification (1 minute from now)...');
    console.log('='.repeat(75));

    const now = new Date();
    const scheduledTime = new Date(now.getTime() + 60 * 1000); // 1 minute from now
    const notificationId = uuidv4();

    await db.query(
      `
      INSERT INTO scheduled_refurbishment_notifications (
        id, partner_id, center_id, scheduled_at, frequency, message,
        packages, auto_send, status, next_send_at, send_count,
        partner_responded, created_by, created_at, updated_at, is_manual_request
      ) VALUES (?, ?, ?, ?, 'instant', ?, '[]', 1, 'pending', ?, 0, 0, ?, NOW(), NOW(), 0)
    `,
      [
        notificationId,
        partner.id,
        center.id,
        scheduledTime,
        `TEST: Scheduled notification for ${partner.name} - ${center.center_name}`,
        scheduledTime,
        partner.user_id,
      ]
    );

    console.log(`✅ Created scheduled notification`);
    console.log(`   Notification ID: ${notificationId}`);
    console.log(`   Scheduled for: ${scheduledTime.toLocaleString()}`);
    console.log(`   Current time: ${now.toLocaleString()}`);
    console.log(`   ⏰ Will execute in ~60 seconds\n`);

    // Step 3: Monitor the flow
    console.log('👀 STEP 3: Monitoring notification flow...');
    console.log('='.repeat(75));
    console.log('Watching for:');
    console.log('  1️⃣  MySQL Event queues it (within 1 minute)');
    console.log('  2️⃣  Node cron processes it (within 5 minutes)');
    console.log('  3️⃣  Partner receives notification\n');

    console.log('⏳ Starting 3-minute monitoring...\n');

    const startTime = Date.now();
    const maxMonitorTime = 180000; // 3 minutes
    let queuedTime = null;
    let processedTime = null;
    let deliveredTime = null;

    // Monitor every 5 seconds
    const checkInterval = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      process.stdout.write(`\r⏱️  Elapsed: ${elapsed}s | `);

      try {
        // Check if queued by MySQL Event
        if (!queuedTime) {
          const [queueCheck] = await db.query(
            `
            SELECT created_at 
            FROM notification_queue 
            WHERE scheduled_notification_id = ?
          `,
            [notificationId]
          );

          if (queueCheck.length > 0) {
            queuedTime = Date.now();
            const queueDelay = Math.floor((queuedTime - scheduledTime.getTime()) / 1000);
            console.log(
              `\n\n✅ 1️⃣  QUEUED by MySQL Event! (Delay: ${queueDelay}s after scheduled time)`
            );
            console.log(`   Queued at: ${new Date(queueCheck[0].created_at).toLocaleString()}\n`);
          } else {
            process.stdout.write('Waiting for MySQL Event to queue... ');
          }
        }

        // Check if processed by Node cron
        if (queuedTime && !processedTime) {
          const [processCheck] = await db.query(
            `
            SELECT created_at 
            FROM notification_queue 
            WHERE scheduled_notification_id = ?
          `,
            [notificationId]
          );

          if (processCheck.length === 0) {
            // Queue empty means it was processed!
            processedTime = Date.now();
            const processDelay = Math.floor((processedTime - queuedTime) / 1000);
            console.log(
              `\n✅ 2️⃣  PROCESSED by Node cron! (Processed in: ${processDelay}s after queuing)`
            );
            console.log(`   Queue cleared at: ${new Date().toLocaleString()}\n`);
          } else {
            process.stdout.write('Queued, waiting for Node cron... ');
          }
        }

        // Check if delivered to partner
        if (processedTime && !deliveredTime) {
          const [deliveryCheck] = await db.query(
            `
            SELECT n.id, n.created_at, n.is_read
            FROM notifications n
            WHERE n.recipient_id = ?
              AND n.alert_type = 'refurbishment'
              AND n.related_entity_id = ?
              AND n.created_at >= ?
            ORDER BY n.created_at DESC
            LIMIT 1
          `,
            [partner.user_id, center.id, now]
          );

          if (deliveryCheck.length > 0) {
            deliveredTime = Date.now();
            const totalTime = Math.floor((deliveredTime - startTime) / 1000);
            console.log(
              `\n✅ 3️⃣  DELIVERED to partner! (Total time: ${totalTime}s from test start)`
            );
            console.log(`   Notification ID: ${deliveryCheck[0].id}`);
            console.log(
              `   Delivered at: ${new Date(deliveryCheck[0].created_at).toLocaleString()}`
            );
            console.log(`   Read status: ${deliveryCheck[0].is_read ? 'Read' : 'Unread'}\n`);

            // Success! Show final summary
            clearInterval(checkInterval);
            await showFinalSummary(notificationId, partner, center, {
              scheduled: scheduledTime,
              queued: queuedTime,
              processed: processedTime,
              delivered: deliveredTime,
              start: startTime,
            });
            process.exit(0);
          } else {
            process.stdout.write('Processed, waiting for delivery... ');
          }
        }

        // Timeout check
        if (Date.now() - startTime > maxMonitorTime) {
          clearInterval(checkInterval);
          console.log('\n\n⏰ Monitoring timeout (3 minutes expired)');
          await showTimeoutAnalysis(notificationId, partner, center, {
            queuedTime,
            processedTime,
            deliveredTime,
          });
          process.exit(1);
        }
      } catch (error) {
        console.error('\n❌ Monitoring error:', error.message);
        clearInterval(checkInterval);
        process.exit(1);
      }
    }, 5000); // Check every 5 seconds
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

async function showFinalSummary(notificationId, partner, center, times) {
  console.log('═'.repeat(75));
  console.log('🎉 TEST SUCCESSFUL - COMPLETE NOTIFICATION FLOW VERIFIED!');
  console.log('═'.repeat(75));

  // Calculate timings
  const queueDelay = Math.floor((times.queued - times.scheduled.getTime()) / 1000);
  const processDelay = Math.floor((times.processed - times.queued) / 1000);
  const deliveryDelay = Math.floor((times.delivered - times.processed) / 1000);
  const totalTime = Math.floor((times.delivered - times.start) / 1000);

  console.log('\n📊 TIMING BREAKDOWN:');
  console.log(`   1. Scheduled → Queued:    ${queueDelay}s (MySQL Event)`);
  console.log(`   2. Queued → Processed:    ${processDelay}s (Node Cron)`);
  console.log(`   3. Processed → Delivered: ${deliveryDelay}s (Send Notification)`);
  console.log(`   ────────────────────────────────────────`);
  console.log(`   ⏱️  TOTAL TIME:             ${totalTime}s`);

  // Check execution log
  const [execLog] = await db.query(
    `
    SELECT status, executed_at, notification_id
    FROM scheduled_notification_executions
    WHERE scheduled_notification_id = ?
    ORDER BY executed_at DESC
    LIMIT 1
  `,
    [notificationId]
  );

  console.log('\n📋 EXECUTION RECORD:');
  if (execLog.length > 0) {
    console.log(`   ✅ Execution logged: ${execLog[0].status}`);
    console.log(`   Executed at: ${new Date(execLog[0].executed_at).toLocaleString()}`);
    console.log(`   Notification ID: ${execLog[0].notification_id}`);
  } else {
    console.log('   ⚠️  No execution record found (unexpected)');
  }

  // Check scheduled notification status
  const [schedStatus] = await db.query(
    `
    SELECT status, send_count, last_sent_at
    FROM scheduled_refurbishment_notifications
    WHERE id = ?
  `,
    [notificationId]
  );

  console.log('\n📅 SCHEDULED NOTIFICATION STATUS:');
  if (schedStatus.length > 0) {
    console.log(`   Status: ${schedStatus[0].status}`);
    console.log(`   Send Count: ${schedStatus[0].send_count}`);
    console.log(
      `   Last Sent: ${schedStatus[0].last_sent_at ? new Date(schedStatus[0].last_sent_at).toLocaleString() : 'Never'}`
    );
  }

  console.log('\n👤 PARTNER CONFIRMATION:');
  console.log(`   Partner: ${partner.name} (${partner.email})`);
  console.log(`   Center: ${center.center_name}`);
  console.log(`   User ID: ${partner.user_id}`);
  console.log(`   ✅ Notification delivered to partner's account`);

  console.log('\n🔍 HOW TO VERIFY IN UI:');
  console.log(`   1. Log in as: ${partner.email}`);
  console.log(`   2. Check bell icon (notifications)`);
  console.log(`   3. Look for: "Refurbishment Eligibility Notification"`);
  console.log(`   4. Center: ${center.center_name}`);

  console.log('\n✅ ALL SYSTEMS WORKING CORRECTLY!');
  console.log('═'.repeat(75));
}

async function showTimeoutAnalysis(notificationId, partner, center, status) {
  console.log('\n═'.repeat(75));
  console.log('⚠️  TIMEOUT - ANALYZING WHAT HAPPENED');
  console.log('═'.repeat(75));

  console.log('\n📊 STATUS SUMMARY:');
  console.log(`   MySQL Event Queuing: ${status.queuedTime ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`   Node Cron Processing: ${status.processedTime ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`   Partner Delivery: ${status.deliveredTime ? '✅ SUCCESS' : '❌ FAILED'}`);

  // Check current state
  console.log('\n🔍 CURRENT STATE CHECK:');

  const [schedCheck] = await db.query(
    `
    SELECT status, next_send_at, send_count, auto_send
    FROM scheduled_refurbishment_notifications
    WHERE id = ?
  `,
    [notificationId]
  );

  if (schedCheck.length > 0) {
    const sched = schedCheck[0];
    console.log(`   Scheduled Notification Status: ${sched.status}`);
    console.log(
      `   Next Send At: ${sched.next_send_at ? new Date(sched.next_send_at).toLocaleString() : 'NULL'}`
    );
    console.log(`   Auto Send: ${sched.auto_send ? 'YES' : 'NO'}`);
    console.log(`   Send Count: ${sched.send_count}`);
  }

  const [queueCheck] = await db.query(
    `
    SELECT COUNT(*) as count FROM notification_queue WHERE scheduled_notification_id = ?
  `,
    [notificationId]
  );
  console.log(`   In Queue: ${queueCheck[0].count > 0 ? 'YES' : 'NO'}`);

  const [execCheck] = await db.query(
    `
    SELECT * FROM scheduled_notification_executions WHERE scheduled_notification_id = ?
  `,
    [notificationId]
  );
  console.log(`   Execution Records: ${execCheck.length}`);

  const [notifCheck] = await db.query(
    `
    SELECT COUNT(*) as count 
    FROM notifications 
    WHERE recipient_id = ? AND alert_type = 'refurbishment' AND related_entity_id = ?
  `,
    [partner.user_id, center.id]
  );
  console.log(`   Partner Notifications: ${notifCheck[0].count}`);

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (!status.queuedTime) {
    console.log('   ❌ MySQL Event did not queue notification');
    console.log('   Check: Is event scheduler ON?');
    console.log('   Run: SHOW VARIABLES LIKE "event_scheduler";');
    console.log(
      '   Check: SELECT * FROM mysql_event_execution_log ORDER BY executed_at DESC LIMIT 5;'
    );
  } else if (!status.processedTime) {
    console.log('   ❌ Node cron did not process queue');
    console.log('   Check: Is backend server running?');
    console.log('   Check: Cron service logs');
    console.log('   Try: node -e "require(\'./src/services/cron.service\').manualTrigger()"');
  } else if (!status.deliveredTime) {
    console.log('   ❌ Notification processed but not delivered');
    console.log('   Check: Execution logs for errors');
    console.log('   Check: Partner user exists and is active');
    console.log(
      '   Query: SELECT * FROM scheduled_notification_executions WHERE scheduled_notification_id = "' +
        notificationId +
        '";'
    );
  }

  console.log('\n═'.repeat(75));
}

// Run the test
testNotificationFlow();
