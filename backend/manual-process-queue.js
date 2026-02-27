/**
 * Manual Queue Processor Trigger
 * Manually runs the notification queue processor once
 */

const db = require('./src/database/connection');
const { v4: uuidv4 } = require('uuid');

async function processQueue() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║     MANUAL QUEUE PROCESSOR                                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Check queue
    console.log('📊 Step 1: Checking notification queue...');
    console.log('='.repeat(75));

    const [queueItems] = await db.query(`
      SELECT 
        nq.*,
        p.name as partner_name,
        c.center_name,
        u.id as user_id,
        u.email as partner_email
      FROM notification_queue nq
      INNER JOIN scheduled_refurbishment_notifications srn ON nq.scheduled_notification_id = srn.id
      INNER JOIN partners p ON srn.partner_id = p.id
      INNER JOIN centers c ON srn.center_id = c.id
      INNER JOIN users u ON u.partner_id = p.id AND u.role = 'PARTNER' AND u.status = 'active'
      ORDER BY nq.created_at ASC
    `);

    console.log(`✅ Found ${queueItems.length} items in queue\n`);

    if (queueItems.length === 0) {
      console.log('ℹ️  Queue is empty - nothing to process');
      process.exit(0);
    }

    // Step 2: Process each item
    console.log('🔄 Step 2: Processing queue items...');
    console.log('='.repeat(75));

    let successCount = 0;
    let errorCount = 0;

    for (const item of queueItems) {
      console.log(
        `\n📨 Processing notification ${successCount + errorCount + 1}/${queueItems.length}`
      );
      console.log(`   Partner: ${item.partner_name} (${item.partner_email})`);
      console.log(`   Center: ${item.center_name}`);
      console.log(`   Scheduled at: ${new Date(item.scheduled_at).toLocaleString()}`);
      console.log(`   Queued at: ${new Date(item.created_at).toLocaleString()}`);

      try {
        // Send notification to partner
        const notificationId = uuidv4();
        await db.query(
          `INSERT INTO notifications (
            id, recipient_id, title, message, alert_type,
            related_entity_id, is_read, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
          [
            notificationId,
            item.user_id,
            'Refurbishment Eligibility Notification',
            item.message,
            'refurbishment',
            item.center_id,
          ]
        );

        // Record execution
        const executionId = uuidv4();
        await db.query(
          `
          INSERT INTO scheduled_notification_executions (
            id, scheduled_notification_id, notification_id,
            executed_at, status, partner_id, center_id
          ) VALUES (?, ?, ?, NOW(), 'sent', ?, ?)
        `,
          [
            executionId,
            item.scheduled_notification_id,
            notificationId,
            item.partner_id,
            item.center_id,
          ]
        );

        // Update scheduled notification
        await db.query(
          `
          UPDATE scheduled_refurbishment_notifications
          SET send_count = send_count + 1,
              last_sent_at = NOW(),
              status = CASE 
                WHEN frequency = 'instant' THEN 'completed'
                ELSE 'active'
              END,
              next_send_at = CASE
                WHEN frequency = 'instant' THEN NULL
                WHEN frequency = 'daily' THEN DATE_ADD(NOW(), INTERVAL 1 DAY)
                WHEN frequency = 'weekly' THEN DATE_ADD(NOW(), INTERVAL 1 WEEK)
                WHEN frequency = 'monthly' THEN DATE_ADD(NOW(), INTERVAL 1 MONTH)
                ELSE NULL
              END,
              updated_at = NOW()
          WHERE id = ?
        `,
          [item.scheduled_notification_id]
        );

        // Remove from queue
        await db.query('DELETE FROM notification_queue WHERE id = ?', [item.id]);

        console.log(`   ✅ Successfully sent and removed from queue`);
        console.log(`   Notification ID: ${notificationId}`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error processing: ${error.message}`);

        // Increment retry counter
        await db.query(
          `
          UPDATE notification_queue 
          SET retry_count = retry_count + 1,
              last_retry_at = NOW()
          WHERE id = ?
        `,
          [item.id]
        );

        // Remove if max retries exceeded
        if (item.retry_count >= 2) {
          // Max 3 attempts (0, 1, 2)
          console.log(`   ⚠️  Max retries exceeded - removing from queue`);
          await db.query('DELETE FROM notification_queue WHERE id = ?', [item.id]);

          // Mark as failed
          await db.query(
            `
            INSERT INTO scheduled_notification_executions (
              id, scheduled_notification_id, notification_id,
              executed_at, status, error_message, partner_id, center_id
            ) VALUES (?, ?, NULL, NOW(), 'failed', ?, ?, ?)
          `,
            [
              uuidv4(),
              item.scheduled_notification_id,
              error.message,
              item.partner_id,
              item.center_id,
            ]
          );
        }

        errorCount++;
      }
    }

    // Step 3: Summary
    console.log('\n' + '='.repeat(75));
    console.log('📊 PROCESSING COMPLETE');
    console.log('='.repeat(75));
    console.log(`   ✅ Successfully sent: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📈 Success rate: ${((successCount / queueItems.length) * 100).toFixed(1)}%`);

    // Check remaining queue
    const [remainingCheck] = await db.query('SELECT COUNT(*) as count FROM notification_queue');
    console.log(`\n   📋 Remaining in queue: ${remainingCheck[0].count}`);

    console.log('\n✅ Queue processing complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Queue processing failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

processQueue();
