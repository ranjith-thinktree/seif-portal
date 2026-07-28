/**
 * Find and remove duplicate certification_archived_files rows.
 * Keeps the oldest row per (certification_pdf_id, file_type, original_name).
 *
 * Usage:
 *   node scripts/cleanup-certification-archive-duplicates.js          # report only
 *   node scripts/cleanup-certification-archive-duplicates.js --apply  # delete dupes
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const APPLY = process.argv.includes('--apply');

const FIND_DUPES = `
  SELECT
    certification_pdf_id,
    file_type,
    original_name,
    COUNT(*) AS cnt,
    GROUP_CONCAT(id ORDER BY created_at ASC) AS ids,
    GROUP_CONCAT(archive_path ORDER BY created_at ASC) AS paths
  FROM certification_archived_files
  GROUP BY certification_pdf_id, file_type, original_name
  HAVING COUNT(*) > 1
`;

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  });

  try {
    const [dupes] = await connection.execute(FIND_DUPES);

    if (!dupes.length) {
      console.log('No duplicate archive records found.');
    } else {
      console.log(`Found ${dupes.length} duplicate group(s):`);
      const idsToDelete = [];

      for (const row of dupes) {
        const ids = String(row.ids).split(',');
        const keep = ids[0];
        const remove = ids.slice(1);
        console.log(`\n  pdf=${row.certification_pdf_id} type=${row.file_type} name=${row.original_name}`);
        console.log(`    count=${row.cnt} keep=${keep} remove=[${remove.join(', ')}]`);
        idsToDelete.push(...remove);
      }

      if (APPLY && idsToDelete.length) {
        const placeholders = idsToDelete.map(() => '?').join(',');
        const [result] = await connection.execute(
          `DELETE FROM certification_archived_files WHERE id IN (${placeholders})`,
          idsToDelete
        );
        console.log(`\nDeleted ${result.affectedRows} duplicate row(s).`);
      } else if (idsToDelete.length) {
        console.log(`\nRun with --apply to delete ${idsToDelete.length} duplicate row(s).`);
      }
    }

    const [listDupes] = await connection.execute(`
      SELECT certification_pdf_id, COUNT(DISTINCT id) AS file_rows
      FROM certification_archived_files
      GROUP BY certification_pdf_id
    `);

    const [pdfCounts] = await connection.execute(`
      SELECT COUNT(*) AS total_rows, COUNT(DISTINCT certification_pdf_id) AS distinct_pdfs
      FROM certification_archived_files
    `);

    console.log('\nSummary:', pdfCounts[0]);

    const [overlap] = await connection.execute(`
      SELECT cp.id AS pdf_id, COUNT(*) AS pdf_rows
      FROM certification_pdfs cp
      WHERE cp.status = 'approved'
      GROUP BY cp.id
      HAVING COUNT(*) > 1
    `);
    if (overlap.length) {
      console.log('Note: approved certification_pdfs with multiple rows:', overlap.length);
    }
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
})();
