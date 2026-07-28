'use strict';
require('dotenv').config();
const db = require('../src/database/connection');
const cert = require('../src/api/v1/services/certification.service');

(async () => {
  const [[fx]] = await db.query(`
    SELECT cu.partner_id, cu.center_id, cu.center_name, u.id AS user_id
    FROM certification_uploads cu
    JOIN users u ON u.partner_id = cu.partner_id AND u.role = 'PARTNER'
    LIMIT 1`);
  if (!fx) {
    console.log('NO_FIXTURE');
    process.exit(0);
  }

  // Date validation should throw
  let dateOk = false;
  try {
    await cert.createCertificationUpload({
      partnerId: fx.partner_id,
      centerId: fx.center_id,
      centerName: fx.center_name,
      otherBatchNumber: 'SMOKE-BAD-DATE',
      batchStartDate: '2099-01-01',
      uploadedBy: fx.user_id,
    });
  } catch (e) {
    dateOk = /future/i.test(e.message);
  }
  console.log(dateOk ? 'OK date future rejected' : 'FAIL date future rejected');

  // Contact validation should throw
  let contactOk = false;
  try {
    await cert.createCertificationUpload({
      partnerId: fx.partner_id,
      centerId: fx.center_id,
      centerName: fx.center_name,
      otherBatchNumber: 'SMOKE-BAD-MOBILE',
      spokeMobile: '1234567890',
      uploadedBy: fx.user_id,
    });
  } catch (e) {
    contactOk = /mobile/i.test(e.message);
  }
  console.log(contactOk ? 'OK bad mobile rejected' : 'FAIL bad mobile rejected');

  const { uploadId } = await cert.createCertificationUpload({
    partnerId: fx.partner_id,
    centerId: fx.center_id,
    centerName: fx.center_name,
    batchId: null,
    otherBatchNumber: 'SMOKE-BATCH-TEST',
    batchStartDate: '2026-01-01',
    batchEndDate: '2026-01-20',
    assessmentDate: '2026-02-01',
    spokeName: 'Smoke',
    spokeEmail: 'ok@example.com',
    spokeMobile: '9876543210',
    uploadedBy: fx.user_id,
  });

  const [[n]] = await db.query(
    `SELECT message, payload FROM notifications
     WHERE related_entity_id = ? AND recipient_role = 'ADMIN'
     ORDER BY created_at DESC LIMIT 1`,
    [uploadId]
  );
  const p = typeof n.payload === 'string' ? JSON.parse(n.payload) : n.payload;
  console.log('MSG', n.message);
  console.log('PAYLOAD', JSON.stringify(p));
  const has = p && (p.partner_name || p.center_name || p.batch_number);
  console.log(has ? 'OK notification context' : 'FAIL notification context');

  await db.query('DELETE FROM notifications WHERE related_entity_id = ?', [uploadId]);
  await db.query('DELETE FROM certification_uploads WHERE id = ?', [uploadId]);
  process.exit(dateOk && contactOk && has ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
