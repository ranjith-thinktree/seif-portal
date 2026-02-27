/**
 * Check User-Partner Linkage
 * See if partner users exist for the scheduled notifications
 */

const db = require('./src/database/connection');

async function checkUsers() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║     USER-PARTNER LINKAGE CHECK                                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Get the scheduled notification details
    console.log('1️⃣  Scheduled Notifications:');
    console.log('='.repeat(70));
    const [scheduled] = await db.query(`
      SELECT 
        sn.id,
        sn.partner_id,
        p.name as partner_name,
        sn.center_id,
        c.center_name,
        sn.status
      FROM scheduled_refurbishment_notifications sn
      LEFT JOIN partners p ON sn.partner_id = p.id
      LEFT JOIN centers c ON sn.center_id = c.id
    `);
    console.table(scheduled);

    // Check if users exist for these partners
    console.log('\n2️⃣  Users for these partners:');
    console.log('='.repeat(70));
    for (const notif of scheduled) {
      console.log(`\nPartner: ${notif.partner_name} (${notif.partner_id})`);

      const [users] = await db.query(
        `
        SELECT id, email, role, status, partner_id
        FROM users
        WHERE partner_id = ?
      `,
        [notif.partner_id]
      );

      if (users.length === 0) {
        console.log('  ❌ NO USERS FOUND for this partner!');
      } else {
        console.table(users);

        // Check for PARTNER role + active status
        const validUsers = users.filter((u) => u.role === 'PARTNER' && u.status === 'active');
        if (validUsers.length === 0) {
          console.log('  ⚠️  Users exist but NONE have role=PARTNER and status=active');
        } else {
          console.log(`  ✅ Found ${validUsers.length} valid PARTNER user(s)`);
        }
      }
    }

    // Check notifications table
    console.log('\n\n3️⃣  Notifications in database:');
    console.log('='.repeat(70));
    const [notifications] = await db.query(`
      SELECT 
        n.id,
        n.recipient_id,
        u.email as recipient_email,
        n.type,
        n.alert_type,
        n.title,
        n.is_read,
        n.created_at,
        n.related_entity_type,
        n.related_entity_id
      FROM notifications n
      LEFT JOIN users u ON n.recipient_id = u.id
      WHERE n.alert_type = 'refurbishment'
      ORDER BY n.created_at DESC
      LIMIT 10
    `);

    if (notifications.length === 0) {
      console.log('❌ NO refurbishment notifications found in notifications table!');
      console.log('\nThis confirms notifications are NOT being sent to partners.');
      console.log(
        'Likely cause: No valid users (role=PARTNER, status=active) for the partner_id\n'
      );
    } else {
      console.table(notifications);
      console.log(`\n✅ Found ${notifications.length} refurbishment notification(s)\n`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkUsers();
