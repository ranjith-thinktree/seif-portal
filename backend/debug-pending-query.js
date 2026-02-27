/**
 * Debug Pending Notifications Query
 * Check what the query conditions are filtering out
 */

const db = require('./src/database/connection');

async function debugQuery() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     DEBUG PENDING NOTIFICATIONS QUERY                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    const now = new Date();
    console.log(`Current time: ${now.toLocaleString()}\n`);

    // Query 1: All scheduled notifications
    console.log('1️⃣  ALL SCHEDULED NOTIFICATIONS:');
    console.log('='.repeat(70));
    const [all] = await db.query(`
      SELECT id, partner_id, center_id, status, auto_send, 
             next_send_at, partner_responded, max_occurrences, send_count
      FROM scheduled_refurbishment_notifications
    `);
    console.table(all);

    // Query 2: Filter by auto_send = 1
    console.log('\n2️⃣  WITH auto_send = 1:');
    console.log('='.repeat(70));
    const [autoSend] = await db.query(`
      SELECT id, status, auto_send, next_send_at, partner_responded
      FROM scheduled_refurbishment_notifications
      WHERE auto_send = 1
    `);
    console.table(autoSend);

    // Query 3: Filter by status
    console.log("\n3️⃣  WITH auto_send = 1 AND status IN ('pending', 'active'):");
    console.log('='.repeat(70));
    const [withStatus] = await db.query(`
      SELECT id, status, next_send_at, partner_responded
      FROM scheduled_refurbishment_notifications
      WHERE auto_send = 1
        AND status IN ('pending', 'active')
    `);
    console.table(withStatus);

    // Query 4: Filter by next_send_at
    console.log('\n4️⃣  WITH next_send_at <= NOW():');
    console.log('='.repeat(70));
    const [withTime] = await db.query(
      `
      SELECT id, status, next_send_at, partner_responded, 
             CASE WHEN next_send_at <= ? THEN 'DUE' ELSE 'NOT YET' END as timing
      FROM scheduled_refurbishment_notifications
      WHERE auto_send = 1
        AND status IN ('pending', 'active')
        AND next_send_at <= ?
    `,
      [now, now]
    );
    console.table(withTime);

    // Query 5: Filter by partner_responded
    console.log('\n5️⃣  WITH partner_responded filter:');
    console.log('='.repeat(70));
    const [withResponse] = await db.query(
      `
      SELECT id, status, next_send_at, partner_responded,
             CASE WHEN partner_responded IS NULL THEN 'NULL'
                  WHEN partner_responded = 0 THEN '0'
                  ELSE '1' END as responded_value
      FROM scheduled_refurbishment_notifications
      WHERE auto_send = 1
        AND status IN ('pending', 'active')
        AND next_send_at <= ?
        AND (partner_responded IS NULL OR partner_responded = 0)
    `,
      [now]
    );
    console.table(withResponse);

    // Query 6: FULL QUERY (what cron uses)
    console.log('\n6️⃣  FULL PENDING QUERY (what cron uses):');
    console.log('='.repeat(70));
    const [pending] = await db.query(
      `
      SELECT id, status, next_send_at, partner_responded, max_occurrences, send_count
      FROM scheduled_refurbishment_notifications
      WHERE auto_send = 1
        AND status IN ('pending', 'active')
        AND next_send_at <= ?
        AND (partner_responded IS NULL OR partner_responded = 0)
        AND (max_occurrences IS NULL OR send_count < max_occurrences)
      ORDER BY next_send_at ASC
    `,
      [now]
    );

    if (pending.length === 0) {
      console.log('❌ NO PENDING NOTIFICATIONS FOUND!');
      console.log('\nThis means one of the query conditions is filtering them all out.');
    } else {
      console.table(pending);
      console.log(`\n✅ Found ${pending.length} pending notification(s)`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('Debug complete!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.end();
    process.exit(0);
  }
}

debugQuery();
