require('dotenv').config();
const mysql = require('mysql2/promise');

const COLUMNS = [
  {
    name: 'partner_acknowledgment_consent',
    definition:
      "TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Partner confirmed acknowledgment consent checkbox'",
    after: 'partner_completed_at',
  },
  {
    name: 'partner_acknowledgment_consent_at',
    definition: "DATETIME NULL COMMENT 'When partner submitted acknowledgment consent'",
    after: 'partner_acknowledgment_consent',
  },
  {
    name: 'partner_acknowledgment_consent_text',
    definition:
      "TEXT NULL COMMENT 'Snapshot of consent statement shown to partner at submission'",
    after: 'partner_acknowledgment_consent_at',
  },
  {
    name: 'package_modification_summary',
    definition:
      "JSON NULL COMMENT 'Admin package add/remove summary stored at approval for audit'",
    after: 'admin_remarks',
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
