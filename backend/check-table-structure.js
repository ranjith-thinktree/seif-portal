const db = require('./src/database/connection');

async function checkTable() {
  try {
    const [cols] = await db.query(`DESCRIBE scheduled_refurbishment_notifications`);
    console.log('\nscheduled_refurbishment_notifications table structure:');
    console.table(cols);

    const [info] = await db.query(`
      SELECT TABLE_COLLATION 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'scheduled_refurbishment_notifications'
    `);
    console.log('\nTable collation:', info[0]?.TABLE_COLLATION);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkTable();
