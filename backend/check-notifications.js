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

async function checkNotifications() {
  try {
    // Check admin users
    const [admins] = await pool.query(
      `SELECT id, email, role FROM users WHERE role IN ('ADMIN', 'SUPER_ADMIN')`
    );
    console.log('\n=== ADMIN USERS ===');
    console.log(admins);

    // Check ALL recent notifications
    const [notifications] = await pool.query(
      `SELECT id, recipient_id, type, title, message, related_entity_type, is_read, created_at 
       FROM notifications 
       ORDER BY created_at DESC 
       LIMIT 10`
    );
    console.log('\n=== ALL RECENT NOTIFICATIONS ===');
    console.log(notifications);

    // Check recent centers with pending approval
    const [centers] = await pool.query(
      `SELECT id, center_name, partner_id, approval_status, status, created_at 
       FROM centers 
       WHERE approval_status = 'pending'
       ORDER BY created_at DESC 
       LIMIT 5`
    );
    console.log('\n=== PENDING CENTERS ===');
    console.log(centers);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkNotifications();
