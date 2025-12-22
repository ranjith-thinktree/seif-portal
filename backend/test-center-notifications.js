const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'seif',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testNotifications() {
  try {
    // Check center notifications
    const [centerNotifs] = await pool.query(
      `SELECT 
        id, recipient_id, type, title, message, 
        related_entity_type, related_entity_id, 
        is_read, created_at 
       FROM notifications 
       WHERE type IN ('center_created', 'center_approved')
       ORDER BY created_at DESC 
       LIMIT 5`
    );
    console.log('\n=== CENTER NOTIFICATIONS ===');
    console.log(centerNotifs);

    // Check who are the recipients
    if (centerNotifs.length > 0) {
      const recipientIds = centerNotifs.map((n) => n.recipient_id);
      const [users] = await pool.query(`SELECT id, email, role FROM users WHERE id IN (?)`, [
        recipientIds,
      ]);
      console.log('\n=== RECIPIENTS ===');
      console.log(users);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testNotifications();
