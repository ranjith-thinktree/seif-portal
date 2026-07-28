/**
 * End-to-end verification: admin approval gate + reject/resubmit + ESSCI visibility.
 * Usage: node scripts/verify-certification-admin-flow-e2e.js
 */
'use strict';

require('dotenv').config();

const http = require('http');
const certService = require('../src/api/v1/services/certification.service');
const db = require('../src/database/connection');

const BASE = 'http://localhost:5000/api/v1';
const TEST_TAG = 'E2E_ADMIN_FLOW';
const PASSWORD = 'Password123';

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
  const passwords = [
    PASSWORD,
    'Admin123!',
    'password123',
    'Welcome@123',
    'Test@1234',
    'Seif@1234',
  ];
  for (const password of passwords) {
    const r = await POST(`${BASE}/auth/login`, { email, password });
    if (r.status === 200 && r.body?.data?.accessToken) return r.body.data.accessToken;
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

async function countNotifs({ uploadId, role, type, recipientId }) {
  const clauses = ['related_entity_id = ?'];
  const params = [uploadId];
  if (role) {
    clauses.push('recipient_role = ?');
    params.push(role);
  }
  if (type) {
    clauses.push('type = ?');
    params.push(type);
  }
  if (recipientId) {
    clauses.push('recipient_id = ?');
    params.push(recipientId);
  }
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS c FROM notifications WHERE ${clauses.join(' AND ')}`,
    params
  );
  return row?.c || 0;
}

async function cleanup(uploadIds) {
  if (!uploadIds.length) return;
  await db.query(
    `DELETE FROM notifications WHERE related_entity_id IN (${uploadIds.map(() => '?').join(',')})`,
    uploadIds
  );
  await db.query(
    `DELETE FROM certification_pdfs WHERE certification_upload_id IN (${uploadIds.map(() => '?').join(',')})`,
    uploadIds
  );
  await db.query(
    `DELETE FROM certification_uploads WHERE id IN (${uploadIds.map(() => '?').join(',')})`,
    uploadIds
  );
}

(async () => {
  console.log('======================================================');
  console.log('  CERTIFICATION ADMIN FLOW — E2E VERIFICATION');
  console.log('======================================================\n');

  const uploadIds = [];
  let uploadId = null;

  try {
    const fixture = await findFixture();
    const adminId = await getAdminId();
    if (!fixture || !adminId) {
      bad('Fixture', 'missing center/batch/partner or admin');
      process.exit(1);
    }
    ok(`Fixture: ${fixture.center_name} / partner ${fixture.partner_email}`);

    const adminToken = await login('admin@seif.org');
    const essciToken = await login('essci@seif.org');
    const partnerToken =
      (fixture.partner_email ? await login(fixture.partner_email) : null) ||
      (await login('demo.partner@seif.org'));
    adminToken ? ok('Admin login') : bad('Admin login', 'failed');
    essciToken ? ok('ESSCI login') : bad('ESSCI login', 'failed');
    partnerToken ? ok('Partner login') : bad('Partner login', 'failed');

    // ── Scenario A: Submit → pending, admin only ─────────────────────────
    console.log('\n--- [A] Partner submit → pending, ESSCI hidden ---');
    const created = await certService.createCertificationUpload({
      partnerId: fixture.partner_id,
      centerId: fixture.center_id,
      centerName: fixture.center_name,
      batchId: fixture.batch_id,
      spokeName: `${TEST_TAG} Spoke`,
      uploadedBy: fixture.user_id,
    });
    uploadId = created.uploadId;
    uploadIds.push(uploadId);
    ok(`Created upload ${uploadId.slice(0, 8)}...`);

    const [[rowPending]] = await db.query(
      'SELECT status FROM certification_uploads WHERE id = ?',
      [uploadId]
    );
    rowPending?.status === 'pending'
      ? ok('Upload status is pending')
      : bad('Upload status', rowPending?.status);

    const adminSubmitNotifs = await countNotifs({
      uploadId,
      role: 'ADMIN',
      type: 'certification_submitted',
    });
    adminSubmitNotifs > 0
      ? ok('Admin notified on submit')
      : bad('Admin notification on submit', 'not found');

    const essciSubmitNotifs = await countNotifs({
      uploadId,
      role: 'ESSCI',
    });
    essciSubmitNotifs === 0
      ? ok('ESSCI not notified on submit')
      : bad('ESSCI notification on submit', `count=${essciSubmitNotifs}`);

    const essciList = await certService.getESSCIData({ page: 1, limit: 500 });
    !essciList.rows.some((r) => r.id === uploadId)
      ? ok('Pending upload hidden from ESSCI list')
      : bad('ESSCI list', 'pending upload visible');

    const essciDetailSvc = await certService.getUploadDetails(uploadId, null, {
      audience: 'essci',
      requireApproved: true,
    });
    !essciDetailSvc
      ? ok('ESSCI service detail blocked for pending')
      : bad('ESSCI service detail', 'pending upload returned');

    if (essciToken) {
      const essciHttp = await GET(`${BASE}/certification/essci/data/${uploadId}`, essciToken);
      essciHttp.status === 404
        ? ok('ESSCI HTTP detail 404 for pending upload')
        : bad('ESSCI HTTP detail pending', `HTTP ${essciHttp.status}`);
    }

    // ── Scenario B: Admin reject → partner notified ──────────────────────
    console.log('\n--- [B] Admin reject → partner notification ---');
    await certService.rejectCertificationUpload(
      uploadId,
      adminId,
      'Incorrect batch dates — please fix and resubmit',
      'E2E test remarks'
    );
    const [[rowRejected]] = await db.query(
      'SELECT status, rejection_reason FROM certification_uploads WHERE id = ?',
      [uploadId]
    );
    rowRejected?.status === 'rejected'
      ? ok('Upload status rejected')
      : bad('Reject status', rowRejected?.status);
    rowRejected?.rejection_reason?.includes('Incorrect batch dates')
      ? ok('Rejection reason stored')
      : bad('Rejection reason', rowRejected?.rejection_reason);

    const partnerRejectNotifs = await countNotifs({
      uploadId,
      type: 'certification_rejected',
      recipientId: fixture.user_id,
    });
    partnerRejectNotifs > 0
      ? ok('Partner notified on reject')
      : bad('Partner reject notification', 'not found');

    const essciRejectNotifs = await countNotifs({
      uploadId,
      role: 'ESSCI',
    });
    essciRejectNotifs === 0
      ? ok('ESSCI not notified on reject')
      : bad('ESSCI notification on reject', `count=${essciRejectNotifs}`);

    // ── Scenario C: Resubmit same ID → pending again ─────────────────────
    console.log('\n--- [C] Partner resubmit same request ID ---');
    const resubmit = await certService.resubmitCertificationUpload(uploadId, fixture.partner_id, {
      centerId: fixture.center_id,
      centerName: fixture.center_name,
      batchId: fixture.batch_id,
      batchStartDate: '2026-03-01',
      batchEndDate: '2026-03-28',
      assessmentDate: '2026-04-01',
      spokeName: `${TEST_TAG} Spoke Fixed`,
      spokeEmail: 'fixed@test.local',
      spokeMobile: '8888888888',
      uploadedBy: fixture.user_id,
    });
    resubmit.uploadId === uploadId
      ? ok('Resubmit keeps same upload ID')
      : bad('Resubmit ID', `${resubmit.uploadId} !== ${uploadId}`);

    const [[rowResubmit]] = await db.query(
      'SELECT status, rejection_reason, spoke_name FROM certification_uploads WHERE id = ?',
      [uploadId]
    );
    rowResubmit?.status === 'pending'
      ? ok('Resubmit status back to pending')
      : bad('Resubmit status', rowResubmit?.status);
    rowResubmit?.rejection_reason == null
      ? ok('Rejection fields cleared on resubmit')
      : bad('Rejection cleared', rowResubmit?.rejection_reason);
    rowResubmit?.spoke_name?.includes('Fixed')
      ? ok('Resubmit updated spoke name')
      : bad('Resubmit spoke name', rowResubmit?.spoke_name);

    const adminResubmitNotifs = await countNotifs({
      uploadId,
      role: 'ADMIN',
      type: 'certification_submitted',
    });
    adminResubmitNotifs >= 2
      ? ok('Admin notified again on resubmit')
      : bad('Admin resubmit notification', `count=${adminResubmitNotifs}`);

    if (partnerToken) {
      const httpResubmit = await PUT(
        `${BASE}/certification/uploads/${uploadId}/resubmit`,
        {
          centerId: fixture.center_id,
          centerName: fixture.center_name,
          batchId: fixture.batch_id,
          spokeName: 'HTTP resubmit should fail - not rejected',
        },
        partnerToken
      );
      httpResubmit.status === 500 || httpResubmit.status === 400
        ? ok('HTTP resubmit blocked when not rejected')
        : bad('HTTP resubmit guard', `HTTP ${httpResubmit.status}`);
    }

  // ── Scenario D: Admin approve → ESSCI visible, timeline filtered ───────
    console.log('\n--- [D] Admin approve → ESSCI visibility ---');
    await certService.approveCertificationUpload(uploadId, adminId, 'Approved after resubmit');
    const essciApproveNotifs = await countNotifs({
      uploadId,
      role: 'ESSCI',
      type: 'certification_approved',
    });
    essciApproveNotifs > 0
      ? ok('ESSCI notified on admin approve')
      : bad('ESSCI approve notification', 'not found');

    const essciListAfter = await certService.getESSCIData({ page: 1, limit: 500 });
    essciListAfter.rows.some((r) => r.id === uploadId)
      ? ok('Approved upload visible in ESSCI list')
      : bad('ESSCI list after approve', 'upload not found');

    const essciDetail = await certService.getUploadDetails(uploadId, null, {
      audience: 'essci',
      requireApproved: true,
    });
    if (essciDetail?.status_timeline?.events) {
      const keys = essciDetail.status_timeline.events.map((e) => e.key);
      const hasAdminKeys = keys.some((k) =>
        ['admin_review_pending', 'admin_rejected', 'admin_approved'].includes(k)
      );
      !hasAdminKeys
        ? ok('ESSCI timeline hides admin-only events')
        : bad('ESSCI timeline filter', `keys=${keys.join(',')}`);
      keys.includes('submitted')
        ? ok('ESSCI timeline includes submitted event')
        : bad('ESSCI timeline', 'missing submitted');
    } else {
      bad('ESSCI detail timeline', 'missing');
    }

    if (essciToken) {
      const essciHttp = await GET(`${BASE}/certification/essci/data/${uploadId}`, essciToken);
      essciHttp.status === 200 && essciHttp.body?.data?.status === 'approved'
        ? ok('ESSCI HTTP detail 200 after approve')
        : bad('ESSCI HTTP detail approved', `HTTP ${essciHttp.status}`);
    }

    if (adminToken) {
      const adminApprovePending = await PUT(
        `${BASE}/certification/admin/uploads/${uploadId}/approve`,
        { remarks: 'duplicate' },
        adminToken
      );
      adminApprovePending.status === 400 || adminApprovePending.status === 500
        ? ok('Admin cannot approve already-approved upload')
        : bad('Double approve guard', `HTTP ${adminApprovePending.status}`);
    }

    // ── Scenario E: HTTP partner submit pending ────────────────────────────
    console.log('\n--- [E] HTTP partner submit → pending ---');
    if (partnerToken) {
      const httpSubmit = await POST(
        `${BASE}/certification/upload`,
        {
          centerId: fixture.center_id,
          centerName: fixture.center_name,
          otherBatchNumber: `${TEST_TAG}-HTTP`,
          spokeName: 'HTTP Flow Test',
          spokeEmail: 'http-flow@test.local',
          spokeMobile: '9876543214',
          batchStartDate: '2026-01-10',
          batchEndDate: '2026-01-25',
          assessmentDate: '2026-02-01',
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
        httpRow?.status === 'pending'
          ? ok('HTTP upload status pending (not auto-approved)')
          : bad('HTTP upload status', httpRow?.status);
      } else {
        bad('Partner HTTP upload', `HTTP ${httpSubmit.status}`);
      }
    }
  } finally {
    console.log('\n--- Cleanup test records ---');
    await cleanup(uploadIds);
    ok(`Cleaned ${uploadIds.length} upload(s)`);
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
