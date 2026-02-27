const db = require('../src/database/connection');

async function addLastNotifiedAtColumn() {
  try {
    console.log('Adding last_notified_at column to centers table...');

    await db.query(`
      ALTER TABLE centers 
      ADD COLUMN last_notified_at DATETIME NULL 
      COMMENT 'Timestamp of last refurbishment notification sent to partner'
    `);

    console.log('✅ Column added successfully');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Column already exists');
      process.exit(0);
    }
    console.error('❌ Error adding column:', error.message);
    process.exit(1);
  }
}

addLastNotifiedAtColumn();
