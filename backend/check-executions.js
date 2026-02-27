/**
 * Check Execution History
 * See if any notifications were actually executed
 */

const db = require('./src/database/connection');

async function checkExecutions() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     EXECUTION HISTORY CHECK                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Check execution records
    console.log('📋 EXECUTION RECORDS:');
    console.log('='.repeat(70));
    const [executions] = await db.query(`
      SELECT 
        id,
        scheduled_notification_id,
        executed_at,
        status,
        notifications_sent,
        error_message
      FROM scheduled_notification_executions
      ORDER BY executed_at DESC
      LIMIT 10
    `);

    if (executions.length === 0) {
      console.log('❌ No execution records found\n');
    } else {
      console.table(executions);
      console.log(`\n✅ Found ${executions.length} execution(s)\n`);
    }

    // Check completed notifications
    console.log('\n📨 COMPLETED NOTIFICATIONS:');
    console.log('='.repeat(70));
    const [completed] = await db.query(`
      SELECT 
        id,
        status,
        send_count,
        last_sent_at,
        next_send_at,
        created_at,
        updated_at
      FROM scheduled_refurbishment_notifications
      WHERE status = 'completed'
    `);

    if (completed.length === 0) {
      console.log('No completed notifications\n');
    } else {
      console.table(completed);
    }

    // Check partner refurbishment notifications
    console.log('\n🔔 PARTNER REFURBISHMENT NOTIFICATIONS (sent to partners):');
    console.log('='.repeat(70));
    const [partnerNotifs] = await db.query(`
      SELECT 
        id,
        partner_id,
        center_id,
        notification_type,
        created_at,
        is_read
      FROM refurbishment_notifications
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (partnerNotifs.length === 0) {
      console.log('❌ No partner notifications found\n');
    } else {
      console.table(partnerNotifs);
      console.log(`\n✅ Found ${partnerNotifs.length} partner notification(s)\n`);
    }

    console.log('='.repeat(70));
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkExecutions();
