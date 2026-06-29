/**
 * Verify review API keeps global docs out of package partner_uploaded_images.
 * Usage: node scripts/verify-review-package-images.js [requestId]
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif_db',
  });

  let requestId = process.argv[2];
  if (!requestId) {
    const [rows] = await connection.query(
      `SELECT id FROM refurbishment_requests WHERE status = 'submitted' ORDER BY updated_at DESC LIMIT 1`
    );
    requestId = rows[0]?.id;
  }
  if (!requestId) {
    console.log('No submitted request found.');
    await connection.end();
    return;
  }

  const [attachments] = await connection.query(
    `SELECT file_name, package_id, attachment_type FROM refurbishment_request_course_attachments WHERE refurbishment_request_id = ?`,
    [requestId]
  );

  const [packages] = await connection.query(
    `SELECT rrcp.package_id, rp.package_name
     FROM refurbishment_request_course_packages rrcp
     JOIN refurbishment_packages rp ON rp.id = rrcp.package_id
     WHERE rrcp.refurbishment_request_id = ?`,
    [requestId]
  );

  const globalFiles = attachments.filter((a) => !a.package_id);
  const packageFiles = attachments.filter((a) => a.package_id);

  console.log('Request:', requestId);
  console.log('Global attachments (should NOT show in admin UI):', globalFiles.length);
  globalFiles.forEach((f) => console.log('  -', f.file_name, `(${f.attachment_type})`));
  console.log('Package attachments (should show under packages):', packageFiles.length);
  packageFiles.forEach((f) => console.log('  -', f.file_name, '→', f.package_id));

  await connection.end();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
