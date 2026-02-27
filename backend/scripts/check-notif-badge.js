require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  });

  console.log('\n=== Refurbishment Requests (current status) ===');
  const [rr] = await db.query(
    'SELECT id, status, approved_at, partner_completed_at, completion_notified_at FROM refurbishment_requests LIMIT 10'
  );
  console.table(rr);

  console.log('\n=== All notifications (last 30 days) ===');
  const [notifs] = await db.query(
    'SELECT id, type, alert_type, title, is_read, recipient_id, recipient_role, created_at FROM notifications WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) ORDER BY created_at DESC LIMIT 20'
  );
  console.table(notifs);

  console.log('\n=== Unread notifications by type ===');
  const [unread] = await db.query(
    'SELECT type, alert_type, recipient_role, COUNT(*) as cnt FROM notifications WHERE is_read = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 180 DAY) GROUP BY type, alert_type, recipient_role'
  );
  console.table(unread);

  await db.end();
}
check().catch(console.error);
