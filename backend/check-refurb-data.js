const db = require('./src/database/connection');

(async () => {
  try {
    console.log('Checking refurbishment notification data...\n');

    const [notifications] = await db.query(`
      SELECT id, type, alert_type, title, message, remark,
             related_entity_id, related_entity_type, payload,
             recipient_id, created_at
      FROM notifications 
      WHERE type = 'alert' AND alert_type = 'refurbishment' 
      LIMIT 3
    `);

    console.log('=== NOTIFICATIONS TABLE ===');
    notifications.forEach((n, i) => {
      console.log(`\n${i + 1}. Notification ID: ${n.id}`);
      console.log(`   Title: ${n.title}`);
      console.log(`   Message: ${n.message}`);
      console.log(`   Recipient ID: ${n.recipient_id}`);
      console.log(`   Related Entity ID: ${n.related_entity_id}`);
      console.log(`   Related Entity Type: ${n.related_entity_type}`);
      console.log(`   Remark:`, n.remark);
      console.log(`   Payload:`, n.payload ? JSON.parse(n.payload) : null);
      console.log(`   Created At:`, n.created_at);
    });

    if (notifications.length > 0) {
      // Get center_ids from notifications (related_entity_id points to center)
      const centerIds = [...new Set(notifications.map((n) => `'${n.related_entity_id}'`))].join(
        ','
      );
      const recipientIds = [...new Set(notifications.map((n) => `'${n.recipient_id}'`))].join(',');

      // Find scheduled refurbishment notifications by matching center_id and partner_id
      const [scheduled] = await db.query(`
        SELECT id, partner_id, center_id, message, packages,
               scheduled_at, created_at, partner_responded, response_received_at
        FROM scheduled_refurbishment_notifications
        WHERE center_id IN (${centerIds})
          AND partner_id IN (${recipientIds})
        ORDER BY created_at DESC
      `);

      console.log('\n\n=== SCHEDULED REFURBISHMENT NOTIFICATIONS ===');
      if (scheduled.length === 0) {
        console.log(
          '\n⚠️  No scheduled refurbishment notifications found for these centers/partners'
        );
        console.log('This might mean:');
        console.log('  1. The notifications were created independently');
        console.log('  2. The scheduled notifications were deleted');
        console.log('  3. The notification system creates notifications without scheduled entries');
      } else {
        scheduled.forEach((s, i) => {
          console.log(`\n${i + 1}. Scheduled Notification ID: ${s.id}`);
          console.log(`   Partner ID: ${s.partner_id}`);
          console.log(`   Center ID: ${s.center_id}`);
          console.log(`   Message: ${s.message}`);
          console.log(`   Scheduled At: ${s.scheduled_at}`);
          console.log(`   Created At: ${s.created_at}`);
          console.log(`   Partner Responded: ${s.partner_responded}`);
          console.log(`   Response Received At: ${s.response_received_at}`);

          if (s.packages) {
            const packages = JSON.parse(s.packages);
            console.log(`   Packages Count: ${packages.length}`);
            console.log(`   Sample Packages:`, packages.slice(0, 2));
          }
        });
      }

      // Also get center info
      if (centerIds) {
        const [centers] = await db.query(`
          SELECT id, center_name, organization_id
          FROM centers
          WHERE id IN (${centerIds})
        `);

        console.log('\n\n=== CENTERS ===');
        centers.forEach((c, i) => {
          console.log(`\n${i + 1}. Center ID: ${c.id}`);
          console.log(`   Center Name: ${c.center_name}`);
          console.log(`   Organization ID: ${c.organization_id}`);
        });
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
