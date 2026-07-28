/**
 * Quick smoke checks for recent certification improvements.
 * Usage: node scripts/smoke-certification-recent-changes.js
 */
'use strict';

require('dotenv').config();

const http = require('http');
const db = require('../src/database/connection');
const certService = require('../src/api/v1/services/certification.service');
const archiveService = require('../src/api/v1/services/certificationFileArchive.service');
const emailService = require('../src/utils/email.util');

const BASE = 'http://127.0.0.1:5000';

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✅ ${label}`);
  passed += 1;
}
function bad(label, detail) {
  console.log(`  ❌ ${label}${detail ? `: ${detail}` : ''}`);
  failed += 1;
}

function request(method, urlPath, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body != null ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: urlPath,
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(payload
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let parsed = text;
          try {
            parsed = JSON.parse(text);
          } catch {
            /* raw */
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('\n🧪 Certification recent-changes smoke\n');

  // Date / contact helpers via service exports are internal; validate via intentional API errors after login
  const login = await request('POST', '/api/v1/auth/login', {
    body: { email: 'admin@seif.org', password: 'Password123' },
  });
  const token = login.body?.data?.accessToken;
  if (!token) {
    bad('Admin login');
    process.exit(1);
  }
  ok('Admin login');

  // Email helpers registered
  [
    'sendCertificationAssessmentRequestAdminEmail',
    'sendCertificationAssessmentApprovedPartnerEmail',
    'sendCertificationApprovedEssciEmail',
    'sendCertificationCertificatesReadyPartnerEmail',
    'sendCertificationCertificatesReadyAdminEmail',
  ].forEach((name) => {
    if (typeof emailService[name] === 'function') ok(`Email helper ${name}`);
    else bad(`Email helper ${name}`);
  });

  // Archive KPIs
  const archive = await archiveService.listArchivedCertificationRecords({
    page: 1,
    limit: 50,
  });
  if (
    archive.kpis &&
    ['centers', 'batches', 'registered', 'attended', 'passed'].every(
      (k) => typeof archive.kpis[k] === 'number'
    )
  ) {
    ok(
      `Archive KPIs centers=${archive.kpis.centers} batches=${archive.kpis.batches} R=${archive.kpis.registered} A=${archive.kpis.attended} P=${archive.kpis.passed}`
    );
  } else {
    bad('Archive KPIs', JSON.stringify(archive.kpis));
  }

  const listHttp = await request('GET', '/api/v1/certification/files/archive?page=1&limit=10', {
    token,
  });
  if (listHttp.status === 200 && listHttp.body?.data?.kpis) {
    ok('Archive list API returns kpis');
  } else {
    bad('Archive list API kpis', `status=${listHttp.status}`);
  }

  // Static lock
  const locked = await request('GET', '/uploads/certification/smoke-test');
  if (locked.status === 401) ok('Static /uploads/certification locked (401)');
  else bad('Static lock', `status=${locked.status}`);

  // Notification payload on recent certification notifications (if any)
  const [notifs] = await db.query(
    `SELECT type, message, payload
     FROM notifications
     WHERE type IN (
       'certification_submitted',
       'certification_approved',
       'certification_rejected',
       'certificate_ready',
       'certificate_pdf_rejected'
     )
     ORDER BY created_at DESC
     LIMIT 10`
  );
  const withPayload = (notifs || []).filter((n) => n.payload);
  if (withPayload.length) {
    const raw = withPayload[0].payload;
    const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (
      payload.partner_name ||
      payload.partnerName ||
      payload.center_name ||
      payload.batch_number
    ) {
      ok(
        `Notification payload has context (${withPayload[0].type}: ${payload.partner_name || payload.partnerName || '—'} / ${payload.center_name || payload.centerName || '—'} / ${payload.batch_number || payload.batchNumber || '—'})`
      );
    } else {
      bad('Notification payload missing names', JSON.stringify(payload));
    }
    if (/Batch|Center|Partner|batch/i.test(withPayload[0].message || '')) {
      ok('Notification message includes context text');
    } else {
      bad('Notification message context', withPayload[0].message);
    }
  } else {
    ok('No new-format notification payloads yet (acceptable until next submit)');
  }

  // Detail includes archived_files when present
  if (archive.rows?.[0]?.upload_id) {
    const detail = await certService.getUploadDetails(archive.rows[0].upload_id, null, {
      audience: 'admin',
    });
    if (detail?.pdf) {
      ok(
        `Upload detail has pdf + archived_files=${Array.isArray(detail.pdf.archived_files) ? detail.pdf.archived_files.length : 0}`
      );
    } else {
      ok('Sample archive row has no pdf on detail (skipped)');
    }
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
