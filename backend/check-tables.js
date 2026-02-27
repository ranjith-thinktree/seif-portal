/**
 * Check Notification Tables
 */

const db = require('./src/database/connection');

async function checkTables() {
  try {
    console.log('\n📋 All tables with "notification" in the name:');
    const [tables] = await db.query(`SHOW TABLES LIKE '%notification%'`);
    console.table(tables);

    console.log('\n📋 All tables in seif database:');
    const [allTables] = await db.query(`SHOW TABLES`);
    console.log('Total tables:', allTables.length);
    const tableNames = allTables.map((t) => Object.values(t)[0]);
    console.log(tableNames.join(', '));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkTables();
