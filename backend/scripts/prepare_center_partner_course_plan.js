const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const CSV_FILE = 'C:/Users/ranji/Downloads/Skill Centre Data base_SEIF (687).xlsx - Sheet1.csv';
const OUT_DIR = path.join(__dirname, '..', '..', 'data', 'documents');

const norm = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const toCsv = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const typeToCourse = (raw) => {
  const t = norm(raw);
  if (t === 'electrical') return 'Basic Electrican';
  if (t === 'solar') return 'Solar Solution';
  if (t === 'electrical + solar') return 'Basic Electrician + Solar Solution';
  if (t === 'industrial automation') return 'Industrial Automation';
  if (t === 'data centre mgt') return 'Data Center Management';
  if (t === 'coe') return 'ITI (Electrical / Wireman / Others)';
  if (t === 'knowledge center') return 'Data Center Management';
  if (t === 'entrepreneurship') return 'EDP (Entrepreneur Development Program)';
  return null;
};

const tokenSet = (s) =>
  new Set(
    norm(s)
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(' ')
      .filter(Boolean)
  );

const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter++;
  }
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
};

function findPartnerMatch(csvPartner, partners) {
  const n = norm(csvPartner);
  const exact = partners.find((p) => p.nameNorm === n);
  if (exact) return { type: 'exact', partner: exact, score: 1 };

  const csvTokens = tokenSet(csvPartner);
  let best = null;
  for (const p of partners) {
    const score = jaccard(csvTokens, p.tokens);
    if (!best || score > best.score) {
      best = { type: 'heuristic', partner: p, score };
    }
  }

  if (best && best.score >= 0.75) return best;
  return { type: 'unmatched', partner: null, score: 0 };
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => toCsv(row[h])).join(','));
  }
  fs.writeFileSync(filePath, lines.join('\n'));
}

