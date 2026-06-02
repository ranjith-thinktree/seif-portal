/**
 * apply_course_mappings.js
 *
 * 1. Fixes typo in courses table: "Basic Electrican" -> "Basic Electrician"
 * 2. Applies CSV course -> DB course mappings to insert missing center_courses links
 * 3. Outputs final reconciliation CSV
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const CSV_PATH = 'C:/Users/ranji/Downloads/Skill Centre Data base_SEIF (687).xlsx - Sheet1.csv';
const REPORT_PATH =
  'C:/Users/ranji/Desktop/TT/SEIF/data/documents/center_course_final_reconciliation.csv';

const norm = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

// CSV course value -> normalized DB course name mapping (lowercased for matching)
const COURSE_MAPPING = {
  electrical: 'basic electrician',
  solar: 'solar solution',
  'electrical + solar': 'basic electrician + solar solution',
  entrepreneurship: 'edp (entrepreneur development program)',
  coe: 'iti (electrical / wireman / others)',
  'knowledge center': 'iti (electrical / wireman / others)',
  'data centre mgt': 'data center management',
  'industrial automation': 'industrial automation',
};

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
  });

  // ── Step 1: Fix typo ──────────────────────────────────────────────────────
  const [typoRows] = await conn.execute(
    "SELECT id FROM courses WHERE course_name = 'Basic Electrican'"
  );
  let typoFixed = false;
  if (typoRows.length > 0) {
    await conn.execute(
      "UPDATE courses SET course_name = 'Basic Electrician' WHERE course_name = 'Basic Electrican'"
    );
    typoFixed = true;
    console.log('✔ Fixed typo: Basic Electrican -> Basic Electrician');
  } else {
    console.log('ℹ No typo found (already correct or already fixed)');
  }

  // ── Step 2: Load DB courses ───────────────────────────────────────────────
  const [dbCourses] = await conn.execute('SELECT id, course_name FROM courses');
  const courseByNormName = {};
  for (const c of dbCourses) {
    courseByNormName[norm(c.course_name)] = c;
  }

  // ── Step 3: Load DB centers ───────────────────────────────────────────────
  const [dbCenters] = await conn.execute('SELECT id, center_name, partner_id FROM centers');
  const centerByNormName = {};
  for (const c of dbCenters) {
    const key = norm(c.center_name);
    if (!centerByNormName[key]) centerByNormName[key] = [];
    centerByNormName[key].push(c);
  }

  // ── Step 4: Load existing center_courses links ────────────────────────────
  const [existingLinks] = await conn.execute('SELECT center_id, course_id FROM center_courses');
  const linkSet = new Set(existingLinks.map((r) => `${r.center_id}|${r.course_id}`));

  // ── Step 5: Parse CSV and reconcile ──────────────────────────────────────
  const csvRows = await new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });

  const report = [];
  const counts = {
    csv_rows_processed: 0,
    center_not_found: 0,
    course_not_mapped: 0,
    same_course: 0,
    added_course: 0,
  };

  let rowNum = 1; // header is row 1

  for (const row of csvRows) {
    rowNum++;
    counts.csv_rows_processed++;

    const csvCenterName = row['Training Center'];
    const csvCourse = row['Course'];
    const csvPartner = row['Implemenation Partner'] || row['Implementation Partner'] || '';

    const normCenter = norm(csvCenterName);
    const normCsvCourse = norm(csvCourse);
    const mappedNormCourse = COURSE_MAPPING[normCsvCourse];

    // Find center in DB
    const dbCenterMatches = centerByNormName[normCenter];
    if (!dbCenterMatches || dbCenterMatches.length === 0) {
      counts.center_not_found++;
      report.push({
        csv_row: rowNum,
        center_name: csvCenterName,
        csv_partner: csvPartner,
        csv_course: csvCourse,
        status: 'center_not_found',
        center_id: '',
        course_id: '',
        notes: 'Center not found in DB',
      });
      continue;
    }

    // Course mapping
    if (!mappedNormCourse) {
      counts.course_not_mapped++;
      report.push({
        csv_row: rowNum,
        center_name: csvCenterName,
        csv_partner: csvPartner,
        csv_course: csvCourse,
        status: 'course_not_mapped',
        center_id: dbCenterMatches.map((c) => c.id).join(';'),
        course_id: '',
        notes: `No mapping defined for CSV course: "${csvCourse}"`,
      });
      continue;
    }

    const dbCourse = courseByNormName[mappedNormCourse];
    if (!dbCourse) {
      counts.course_not_mapped++;
      report.push({
        csv_row: rowNum,
        center_name: csvCenterName,
        csv_partner: csvPartner,
        csv_course: csvCourse,
        status: 'course_not_mapped',
        center_id: dbCenterMatches.map((c) => c.id).join(';'),
        course_id: '',
        notes: `Mapped to "${mappedNormCourse}" but not found in DB courses`,
      });
      continue;
    }

    // For each matched center, check/insert link
    for (const dbCenter of dbCenterMatches) {
      const linkKey = `${dbCenter.id}|${dbCourse.id}`;
      if (linkSet.has(linkKey)) {
        counts.same_course++;
        report.push({
          csv_row: rowNum,
          center_name: csvCenterName,
          csv_partner: csvPartner,
          csv_course: csvCourse,
          status: 'same_course',
          center_id: dbCenter.id,
          course_id: dbCourse.id,
          notes: `Already linked: "${dbCourse.course_name}"`,
        });
      } else {
        // Insert
        const newId = uuidv4();
        await conn.execute(
          'INSERT INTO center_courses (id, center_id, course_id) VALUES (?, ?, ?)',
          [newId, dbCenter.id, dbCourse.id]
        );
        linkSet.add(linkKey);
        counts.added_course++;
        report.push({
          csv_row: rowNum,
          center_name: csvCenterName,
          csv_partner: csvPartner,
          csv_course: csvCourse,
          status: 'added_course',
          center_id: dbCenter.id,
          course_id: dbCourse.id,
          notes: `Inserted new link: "${dbCourse.course_name}"`,
        });
      }
    }
  }

  // ── Step 6: Write report CSV ──────────────────────────────────────────────
  const headers = [
    'csv_row',
    'center_name',
    'csv_partner',
    'csv_course',
    'status',
    'center_id',
    'course_id',
    'notes',
  ];
  const escape = (v) => {
    const s = String(v || '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(','),
    ...report.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ];
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n=== SUMMARY ===');
  console.log(
    JSON.stringify({ typo_fixed: typoFixed, ...counts, report_file: REPORT_PATH }, null, 2)
  );

  await conn.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
