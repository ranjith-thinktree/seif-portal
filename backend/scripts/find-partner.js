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
    // Find partner who owns the refurbishment notifications
    const [users] = await db.query(
      "SELECT id, email, role FROM users WHERE id = 'ff64776d-1e8c-4518-9fa8-eca534eedf5e'"
    );
    console.log('Partner with refurbishment notifications:');
    console.table(users);
    await db.end();
  })
  .catch(console.error);
