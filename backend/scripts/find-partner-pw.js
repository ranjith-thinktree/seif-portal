require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function check() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  });

  const [rows] = await db.query(
    "SELECT id, email, role, password_hash FROM users WHERE email IN ('tatasteel@seif.in','arsdc@seif.in','srisri@seif.in') LIMIT 3"
  );
  await db.end();

  const candidates = ['Password123', 'Admin@123', 'Partner@123', 'Seif@1234', 'seif123', 'admin'];
  for (const row of rows) {
    console.log(`\nChecking ${row.email}...`);
    for (const pw of candidates) {
      const match = await bcrypt.compare(pw, row.password_hash);
      if (match) {
        console.log(`  ✅ Password: "${pw}"`);
        break;
      }
    }
  }
  console.log('\nDone.');
}

check().catch(console.error);
