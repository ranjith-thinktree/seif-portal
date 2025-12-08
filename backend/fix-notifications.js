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

    console.log('=== Fixing Existing Notifications ===\n');

    // Update notifications with NULL recipient_role to PARTNER
    const [result1] = await conn.query(`
      UPDATE notifications 
      SET recipient_role = 'PARTNER',
          type = 'review',
          related_entity_type = 'data_upload'
      WHERE recipient_role IS NULL 
        AND type IN ('DATA_APPROVED', 'DATA_REJECTED', 'approval')
        AND recipient_id IS NOT NULL
    `);

    console.log(`Updated ${result1.affectedRows} notifications with recipient_role = PARTNER`);

    // Check the fixed notifications
    const [fixed] = await conn.query(`
      SELECT id, recipient_role, type, title, related_entity_type, related_entity_id
      FROM notifications 
      WHERE recipient_role = 'PARTNER'
      LIMIT 5
    `);

    console.log('\nSample fixed notifications:');
    fixed.forEach((n) => {
      console.log(`- [${n.type}] ${n.title} | Related: ${n.related_entity_type}`);
    });

    await conn.end();
    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
