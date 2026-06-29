/**
 * Extend refurbishment_request_course_attachments.attachment_type enum
 * to support partner submission document types.
 *
 * Usage: node scripts/add-refurbishment-attachment-types.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif_db',
  });

  try {
    await connection.query(`
      ALTER TABLE refurbishment_request_course_attachments
      MODIFY COLUMN attachment_type ENUM(
        'partner_before',
        'admin_completion',
        'partner_completion',
        'refurbishment_submission',
        'upgradation_submission',
        'package_attachment'
      ) DEFAULT 'partner_before'
      COMMENT 'Type of attachment: condition photos, submission docs, completion proof, etc.'
    `);
    console.log('attachment_type enum updated successfully.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
