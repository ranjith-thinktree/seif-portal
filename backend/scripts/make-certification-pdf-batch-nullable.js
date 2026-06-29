/**
 * Make certification_pdfs.batch_id nullable.
 *
 * Certification requests can be submitted with a free-text "other batch number"
 * instead of a linked batch, in which case certification_uploads.batch_id is NULL.
 * The certificate package (certification_pdfs) must still be uploadable for those
 * requests, so batch_id needs to allow NULL.
 *
 * Usage: node scripts/make-certification-pdf-batch-nullable.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  });

  try {
    const [[col]] = await connection.execute(
      `SELECT IS_NULLABLE, COLUMN_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'certification_pdfs'
         AND COLUMN_NAME = 'batch_id'`
    );

    if (!col) {
      console.log('SKIP: certification_pdfs.batch_id column not found');
      return;
    }

    if (col.IS_NULLABLE === 'YES') {
      console.log('OK: certification_pdfs.batch_id is already nullable');
      return;
    }

    await connection.execute(
      `ALTER TABLE certification_pdfs
       MODIFY COLUMN batch_id CHAR(36) NULL COMMENT 'Linked batch (NULL for free-text batch numbers)'`
    );
    console.log('OK: certification_pdfs.batch_id is now nullable');
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
})();
