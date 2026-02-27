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
      "SELECT email, role, status FROM users WHERE role IN ('ADMIN','SUPER_ADMIN','PARTNER') AND status = 'active' LIMIT 8"
    );
    console.table(users);
    await db.end();
  })
  .catch(console.error);
