require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  });
  try {
    const [cols] = await c.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'refurbishment_request_course_attachments'
         AND COLUMN_NAME = 'package_id'`,
    );
    if (cols.length === 0) {
      await c.execute(`
        ALTER TABLE refurbishment_request_course_attachments
        ADD COLUMN package_id CHAR(36) NULL AFTER course_id,
        ADD INDEX idx_rrca_package_id (package_id)
      `);
      console.log('OK: package_id column added to refurbishment_request_course_attachments');
    } else {
      console.log('OK: package_id column already exists');
    }
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  }
  await c.end();
})();
