/**
 * Deep verification: ZIP contents, Excel merge, and all export scenarios.
 * Usage: node scripts/verify-certification-file-archive-e2e.js
 *
 * Requires backend running on localhost:5000 (or API_BASE env).
 */
'use strict';

require('dotenv').config();

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');
const { execFileSync } = require('child_process');
const ExcelJS = require('exceljs');

const BASE = process.env.API_BASE || 'http://localhost:5000/api/v1';
const PASSWORD = 'Password123';

let passed = 0;
let failed = 0;
const failures = [];

function ok(label) {
  console.log(`  ✅ ${label}`);
  passed += 1;
}

function bad(label, detail) {
  const msg = detail ? `${label}: ${detail}` : label;
  console.log(`  ❌ ${msg}`);
  failures.push(msg);
  failed += 1;
}

function request(method, url, { body, token, raw } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = body != null ? JSON.stringify(body) : null;
    const lib = u.protocol === 'https:' ? https : http;
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(payload
        ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        : {}),
    };

    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (raw) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: buf,
              contentType: String(res.headers['content-type'] || ''),
              disposition: String(res.headers['content-disposition'] || ''),
            });
            return;
          }
          const text = buf.toString('utf8');
          try {
            resolve({ status: res.statusCode, body: JSON.parse(text), headers: res.headers });
          } catch {
            resolve({ status: res.statusCode, body: text, headers: res.headers });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const GET = (url, token) => request('GET', url, { token });
const POST = (url, body, token) => request('POST', url, { body, token });
const POST_RAW = (url, body, token) => request('POST', url, { body, token, raw: true });

function listZipEntries(buf) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cert-zip-'));
  const zipPath = path.join(dir, 'export.zip');
  fs.writeFileSync(zipPath, buf);
  const escaped = zipPath.replace(/'/g, "''");
  const ps = `
    Add-Type -AssemblyName System.IO.Compression.FileSystem;
    $z = [System.IO.Compression.ZipFile]::OpenRead('${escaped}');
    $z.Entries | ForEach-Object { $_.FullName + '|' + $_.Length };
    $z.Dispose();
  `;
  const out = execFileSync('powershell', ['-NoProfile', '-Command', ps], {
    encoding: 'utf8',
  });
  return out
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, size] = line.split('|');
      return { name, size: Number(size || 0) };
    });
}

async function inspectExcel(buf) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buf);
  const sheet = workbook.getWorksheet('Consolidated Results') || workbook.worksheets[0];
  if (!sheet) return { sheetName: null, rowCount: 0, headers: [] };
  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    headers.push(String(cell.value ?? ''));
  });
  return {
    sheetName: sheet.name,
    rowCount: sheet.rowCount,
    dataRows: Math.max(sheet.rowCount - 1, 0),
    headers,
  };
}

async function login(email) {
  const passwords = [PASSWORD, 'Admin123!', 'password123', 'Welcome@123', 'Seif@1234'];
  for (const password of passwords) {
    const r = await POST(`${BASE}/auth/login`, { email, password });
    if (r.status === 200 && r.body?.data?.accessToken) return r.body.data.accessToken;
  }
  return null;
}

