require('dotenv').config();
const mysql = require('mysql2/promise');
mysql
  .createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  })
  .then(async (db) => {
    const [users] = await db.query(
      'SELECT email, role, status FROM users ORDER BY role, status LIMIT 20'
    );
    console.table(users);

    // Check the refurbishment request owner
    const [rreq] = await db.query(
      'SELECT rr.id, rr.status, rr.partner_id, u.email FROM refurbishment_requests rr LEFT JOIN users u ON u.partner_id = rr.partner_id LIMIT 5'
    );
    console.log('\nRefurbishment requests with owner emails:');
    console.table(rreq);

    await db.end();
  })
  .catch(console.error);
