/**
 * Migration Script - Add student_comments table
 * Run with: node backend/scripts/migrate_comments.js
 */

const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('📦 Reading migration file...');
    const sqlFile = path.join(__dirname, '../migrations/add_student_comments_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('🔄 Applying migration...');
    await pool.query(sql);

    console.log('✅ Migration applied successfully!');
    console.log('📋 student_comments table created');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
