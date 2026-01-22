const db = require('../src/database/connection');

async function clearTables() {
  try {
    await db.query('DELETE FROM course_packages');
    await db.query('DELETE FROM refurbishment_packages');
    console.log('✅ Tables cleared successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

clearTables();
