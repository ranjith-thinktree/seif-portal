require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const requestId = process.argv[2] || '5df88506-bfb0-4edb-83d0-46f01a5a71ae';
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif_db',
  });

  const [partnerImages] = await connection.query(
    `SELECT id, package_id, file_url, file_name, file_mime_type, attachment_type
     FROM refurbishment_request_course_attachments WHERE refurbishment_request_id = ?`,
    [requestId]
  );

  const resolveSupportingDocumentType = (att) => {
    const attachmentType = (att.attachment_type || '').toLowerCase();
    const name = (att.file_name || '').toLowerCase();
    if (attachmentType === 'upgradation_submission' || name.includes('upgradation')) {
      return 'upgradation';
    }
    if (
      attachmentType === 'refurbishment_submission' ||
      name.includes('refurbishment-document') ||
      name.includes('refurbishment_document') ||
      name.includes('refurbishment')
    ) {
      return 'refurbishment';
    }
    if (!att.package_id && attachmentType === 'partner_before') {
      return 'refurbishment';
    }
    return 'other';
  };

  const supportingDocuments = partnerImages
    .filter((att) => !att.package_id)
    .map((att) => ({
      name: att.file_name,
      type: att.file_mime_type,
      document_type: resolveSupportingDocumentType(att),
      url: att.file_url,
    }));

  console.log(JSON.stringify(supportingDocuments, null, 2));
  await connection.end();
})().catch(console.error);
