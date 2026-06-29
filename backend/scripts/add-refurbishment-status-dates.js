require('dotenv').config();
const mysql = require('mysql2/promise');

const COLUMNS = [
  {
    name: 'material_procurement_at',
    definition:
      "DATETIME NULL COMMENT 'Date when Material Procurement Completed step was recorded'",
    after: 'approved_at',
  },
  {
    name: 'installation_in_progress_at',
    definition:
      "DATETIME NULL COMMENT 'Date when installation in progress step was completed'",
    after: 'material_procurement_at',
  },
];

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  });

  try {
    for (const col of COLUMNS) {
      const [existing] = await c.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'refurbishment_requests'
           AND COLUMN_NAME = ?`,
        [col.name],
      );

      if (existing.length === 0) {
        await c.execute(
          `ALTER TABLE refurbishment_requests
           ADD COLUMN ${col.name} ${col.definition} AFTER ${col.after}`,
        );
        console.log(`OK: added ${col.name}`);
      } else {
        console.log(`OK: ${col.name} already exists`);
      }
    }
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  }

  await c.end();
})();
