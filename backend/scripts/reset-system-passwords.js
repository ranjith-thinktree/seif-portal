/**
 * Reset system account passwords to Password123
 * Usage: node scripts/reset-system-passwords.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const SYSTEM_EMAILS = [
  'superadmin@seif.org',
  'admin@seif.org',
  'readonly@seif.org',
  'essci@seif.org',
];

const NEW_PASSWORD = 'Password123';

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  });

  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  console.log(`\nNew hash: ${hash}\n`);

  for (const email of SYSTEM_EMAILS) {
    const [rows] = await db.query('SELECT id, email, role, status FROM users WHERE email = ?', [
      email,
    ]);
    if (!rows.length) {
      console.log(`⚠️  ${email} — NOT FOUND in database`);
      continue;
    }
    await db.query(
      'UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = NOW() WHERE email = ?',
      [hash, email]
    );
    console.log(`✅ ${email} (${rows[0].role}) — password reset to "${NEW_PASSWORD}"`);
  }

  await db.end();
  console.log('\nDone.');
}

run().catch(console.error);
