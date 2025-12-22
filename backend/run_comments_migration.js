/**
 * Migration Script - Add student_comments table
 * Run with: node run_comments_migration.js
 */

const db = require('./src/database/connection');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('📦 Reading migration file...');
    const sqlFile = path.join(__dirname, 'migrations/add_student_comments_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('🔄 Applying migration...');
    await db.query(sql);

    console.log('✅ Migration applied successfully!');
    console.log('📋 student_comments table created');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
