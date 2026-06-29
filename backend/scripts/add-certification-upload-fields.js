/**
 * Add certification upload form fields and allow optional batch_id when other_batch_number is used.
 * Usage: node scripts/add-certification-upload-fields.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const COLUMNS = [
  {
    name: 'center_name',
    definition: "VARCHAR(255) NULL COMMENT 'Center name snapshot at submission'",
    after: 'center_id',
  },
  {
    name: 'other_batch_number',
    definition: "VARCHAR(100) NULL COMMENT 'Manual batch number when not selected from dropdown'",
    after: 'batch_id',
  },
  {
    name: 'spoke_name',
    definition: "VARCHAR(255) NULL COMMENT 'Center spoke contact name'",
    after: 'assessment_date',
  },
  {
    name: 'spoke_email',
    definition: "VARCHAR(255) NULL COMMENT 'Center spoke contact email'",
    after: 'spoke_name',
  },
  {
    name: 'spoke_mobile',
    definition: "VARCHAR(20) NULL COMMENT 'Center spoke contact mobile'",
    after: 'spoke_email',
  },
];

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  });

  try {
    for (const col of COLUMNS) {
      const [existing] = await connection.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'certification_uploads'
           AND COLUMN_NAME = ?`,
        [col.name],
      );

      if (existing.length === 0) {
        await connection.execute(
          `ALTER TABLE certification_uploads
           ADD COLUMN ${col.name} ${col.definition} AFTER ${col.after}`,
        );
        console.log(`OK: added ${col.name}`);
      } else {
        console.log(`OK: ${col.name} already exists`);
      }
    }

    const [batchCol] = await connection.execute(
      `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'certification_uploads'
         AND COLUMN_NAME = 'batch_id'`,
    );

    if (batchCol[0]?.IS_NULLABLE === 'NO') {
      await connection.execute(
        `ALTER TABLE certification_uploads
         MODIFY COLUMN batch_id CHAR(36) NULL COMMENT 'FK batches; null when other_batch_number is used'`,
      );
      console.log('OK: batch_id is now nullable');
    } else {
      console.log('OK: batch_id already nullable');
    }
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
})();
