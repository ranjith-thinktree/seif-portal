/**
 * add_multicourse_to_db_and_update_report.js
 * 1. Adds missing center-course links to DB from multi_course_centers.csv
 * 2. Updates csv_duplicate_center_rows_comparison.csv with only the 31 true duplicates
 */

require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const MULTI_CSV = path.join(__dirname, '../../data/documents/multi_course_centers.csv');
const TRUE_DUPS = path.join(__dirname, '../../data/documents/true_duplicate_rows.csv');
const REPORT_OUT = path.join(
  __dirname,
  '../../data/documents/csv_duplicate_center_rows_comparison.csv'
);

// CSV course name → DB course_name mapping
const COURSE_MAP = {
  electrical: 'Basic Electrician',
  solar: 'Solar Solution',
  'industrial automation': 'Industrial Automation',
  coe: 'ITI (Electrical / Wireman / Others)',
  'knowledge center': 'ITI (Electrical / Wireman / Others)',
  entrepreneurship: 'EDP (Entrepreneur Development Program)',
  'data centre mgt': 'Data Center Management',
  'data center mgt': 'Data Center Management',
};

const norm = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const mapCourse = (csvCourse) => {
  const n = norm(csvCourse);
  return COURSE_MAP[n] || null;
};

const readCSV = (filePath) =>
  new Promise((res, rej) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (r) => rows.push(r))
      .on('end', () => res(rows))
      .on('error', rej);
  });

const escape = (v) => {
  const s = String(v == null ? '' : v);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
};

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306,
  });

  // Load DB lookups
  const [centersRows] = await conn.query('SELECT id, center_name FROM centers');
  const [coursesRows] = await conn.query('SELECT id, course_name FROM courses');
  const [existingLinks] = await conn.query('SELECT center_id, course_id FROM center_courses');

  const centerMap = {}; // norm(name) → id
  for (const r of centersRows) centerMap[norm(r.center_name)] = r.id;

  const courseMap = {}; // norm(name) → id
  for (const r of coursesRows) courseMap[norm(r.course_name)] = r.id;

  const existingSet = new Set(); // "center_id|course_id"
  for (const r of existingLinks) existingSet.add(`${r.center_id}|${r.course_id}`);

  // --- TASK 1: Add multi-course links ---
  const multiRows = await readCSV(MULTI_CSV);

  // Collect all unique (center_norm, csvCourse) pairs to process
  const pairsToAdd = new Set();
  for (const row of multiRows) {
    const cNorm = norm(row['center_name']);
    // Add both row_1_course and row_n_course (handles any missing ones)
    pairsToAdd.add(`${cNorm}|||${norm(row['row_1_course'])}`);
    pairsToAdd.add(`${cNorm}|||${norm(row['row_n_course'])}`);
  }

  let inserted = 0;
  let skipped = 0;
  let notFound = [];

  for (const pair of pairsToAdd) {
    const [cNorm, csvCourseNorm] = pair.split('|||');
    const centerId = centerMap[cNorm];
    const dbCourseName = mapCourse(csvCourseNorm);

    if (!centerId) {
      notFound.push(`Center not found: "${cNorm}"`);
      continue;
    }
    if (!dbCourseName) {
      notFound.push(`Course mapping not found for: "${csvCourseNorm}"`);
      continue;
    }

    const courseId = courseMap[norm(dbCourseName)];
    if (!courseId) {
      notFound.push(`Course not in DB: "${dbCourseName}"`);
      continue;
    }

    const key = `${centerId}|${courseId}`;
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }

    await conn.query('INSERT INTO center_courses (id, center_id, course_id) VALUES (?, ?, ?)', [
      uuidv4(),
      centerId,
      courseId,
    ]);
    existingSet.add(key);
    inserted++;
  }

  await conn.end();

  // --- TASK 2: Update csv_duplicate_center_rows_comparison.csv with true duplicates ---
  const trueDupRows = await readCSV(TRUE_DUPS);
  const headers = [
    'center_name',
    'partner',
    'course',
    'keep_row_number',
    'duplicate_row_number',
    'total_occurrences',
  ];
  const lines = [
    headers.join(','),
    ...trueDupRows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ];
  fs.writeFileSync(REPORT_OUT, lines.join('\n'), 'utf8');

  // --- Summary ---
  console.log(
    JSON.stringify(
      {
        db_updates: {
          center_course_links_inserted: inserted,
          already_existed_skipped: skipped,
          issues: notFound,
        },
        report_updated: {
          file: REPORT_OUT,
          rows: trueDupRows.length,
          description: 'Now contains only 31 true duplicate rows (same center + same course)',
        },
      },
      null,
      2
    )
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
