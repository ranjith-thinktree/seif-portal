/**
 * Add ESSCI two-step certification workflow fields.
 * Usage: node scripts/add-certification-essci-workflow-fields.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const UPLOAD_COLUMNS = [
  {
    name: 'essci_response_link',
    definition: "VARCHAR(500) NULL COMMENT 'ESSCI step 1 assessment link'",
    after: 'spoke_mobile',
  },
  {
    name: 'essci_response_id',
    definition: "VARCHAR(255) NULL COMMENT 'ESSCI step 1 assessment ID'",
    after: 'essci_response_link',
  },
  {
    name: 'essci_response_password',
    definition: "VARCHAR(255) NULL COMMENT 'ESSCI step 1 assessment password'",
    after: 'essci_response_id',
  },
  {
    name: 'essci_qr_code_url',
    definition: "VARCHAR(500) NULL COMMENT 'ESSCI step 1 QR code file URL'",
    after: 'essci_response_password',
  },
  {
    name: 'essci_qr_code_name',
    definition: "VARCHAR(255) NULL COMMENT 'ESSCI step 1 QR code file name'",
    after: 'essci_qr_code_url',
  },
  {
    name: 'essci_step1_at',
    definition: "DATETIME NULL COMMENT 'When ESSCI submitted step 1'",
    after: 'essci_qr_code_name',
  },
  {
    name: 'essci_step1_by',
    definition: "CHAR(36) NULL COMMENT 'ESSCI user who submitted step 1'",
    after: 'essci_step1_at',
  },
];

const PDF_COLUMNS = [
  {
    name: 'trainees_registered',
    definition: "INT NULL DEFAULT 0 COMMENT 'Students registered for assessment'",
    after: 'trainees_absent',
  },
  {
    name: 'certification_files_json',
    definition: "TEXT NULL COMMENT 'JSON array of uploaded certificate files'",
    after: 'student_list_name',
  },
];

async function ensureColumn(connection, table, col) {
  const [existing] = await connection.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [table, col.name]
  );

  if (existing.length === 0) {
    await connection.execute(
      `ALTER TABLE ${table}
       ADD COLUMN ${col.name} ${col.definition} AFTER ${col.after}`
    );
    console.log(`OK: added ${table}.${col.name}`);
  } else {
    console.log(`OK: ${table}.${col.name} already exists`);
  }
}

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  });

  try {
    for (const col of UPLOAD_COLUMNS) {
      await ensureColumn(connection, 'certification_uploads', col);
    }
    for (const col of PDF_COLUMNS) {
      await ensureColumn(connection, 'certification_pdfs', col);
    }
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
})();
