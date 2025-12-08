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

    console.log('=== All Notifications in System ===\n');

    const [all] = await conn.query(`
      SELECT 
        id, 
        recipient_id, 
        recipient_role, 
        type, 
        title,
        related_entity_type,
        related_entity_id,
        created_at 
      FROM notifications 
      ORDER BY created_at DESC 
      LIMIT 20
    `);

    console.log(`Total notifications: ${all.length}\n`);
    all.forEach((n, i) => {
      console.log(`${i + 1}. [${n.recipient_role}/${n.type}] ${n.title}`);
      console.log(`   Related: ${n.related_entity_type} - ${n.related_entity_id}`);
      console.log(`   Created: ${n.created_at}\n`);
    });

    // Count by role
    const [counts] = await conn.query(`
      SELECT recipient_role, COUNT(*) as count 
      FROM notifications 
      GROUP BY recipient_role
    `);

    console.log('\n=== Notifications by Role ===');
    counts.forEach((c) => {
      console.log(`${c.recipient_role}: ${c.count}`);
    });

    // Check data uploads
    console.log('\n=== Recent Data Uploads ===\n');
    const [uploads] = await conn.query(`
      SELECT id, partner_id, file_name, status, created_at 
      FROM data_uploads 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    uploads.forEach((u) => {
      console.log(`${u.file_name} | Status: ${u.status} | Partner: ${u.partner_id}`);
    });

    await conn.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
