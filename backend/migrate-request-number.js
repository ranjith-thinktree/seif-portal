const db = require('./src/database/connection');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    console.log('Running migration: add_request_number_to_refurbishment.sql\n');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../db/add_request_number_to_refurbishment.sql'),
      'utf8'
    );

    // Split by semicolons to execute each statement separately
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('--')); // Remove comments and empty statements

    for (const statement of statements) {
      if (statement) {
        console.log('Executing:', statement.substring(0, 80) + '...');
        await db.query(statement);
        console.log('✅ Success');
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nVerifying column was added...');

    const [columns] = await db.query(`
      SHOW COLUMNS FROM scheduled_refurbishment_notifications LIKE 'request_number'
    `);

    if (columns.length > 0) {
      console.log('✅ request_number column exists:');
      console.log(columns[0]);
    } else {
      console.log('❌ request_number column NOT found');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
})();
