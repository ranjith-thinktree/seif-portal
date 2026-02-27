const db = require('./src/database/connection');

(async () => {
  try {
    // The notifications table shows notification_id -> center_id (related_entity_id)
    // We need to link this to scheduled_refurbishment_notifications to get packages

    const [notifRows] = await db.query(`
      SELECT * FROM notifications 
      WHERE type = 'alert' AND alert_type = 'refurbishment'
      LIMIT 1
    `);

    const notif = notifRows[0];
    console.log('Sample Notification:', notif);
    console.log('\nNow looking for matching scheduled notification...');

    // Try to find the scheduled notification by center_id and recipient_id
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
      console.log('\n✅ Found matching scheduled notification!');
      console.log('ID:', scheduled[0].id);
      console.log('Packages:', JSON.parse(scheduled[0].packages || '[]').length);
      console.log('Partner Responded:', scheduled[0].partner_responded);
    } else {
      console.log('\n⚠️  No scheduled notification found for this notification');
      console.log('Need to check if notifications are created independently');
    }

    // Check if refurbishment_requests table has any data
    const [requests] = await db.query(`SELECT COUNT(*) as count FROM refurbishment_requests`);
    console.log(`\n refurbishment_requests table: ${requests[0].count} records`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
