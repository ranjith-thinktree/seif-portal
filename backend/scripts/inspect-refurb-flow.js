require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'seif',
  });

  console.log('\n=== refurbishment_requests table structure ===');
  const [cols] = await db.query('DESCRIBE refurbishment_requests');
  console.table(
    cols.map((c) => ({ Field: c.Field, Type: c.Type, Null: c.Null, Default: c.Default }))
  );

  console.log('\n=== All refurbishment_requests rows ===');
  const [rr] = await db.query(
    'SELECT id, status, center_id, created_at, updated_at FROM refurbishment_requests LIMIT 10'
  );
  console.table(rr);

  console.log('\n=== scheduled_refurbishment_notifications (all) ===');
  const [srn] = await db.query(
    'SELECT id, center_id, partner_id, status, request_number, frequency_months, created_at FROM scheduled_refurbishment_notifications LIMIT 10'
  );
  console.table(srn);

  console.log('\n=== Users with PARTNER role (first 5) ===');
  const [users] = await db.query(
    "SELECT id, email, role, partner_id FROM users WHERE role='PARTNER' LIMIT 5"
  );
  console.table(users);

  console.log('\n=== Centers (first 5) ===');
  const [centers] = await db.query('SELECT id, center_name, partner_id FROM centers LIMIT 5');
  console.table(centers);

  console.log('\n=== All Notifications (most recent 15) ===');
  const [notifs] = await db.query(
    'SELECT id, recipient_id, recipient_role, type, alert_type, title, is_read, related_entity_id, created_at FROM notifications ORDER BY created_at DESC LIMIT 15'
  );
  console.table(notifs);

  await db.end();
}
check().catch(console.error);
