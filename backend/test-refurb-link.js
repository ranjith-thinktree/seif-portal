const db = require('./src/database/connection');

(async () => {
  try {
    // Get a sample refurbishment notification
    const [notifications] = await db.query(`
      SELECT * FROM notifications 
      WHERE type = 'alert' AND alert_type = 'refurbishment'
      LIMIT 1
    `);

    if (notifications.length === 0) {
      console.log('❌ No refurbishment notifications found');
      process.exit(0);
    }

    const notif = notifications[0];
    console.log('✅ Sample Notification:');
    console.log('   ID:', notif.id);
    console.log('   Title:', notif.title);
    console.log('   Center ID (related_entity_id):', notif.related_entity_id);
    console.log('   Recipient ID:', notif.recipient_id);

    // Try to find matching scheduled notification
    const [scheduled] = await db.query(
      `
      SELECT * FROM scheduled_refurbishment_notifications
      WHERE center_id = ? AND partner_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [notif.related_entity_id, notif.recipient_id]
    );

    if (scheduled.length > 0) {
      console.log('\n✅ Found Scheduled Notification:');
      console.log('   ID:', scheduled[0].id);
      const packages = JSON.parse(scheduled[0].packages || '[]');
      console.log('   Packages Count:', packages.length);
      console.log('   Sample Package:', packages[0]);
      console.log('   Partner Responded:', scheduled[0].partner_responded);
      console.log('   Response Received At:', scheduled[0].response_received_at);
    } else {
      console.log('\n⚠️  No scheduled notification found');
    }

    // Check refurbishment_requests table
    const [requests] = await db.query(`SELECT COUNT(*) as count FROM refurbishment_requests`);
    console.log(`\nRefurbishment Requests in DB: ${requests[0].count} records`);

    //Check partner and center info
    const [centers] = await db.query(
      `SELECT id, center_name, partner_id FROM centers WHERE id = ?`,
      [notif.related_entity_id]
    );
    const [partners] = await db.query(`SELECT id, organization_name FROM partners WHERE id = ?`, [
      notif.recipient_id,
    ]);

    console.log('\nCenter:', centers[0]?.center_name);
    console.log('Partner:', partners[0]?.organization_name);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
