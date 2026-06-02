/**
 * import-centers-from-csv.js
 *
 * Reads data/documents/duplicate_centers_extracted.csv and generates
 * INSERT SQL for all 53 rows into the centers table.
 *
 * Duplicate handling:
 *   If a center with the same name already exists in the DB for the same partner,
 *   the new center_name gets a suffix: "-1", "-2", "-3", etc.
 *   The same suffix logic applies to duplicate names within the batch itself.
 *
 * Usage:
 *   cd backend
 *   node scripts/import-centers-from-csv.js
 *
 * Output:
 *   data/documents/insert_centers.sql  — review before executing
 */

'use strict';

const mysql = require('mysql2/promise');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ─── DB config from .env ────────────────────────────────────────────────────
const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'seif',
};

// ─── Partner name corrections (CSV name → exact DB name) ────────────────────
const PARTNER_NAME_MAP = {
  'Don Bosco Tech Society': 'Don Bosco Tech Society',
  'Ambuja Cemebt Foundation': 'Ambuja Cemebt Foundation', // DB has the typo too
  'Ambuja Cement Foundation': 'Ambuja Cemebt Foundation', // corrected spelling → DB
  'Sri Sri Rural Development Trust': 'Sri Sri Rural Development Trust',
  'ICICI Foundation': 'ICICI Foundation',
  'Dalmia Bharat Foundation': 'Dalmia Bharat Foundation',
  'Dalmia Bharath Foundation': 'Dalmia Bharat Foundation',
};

// ─── Status mapping ──────────────────────────────────────────────────────────
function mapStatus(raw) {
  if (!raw) return 'active';
  const v = raw.trim().toLowerCase();
  if (v === 'active') return 'active';
  if (v === 'in-active' || v === 'inactive') return 'inactive';
  return 'active';
}