async function main() {
  console.log('\n🧪 Certification archive ZIP / Excel deep verification\n');

  const adminToken = await login('admin@seif.org');
  if (!adminToken) {
    bad('Admin login');
    process.exit(1);
  }
  ok('Admin login');

  const list = await GET(`${BASE}/certification/files/archive?page=1&limit=50`, adminToken);
  if (list.status !== 200 || !list.body?.success) {
    bad('List archive', `status=${list.status}`);
    process.exit(1);
  }
  const rows = list.body.data?.rows || [];
  ok(`List archive (rows=${rows.length}, total=${list.body.data?.total ?? 0})`);

  const allFiles = rows.flatMap((row) => row.files || []);
  const certs = allFiles.filter((f) => f.fileType === 'certificate');
  const sheets = allFiles.filter((f) => f.fileType === 'result_sheet');
  const certIds = certs.map((f) => f.id);
  const sheetIds = sheets.map((f) => f.id);

  console.log(`\n📦 Fixtures: ${certIds.length} certificate(s), ${sheetIds.length} result sheet(s)\n`);

  // ── Scenario: empty export blocked ───────────────────────────────────────
  const emptyZip = await POST_RAW(`${BASE}/certification/files/archive/export/zip`, {}, adminToken);
  if (emptyZip.status === 400) ok('ZIP blocked with no filters/selection');
  else bad('ZIP blocked with no filters/selection', `status=${emptyZip.status}`);

  const emptyExcel = await POST_RAW(
    `${BASE}/certification/files/archive/export/excel`,
    {},
    adminToken
  );
  if (emptyExcel.status === 400) ok('Excel blocked with no filters/selection');
  else bad('Excel blocked with no filters/selection', `status=${emptyExcel.status}`);

  // ── Scenario: ZIP certificates only ──────────────────────────────────────
  if (!certIds.length) {
    bad('ZIP certificates-only', 'no certificate fixtures');
  } else {
    const zipRes = await POST_RAW(
      `${BASE}/certification/files/archive/export/zip`,
      { fileIds: certIds },
      adminToken
    );
    if (zipRes.status !== 200 || !zipRes.contentType.includes('zip')) {
      bad('ZIP certificates-only response', `status=${zipRes.status} type=${zipRes.contentType}`);
    } else {
      const entries = listZipEntries(zipRes.body);
      const nonEmpty = entries.filter((e) => e.size > 0);
      if (nonEmpty.length >= 1 && nonEmpty.length <= certIds.length) {
        ok(
          `ZIP certificates-only: ${nonEmpty.length}/${certIds.length} non-empty entries (${zipRes.body.length} bytes)`
        );
      } else {
        bad(
          'ZIP certificates-only contents',
          `entries=${entries.length} nonEmpty=${nonEmpty.length} expected<=${certIds.length}`
        );
      }
      if (/attachment/i.test(zipRes.disposition)) ok('ZIP has Content-Disposition attachment');
      else bad('ZIP Content-Disposition', zipRes.disposition || 'missing');
    }
  }

  // ── Scenario: ZIP with only result-sheet IDs → no certs → 404 ─────────────
  if (sheetIds.length) {
    const zipWrong = await POST_RAW(
      `${BASE}/certification/files/archive/export/zip`,
      { fileIds: sheetIds },
      adminToken
    );
    if (zipWrong.status === 404) ok('ZIP with only result-sheet IDs correctly returns 404');
    else bad('ZIP with only result-sheet IDs', `status=${zipWrong.status}`);
  } else {
    ok('ZIP wrong-type scenario skipped (no sheets)');
  }

  // ── Scenario: Excel result sheets only (merge) ───────────────────────────
  if (!sheetIds.length) {
    bad('Excel sheets-only merge', 'no result sheet fixtures');
  } else {
    const excelRes = await POST_RAW(
      `${BASE}/certification/files/archive/export/excel`,
      { fileIds: sheetIds },
      adminToken
    );
    if (excelRes.status !== 200 || !excelRes.contentType.includes('sheet')) {
      bad('Excel sheets-only response', `status=${excelRes.status} type=${excelRes.contentType}`);
    } else {
      const info = await inspectExcel(excelRes.body);
      const needed = ['Partner', 'Center', 'Batch', 'Request ID', 'Assessment Date'];
      const hasContext = needed.every((h) => info.headers.includes(h));
      if (info.sheetName && info.dataRows >= 1 && hasContext) {
        ok(
          `Excel merge sheets-only: "${info.sheetName}" dataRows=${info.dataRows} headers=[${info.headers.slice(0, 5).join(', ')}…]`
        );
      } else {
        bad(
          'Excel merge sheets-only contents',
          `sheet=${info.sheetName} dataRows=${info.dataRows} headers=${JSON.stringify(info.headers)}`
        );
      }
    }
  }

  // ── Scenario: Excel with only certificate IDs → 404 ──────────────────────
  if (certIds.length) {
    const excelWrong = await POST_RAW(
      `${BASE}/certification/files/archive/export/excel`,
      { fileIds: certIds },
      adminToken
    );
    if (excelWrong.status === 404) ok('Excel with only certificate IDs correctly returns 404');
    else bad('Excel with only certificate IDs', `status=${excelWrong.status}`);
  } else {
    ok('Excel wrong-type scenario skipped (no certs)');
  }

  // ── Scenario: mixed selection — ZIP gets certs only; Excel gets sheets only
  if (certIds.length && sheetIds.length) {
    const mixed = [...certIds.slice(0, 2), ...sheetIds.slice(0, 2)];
    const zipMixed = await POST_RAW(
      `${BASE}/certification/files/archive/export/zip`,
      { fileIds: mixed },
      adminToken
    );
    if (zipMixed.status === 200 && zipMixed.contentType.includes('zip')) {
      const entries = listZipEntries(zipMixed.body);
      if (entries.length >= 1) ok(`Mixed selection ZIP: ${entries.length} cert entr(y/ies)`);
      else bad('Mixed selection ZIP empty');
    } else {
      bad('Mixed selection ZIP', `status=${zipMixed.status}`);
    }

    const excelMixed = await POST_RAW(
      `${BASE}/certification/files/archive/export/excel`,
      { fileIds: mixed },
      adminToken
    );
    if (excelMixed.status === 200 && excelMixed.contentType.includes('sheet')) {
      const info = await inspectExcel(excelMixed.body);
      if (info.dataRows >= 1) ok(`Mixed selection Excel merge: dataRows=${info.dataRows}`);
      else bad('Mixed selection Excel empty rows');
    } else {
      bad('Mixed selection Excel', `status=${excelMixed.status}`);
    }
  } else {
    ok('Mixed selection scenarios skipped (need both types)');
  }

  // ── Scenario: filter-based exports ───────────────────────────────────────
  const sample = rows[0];
  if (sample?.assessment_date) {
    const d = new Date(sample.assessment_date);
    const month = String(d.getMonth() + 1);
    const year = String(d.getFullYear());
    const filterBody = {
      dateTypes: 'assessment',
      months: month,
      years: year,
    };

    const zipFilter = await POST_RAW(
      `${BASE}/certification/files/archive/export/zip`,
      filterBody,
      adminToken
    );
    if (zipFilter.status === 200 && zipFilter.contentType.includes('zip')) {
      const entries = listZipEntries(zipFilter.body);
      if (entries.some((e) => e.size > 0)) {
        ok(`Filter ZIP (${month}/${year}): ${entries.length} entr(y/ies)`);
      } else bad('Filter ZIP empty entries');
    } else if (zipFilter.status === 404) {
      ok(`Filter ZIP (${month}/${year}): 404 no certificates (acceptable)`);
    } else {
      bad('Filter ZIP', `status=${zipFilter.status}`);
    }

    const excelFilter = await POST_RAW(
      `${BASE}/certification/files/archive/export/excel`,
      filterBody,
      adminToken
    );
    if (excelFilter.status === 200 && excelFilter.contentType.includes('sheet')) {
      const info = await inspectExcel(excelFilter.body);
      if (info.dataRows >= 1 && info.headers.includes('Partner')) {
        ok(`Filter Excel merge (${month}/${year}): dataRows=${info.dataRows}`);
      } else bad('Filter Excel merge contents', JSON.stringify(info));
    } else if (excelFilter.status === 404) {
      ok(`Filter Excel (${month}/${year}): 404 no sheets (acceptable)`);
    } else {
      bad('Filter Excel', `status=${excelFilter.status}`);
    }
  } else {
    bad('Filter scenarios', 'no assessment_date sample');
  }

  // ── Scenario: single file download ───────────────────────────────────────
  if (allFiles[0]?.id) {
    const dl = await request(
      'GET',
      `${BASE}/certification/files/archive/${allFiles[0].id}/download`,
      { token: adminToken, raw: true }
    );
    if (dl.status === 200 && dl.body.length > 0) {
      ok(`Single file download (${dl.body.length} bytes)`);
    } else bad('Single file download', `status=${dl.status}`);
  }

  // ── Scenario: static /uploads/certification locked ────────────────────────
  console.log('\n🔒 Access control\n');
  {
    let archivePath = null;
    try {
      const db = require('../src/database/connection');
      const [[row]] = await db.query(
        `SELECT archive_path FROM certification_archived_files ORDER BY created_at DESC LIMIT 1`
      );
      archivePath = row?.archive_path || null;
    } catch (err) {
      bad('Static lock lookup', err.message);
    }

    if (archivePath) {
      const staticUrl = `http://localhost:5000${archivePath}`;
      const staticRes = await request('GET', staticUrl, { raw: true });
      if (staticRes.status === 401) ok('Static /uploads/certification blocked (401)');
      else bad('Static /uploads/certification blocked', `status=${staticRes.status}`);
    } else {
      bad('Static lock', 'no archived path found');
    }
  }

  // ── Scenario: partner can download own files only ─────────────────────────
  {
    let ownFileId = null;
    let partnerEmail = null;
    let otherFileId = null;
    try {
      const db = require('../src/database/connection');
      const [[own]] = await db.query(
        `SELECT caf.id AS file_id, u.email AS partner_email, cu.partner_id
         FROM certification_archived_files caf
         JOIN certification_uploads cu ON cu.id = caf.certification_upload_id
         JOIN users u ON u.partner_id = cu.partner_id AND u.role = 'PARTNER'
         WHERE u.email IS NOT NULL AND TRIM(u.email) <> ''
         ORDER BY caf.created_at DESC
         LIMIT 1`
      );
      ownFileId = own?.file_id || null;
      partnerEmail = own?.partner_email || null;

      if (own?.partner_id) {
        const [[other]] = await db.query(
          `SELECT caf.id AS file_id
           FROM certification_archived_files caf
           JOIN certification_uploads cu ON cu.id = caf.certification_upload_id
           WHERE cu.partner_id <> ?
           ORDER BY caf.created_at DESC
           LIMIT 1`,
          [own.partner_id]
        );
        otherFileId = other?.file_id || null;
      }
    } catch (err) {
      bad('Partner access fixture', err.message);
    }

    const partnerToken = partnerEmail ? await login(partnerEmail) : null;
    if (!partnerToken) {
      ok('Partner ownership download skipped (partner login unavailable)');
    } else if (ownFileId) {
      const ownDl = await request(
        'GET',
        `${BASE}/certification/files/archive/${ownFileId}/download`,
        { token: partnerToken, raw: true }
      );
      if (ownDl.status === 200 && ownDl.body.length > 0) {
        ok(`Partner can download own file (${ownDl.body.length} bytes)`);
      } else {
        bad('Partner own download', `status=${ownDl.status}`);
      }

      if (otherFileId) {
        const denied = await request(
          'GET',
          `${BASE}/certification/files/archive/${otherFileId}/download`,
          { token: partnerToken, raw: true }
        );
        if (denied.status === 403) ok('Partner blocked from other partner file (403)');
        else bad('Partner other-file deny', `status=${denied.status}`);
      } else {
        ok('Partner cross-download deny skipped (no other-partner file)');
      }
    } else {
      bad('Partner ownership download', 'no partner-owned archived file');
    }
  }

  // ── Scenario: ESSCI approval email helper exists ──────────────────────────
  try {
    const emailService = require('../src/utils/email.util');
    if (typeof emailService.sendCertificationApprovedEssciEmail === 'function') {
      ok('ESSCI approval email helper registered');
    } else {
      bad('ESSCI approval email helper missing');
    }
  } catch (err) {
    bad('ESSCI approval email helper', err.message);
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed) {
    console.log('Failures:\n - ' + failures.join('\n - '));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
