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
    "SELECT id, email, role, password_hash FROM users WHERE email = 'admin@seif.org'"
  );
  await db.end();

  if (!rows.length) {
    console.log('admin@seif.org not found');
    return;
  }
  const { password_hash, email } = rows[0];
  console.log(`\nUser: ${email}, hash prefix: ${password_hash.slice(0, 20)}...`);

  const candidates = [
    'Admin@123',
    'Admin123!',
    'Password123',
    'Admin1234',
    'admin#123',
    'Seif@1234',
    'Seif123!',
    'seif123',
    'admin',
  ];
  for (const pw of candidates) {
    const match = await bcrypt.compare(pw, password_hash);
    if (match) {
      console.log(`\n✅ PASSWORD FOUND: "${pw}"`);
      return;
    }
  }
  console.log('\n❌ None of the candidate passwords matched.');
  console.log('Full hash:', password_hash);
}

check().catch(console.error);
