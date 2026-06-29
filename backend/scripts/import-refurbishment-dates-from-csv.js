'use strict';

/**
 * One-time data import: set centers.last_refurbishment_date from CSV.
 *
 * Rules:
 * - Refurbuishment column -> last_refurbishment_date (when filled)
 * - Upgradation column -> last_refurbishment_date (when refurb empty, upgrad filled)
 * - When both filled -> use the later date
 * - Always overwrite existing last_refurbishment_date
 *
 * Usage:
 *   node scripts/import-refurbishment-dates-from-csv.js [--dry-run] [csvPath]
 */

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

const MONTHS = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
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

function parseDisplayDate(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;

  // 31st-March-2025
  const displayMatch = trimmed.match(/^(\d{1,2})(?:st|nd|rd|th)?-([A-Za-z]+)-(\d{4})$/i);
  if (displayMatch) {
    const day = parseInt(displayMatch[1], 10);
    const month = MONTHS[displayMatch[2].toLowerCase()];
    const year = parseInt(displayMatch[3], 10);
    if (!month || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // ISO date fallback
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return trimmed;

  return null;
}

function readCsv(csvPath) {
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
    const refurbRaw = (fields[idx.refurb] || '').trim();
    const upgradRaw = (fields[idx.upgrad] || '').trim();
    const refurbDate = parseDisplayDate(refurbRaw);
    const upgradDate = parseDisplayDate(upgradRaw);

    if (!refurbDate && !upgradDate) continue;

    let targetDate = null;
    let source = '';
    if (refurbDate && upgradDate) {
      targetDate = refurbDate >= upgradDate ? refurbDate : upgradDate;
      source = refurbDate >= upgradDate ? 'refurbishment' : 'upgradation';
    } else if (refurbDate) {
      targetDate = refurbDate;
      source = 'refurbishment';
    } else {
      targetDate = upgradDate;
      source = 'upgradation';
    }

    rows.push({
      centerName: (fields[idx.centerName] || '').trim(),
      partnerName: (fields[idx.partnerName] || '').trim(),
      refurbRaw,
      upgradRaw,
      refurbDate,
      upgradDate,
      targetDate,
      source,
    });
  }
  return rows;
}

function findDbCenter(csvRow, dbCenters) {
  const partnerNorm = normalizeName(
    PARTNER_NAME_MAP[csvRow.partnerName] || csvRow.partnerName
  );

  const exactPartnerMatches = dbCenters.filter(
    (c) =>
      c.center_name.trim() === csvRow.centerName &&
      normalizeName(c.partner_name) === partnerNorm
  );
  if (exactPartnerMatches.length === 1) return exactPartnerMatches[0];
  if (exactPartnerMatches.length > 1) {
    return { ambiguous: exactPartnerMatches };
  }

  const exactNameMatches = dbCenters.filter(
    (c) => c.center_name.trim() === csvRow.centerName
  );
  if (exactNameMatches.length === 1) return exactNameMatches[0];
  if (exactNameMatches.length > 1) return { ambiguous: exactNameMatches };

  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const csvPath =
    args.find((a) => !a.startsWith('--')) ||
    'C:/Users/ranji/Downloads/Copy of centers_1780394373860 (002).xlsx - Centers-converted.csv';

  const csvRows = readCsv(csvPath);
  console.log(`CSV rows with dates: ${csvRows.length}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}\n`);

  const conn = await mysql.createConnection(DB_CONFIG);
  const [dbCenters] = await conn.query(
    `SELECT c.id, c.center_id, c.center_name, c.last_refurbishment_date,
            p.name AS partner_name
     FROM centers c
     LEFT JOIN partners p ON p.id = c.partner_id`
  );

  const toUpdate = [];
  const missing = [];
  const ambiguous = [];
  const invalidDates = [];

  for (const row of csvRows) {
    if (!row.targetDate) {
      invalidDates.push(row);
      continue;
    }

    const match = findDbCenter(row, dbCenters);
    if (!match) {
      missing.push(row);
      continue;
    }
    if (match.ambiguous) {
      ambiguous.push({ row, matches: match.ambiguous });
      continue;
    }

    toUpdate.push({
      row,
      center: match,
      previousDate: match.last_refurbishment_date
        ? String(match.last_refurbishment_date).slice(0, 10)
        : null,
    });
  }

  console.log('=== PLAN ===');
  console.log(`Will update: ${toUpdate.length}`);
  console.log(`Missing: ${missing.length}`);
  console.log(`Ambiguous: ${ambiguous.length}`);
  console.log(`Invalid dates: ${invalidDates.length}`);

  const refurbSource = toUpdate.filter((u) => u.row.source === 'refurbishment').length;
  const upgradSource = toUpdate.filter((u) => u.row.source === 'upgradation').length;
  console.log(`  From refurbishment column: ${refurbSource}`);
  console.log(`  From upgradation column: ${upgradSource}`);

  if (toUpdate.length) {
    console.log('\n=== SAMPLE UPDATES (first 10) ===');
    toUpdate.slice(0, 10).forEach(({ row, center, previousDate }) => {
      console.log(
        `  ${center.center_name} (${center.center_id}) | ${previousDate || 'NULL'} -> ${row.targetDate} [${row.source}]`
      );
    });
  }

  if (missing.length) {
    console.log('\n=== MISSING ===');
    missing.forEach((r) => console.log(`  - ${r.centerName} (${r.partnerName})`));
  }

  if (ambiguous.length) {
    console.log('\n=== AMBIGUOUS ===');
    ambiguous.forEach(({ row, matches }) => {
      console.log(`  - ${row.centerName} (${row.partnerName})`);
      matches.forEach((m) => console.log(`      ${m.center_id} | ${m.center_name} | ${m.partner_name}`));
    });
  }

  if (!dryRun && toUpdate.length > 0) {
    await conn.beginTransaction();
    try {
      for (const { row, center } of toUpdate) {
        await conn.query(
          `UPDATE centers SET last_refurbishment_date = ? WHERE id = ?`,
          [row.targetDate, center.id]
        );
      }
      await conn.commit();
      console.log(`\n✅ Updated ${toUpdate.length} centers`);
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  } else if (dryRun) {
    console.log('\n(Dry run — no database changes made)');
  }

  await conn.end();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
