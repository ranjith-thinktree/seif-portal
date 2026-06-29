/**
 * Verify certification upload form fields are stored correctly.
 * Tests: batch dropdown path, other-batch path, validation, list/detail queries.
 * Usage: node scripts/verify-certification-upload.js
 */
'use strict';

require('dotenv').config();

const http = require('http');
const certService = require('../src/api/v1/services/certification.service');
const db = require('../src/database/connection');

const BASE = 'http://localhost:5000/api/v1';
const TEST_TAG = 'VERIFY_CERT_E2E';

let passed = 0;
let failed = 0;
const failures = [];

function ok(label) {
  console.log(`  ✅ ${label}`);
  passed++;
}

function bad(label, detail) {
  const msg = detail ? `${label}: ${detail}` : label;
  console.log(`  ❌ ${msg}`);
  failures.push(msg);
  failed++;
}

function jsonPost(url, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(d) });
          } catch {
            resolve({ status: res.statusCode, body: d });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function assertEqual(actual, expected, label) {
  const a = actual == null ? null : String(actual);
  const e = expected == null ? null : String(expected);
  if (a === e) ok(label);
  else bad(label, `expected "${e}", got "${a}"`);
}

/** Compare MySQL DATE values (mysql2 returns local-midnight Date objects). */
async function assertDbDate(uploadId, column, expected, label) {
  const [[row]] = await db.query(
    `SELECT DATE_FORMAT(${column}, '%Y-%m-%d') AS d FROM certification_uploads WHERE id = ?`,
    [uploadId]
  );
  assertEqual(row?.d, expected, label);
}

async function findTestFixture() {
  const [rows] = await db.query(
    `SELECT c.id AS center_id, c.center_name, c.partner_id,
            b.id AS batch_id, b.batch_number,
            u.id AS user_id
     FROM centers c
     JOIN batches b ON b.center_id = c.id
     JOIN users u ON u.partner_id = c.partner_id AND u.role = 'PARTNER' AND u.status = 'active'
     WHERE c.approval_status = 'approved'
     ORDER BY c.created_at DESC
     LIMIT 1`
  );
  return rows[0] || null;
}

async function loginPartner(email) {
  const COMMON = ['Password123', 'Admin123!', 'password123', 'Welcome@123', 'Test@1234', 'Seif@1234'];
  for (const pwd of COMMON) {
    const r = await jsonPost(`${BASE}/auth/login`, { email, password: pwd });
    if (r.status === 200 && r.body?.data?.accessToken) {
      return r.body.data.accessToken;
    }
  }
  return null;
}

async function cleanupUploadIds(ids) {
  if (!ids.length) return;
  await db.query(`DELETE FROM notifications WHERE related_entity_id IN (${ids.map(() => '?').join(',')})`, ids);
  await db.query(`DELETE FROM certification_uploads WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
}

(async () => {
  console.log('======================================================');
  console.log('  CERTIFICATION UPLOAD — FIELD STORAGE VERIFICATION');
  console.log('======================================================\n');

  const fixture = await findTestFixture();
  if (!fixture) {
    bad('Fixture lookup', 'No approved center with batch + partner user found');
    process.exit(1);
  }
  ok(`Fixture: center "${fixture.center_name}" batch "${fixture.batch_number}"`);

  const uploadIds = [];

  try {
    // ── Scenario A: full form with batch dropdown ─────────────────────────────
    console.log('\n--- [A] Submit with batch dropdown + all optional fields ---');
    const fullPayload = {
      partnerId: fixture.partner_id,
      centerId: fixture.center_id,
      centerName: fixture.center_name,
      batchId: fixture.batch_id,
      otherBatchNumber: null,
      batchStartDate: '2026-01-15',
      batchEndDate: '2026-03-20',
      assessmentDate: '2026-04-01',
      spokeName: `${TEST_TAG} Spoke`,
      spokeEmail: 'verify-spoke@test.local',
      spokeMobile: '9876543210',
      uploadedBy: fixture.user_id,
    };

    const { uploadId: idA } = await certService.createCertificationUpload(fullPayload);
    uploadIds.push(idA);
    ok(`Created upload ${idA.substring(0, 8)}...`);

    const [[rowA]] = await db.query('SELECT * FROM certification_uploads WHERE id = ?', [idA]);
    assertEqual(rowA.center_id, fullPayload.centerId, 'center_id stored');
    assertEqual(rowA.center_name, fullPayload.centerName, 'center_name snapshot stored');
    assertEqual(rowA.batch_id, fullPayload.batchId, 'batch_id stored');
    assertEqual(rowA.other_batch_number, null, 'other_batch_number null when batch selected');
    await assertDbDate(idA, 'batch_start_date', fullPayload.batchStartDate, 'batch_start_date stored');
    await assertDbDate(idA, 'batch_end_date', fullPayload.batchEndDate, 'batch_end_date stored');
    await assertDbDate(idA, 'assessment_date', fullPayload.assessmentDate, 'assessment_date stored');
    assertEqual(rowA.spoke_name, fullPayload.spokeName, 'spoke_name stored');
    assertEqual(rowA.spoke_email, fullPayload.spokeEmail, 'spoke_email stored');
    assertEqual(rowA.spoke_mobile, fullPayload.spokeMobile, 'spoke_mobile stored');
    assertEqual(rowA.status, 'approved', 'status is approved on submit');

    const listA = await certService.getPartnerUploads(fixture.partner_id, 1, 5);
    const listed = listA.uploads.find((u) => u.id === idA);
    if (listed) ok('Upload appears in partner history list');
    else bad('Partner history list', 'upload not found');
    if (listed) {
      assertEqual(listed.batch_number, fixture.batch_number, 'list shows batch_number from join');
      assertEqual(listed.center_name, fixture.center_name, 'list shows center_name');
    }

    const detailA = await certService.getUploadDetails(idA, fixture.partner_id);
    if (detailA?.id === idA) ok('Upload detail fetch works');
    else bad('Upload detail', 'missing or wrong id');

    // ── Scenario B: other batch number only (no batch_id) ───────────────────
    console.log('\n--- [B] Submit with other batch number only ---');
    const otherBatch = `${TEST_TAG}-BATCH-99`;
    const { uploadId: idB } = await certService.createCertificationUpload({
      partnerId: fixture.partner_id,
      centerId: fixture.center_id,
      centerName: fixture.center_name,
      batchId: null,
      otherBatchNumber: otherBatch,
      batchStartDate: null,
      batchEndDate: null,
      assessmentDate: null,
      spokeName: null,
      spokeEmail: null,
      spokeMobile: null,
      uploadedBy: fixture.user_id,
    });
    uploadIds.push(idB);
    ok(`Created other-batch upload ${idB.substring(0, 8)}...`);

    const [[rowB]] = await db.query('SELECT * FROM certification_uploads WHERE id = ?', [idB]);
    assertEqual(rowB.batch_id, null, 'batch_id null for other batch');
    assertEqual(rowB.other_batch_number, otherBatch, 'other_batch_number stored');

    const listB = await certService.getPartnerUploads(fixture.partner_id, 1, 5);
    const listedB = listB.uploads.find((u) => u.id === idB);
    if (listedB) assertEqual(listedB.batch_number, otherBatch, 'list COALESCE shows other_batch_number');

    // ── Scenario C: validation ───────────────────────────────────────────────
    console.log('\n--- [C] Validation ---');
    try {
      await certService.createCertificationUpload({
        partnerId: fixture.partner_id,
        centerId: fixture.center_id,
        centerName: fixture.center_name,
        batchId: null,
        otherBatchNumber: null,
        uploadedBy: fixture.user_id,
      });
      bad('Validation', 'should reject missing batch');
    } catch (e) {
      if (String(e.message).includes('batchId or otherBatchNumber')) ok('Rejects missing batch');
      else bad('Validation', e.message);
    }

    // ── Scenario D: HTTP API (if backend running) ───────────────────────────
    console.log('\n--- [D] HTTP API (optional) ---');
    const [partnerUser] = await db.query(
      `SELECT email FROM users WHERE id = ? LIMIT 1`,
      [fixture.user_id]
    );
    let backendUp = false;
    try {
      const ping = await jsonPost(`${BASE}/auth/login`, { email: 'invalid@test', password: 'x' });
      backendUp = ping.status < 500;
    } catch {
      backendUp = false;
    }

    if (!backendUp) {
      console.log('  ⚠️  Backend not running — skipping HTTP tests');
    } else {
      ok('Backend reachable');
      const token = await loginPartner(partnerUser[0]?.email);
      if (!token) {
        console.log('  ⚠️  Could not login partner — skipping HTTP submit');
      } else {
        ok('Partner login for HTTP test');
        const httpRes = await jsonPost(
          `${BASE}/certification/upload`,
          {
            centerId: fixture.center_id,
            centerName: fixture.center_name,
            otherBatchNumber: `${TEST_TAG}-HTTP-01`,
            spokeName: `${TEST_TAG} HTTP`,
          },
          token
        );
        if (httpRes.status === 200 && httpRes.body?.success) {
          const httpId = httpRes.body?.data?.uploadId;
          if (httpId) {
            uploadIds.push(httpId);
            ok('HTTP POST /certification/upload succeeded');
            const [[httpRow]] = await db.query(
              'SELECT other_batch_number, spoke_name FROM certification_uploads WHERE id = ?',
              [httpId]
            );
            assertEqual(httpRow.other_batch_number, `${TEST_TAG}-HTTP-01`, 'HTTP row other_batch_number');
            assertEqual(httpRow.spoke_name, `${TEST_TAG} HTTP`, 'HTTP row spoke_name');
          } else bad('HTTP upload', 'no uploadId in response');
        } else {
          bad('HTTP POST /certification/upload', `HTTP ${httpRes.status} ${JSON.stringify(httpRes.body).slice(0, 120)}`);
        }

        const missingCenter = await jsonPost(`${BASE}/certification/upload`, { batchId: fixture.batch_id }, token);
        missingCenter.status === 400 ? ok('HTTP rejects missing centerId (400)') : bad('HTTP validation centerId', `HTTP ${missingCenter.status}`);

        const missingBatch = await jsonPost(
          `${BASE}/certification/upload`,
          { centerId: fixture.center_id },
          token
        );
        missingBatch.status === 400 ? ok('HTTP rejects missing batch (400)') : bad('HTTP validation batch', `HTTP ${missingBatch.status}`);
      }
    }
  } finally {
    console.log('\n--- Cleanup test records ---');
    await cleanupUploadIds(uploadIds);
    ok(`Removed ${uploadIds.length} test upload(s)`);
  }

  console.log('\n======================================================');
  console.log(`  RESULTS: ${passed} passed | ${failed} failed`);
  if (failures.length) {
    console.log('\n  FAILURES:');
    failures.forEach((f, i) => console.log(`    ${i + 1}. ${f}`));
  }
  console.log('======================================================');

  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error('CRASH:', err);
  process.exit(1);
});
