const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif_portal',
    multipleStatements: true,
  });

  try {
    const sqlFile = path.join(__dirname, 'add_version_and_edit_logs.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('Running migration: add_version_and_edit_logs.sql');
    await connection.query(sql);
    console.log('✓ Migration completed successfully!');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
