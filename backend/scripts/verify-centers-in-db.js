'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'seif',
};

const PARTNER_NAME_MAP = {
  'Ambuja Cemebt Foundation': 'Ambuja Cemebt Foundation',
  'Ambuja Cement Foundation': 'Ambuja Cemebt Foundation',
  'Dalmia Bharath Foundation': 'Dalmia Bharat Foundation',
};

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  result.push(cur);
  return result;
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function stripNumericSuffix(name) {
  return name.replace(/-\d+$/, '').trim();
}

function readFilteredCsv(csvPath) {
  const text = fs.readFileSync(csvPath, 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseCSVLine(lines[0]);
  const idx = {
    centerName: header.indexOf('Center Name'),
    partnerName: header.indexOf('Partner Name'),
    refurb: header.indexOf('Refurbuishment'),
    upgrad: header.indexOf('Upgradation'),
  };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const refurb = (fields[idx.refurb] || '').trim();
    const upgrad = (fields[idx.upgrad] || '').trim();
    if (!refurb && !upgrad) continue;

    rows.push({
      centerName: (fields[idx.centerName] || '').trim(),
      partnerName: (fields[idx.partnerName] || '').trim(),
      refurb,
      upgrad,
      fillType:
        refurb && upgrad ? 'both' : refurb ? 'refurb-only' : 'upgrad-only',
    });
  }
  return rows;
}

async function main() {
  const csvPath =
    process.argv[2] ||
    'C:/Users/ranji/Downloads/Copy of centers_1780394373860 (002).xlsx - Centers.csv';

  const csvRows = readFilteredCsv(csvPath);
  console.log(`Loaded ${csvRows.length} CSV centers with Refurbuishment and/or Upgradation filled\n`);

  const conn = await mysql.createConnection(DB_CONFIG);
  const [dbCenters] = await conn.query(
    `SELECT c.id, c.center_id, c.center_name, c.status, c.approval_status,
            p.name AS partner_name
     FROM centers c
     LEFT JOIN partners p ON p.id = c.partner_id`
  );
  await conn.end();

  const byExactName = new Map();
  const byNormalizedName = new Map();

  for (const center of dbCenters) {
    const exact = center.center_name.trim();
    const norm = normalizeName(exact);
    if (!byExactName.has(exact)) byExactName.set(exact, []);
    byExactName.get(exact).push(center);
    if (!byNormalizedName.has(norm)) byNormalizedName.set(norm, []);
    byNormalizedName.get(norm).push(center);
  }

  function findMatches(csvRow) {
    const candidates = new Set();
    const namesToTry = [
      csvRow.centerName,
      stripNumericSuffix(csvRow.centerName),
    ].filter(Boolean);

    for (const name of namesToTry) {
      for (const c of byExactName.get(name) || []) candidates.add(c);
      for (const c of byNormalizedName.get(normalizeName(name)) || []) candidates.add(c);
    }

    const mappedPartner =
      PARTNER_NAME_MAP[csvRow.partnerName] || csvRow.partnerName;
    const partnerNorm = normalizeName(mappedPartner);

    const all = [...candidates];
    const partnerMatches = all.filter(
      (c) => normalizeName(c.partner_name) === partnerNorm
    );

    return {
      exactOrNameMatch: all,
      partnerMatches,
      best: partnerMatches[0] || all[0] || null,
    };
  }

  const found = [];
  const missing = [];
  const ambiguous = [];

  for (const row of csvRows) {
    const { exactOrNameMatch, partnerMatches, best } = findMatches(row);
    if (!best) {
      missing.push(row);
    } else if (partnerMatches.length > 1) {
      ambiguous.push({ row, matches: partnerMatches });
      found.push({ row, match: best, note: 'multiple partner matches' });
    } else if (exactOrNameMatch.length > 1 && partnerMatches.length === 0) {
      ambiguous.push({ row, matches: exactOrNameMatch });
      found.push({ row, match: best, note: 'name matched, partner differed' });
    } else {
      found.push({ row, match: best });
    }
  }

  const refurbOnly = csvRows.filter((r) => r.fillType === 'refurb-only');
  const upgradOnly = csvRows.filter((r) => r.fillType === 'upgrad-only');
  const bothFilled = csvRows.filter((r) => r.fillType === 'both');

  const missingRefurb = refurbOnly.filter((r) => missing.some((m) => m.centerName === r.centerName));
  const missingUpgrad = upgradOnly.filter((r) => missing.some((m) => m.centerName === r.centerName));

  console.log('=== SUMMARY ===');
  console.log(`Total in CSV (with refurb and/or upgradation): ${csvRows.length}`);
  console.log(`  - Refurbuishment only: ${refurbOnly.length}`);
  console.log(`  - Upgradation only: ${upgradOnly.length}`);
  console.log(`  - Both filled: ${bothFilled.length}`);
  console.log(`Found in database: ${found.length}`);
  console.log(`Missing from database: ${missing.length}`);
  console.log(`Ambiguous matches: ${ambiguous.length}`);
  console.log(`Missing (refurb-only rows): ${missingRefurb.length}`);
  console.log(`Missing (upgrad-only rows): ${missingUpgrad.length}`);

  if (missing.length) {
    console.log('\n=== MISSING FROM DATABASE ===');
    missing.forEach((r) => {
      console.log(
        `  - ${r.centerName} | Partner: ${r.partnerName} | Refurb: ${r.refurb || '-'} | Upgrad: ${r.upgrad || '-'}`
      );
    });
  }

  if (ambiguous.length) {
    console.log('\n=== AMBIGUOUS (name matched multiple DB rows) ===');
    ambiguous.slice(0, 15).forEach(({ row, matches }) => {
      console.log(`  - CSV: ${row.centerName} (${row.partnerName})`);
      matches.forEach((m) => {
        console.log(`      -> DB: ${m.center_name} | ${m.partner_name} | ${m.center_id} | ${m.status}`);
      });
    });
    if (ambiguous.length > 15) console.log(`  ... and ${ambiguous.length - 15} more`);
  }

  const partnerMismatch = found.filter((f) => f.note === 'name matched, partner differed');
  if (partnerMismatch.length) {
    console.log('\n=== FOUND BY NAME BUT PARTNER DIFFERS ===');
    partnerMismatch.forEach(({ row, match }) => {
      console.log(
        `  - CSV: ${row.centerName} (${row.partnerName}) -> DB partner: ${match.partner_name}`
      );
    });
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
