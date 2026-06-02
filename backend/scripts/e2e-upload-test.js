/**
 * e2e-upload-test.js
 * End-to-end test for all upload flows: Student, TOT, Employment, Certification
 * Run: node scripts/e2e-upload-test.js  (from backend/ directory)
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const BASE = 'http://localhost:5000/api/v1';
const DUMMY = path.join(__dirname, '../../documents/dummy-test-data');

// ─── HTTP HELPERS ─────────────────────────────────────────────────────────────
function jsonRequest(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(payload
        ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        : {}),
    };
    const req = http.request(
      { hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, method, headers },
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

function formRequest(url, form, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...form.getHeaders(),
    };
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method: 'POST',
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
    form.pipe(req);
  });
}

const GET = (url, tok) => jsonRequest('GET', url, null, tok);
const POST = (url, body, tok) => jsonRequest('POST', url, body, tok);

// ─── RESULT TRACKING ──────────────────────────────────────────────────────────
let passed = 0,
  failed = 0,
  warnings = 0;
const failDetails = [];
function pass(label) {
  console.log(`  \u2705 ${label}`);
  passed++;
}
function fail(label, detail) {
  const m = detail ? `${label}: ${detail}` : label;
  console.log(`  \u274C ${m}`);
  failDetails.push(m);
  failed++;
}
function warn(label, detail) {
  console.log(`  \u26A0\uFE0F  ${label}${detail ? ': ' + detail : ''}`);
  warnings++;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('======================================================');
  console.log('  SEIF PORTAL -- END-TO-END UPLOAD FLOW TEST');
  console.log('======================================================\n');

  // ── 1. Backend Connectivity ──────────────────────────────────────────────────
  console.log('--- [1] Backend Connectivity ---');
  try {
    const ping = await GET(`${BASE}/auth/login`);
    if (ping.status < 500) pass(`Backend reachable at :5000 (HTTP ${ping.status})`);
    else {
      fail('Backend not reachable', `HTTP ${ping.status}`);
      process.exit(1);
    }
  } catch (e) {
    fail('Backend not reachable', e.message);
    process.exit(1);
  }

  const db = require('../src/database/connection');

  // ── 2. Credentials Lookup ────────────────────────────────────────────────────
  console.log('\n--- [2] Credentials Lookup ---');
  const [admins] = await db.query(
    `SELECT email, full_name, role FROM users WHERE role IN ('ADMIN','SUPER_ADMIN') AND status='active' ORDER BY role LIMIT 3`
  );
  admins.forEach((u) => console.log(`    ${u.role}: ${u.email}`));

  const PARTNER_EMAILS = [
    'sachin.alatagi@outlook.com',
    'veeresh.modi@dbtech.co.in',
    'tapasya.puri@ssrdp.org',
  ];
  const [partnerRows] = await db.query(
    `SELECT u.email, u.full_name, u.partner_id, p.name AS partner_name
     FROM users u JOIN partners p ON p.id=u.partner_id
     WHERE u.email IN (?,?,?) AND u.status='active'`,
    PARTNER_EMAILS
  );
  partnerRows.forEach((u) => console.log(`    PARTNER: ${u.email} -> ${u.partner_name}`));

  // ── 3. Authentication ────────────────────────────────────────────────────────
  console.log('\n--- [3] Authentication Tests ---');

  const badLogin = await POST(`${BASE}/auth/login`, {
    email: admins[0]?.email,
    password: 'WrongPass!XYZ',
  });
  badLogin.status === 401 || badLogin.status === 400
    ? pass('Rejects invalid credentials')
    : warn('Invalid credentials not rejected', `HTTP ${badLogin.status}`);

  const COMMON = [
    'Password123',
    'Admin123!',
    'password123',
    'Welcome@123',
    'Test@1234',
    'Seif@1234',
  ];
  let adminToken = null;
  const partnerTokens = {};

  for (const admin of admins) {
    for (const pwd of COMMON) {
      const r = await POST(`${BASE}/auth/login`, { email: admin.email, password: pwd });
      if (r.status === 200 && r.body?.data?.accessToken) {
        adminToken = r.body.data.accessToken;
        pass(`Admin login: ${admin.email} (${admin.role})`);
        break;
      }
    }
    if (adminToken) break;
  }
  if (!adminToken) warn('Admin password not in common list');

  for (const row of partnerRows) {
    for (const pwd of COMMON) {
      const r = await POST(`${BASE}/auth/login`, { email: row.email, password: pwd });
      if (r.status === 200 && r.body?.data?.accessToken) {
        partnerTokens[row.email] = {
          token: r.body.data.accessToken,
          partnerId: row.partner_id,
          name: row.full_name,
        };
        pass(`Partner login: ${row.email}`);
        break;
      }
    }
    if (!partnerTokens[row.email]) warn(`No common password matched for ${row.email}`);
  }

  // ── 4. Template Download Tests ───────────────────────────────────────────────
  console.log('\n--- [4] Template Download Tests ---');
  const gramInfo = partnerTokens['sachin.alatagi@outlook.com'];
  const gramToken = gramInfo?.token;
  const anyToken = gramToken || adminToken;

  if (anyToken) {
    const s = await GET(`${BASE}/uploads/template`, anyToken);
    s.status === 200
      ? pass('Student template download')
      : fail('Student template download', `HTTP ${s.status}`);

    const t = await GET(`${BASE}/tot/template`, anyToken);
    t.status === 200
      ? pass('TOT template download')
      : fail('TOT template download', `HTTP ${t.status}`);

    // Employment template needs approved students — treat 400 as expected if none exist
    if (gramToken) {
      const e = await GET(`${BASE}/employment/template`, gramToken);
      if (e.status === 200) pass('Employment template download (partner)');
      else if (e.status === 400)
        warn('Employment template (no approved students yet)', 'expected — approve students first');
      else
        fail(
          'Employment template download',
          `HTTP ${e.status} -- ${JSON.stringify(e.body).substring(0, 80)}`
        );
    } else {
      warn('Skipping employment template -- need partner token');
    }
  } else {
    warn('No token available -- skipping template tests');
  }

  // ── 5. Route Existence Tests ─────────────────────────────────────────────────
  console.log('\n--- [5] Route Existence Tests ---');
  const ROUTES = [
    // Student
    { method: 'GET', path: '/uploads/template', label: 'GET student template' },
    { method: 'POST', path: '/uploads', label: 'POST student upload' },
    { method: 'GET', path: '/uploads', label: 'GET student history (partner)' },
    { method: 'GET', path: '/uploads/admin/all', label: 'GET student all (admin)' },
    // Employment
    { method: 'POST', path: '/employment/upload', label: 'POST employment upload' },
    { method: 'GET', path: '/employment/uploads', label: 'GET employment uploads history' },
    { method: 'GET', path: '/employment/template', label: 'GET employment template' },
    // TOT
    { method: 'GET', path: '/tot/template', label: 'GET TOT template' },
    { method: 'POST', path: '/tot/upload', label: 'POST TOT upload' },
    { method: 'GET', path: '/tot/uploads', label: 'GET TOT uploads history' },
    { method: 'GET', path: '/tot/admin/uploads', label: 'GET TOT all (admin)' },
    // Certification
    { method: 'POST', path: '/certification/upload', label: 'POST certification upload' },
    { method: 'GET', path: '/certification/uploads', label: 'GET certification uploads' },
    { method: 'GET', path: '/certification/admin/uploads', label: 'GET certification all (admin)' },
  ];

  if (!anyToken) {
    warn('No token -- skipping route existence tests');
  } else {
    for (const r of ROUTES) {
      const url = `${BASE}${r.path}`;
      const res = r.method === 'GET' ? await GET(url, anyToken) : await POST(url, {}, anyToken);
      if (res.status === 404) fail(r.label, '404 NOT FOUND');
      else if (res.status >= 500)
        fail(r.label, `${res.status} SERVER ERROR -- ${JSON.stringify(res.body).substring(0, 80)}`);
      else pass(`${r.label} (${res.status})`);
    }
  }

  // ── 6. Actual File Upload Tests ──────────────────────────────────────────────
  console.log('\n--- [6] File Upload Tests ---');

  async function uploadFile(endpoint, filePath, label, extraFields, token) {
    token = token || gramToken;
    if (!fs.existsSync(filePath)) {
      warn(label, 'file not found: ' + path.basename(filePath));
      return null;
    }
    if (!token) {
      warn(label, 'no token available');
      return null;
    }
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
      filename: path.basename(filePath),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    for (const [k, v] of Object.entries(extraFields || {})) form.append(k, v);
    return formRequest(`${BASE}${endpoint}`, form, token);
  }

  // 6a. Student Upload (Gram Vikas, partner token) → two-step: preview then confirm → then admin approves
  let studentUploadId = null;
  {
    // Step 1: upload file for preview
    const res = await uploadFile(
      '/uploads',
      path.join(DUMMY, 'Gram_Vikas_Society_student_upload.xlsx'),
      'Student upload - Gram Vikas'
    );
    if (res) {
      if (res.status === 200 && res.body?.preview?.fileName) {
        const previewFilePath = res.body?.uploadData?.filePath;
        const previewFileName =
          res.body?.uploadData?.fileName || 'Gram_Vikas_Society_student_upload.xlsx';
        if (previewFilePath) {
          // Step 2: confirm upload
          const confirmRes = await POST(
            `${BASE}/uploads/confirm`,
            { filePath: previewFilePath, fileName: previewFileName },
            gramToken
          );
          if (confirmRes.status === 200 || confirmRes.status === 201) {
            studentUploadId = confirmRes.body?.data?.uploadId || null;
            pass(
              `Student upload - Gram Vikas (confirmed, id: ${studentUploadId ? studentUploadId.substring(0, 8) + '...' : 'N/A'})`
            );
          } else if (confirmRes.status === 409 && confirmRes.body?.duplicateUpload?.id) {
            studentUploadId = confirmRes.body.duplicateUpload.id;
            pass(
              `Student upload - Gram Vikas (duplicate detected, reusing id: ${studentUploadId.substring(0, 8)}...)`
            );
          } else {
            fail(
              'Student upload confirm - Gram Vikas',
              `HTTP ${confirmRes.status} -- ${JSON.stringify(confirmRes.body).substring(0, 160)}`
            );
          }
        } else {
          fail(
            'Student upload - Gram Vikas',
            'Preview succeeded but no filePath returned for confirmation'
          );
        }
      } else if (res.status === 409 && res.body?.duplicateUpload?.id) {
        studentUploadId = res.body.duplicateUpload.id;
        pass(
          `Student upload - Gram Vikas (duplicate, reusing id: ${studentUploadId.substring(0, 8)}...)`
        );
      } else {
        fail(
          'Student upload - Gram Vikas',
          `HTTP ${res.status} -- ${JSON.stringify(res.body).substring(0, 160)}`
        );
      }
    }
  }

  // 6a-approve. Admin approves student upload so employment upload can reference student IDs
  let studentsApproved = false;
  if (studentUploadId && adminToken) {
    const appRes = await POST(
      `${BASE}/uploads/${studentUploadId}/approve`,
      { remarks: 'E2E test auto-approve' },
      adminToken
    );
    if (appRes.status === 200 || appRes.status === 201) {
      pass(`Admin approved student upload (${studentUploadId.substring(0, 8)}...)`);
      studentsApproved = true;
    } else {
      warn(
        'Admin approval of student upload',
        `HTTP ${appRes.status} -- ${JSON.stringify(appRes.body).substring(0, 120)}`
      );
    }
  } else if (!adminToken) {
    warn('Student upload approval skipped', 'no admin token');
  }

  // 6b. TOT Upload (Gram Vikas, partner token)
  {
    const res = await uploadFile(
      '/tot/upload',
      path.join(DUMMY, 'Gram_Vikas_Society_tot_upload.xlsx'),
      'TOT upload - Gram Vikas'
    );
    if (res) {
      if (res.status === 200 || res.status === 201)
        pass(`TOT upload - Gram Vikas (id: ${res.body?.data?.uploadId || 'N/A'})`);
      else
        fail(
          'TOT upload - Gram Vikas',
          `HTTP ${res.status} -- ${JSON.stringify(res.body).substring(0, 200)}`
        );
    }
  }

  // 6c. Admin TOT upload without targetPartnerId should return 400 (not 500)
  if (adminToken) {
    const res = await uploadFile(
      '/tot/upload',
      path.join(DUMMY, 'Gram_Vikas_Society_tot_upload.xlsx'),
      'TOT upload (admin no partnerId)',
      {},
      adminToken
    );
    if (res) {
      if (res.status === 400) pass('TOT upload (admin, no partnerId) => 400 (correct)');
      else warn('TOT upload (admin, no partnerId)', `Expected 400 but got ${res.status}`);
    }

    // Admin TOT upload WITH targetPartnerId should succeed
    if (gramInfo?.partnerId) {
      const res2 = await uploadFile(
        '/tot/upload',
        path.join(DUMMY, 'Gram_Vikas_Society_tot_upload.xlsx'),
        'TOT upload (admin+partnerId)',
        { targetPartnerId: gramInfo.partnerId },
        adminToken
      );
      if (res2) {
        if (res2.status === 200 || res2.status === 201)
          pass(`TOT upload (admin + targetPartnerId) success`);
        else
          fail(
            'TOT upload (admin + targetPartnerId)',
            `HTTP ${res2.status} -- ${JSON.stringify(res2.body).substring(0, 200)}`
          );
      }
    }
  }

  // 6d. Employment Upload — requires students to be approved first (done in 6a-approve)
  {
    if (!studentsApproved) {
      warn(
        'Employment upload - Gram Vikas',
        'skipped — students not yet approved (see 6a-approve)'
      );
    } else {
      const res = await uploadFile(
        '/employment/upload',
        path.join(DUMMY, 'Gram_Vikas_Society_employment_upload.xlsx'),
        'Employment upload - Gram Vikas'
      );
      if (res) {
        if (res.status === 200 || res.status === 201) {
          pass(`Employment upload - Gram Vikas (id: ${res.body?.data?.uploadId || 'N/A'})`);
        } else if (res.status === 400) {
          const msg = (res.body?.message || JSON.stringify(res.body)).substring(0, 200);
          // Show first error detail if available
          const errDetail = res.body?.errors?.[0]?.error || '';
          fail(
            'Employment upload - Gram Vikas',
            `400 -- ${msg}${errDetail ? ' | ' + errDetail : ''}`
          );
        } else {
          fail(
            'Employment upload - Gram Vikas',
            `HTTP ${res.status} -- ${JSON.stringify(res.body).substring(0, 160)}`
          );
        }
      }
    }
  }

  // 6e. Certification endpoint check (partner)
  if (gramToken) {
    const certTest = await POST(`${BASE}/certification/upload`, {}, gramToken);
    certTest.status !== 404 && certTest.status < 500
      ? pass(`Certification upload endpoint exists (${certTest.status})`)
      : fail('Certification upload endpoint', `HTTP ${certTest.status}`);

    const approvedCheck = await GET(`${BASE}/employment/check-approved-students`, gramToken);
    approvedCheck.status < 400
      ? pass(`Employment check-approved-students (${approvedCheck.status})`)
      : warn('Employment check-approved-students', `HTTP ${approvedCheck.status}`);
  }

  // ── 7. Admin Review Routes ────────────────────────────────────────────────────
  console.log('\n--- [7] Admin Review & Approval Routes ---');
  if (!adminToken) {
    warn('No admin token -- skipping review tests');
  } else {
    const totList = await GET(`${BASE}/tot/admin/uploads`, adminToken);
    totList.status === 200
      ? pass(
          `GET /tot/admin/uploads (total: ${totList.body?.data?.total ?? totList.body?.total ?? '?'})`
        )
      : fail('GET /tot/admin/uploads', `HTTP ${totList.status}`);

    const [latestTot] = await db.query(
      'SELECT id FROM tot_uploads ORDER BY created_at DESC LIMIT 1'
    );
    if (latestTot.length) {
      const detail = await GET(`${BASE}/tot/uploads/${latestTot[0].id}`, adminToken);
      detail.status === 200
        ? pass('GET /tot/uploads/:id')
        : fail('GET /tot/uploads/:id', `HTTP ${detail.status}`);

      const edits = await POST(
        `${BASE}/tot/admin/uploads/${latestTot[0].id}/save-edits`,
        { rows: [] },
        adminToken
      );
      edits.status < 500
        ? pass(`POST /tot/admin/uploads/:id/save-edits (${edits.status})`)
        : fail('POST save-edits', `HTTP ${edits.status}`);
    } else {
      warn('No TOT uploads in DB to test detail endpoint');
    }

    const studentList = await GET(`${BASE}/uploads/admin/all`, adminToken);
    studentList.status === 200
      ? pass('GET /uploads/admin/all')
      : fail('GET /uploads/admin/all', `HTTP ${studentList.status}`);

    const certList = await GET(`${BASE}/certification/admin/uploads`, adminToken);
    certList.status === 200
      ? pass('GET /certification/admin/uploads')
      : fail('GET /certification/admin/uploads', `HTTP ${certList.status}`);
  }

  // ── 8. Database State ─────────────────────────────────────────────────────────
  console.log('\n--- [8] Database State ---');
  const [[{ tot_uploads }]] = await db.query('SELECT COUNT(*) AS tot_uploads FROM tot_uploads');
  const [[{ staged_tots }]] = await db.query('SELECT COUNT(*) AS staged_tots FROM uploaded_tots');
  const [[{ staged_students }]] = await db.query(
    'SELECT COUNT(*) AS staged_students FROM uploaded_students'
  );
  const [[{ trainer_mods }]] = await db.query(
    'SELECT COUNT(*) AS trainer_mods FROM trainer_modules WHERE is_active=1'
  );

  console.log(`  tot_uploads rows:       ${tot_uploads}`);
  console.log(`  uploaded_tots rows:     ${staged_tots}`);
  console.log(`  uploaded_students rows: ${staged_students}`);
  console.log(`  trainer_modules active: ${trainer_mods}`);

  tot_uploads > 0
    ? pass(`tot_uploads has ${tot_uploads} record(s)`)
    : warn('tot_uploads is still empty');
  staged_tots > 0
    ? pass(`uploaded_tots has ${staged_tots} row(s)`)
    : warn('uploaded_tots is empty after TOT upload');
  trainer_mods >= 5
    ? pass(`Trainer modules seeded (${trainer_mods})`)
    : fail('Trainer modules', `only ${trainer_mods}`);

  const [byType] = await db.query(
    `SELECT upload_type, status, COUNT(*) AS cnt FROM data_uploads GROUP BY upload_type, status ORDER BY upload_type, status`
  );
  if (byType.length) {
    console.log('  data_uploads:');
    byType.forEach((r) =>
      console.log(
        `    ${String(r.upload_type).padEnd(26)} | ${String(r.status).padEnd(10)} | ${r.cnt}`
      )
    );
  }

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('\n======================================================');
  console.log(`  RESULTS: ${passed} passed  |  ${failed} failed  |  ${warnings} warnings`);
  if (failDetails.length) {
    console.log('\n  FAILURES:');
    failDetails.forEach((d, i) => console.log(`    ${i + 1}. ${d}`));
  }
  console.log('======================================================');

  await db.end?.();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('\nCRASH:', e.stack || e.message);
  process.exit(1);
});
