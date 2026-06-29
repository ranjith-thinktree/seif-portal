/**
 * End-to-end verification: certification upload + ESSCI requests + timeline + notifications.
 * Usage: node scripts/verify-essci-certification-e2e.js
 */
'use strict';

require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const certService = require('../src/api/v1/services/certification.service');
const db = require('../src/database/connection');

const BASE = 'http://localhost:5000/api/v1';
const TEST_TAG = 'E2E_ESSCI_CERT';
const PASSWORD = 'Password123';

let passed = 0;
let failed = 0;
let warnings = 0;
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
function warn(label, detail) {
  console.log(`  ⚠️  ${label}${detail ? `: ${detail}` : ''}`);
  warnings++;
}

function jsonRequest(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = body != null ? JSON.stringify(body) : null;
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(payload
        ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        : {}),
    };
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method,
        headers,
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
    if (payload) req.write(payload);
    req.end();
  });
}

const GET = (url, tok) => jsonRequest('GET', url, null, tok);
const POST = (url, body, tok) => jsonRequest('POST', url, body, tok);
const PUT = (url, body, tok) => jsonRequest('PUT', url, body, tok);

async function login(email) {
  const r = await POST(`${BASE}/auth/login`, { email, password: PASSWORD });
  if (r.status === 200 && r.body?.data?.accessToken) {
    return r.body.data.accessToken;
  }
  return null;
}

async function findFixture() {
  const [rows] = await db.query(
    `SELECT c.id AS center_id, c.center_name, c.partner_id,
            b.id AS batch_id, b.batch_number,
            u.id AS user_id, u.email AS partner_email
     FROM centers c
     JOIN batches b ON b.center_id = c.id
     JOIN users u ON u.partner_id = c.partner_id AND u.role = 'PARTNER' AND u.status = 'active'
     WHERE c.approval_status = 'approved'
     ORDER BY c.created_at DESC
     LIMIT 1`
  );
  return rows[0] || null;
}

async function getAdminId() {
  const [[row]] = await db.query(
    `SELECT id FROM users WHERE role IN ('ADMIN','SUPER_ADMIN') AND status='active' LIMIT 1`
  );
  return row?.id;
}

async function getEssciUserId() {
  const [[row]] = await db.query(
    `SELECT id FROM users WHERE role = 'ESSCI' AND status='active' LIMIT 1`
  );
  return row?.id;
}

async function cleanup(ids) {
  const { uploadIds = [], pdfIds = [] } = ids;
  const allIds = [...uploadIds];
  if (allIds.length) {
    await db.query(
      `DELETE FROM notifications WHERE related_entity_id IN (${allIds.map(() => '?').join(',')})`,
      allIds
    );
    await db.query(
      `DELETE FROM certification_uploads WHERE id IN (${allIds.map(() => '?').join(',')})`,
      allIds
    );
  }
  if (pdfIds.length) {
    await db.query(
      `DELETE FROM notifications WHERE related_entity_id IN (${pdfIds.map(() => '?').join(',')})`,
      pdfIds
    );
    await db.query(
      `DELETE FROM certification_pdfs WHERE id IN (${pdfIds.map(() => '?').join(',')})`,
      pdfIds
    );
  }
}

function assertTimelineCurrent(timeline, expectedKey, label) {
  if (!timeline) {
    bad(label, 'no timeline');
    return;
  }
  if (timeline.current_status === expectedKey) ok(label);
  else bad(label, `expected current ${expectedKey}, got ${timeline.current_status}`);
}

function assertDerived(row, expected, label) {
  if (row?.derived_status === expected) ok(label);
  else bad(label, `expected "${expected}", got "${row?.derived_status}"`);
}

