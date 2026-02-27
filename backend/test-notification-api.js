/**
 * Test Notification API Response
 * Simulates what the partner sees when they check inbox
 */

const db = require('./src/database/connection');

async function testNotificationAPI() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║     TEST NOTIFICATION API RESPONSE                                ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get Don Bosco Tech Society partner
    const [partners] = await db.query(`
      SELECT u.id as user_id, u.email, u.role
      FROM users u
      WHERE u.email = 'non@seif.in'
      LIMIT 1
    `);

    const partner = partners[0];
    const userId = partner.user_id;
    const role = partner.role;

    console.log('👤 Testing as Partner:');
    console.log('='.repeat(75));
    console.log(`   Email: ${partner.email}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Role: ${role}\n`);

    // Run the EXACT query that the API uses (with the fix)
    const whereClause =
      'WHERE (n.recipient_id = ? OR (n.recipient_role = ? AND n.recipient_id IS NULL)) AND n.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
    const params = [userId, role, 180];

    const centerQuery = `
      SELECT 
        n.id,
        n.related_entity_id as center_id,
        n.created_at,
        n.type,
        n.alert_type,
        n.title,
        n.message,
        n.remark,
        n.is_read,
        n.payload,
        'center' as notification_type
      FROM notifications n
      ${whereClause}
        AND n.related_entity_type = 'center'
        AND n.type IN ('center_created', 'center_approved', 'alert')
      ORDER BY n.created_at DESC
    `;

    console.log('📋 Center Notifications Query Result:');
    console.log('='.repeat(75));
    const [centerNotifs] = await db.query(centerQuery, params);
    console.log(`   Found: ${centerNotifs.length} notifications\n`);

    if (centerNotifs.length > 0) {
      centerNotifs.forEach((notif, i) => {
        console.log(`   ${i + 1}. ${notif.title}`);
        console.log(`      ID: ${notif.id}`);
        console.log(`      Type: ${notif.type}`);
        console.log(`      Alert Type: ${notif.alert_type}`);
        console.log(`      Message: ${notif.message}`);
        console.log(`      Read: ${notif.is_read ? 'Yes' : 'No'}`);
        console.log(`      Created: ${new Date(notif.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // Check unread count
    const [unreadCount] = await db.query(
      `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE (recipient_id = ? OR (recipient_role = ? AND recipient_id IS NULL))
        AND is_read = 0
    `,
      [userId, role]
    );

    console.log('📊 Unread Count:');
    console.log('='.repeat(75));
    console.log(`   Unread: ${unreadCount[0].count}\n`);

    if (centerNotifs.length > 0) {
      console.log('✅ SUCCESS! Notifications are now being returned by the API');
      console.log('   Partner should see these notifications in their inbox.');
      console.log('\n💡 Next Steps:');
      console.log('   1. Open the partner portal');
      console.log('   2. Login as: non@seif.in');
      console.log('   3. Click the bell icon');
      console.log(`   4. You should see ${centerNotifs.length} notifications displayed`);
    } else {
      console.log('⚠️  No notifications returned. Check if partner has any notifications.');
    }

    console.log('\n' + '='.repeat(75));
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testNotificationAPI();