async function main() {
  const rawRows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE)
      .pipe(csv({ headers: false }))
      .on('data', (r) => rawRows.push(r))
      .on('end', resolve)
      .on('error', reject);
  });

  const dataRows = rawRows.slice(1);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
  });

  const [partners] = await conn.execute('SELECT id, name FROM partners');
  const [centers] = await conn.execute('SELECT id, center_name, partner_id FROM centers');
  const [courses] = await conn.execute('SELECT id, course_name FROM courses');
  const [centerCourses] = await conn.execute('SELECT center_id, course_id FROM center_courses');
  await conn.end();

  const partnersPrepared = partners.map((p) => ({
    id: String(p.id),
    name: String(p.name || ''),
    nameNorm: norm(p.name),
    tokens: tokenSet(p.name),
  }));

  const courseByNorm = new Map(
    courses.map((c) => [norm(c.course_name), { id: String(c.id), name: String(c.course_name) }])
  );

  const centersByNameNorm = new Map();
  for (const c of centers) {
    const key = norm(c.center_name);
    if (!centersByNameNorm.has(key)) centersByNameNorm.set(key, []);
    centersByNameNorm.get(key).push({
      id: String(c.id),
      center_name: String(c.center_name || ''),
      partner_id: c.partner_id ? String(c.partner_id) : '',
    });
  }

  const existingCenterCourse = new Set(
    centerCourses.map((cc) => `${String(cc.center_id)}||${String(cc.course_id)}`)
  );

  const rowAudit = [];
  const partnerAuditMap = new Map();
  const centerPartnerUpdates = new Map();
  const unresolvedPartnerRows = [];
  const ambiguousCenterRows = [];
  const missingCenterRows = [];
  const centerCourseInserts = new Map();
  const centerCourseRejects = [];

  let processedRows = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const sourceRow = i + 2;

    const trainingCenter = String(row['1'] || '').trim();
    const csvPartner = String(row['2'] || '').trim();
    const csvTypeCol4 = String(row['3'] || '').trim();

    if (!trainingCenter) continue;
    processedRows++;

    const centerNorm = norm(trainingCenter);
    const centerMatches = centersByNameNorm.get(centerNorm) || [];

    const partnerMatch = findPartnerMatch(csvPartner, partnersPrepared);
    if (!partnerAuditMap.has(norm(csvPartner))) {
      partnerAuditMap.set(norm(csvPartner), {
        csv_partner_name: csvPartner,
        status: partnerMatch.type,
        matched_partner_id: partnerMatch.partner ? partnerMatch.partner.id : '',
        matched_partner_name: partnerMatch.partner ? partnerMatch.partner.name : '',
        confidence_score: partnerMatch.score ? Number(partnerMatch.score.toFixed(3)) : 0,
      });
    }

    let rowStatus = 'ok';
    let rowReason = '';

    if (!centerMatches.length) {
      rowStatus = 'missing_center';
      rowReason = 'Center not found in DB by normalized name';
      missingCenterRows.push({
        source_row: sourceRow,
        training_center: trainingCenter,
        implementation_partner_col3: csvPartner,
        type_of_centre_col4: csvTypeCol4,
      });
    } else if (centerMatches.length > 1) {
      rowStatus = 'ambiguous_center';
      rowReason = 'Multiple centers found with same normalized center_name';
      ambiguousCenterRows.push({
        source_row: sourceRow,
        training_center: trainingCenter,
        implementation_partner_col3: csvPartner,
        type_of_centre_col4: csvTypeCol4,
        center_count: centerMatches.length,
        candidate_center_ids: centerMatches.map((c) => c.id).join('|'),
      });
    } else {
      const center = centerMatches[0];

      if (partnerMatch.type === 'exact') {
        if (center.partner_id !== partnerMatch.partner.id) {
          const key = center.id;
          if (!centerPartnerUpdates.has(key)) {
            centerPartnerUpdates.set(key, {
              center_id: center.id,
              center_name: center.center_name,
              old_partner_id: center.partner_id,
              new_partner_id: partnerMatch.partner.id,
              csv_partner_name: csvPartner,
              matched_partner_name: partnerMatch.partner.name,
              source_rows: String(sourceRow),
            });
          } else {
            const existing = centerPartnerUpdates.get(key);
            if (!existing.source_rows.split('|').includes(String(sourceRow))) {
              existing.source_rows += `|${sourceRow}`;
            }
          }
          rowStatus = 'partner_update_needed';
          rowReason = 'Center exists but partner differs from exact CSV partner mapping';
        }
      } else {
        rowStatus =
          partnerMatch.type === 'heuristic' ? 'partner_heuristic_review' : 'partner_unmatched';
        rowReason =
          partnerMatch.type === 'heuristic'
            ? `Partner matched heuristically (${partnerMatch.score.toFixed(3)}), manual review needed`
            : 'CSV partner could not be matched to partners table';
        unresolvedPartnerRows.push({
          source_row: sourceRow,
          training_center: trainingCenter,
          implementation_partner_col3: csvPartner,
          center_id: center.id,
          current_partner_id: center.partner_id,
          partner_match_status: partnerMatch.type,
          suggested_partner_id: partnerMatch.partner ? partnerMatch.partner.id : '',
          suggested_partner_name: partnerMatch.partner ? partnerMatch.partner.name : '',
          confidence_score: partnerMatch.score ? Number(partnerMatch.score.toFixed(3)) : 0,
          reason: rowReason,
        });
      }

      const mappedCourseName = typeToCourse(csvTypeCol4);
      if (!mappedCourseName) {
        centerCourseRejects.push({
          source_row: sourceRow,
          training_center: trainingCenter,
          center_id: center.id,
          type_of_centre_col4: csvTypeCol4,
          mapped_course_name: '',
          reason: 'Unmapped type in column 4',
        });
      } else {
        const course = courseByNorm.get(norm(mappedCourseName));
        if (!course) {
          centerCourseRejects.push({
            source_row: sourceRow,
            training_center: trainingCenter,
            center_id: center.id,
            type_of_centre_col4: csvTypeCol4,
            mapped_course_name: mappedCourseName,
            reason: 'Mapped course missing in courses table',
          });
        } else {
          const key = `${center.id}||${course.id}`;
          if (!existingCenterCourse.has(key)) {
            if (!centerCourseInserts.has(key)) {
              centerCourseInserts.set(key, {
                center_id: center.id,
                center_name: center.center_name,
                course_id: course.id,
                course_name: course.name,
                source_rows: String(sourceRow),
                source_type_values: csvTypeCol4,
              });
            } else {
              const ex = centerCourseInserts.get(key);
              if (!ex.source_rows.split('|').includes(String(sourceRow))) {
                ex.source_rows += `|${sourceRow}`;
              }
              if (!ex.source_type_values.split('|').includes(csvTypeCol4)) {
                ex.source_type_values += `|${csvTypeCol4}`;
              }
            }
          }
        }
      }
    }

    rowAudit.push({
      source_row: sourceRow,
      training_center: trainingCenter,
      implementation_partner_col3: csvPartner,
      type_of_centre_col4: csvTypeCol4,
      center_match_count: centerMatches.length,
      partner_match_status: partnerMatch.type,
      partner_match_score: partnerMatch.score ? Number(partnerMatch.score.toFixed(3)) : 0,
      status: rowStatus,
      reason: rowReason,
    });
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = {
    rowAudit: path.join(OUT_DIR, 'center_row_audit_col2_col3_col4.csv'),
    partnerAudit: path.join(OUT_DIR, 'partner_name_mapping_audit_col3.csv'),
    centerPartnerUpdates: path.join(OUT_DIR, 'center_partner_updates_exact_only.csv'),
    unresolvedPartnerRows: path.join(OUT_DIR, 'center_partner_unresolved_rows.csv'),
    missingCenters: path.join(OUT_DIR, 'missing_centers_from_csv_col2.csv'),
    ambiguousCenters: path.join(OUT_DIR, 'ambiguous_centers_by_name.csv'),
    centerCourseInserts: path.join(OUT_DIR, 'center_courses_insert_ready.csv'),
    centerCourseRejects: path.join(OUT_DIR, 'center_courses_rejects.csv'),
  };

  writeCsv(
    files.rowAudit,
    [
      'source_row',
      'training_center',
      'implementation_partner_col3',
      'type_of_centre_col4',
      'center_match_count',
      'partner_match_status',
      'partner_match_score',
      'status',
      'reason',
    ],
    rowAudit
  );

  writeCsv(
    files.partnerAudit,
    [
      'csv_partner_name',
      'status',
      'matched_partner_id',
      'matched_partner_name',
      'confidence_score',
    ],
    Array.from(partnerAuditMap.values())
  );

  writeCsv(
    files.centerPartnerUpdates,
    [
      'center_id',
      'center_name',
      'old_partner_id',
      'new_partner_id',
      'csv_partner_name',
      'matched_partner_name',
      'source_rows',
    ],
    Array.from(centerPartnerUpdates.values())
  );

  writeCsv(
    files.unresolvedPartnerRows,
    [
      'source_row',
      'training_center',
      'implementation_partner_col3',
      'center_id',
      'current_partner_id',
      'partner_match_status',
      'suggested_partner_id',
      'suggested_partner_name',
      'confidence_score',
      'reason',
    ],
    unresolvedPartnerRows
  );

  writeCsv(
    files.missingCenters,
    ['source_row', 'training_center', 'implementation_partner_col3', 'type_of_centre_col4'],
    missingCenterRows
  );

  writeCsv(
    files.ambiguousCenters,
    [
      'source_row',
      'training_center',
      'implementation_partner_col3',
      'type_of_centre_col4',
      'center_count',
      'candidate_center_ids',
    ],
    ambiguousCenterRows
  );

  writeCsv(
    files.centerCourseInserts,
    ['center_id', 'center_name', 'course_id', 'course_name', 'source_rows', 'source_type_values'],
    Array.from(centerCourseInserts.values())
  );

  writeCsv(
    files.centerCourseRejects,
    [
      'source_row',
      'training_center',
      'center_id',
      'type_of_centre_col4',
      'mapped_course_name',
      'reason',
    ],
    centerCourseRejects
  );

  const summary = {
    csv_rows_processed: processedRows,
    centers_in_db_unique_names: centersByNameNorm.size,
    missing_centers_count: missingCenterRows.length,
    ambiguous_center_rows_count: ambiguousCenterRows.length,
    partner_updates_exact_only_count: centerPartnerUpdates.size,
    unresolved_partner_rows_count: unresolvedPartnerRows.length,
    center_course_insert_ready_count: centerCourseInserts.size,
    center_course_rejects_count: centerCourseRejects.length,
    output_files: files,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
