/**
 * Create certification_archived_files table for month-wise file registry.
 * Usage: node scripts/add-certification-file-archive-table.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS certification_archived_files (
  id CHAR(36) NOT NULL,
  certification_pdf_id CHAR(36) NOT NULL,
  certification_upload_id CHAR(36) NOT NULL,
  file_type ENUM('certificate', 'result_sheet') NOT NULL,
  storage_month CHAR(7) NOT NULL COMMENT 'YYYY-MM from assessment date',
  archive_path VARCHAR(500) NOT NULL COMMENT 'Public URL under /uploads',
  original_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_caf_storage_month (storage_month),
  KEY idx_caf_pdf_id (certification_pdf_id),
  KEY idx_caf_upload_id (certification_upload_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  });

  try {
    await connection.execute(CREATE_TABLE);
    console.log('OK: certification_archived_files table ready');
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
})();
