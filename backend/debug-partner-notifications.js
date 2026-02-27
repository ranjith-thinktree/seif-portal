/**
 * Debug Partner Notifications
 * Check what notifications exist for partners and what the API returns
 */

const db = require('./src/database/connection');

async function debugPartnerNotifications() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║     PARTNER NOTIFICATIONS DEBUG                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get Don Bosco Tech Society partner details
    const [partners] = await db.query(`
      SELECT p.id, p.name, u.id as user_id, u.email, u.role
      FROM partners p
      INNER JOIN users u ON u.partner_id = p.id
      WHERE u.email = 'non@seif.in'
      LIMIT 1
    `);

    if (partners.length === 0) {
      console.log('❌ Partner not found');
      process.exit(1);
    }

    const partner = partners[0];
    console.log('📊 Partner Information:');
    console.log('='.repeat(75));
    console.log(`   Name: ${partner.name}`);
    console.log(`   Email: ${partner.email}`);
    console.log(`   User ID: ${partner.user_id}`);
    console.log(`   Partner ID: ${partner.id}`);
    console.log(`   Role: ${partner.role}\n`);

    // Check ALL notifications for this user
    console.log('📋 ALL Notifications for this User:');
    console.log('='.repeat(75));
    const [allNotifs] = await db.query(
      `
      SELECT 
        id,
        recipient_id,
        recipient_role,
        title,
        message,
        alert_type,
        type,
        related_entity_type,
        related_entity_id,
        is_read,
        created_at
      FROM notifications
      WHERE recipient_id = ? OR (recipient_role = ? AND recipient_id IS NULL)
      ORDER BY created_at DESC
      LIMIT 20
    `,
      [partner.user_id, partner.role]
    );

    if (allNotifs.length === 0) {
      console.log('   ❌ No notifications found for this user!\n');
    } else {
      console.log(`   ✅ Found ${allNotifs.length} notifications:\n`);
      allNotifs.forEach((notif, i) => {
        console.log(`   ${i + 1}. [${notif.type}] ${notif.title}`);
        console.log(`      ID: ${notif.id}`);
        console.log(`      Message: ${notif.message}`);
        console.log(`      Alert Type: ${notif.alert_type}`);
        console.log(`      Related Type: ${notif.related_entity_type}`);
        console.log(`      Related ID: ${notif.related_entity_id}`);
        console.log(`      Read: ${notif.is_read ? 'Yes' : 'No'}`);
        console.log(`      Created: ${notif.created_at}`);
        console.log(`      Recipient: ${notif.recipient_id || `Role: ${notif.recipient_role}`}`);
        console.log('');
      });
    }

    // Check refurbishment notifications specifically
    console.log('🔍 Refurbishment Notifications:');
    console.log('='.repeat(75));
    const [refurbNotifs] = await db.query(
      `
      SELECT 
        n.*,
        c.center_name
      FROM notifications n
      LEFT JOIN centers c ON n.related_entity_id = c.id
      WHERE (n.recipient_id = ? OR (n.recipient_role = ? AND n.recipient_id IS NULL))
        AND n.alert_type = 'refurbishment'
      ORDER BY n.created_at DESC
      LIMIT 10
    `,
      [partner.user_id, partner.role]
    );

    if (refurbNotifs.length === 0) {
      console.log('   ℹ️  No refurbishment notifications found\n');
    } else {
      console.log(`   ✅ Found ${refurbNotifs.length} refurbishment notifications:\n`);
      refurbNotifs.forEach((notif, i) => {
        console.log(`   ${i + 1}. ${notif.title}`);
        console.log(`      ID: ${notif.id}`);
        console.log(`      Center: ${notif.center_name || 'N/A'}`);
        console.log(`      Message: ${notif.message}`);
        console.log(`      Read: ${notif.is_read ? 'Yes' : 'No'}`);
        console.log(`      Created: ${notif.created_at}`);
        console.log('');
      });
    }

    // Check unread count
    console.log('📊 Unread Count:');
    console.log('='.repeat(75));
    const [unreadCount] = await db.query(
      `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE (recipient_id = ? OR (recipient_role = ? AND recipient_id IS NULL))
        AND is_read = 0
    `,
      [partner.user_id, partner.role]
    );
    console.log(`   Unread notifications: ${unreadCount[0].count}\n`);

    // Test the grouped notifications query (what the API uses)
    console.log('🔬 Testing Grouped Notifications Query (API Logic):');
    console.log('='.repeat(75));

    const whereClause =
      'WHERE (n.recipient_id = ? OR (n.recipient_role = ? AND n.recipient_id IS NULL)) AND n.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
    const params = [partner.user_id, partner.role, 180];

    // Get center notifications
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
        AND n.type IN ('center_created', 'center_approved')
      ORDER BY n.created_at DESC
      LIMIT 10
    `;

    const [centerNotifs] = await db.query(centerQuery, params);
    console.log(`   Center notifications: ${centerNotifs.length}`);
    if (centerNotifs.length > 0) {
      centerNotifs.forEach((n, i) => {
        console.log(`      ${i + 1}. ${n.title} (${n.type})`);
      });
    }

    // Get upload notifications
    const uploadQuery = `
      SELECT 
        n.related_entity_id as upload_id,
        MAX(n.id) as latest_notification_id,
        MAX(n.created_at) as latest_created_at,
        COUNT(DISTINCT uc.id) as total_centers,
        'upload' as notification_type
      FROM notifications n
      LEFT JOIN uploaded_centers uc ON uc.data_upload_id = n.related_entity_id
      LEFT JOIN data_uploads du ON du.id = n.related_entity_id
      ${whereClause}
        AND n.related_entity_type = 'data_upload'
        AND n.type IN ('upload', 'review')
      GROUP BY n.related_entity_id
      ORDER BY latest_created_at DESC
      LIMIT 10
    `;

    const [uploadNotifs] = await db.query(uploadQuery, params);
    console.log(`   Upload notifications (grouped): ${uploadNotifs.length}`);
    if (uploadNotifs.length > 0) {
      uploadNotifs.forEach((n, i) => {
        console.log(`      ${i + 1}. Upload ID: ${n.upload_id} (${n.total_centers} centers)`);
      });
    }

    console.log('\n   🔴 THE ISSUE:');
    console.log('   The grouped notifications query ONLY looks for:');
    console.log(
      '      - related_entity_type = "center" AND type IN ("center_created", "center_approved")'
    );
    console.log('      - related_entity_type = "data_upload" AND type IN ("upload", "review")');
    console.log('');
    console.log('   But refurbishment notifications have:');
    console.log('      - alert_type = "refurbishment"');
    console.log('      - type = ??? (need to check)');
    console.log('');
    console.log('   They are NOT being included in the grouped query!\n');

    // Check what type refurbishment notifs have
    if (refurbNotifs.length > 0) {
      console.log('📋 Refurbishment Notification Details:');
      console.log('='.repeat(75));
      console.log(
        '   Type values found:',
        [...new Set(refurbNotifs.map((n) => n.type))].join(', ')
      );
      console.log(
        '   Related entity types:',
        [...new Set(refurbNotifs.map((n) => n.related_entity_type))].join(', ')
      );
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

debugPartnerNotifications();