// ─── Escape a value for SQL ──────────────────────────────────────────────────
function sq(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

// ─── Read CSV into array of row objects ─────────────────────────────────────
function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// ─── Derive center_id prefix from partner name (3-char code) ────────────────
function derivePrefix(partnerName) {
  // Take first 3 uppercase letters from meaningful words
  const letters = partnerName.replace(/[^A-Za-z]/g, '').toUpperCase();
  return letters.substring(0, 3);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const csvPath = path.join(__dirname, '../../data/documents/duplicate_centers_extracted.csv');
  const outputSql = path.join(__dirname, '../../data/documents/insert_centers.sql');

  console.log('Connecting to database...');
  const conn = await mysql.createConnection(DB_CONFIG);

  // 1. Load partners ──────────────────────────────────────────────────────────
  const [partnerRows] = await conn.query('SELECT id, partner_id, name FROM partners');
  /** @type {Map<string, { uuid: string, orgId: string }>} */
  const partnerMap = new Map(); // DB name → { uuid, orgId }
  for (const p of partnerRows) {
    partnerMap.set(p.name, { uuid: p.id, orgId: p.partner_id });
  }
  console.log(`Loaded ${partnerRows.length} partners.`);

  // 2. Load existing centers ──────────────────────────────────────────────────
  const [centerRows] = await conn.query(
    'SELECT id, center_id, partner_id, center_name FROM centers'
  );
  console.log(`Loaded ${centerRows.length} existing centers.`);

  // prefix → max sequence number (e.g. 'DON' → 129, 'AMB' → 26)
  const maxSeq = {};
  // partnerUuid → Set<lower-cased center_name>
  const existingNamesByPartner = {};
  // partnerUuid → prefix code (e.g. 'DON', 'AMB', 'ICI')
  const prefixByPartner = {};

  for (const c of centerRows) {
    // Supports both legacy "ORG0001-DONB-0056" and live "DON-129" formats
    const match =
      c.center_id.match(/^([A-Z]{2,4})-(\d+)$/) || c.center_id.match(/^ORG\d{4}-([A-Z]{4})-(\d+)$/);
    if (match) {
      const prefix = match[1];
      const num = parseInt(match[2], 10);
      if (!maxSeq[prefix] || num > maxSeq[prefix]) maxSeq[prefix] = num;
      if (!prefixByPartner[c.partner_id]) prefixByPartner[c.partner_id] = prefix;
    }
    if (!existingNamesByPartner[c.partner_id]) {
      existingNamesByPartner[c.partner_id] = new Set();
    }
    existingNamesByPartner[c.partner_id].add(c.center_name.toLowerCase().trim());
  }

  // 3. Read CSV ────────────────────────────────────────────────────────────────
  const csvRows = await readCsv(csvPath);
  console.log(`Read ${csvRows.length} rows from CSV.`);

  // 4. Process rows ────────────────────────────────────────────────────────────
  // Track names we assign in this batch (per partner) to catch intra-batch dupes
  const batchNamesByPartner = {};

  const inserts = [];
  const warnings = [];

  for (const row of csvRows) {
    const csvPartnerName = (row['Implemenation Partner'] || '').trim();
    const dbPartnerName = PARTNER_NAME_MAP[csvPartnerName] || csvPartnerName;
    const partnerInfo = partnerMap.get(dbPartnerName);

    if (!partnerInfo) {
      warnings.push(`Row ${row['Sl.No']}: Partner "${csvPartnerName}" not found in DB — SKIPPED`);
      continue;
    }

    const { uuid: partnerUuid } = partnerInfo;

    // Determine center_id prefix
    let prefix = prefixByPartner[partnerUuid];
    if (!prefix) {
      prefix = derivePrefix(dbPartnerName);
      prefixByPartner[partnerUuid] = prefix;
    }

    // Init tracking sets for this partner
    if (!existingNamesByPartner[partnerUuid]) existingNamesByPartner[partnerUuid] = new Set();
    if (!batchNamesByPartner[partnerUuid]) batchNamesByPartner[partnerUuid] = new Set();

    const dbNames = existingNamesByPartner[partnerUuid];
    const batchNames = batchNamesByPartner[partnerUuid];

    // Find a unique center_name (suffix -1, -2, -3 if needed)
    const baseName = (row['Training Center'] || '').trim();
    let finalName = baseName;

    if (dbNames.has(baseName.toLowerCase()) || batchNames.has(baseName.toLowerCase())) {
      let i = 1;
      while (true) {
        const candidate = `${baseName}-${i}`;
        if (!dbNames.has(candidate.toLowerCase()) && !batchNames.has(candidate.toLowerCase())) {
          finalName = candidate;
          break;
        }
        i++;
      }
    }

    // Register name in batch tracker (so subsequent rows in same batch don't collide)
    batchNames.add(finalName.toLowerCase());

    // Increment center_id sequence (live DB uses XXX-NNN format, min 3 digits)
    maxSeq[prefix] = (maxSeq[prefix] || 0) + 1;
    const newCenterId = `${prefix}-${String(maxSeq[prefix]).padStart(3, '0')}`;

    // Field mapping
    const centerType = (row['Type of the centre'] || '').trim() || null;
    const region = (row['Region'] || '').trim() || null;
    const city = (row['City'] || '').trim() || null;
    const state = (row['State'] || '').trim() || null;
    const address = (row['Center  address'] || '').trim() || null;
    const yearRaw = (row['Year of establishment'] || '').trim();
    const year = yearRaw && /^\d{4}$/.test(yearRaw) ? parseInt(yearRaw, 10) : null;
    const status = mapStatus(row['Status of the centre']);

    inserts.push({
      id: uuidv4(),
      center_id: newCenterId,
      partner_id: partnerUuid,
      center_name: finalName,
      center_type: centerType,
      region,
      city,
      state,
      address,
      year_of_establishment: year,
      status,
      _slNo: row['Sl.No'],
      _role: row['Role'],
      _originalName: baseName,
      _partner: dbPartnerName,
    });
  }

  // 5. Build SQL ────────────────────────────────────────────────────────────────
  const lines = [
    '-- ============================================================',
    '-- Auto-generated: import-centers-from-csv.js',
    `-- Generated at : ${new Date().toISOString()}`,
    `-- Total rows   : ${inserts.length}`,
    '-- ============================================================',
    '',
    'SET NAMES utf8mb4;',
    '',
  ];

  for (const r of inserts) {
    const suffix =
      r.center_name !== r._originalName
        ? `  [renamed: "${r._originalName}" → "${r.center_name}"]`
        : '';
    lines.push(`-- Row ${r._slNo} [${r._role}] ${r._partner}${suffix}`);
    lines.push(
      `INSERT INTO \`centers\` ` +
        `(\`id\`, \`center_id\`, \`partner_id\`, \`country_id\`, \`center_name\`, \`center_type\`, ` +
        `\`region\`, \`city\`, \`state\`, \`country\`, \`address\`, \`year_of_establishment\`, ` +
        `\`status\`, \`approval_status\`, \`created_at\`, \`updated_at\`) VALUES (` +
        `${sq(r.id)}, ${sq(r.center_id)}, ${sq(r.partner_id)}, 101, ${sq(r.center_name)}, ` +
        `${sq(r.center_type)}, ${sq(r.region)}, ${sq(r.city)}, ${sq(r.state)}, 'India', ` +
        `${sq(r.address)}, ${r.year_of_establishment ?? 'NULL'}, ` +
        `${sq(r.status)}, 'approved', NOW(), NOW());`
    );
    lines.push('');
  }

  if (warnings.length) {
    lines.push('-- ============================================================');
    lines.push('-- WARNINGS (rows that were SKIPPED):');
    for (const w of warnings) lines.push(`-- ${w}`);
    lines.push('-- ============================================================');
  }

  // 6. Write SQL file ──────────────────────────────────────────────────────────
  fs.writeFileSync(outputSql, lines.join('\n'), 'utf8');

  console.log('');
  console.log(`✓ Generated ${inserts.length} INSERT statements`);
  if (warnings.length) console.log(`⚠  ${warnings.length} row(s) skipped — see end of SQL file`);
  console.log(`  Output: ${outputSql}`);
  console.log('');
  console.log('Review the SQL file, then run:');
  console.log('  mysql -u root seif < data/documents/insert_centers.sql');

  await conn.end();
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
