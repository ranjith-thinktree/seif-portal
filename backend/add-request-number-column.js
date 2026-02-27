const db = require('./src/database/connection');

(async () => {
  try {
    console.log('Adding request_number column to scheduled_refurbishment_notifications...\n');

    // Add column
    await db.query(`
      ALTER TABLE scheduled_refurbishment_notifications 
      ADD COLUMN request_number INT(11) DEFAULT NULL 
      COMMENT 'Sequential request number for RQ-XXXXX format' 
      AFTER id
    `);
    console.log('✅ Column added');

    // Add index
    await db.query(`
      CREATE INDEX idx_request_number 
      ON scheduled_refurbishment_notifications(request_number)
    `);
    console.log('✅ Index created');

    // Verify
    const [columns] = await db.query(`
      SHOW COLUMNS FROM scheduled_refurbishment_notifications 
      WHERE Field = 'request_number'
    `);

    console.log('\n✅ Migration successful!');
    console.log('Column info:', columns[0]);

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