(async () => {
  console.log('======================================================');
  console.log('  ESSCI CERTIFICATION — END-TO-END VERIFICATION');
  console.log('======================================================\n');

  const uploadIds = [];
  const pdfIds = [];
  let uploadId = null;
  let pdfId = null;

  try {
    // ── [0] Backend connectivity ───────────────────────────────────────────
    console.log('--- [0] Backend connectivity ---');
    try {
      const ping = await GET(`${BASE}/auth/login`);
      ping.status < 500 ? ok(`Backend reachable (HTTP ${ping.status})`) : bad('Backend', `HTTP ${ping.status}`);
    } catch (e) {
      bad('Backend not reachable', e.message);
      process.exit(1);
    }

    const fixture = await findFixture();
    if (!fixture) {
      bad('Fixture', 'No approved center with batch + partner');
      process.exit(1);
    }
    ok(`Fixture: ${fixture.center_name} / ${fixture.batch_number}`);

    const adminId = await getAdminId();
    const essciUserId = await getEssciUserId();
    if (!adminId) bad('Admin user', 'not found');
    else ok('Admin user found');
    if (!essciUserId) warn('ESSCI user', 'not found — HTTP ESSCI tests skipped');
    else ok('ESSCI user found');

    // ── [1] Timeline builder (all scenarios) ───────────────────────────────
    console.log('\n--- [1] Timeline builder scenarios ---');
    const baseUpload = {
      created_at: new Date(),
      status: 'pending',
    };
    let tl = certService.buildCertificationStatusTimeline(baseUpload, null);
    assertTimelineCurrent(tl, 'admin_review_pending', 'Pending → admin_review_pending');
    if (tl.events.some((e) => e.key === 'submitted')) ok('Pending includes submitted event');

    tl = certService.buildCertificationStatusTimeline(
      { ...baseUpload, status: 'rejected', reviewed_at: new Date(), rejection_reason: 'Test' },
      null
    );
    assertTimelineCurrent(tl, 'admin_rejected', 'Rejected → admin_rejected');

    tl = certService.buildCertificationStatusTimeline(
      { ...baseUpload, status: 'approved', reviewed_at: new Date() },
      null
    );
    assertTimelineCurrent(tl, 'essci_step1_pending', 'Approved no step1 → essci_step1_pending');

    tl = certService.buildCertificationStatusTimeline(
      {
        ...baseUpload,
        status: 'approved',
        reviewed_at: new Date(),
        essci_step1_at: new Date(),
        essci_response_link: 'https://example.com',
        essci_response_id: 'id1',
      },
      null
    );
    assertTimelineCurrent(tl, 'essci_step2_pending', 'Step1 done no PDF → essci_step2_pending');

    const pdfPending = {
      status: 'pending',
      created_at: new Date(),
      trainees_registered: 12,
      trainees_attended: 10,
      trainees_passed: 8,
    };
    tl = certService.buildCertificationStatusTimeline(
      {
        ...baseUpload,
        status: 'approved',
        reviewed_at: new Date(),
        essci_step1_at: new Date(),
      },
      pdfPending
    );
    assertTimelineCurrent(tl, 'pdf_under_review', 'PDF pending → pdf_under_review');

    tl = certService.buildCertificationStatusTimeline(
      {
        ...baseUpload,
        status: 'approved',
        reviewed_at: new Date(),
        essci_step1_at: new Date(),
      },
      { ...pdfPending, status: 'approved', reviewed_at: new Date() }
    );
    assertTimelineCurrent(tl, 'pdf_approved', 'PDF approved → pdf_approved');

    tl = certService.buildCertificationStatusTimeline(
      {
        ...baseUpload,
        status: 'approved',
        reviewed_at: new Date(),
        essci_step1_at: new Date(),
      },
      { ...pdfPending, status: 'rejected', reviewed_at: new Date(), rejection_reason: 'Bad zip' }
    );
    assertTimelineCurrent(tl, 'essci_reupload_pending', 'PDF rejected → essci_reupload_pending');

    // ── [2] Partner submit (service) ───────────────────────────────────────
    console.log('\n--- [2] Partner submit certification data ---');
    const { uploadId: id1 } = await certService.createCertificationUpload({
      partnerId: fixture.partner_id,
      centerId: fixture.center_id,
      centerName: fixture.center_name,
      batchId: fixture.batch_id,
      batchStartDate: '2026-02-01',
      batchEndDate: '2026-02-28',
      assessmentDate: '2026-03-01',
      spokeName: `${TEST_TAG} Spoke`,
      spokeEmail: 'e2e@test.local',
      spokeMobile: '9999999999',
      uploadedBy: fixture.user_id,
    });
    uploadId = id1;
    uploadIds.push(uploadId);
    ok(`Created auto-approved upload ${uploadId.slice(0, 8)}...`);

    let detail = await certService.getUploadDetails(uploadId);
    detail?.status === 'approved' ? ok('Detail status approved on submit') : bad('Detail status', detail?.status);
    assertTimelineCurrent(detail?.status_timeline, 'essci_step1_pending', 'Detail timeline ready for ESSCI');

    // ── [3] ESSCI notification & list visibility (no admin step) ───────────
    console.log('\n--- [3] ESSCI notification & list visibility ---');

    const [essciNotifs] = await db.query(
      `SELECT id FROM notifications
       WHERE recipient_role = 'ESSCI'
         AND related_entity_type = 'certification_upload'
         AND related_entity_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [uploadId]
    );
    essciNotifs.length > 0
      ? ok('ESSCI notification created on partner submit')
      : bad('ESSCI notification', 'not found');

    const essciData = await certService.getESSCIData({ page: 1, limit: 100 });
    const row = essciData.rows.find((r) => r.id === uploadId);
    row ? ok('Upload appears in ESSCI data list') : bad('ESSCI data list', 'upload not found');
    if (row) assertDerived(row, 'Ongoing', 'Derived status Ongoing after submit');

    detail = await certService.getUploadDetails(uploadId);
    assertTimelineCurrent(
      detail?.status_timeline,
      'essci_step1_pending',
      'Detail timeline after submit'
    );
    detail?.partner_name ? ok('Detail includes partner_name') : bad('Detail partner_name', 'missing');
    detail?.batch_number ? ok('Detail includes batch_number') : bad('Detail batch_number', 'missing');

    // ── [4] ESSCI step 1 — initial response ───────────────────────────────
    console.log('\n--- [4] ESSCI step 1 — initial response ---');
    await certService.submitESSCIStep1Response({
      uploadId,
      responseLink: 'https://assessment.example.com/login',
      responseId: 'E2E-ASSESS-01',
      responsePassword: 'test-pass-123',
      qrCodeUrl: '/uploads/test/e2e-qr.png',
      qrCodeName: 'e2e-qr.png',
      submittedBy: essciUserId || adminId,
    });
    ok('Step 1 submitted');

    detail = await certService.getUploadDetails(uploadId);
    assertTimelineCurrent(detail?.status_timeline, 'essci_step2_pending', 'Timeline after step 1');

    const [partnerStep1Notifs] = await db.query(
      `SELECT id FROM notifications
       WHERE recipient_id = ?
         AND type = 'certification_essci_step1'
         AND related_entity_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [fixture.user_id, uploadId]
    );
    partnerStep1Notifs.length > 0
      ? ok('Partner notified on step 1 submit')
      : bad('Partner step1 notification', 'not found');

    // ── [5] ESSCI step 2 — certificates → Done ───────────────────────────
    console.log('\n--- [5] ESSCI step 2 — certificates → Done ---');
    const pdfResult = await certService.uploadCertificatePDF({
      partnerId: fixture.partner_id,
      centerId: fixture.center_id,
      batchId: fixture.batch_id,
      certificationUploadId: uploadId,
      traineesRegistered: 14,
      traineesAttended: 12,
      traineesPassed: 10,
      traineesFailed: 1,
      traineesAbsent: 1,
      zipFileUrl: '/uploads/test/e2e.zip',
      zipFileName: 'e2e.zip',
      studentListUrl: '/uploads/test/e2e-list.pdf',
      studentListName: 'e2e-list.pdf',
      certificationFilesJson: JSON.stringify([
        { url: '/uploads/test/e2e.zip', name: 'e2e.zip' },
        { url: '/uploads/test/e2e-list.pdf', name: 'e2e-list.pdf' },
      ]),
      uploadedBy: essciUserId || adminId,
    });
    pdfId = pdfResult.pdfId;
    pdfIds.push(pdfId);
    ok(`PDF record created ${pdfId.slice(0, 8)}...`);

    const essciData2 = await certService.getESSCIData({ page: 1, limit: 100, filter: 'done' });
    const row2 = essciData2.rows.find((r) => r.id === uploadId);
    row2 ? ok('Upload in done filter after PDF upload') : bad('done filter', 'upload not found');
    if (row2) assertDerived(row2, 'Done', 'Derived status Done');

    detail = await certService.getUploadDetails(uploadId);
    assertTimelineCurrent(detail?.status_timeline, 'pdf_approved', 'Timeline certificates ready');
    detail?.pdf?.status === 'approved'
      ? ok('PDF auto-approved on upload')
      : bad('PDF status', detail?.pdf?.status);
    detail?.pdf?.trainees_attended === 12
      ? ok('Detail PDF attendance stored')
      : bad('PDF attendance', String(detail?.pdf?.trainees_attended));

    // ── [6] Other batch path (no batch_id) ───────────────────────────────
    console.log('\n--- [6] Other batch number path ---');
    const { uploadId: idOther } = await certService.createCertificationUpload({
      partnerId: fixture.partner_id,
      centerId: fixture.center_id,
      centerName: fixture.center_name,
      otherBatchNumber: `${TEST_TAG}-OTHER`,
      uploadedBy: fixture.user_id,
    });
    uploadIds.push(idOther);
    const otherDetail = await certService.getUploadDetails(idOther);
    otherDetail?.status === 'approved'
      ? ok('Other batch auto-approved on submit')
      : bad('Other batch status', otherDetail?.status);
    otherDetail?.batch_number === `${TEST_TAG}-OTHER`
      ? ok('Other batch number in detail')
      : bad('Other batch', otherDetail?.batch_number);

    // ── [7] HTTP API (auth + routes) ─────────────────────────────────────
    console.log('\n--- [7] HTTP API scenarios ---');
    const adminToken = await login('admin@seif.org');
    const essciToken = essciUserId ? await login('essci@seif.org') : null;
    const partnerToken = fixture.partner_email ? await login(fixture.partner_email) : null;

    adminToken ? ok('Admin HTTP login') : warn('Admin HTTP login', 'failed');
    essciToken ? ok('ESSCI HTTP login') : warn('ESSCI HTTP login', 'failed');
    partnerToken ? ok('Partner HTTP login') : warn('Partner HTTP login', 'failed');

    if (essciToken) {
      const listRes = await GET(`${BASE}/certification/essci/data?page=1&limit=50`, essciToken);
      listRes.status === 200 && listRes.body?.success
        ? ok(`GET /essci/data (${listRes.body?.data?.total ?? '?'} rows)`)
        : bad('GET /essci/data', `HTTP ${listRes.status}`);

      const detailRes = await GET(`${BASE}/certification/essci/data/${uploadId}`, essciToken);
      if (detailRes.status === 200 && detailRes.body?.data?.status_timeline) {
        ok('GET /essci/data/:id includes status_timeline');
        const events = detailRes.body.data.status_timeline.events || [];
        events.length >= 4
          ? ok(`Timeline has ${events.length} events`)
          : bad('Timeline events', `only ${events.length}`);
      } else {
        bad('GET /essci/data/:id', `HTTP ${detailRes.status} or no timeline`);
      }

      const filterRes = await GET(`${BASE}/certification/essci/data?filter=done`, essciToken);
      filterRes.status === 200 ? ok('GET /essci/data?filter=done') : bad('filter=done', `HTTP ${filterRes.status}`);

      const noAuth = await GET(`${BASE}/certification/essci/data`);
      noAuth.status === 401 || noAuth.status === 403
        ? ok('ESSCI data requires auth')
        : bad('ESSCI auth guard', `HTTP ${noAuth.status}`);
    }

    if (partnerToken) {
      const blocked = await GET(`${BASE}/certification/essci/data`, partnerToken);
      blocked.status === 403 || blocked.status === 401
        ? ok('Partner blocked from ESSCI data')
        : warn('Partner ESSCI access', `HTTP ${blocked.status} (expected 403)`);
    }

    if (partnerToken && adminToken) {
      const httpSubmit = await POST(
        `${BASE}/certification/upload`,
        {
          centerId: fixture.center_id,
          centerName: fixture.center_name,
          otherBatchNumber: `${TEST_TAG}-HTTP`,
          spokeName: 'HTTP Test',
        },
        partnerToken
      );
      if (httpSubmit.status === 200 && httpSubmit.body?.data?.uploadId) {
        const httpId = httpSubmit.body.data.uploadId;
        uploadIds.push(httpId);
        ok('Partner HTTP POST /certification/upload');
        const [[httpRow]] = await db.query(
          'SELECT status FROM certification_uploads WHERE id = ?',
          [httpId]
        );
        httpRow?.status === 'approved'
          ? ok('HTTP upload auto-approved')
          : bad('HTTP upload status', httpRow?.status);
      } else {
        bad('Partner HTTP upload', `HTTP ${httpSubmit.status} ${JSON.stringify(httpSubmit.body).slice(0, 80)}`);
      }
    }

    // ── [8] Validation rejects ───────────────────────────────────────────
    console.log('\n--- [8] Validation ---');
    if (partnerToken) {
      const noCenter = await POST(`${BASE}/certification/upload`, { batchId: fixture.batch_id }, partnerToken);
      noCenter.status === 400 ? ok('HTTP rejects missing centerId') : bad('Validation centerId', `HTTP ${noCenter.status}`);

      const noBatch = await POST(
        `${BASE}/certification/upload`,
        { centerId: fixture.center_id },
        partnerToken
      );
      noBatch.status === 400 ? ok('HTTP rejects missing batch') : bad('Validation batch', `HTTP ${noBatch.status}`);
    }

    try {
      await certService.createCertificationUpload({
        partnerId: fixture.partner_id,
        centerId: fixture.center_id,
        uploadedBy: fixture.user_id,
      });
      bad('Service validation', 'should reject missing batch');
    } catch (e) {
      String(e.message).includes('batch') ? ok('Service rejects missing batch') : bad('Service validation', e.message);
    }
  } finally {
    console.log('\n--- Cleanup test records ---');
    await cleanup({ uploadIds, pdfIds });
    ok(`Cleaned ${uploadIds.length} upload(s), ${pdfIds.length} pdf(s)`);
  }

  console.log('\n======================================================');
  console.log(`  RESULTS: ${passed} passed | ${failed} failed | ${warnings} warnings`);
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
