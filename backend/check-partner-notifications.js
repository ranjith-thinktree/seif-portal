/**
 * Check Partner Notifications
 * See if notifications were actually sent to partners
 */

const db = require('./src/database/connection');

async function checkPartnerNotifications() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║     PARTNER NOTIFICATIONS CHECK                                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Check refurbishment_notifications table
    console.log('📧 Refurbishment Notifications Sent to Partners:');
    console.log('='.repeat(70));
    const [rows] = await db.query(`
      SELECT 
        rn.id,
        rn.partner_id,
        p.name as partner_name,
        rn.center_id,
        c.center_name,
        rn.notification_type,
        rn.message,
        rn.created_at,
        rn.is_read,
        rn.read_at
      FROM refurbishment_notifications rn
      LEFT JOIN partners p ON rn.partner_id = p.id
      LEFT JOIN centers c ON rn.center_id = c.id
      ORDER BY rn.created_at DESC
      LIMIT 20
    `);

    if (rows.length === 0) {
      console.log('❌ NO partner notifications found!\n');
      console.log('This means notifications from scheduled_refurbishment_notifications');
      console.log('are NOT being sent to partners in refurbishment_notifications table.\n');
    } else {
      console.table(
        rows.map((r) => ({
          partner: r.partner_name,
          center: r.center_name,
          type: r.notification_type,
          created: new Date(r.created_at).toLocaleString(),
          read: r.is_read ? 'Yes' : 'No',
        }))
      );
      console.log(`\n✅ Found ${rows.length} notification(s) sent to partners\n`);
    }

    // Check the connection between scheduled notifications and partner notifications
    console.log('\n🔗 Scheduled vs Partner Notifications Link:');
    console.log('='.repeat(70));
    const [link] = await db.query(`
      SELECT 
        sne.scheduled_notification_id,
        sne.notification_id,
        sne.executed_at,
        sne.status,
        COUNT(rn.id) as partner_notif_count
      FROM scheduled_notification_executions sne
      LEFT JOIN refurbishment_notifications rn ON rn.id = sne.notification_id
      GROUP BY sne.id
    `);

    if (link.length > 0) {
      console.table(link);

      const missingLinks = link.filter((l) => l.partner_notif_count === 0);
      if (missingLinks.length > 0) {
        console.log(
          `\n⚠️  ${missingLinks.length} execution(s) have NO corresponding partner notification!`
        );
        console.log(
          "This means the notification_id in executions doesn't match refurbishment_notifications"
        );
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkPartnerNotifications();
