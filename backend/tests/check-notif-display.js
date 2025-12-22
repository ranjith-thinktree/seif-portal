const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'seif',
});

async function checkNotifications() {
  try {
    // Check all notifications
    const [allNotifs] = await pool.query(
      `SELECT id, recipient_id, recipient_role, type, title, message, 
              related_entity_type, related_entity_id, is_read, created_at
       FROM notifications 
       ORDER BY created_at DESC 
       LIMIT 10`
    );

    console.log('\n=== ALL RECENT NOTIFICATIONS ===');
    allNotifs.forEach((n) => {
      console.log(`\n${n.type} (${n.related_entity_type}):`);
      console.log(`  Title: ${n.title}`);
      console.log(`  Message: ${n.message}`);
      console.log(
        `  Recipient: ${n.recipient_id ? n.recipient_id.substring(0, 8) : 'NULL'} (${n.recipient_role})`
      );
      console.log(`  Read: ${n.is_read ? 'Yes' : 'No'}`);
      console.log(`  Created: ${n.created_at}`);
    });

    // Check admin user ID
    const [admins] = await pool.query(
      `SELECT id, email, role FROM users WHERE role IN ('ADMIN', 'SUPER_ADMIN')`
    );
    console.log('\n=== ADMIN USERS ===');
    admins.forEach((a) => console.log(`${a.email} (${a.role}): ${a.id.substring(0, 8)}`));

    // Check unread count for first admin
    if (admins.length > 0) {
      const adminId = admins[0].id;
      const [unread] = await pool.query(
        `SELECT COUNT(*) as count 
         FROM notifications 
         WHERE (recipient_id = ? OR (recipient_role = 'ADMIN' AND recipient_id IS NULL))
           AND is_read = 0`,
        [adminId]
      );
      console.log(`\nUnread notifications for ${admins[0].email}: ${unread[0].count}`);
    }

    // Check center notifications specifically
    const [centerNotifs] = await pool.query(
      `SELECT * FROM notifications 
       WHERE related_entity_type = 'center'
       ORDER BY created_at DESC 
       LIMIT 5`
    );
    console.log('\n=== CENTER NOTIFICATIONS ===');
    console.log(`Found ${centerNotifs.length} center notifications`);
    centerNotifs.forEach((n) => {
      console.log(`\n${n.type}:`);
      console.log(`  Title: ${n.title}`);
      console.log(`  Recipient ID: ${n.recipient_id ? n.recipient_id.substring(0, 8) : 'NULL'}`);
      console.log(`  Recipient Role: ${n.recipient_role}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkNotifications();
