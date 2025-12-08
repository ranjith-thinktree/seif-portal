const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'seif',
    });

    console.log('=== Checking Partner Notifications ===\n');

    // Check all notifications for partners
    const [notifs] = await conn.query(`
      SELECT 
        id, 
        recipient_id, 
        recipient_role, 
        type, 
        title, 
        message,
        related_entity_type,
        related_entity_id,
        created_at 
      FROM notifications 
      WHERE recipient_role IN ('PARTNER', 'partner')
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    console.log(`Found ${notifs.length} partner notifications:\n`);
    notifs.forEach((n, i) => {
      console.log(`${i + 1}. [${n.type}] ${n.title}`);
      console.log(`   Recipient: ${n.recipient_id} | Role: ${n.recipient_role}`);
      console.log(`   Related: ${n.related_entity_type} - ${n.related_entity_id}`);
      console.log(`   Created: ${n.created_at}\n`);
    });

    // Check partner users
    console.log('\n=== Partner Users ===\n');
    const [users] = await conn.query(`
      SELECT id, email, full_name, role, partner_id 
      FROM users 
      WHERE role = 'PARTNER' 
      LIMIT 5
    `);

    users.forEach((u) => {
      console.log(`${u.email} | ID: ${u.id} | Partner: ${u.partner_id}`);
    });

    await conn.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
