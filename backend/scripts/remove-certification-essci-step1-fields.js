/**
 * Drops ESSCI "Initial Response" (step 1) columns from certification_uploads.
 *
 * Run: node backend/scripts/remove-certification-essci-step1-fields.js
 */
'use strict';

const db = require('../src/database/connection');

const COLUMNS = [
  'essci_response_link',
  'essci_response_id',
  'essci_response_password',
  'essci_qr_code_url',
  'essci_qr_code_name',
  'essci_step1_at',
  'essci_step1_by',
];

async function columnExists(table, column) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

async function run() {
  for (const column of COLUMNS) {
    const exists = await columnExists('certification_uploads', column);
    if (!exists) {
      console.log(`Skip ${column} (already removed)`);
      continue;
    }
    await db.query(`ALTER TABLE certification_uploads DROP COLUMN \`${column}\``);
    console.log(`Dropped certification_uploads.${column}`);
  }
  console.log('Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
