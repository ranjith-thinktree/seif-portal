/**
 * Deep investigation of specific bugs found in Organization Management
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  });

  console.log('\n=== 1. center_courses table structure ===');
  try {
    const [cols] = await db.query('DESCRIBE center_courses');
    cols.forEach((c) => console.log(`  ${c.Field.padEnd(30)} ${c.Type.padEnd(20)} ${c.Null}`));
    const [rows] = await db.query('SELECT * FROM center_courses LIMIT 5');
    console.log('\n  Sample rows count:', rows.length);
    if (rows.length > 0) console.log('  First row:', rows[0]);
  } catch (e) {
    console.log('  Error:', e.message);
  }

  console.log('\n=== 2. courses table structure ===');
  try {
    const [cols] = await db.query('DESCRIBE courses');
    cols.forEach((c) => console.log(`  ${c.Field.padEnd(30)} ${c.Type.padEnd(20)} ${c.Null}`));
    const [courses] = await db.query('SELECT id, name FROM courses LIMIT 10');
    console.log('\n  Available courses:');
    courses.forEach((c) => console.log(`  - ${c.name || c.course_name || JSON.stringify(c)}`));
  } catch (e) {
    console.log('  Error:', e.message);
  }

  console.log('\n=== 3. partners table - check for user_id or linked user ===');
  try {
    const [cols] = await db.query('DESCRIBE partners');
    const userRelCols = cols.filter(
      (c) => c.Field.toLowerCase().includes('user') || c.Field.toLowerCase().includes('email')
    );
    userRelCols.forEach((c) => console.log(`  ${c.Field.padEnd(30)} ${c.Type}`));

    // Check if partners have a linked user
    const [p] = await db.query(`
      SELECT p.id as partner_id, p.name, u.id as user_id, u.email, u.role
      FROM partners p
      LEFT JOIN users u ON u.partner_id = p.id AND u.role = 'PARTNER'
      LIMIT 5
    `);
    console.log('\n  Partners with linked users:');
    p.forEach((r) =>
      console.log(
        `  partner_id=${r.partner_id?.substring(0, 8)} user_id=${r.user_id?.substring(0, 8)} email=${r.email}`
      )
    );
  } catch (e) {
    console.log('  Error:', e.message);
  }

  console.log('\n=== 4. reset-password endpoint - what user id does it need? ===');
  try {
    // Check users table for user with partner_id linkage
    const [users] = await db.query(`
      SELECT u.id, u.email, u.role, u.partner_id
      FROM users u
      WHERE u.role = 'PARTNER'
      LIMIT 3
    `);
    console.log('  Partner-role users:');
    users.forEach((u) =>
      console.log(
        `  user.id=${u.id?.substring(0, 8)} email=${u.email} partner_id=${u.partner_id?.substring(0, 8)}`
      )
    );

    // Does resetUserPassword(partner.id) match any user.id or does it need user.id?
    const [firstPartner] = await db.query('SELECT id, name FROM partners LIMIT 1');
    if (firstPartner.length > 0) {
      const pid = firstPartner[0].id;
      const [userByPartnerId] = await db.query('SELECT id FROM users WHERE id = ?', [pid]);
      const [userByPartnerLink] = await db.query('SELECT id FROM users WHERE partner_id = ?', [
        pid,
      ]);
      console.log(
        `\n  Does partner.id=${pid.substring(0, 8)} match any user.id?`,
        userByPartnerId.length > 0 ? 'YES' : 'NO'
      );
      console.log(`  Users linked to partner via partner_id:`, userByPartnerLink.length);
      if (userByPartnerLink.length > 0) {
        console.log(`  Linked user.id=${userByPartnerLink[0].id.substring(0, 8)}`);
      }
    }
  } catch (e) {
    console.log('  Error:', e.message);
  }

  console.log('\n=== 5. center_courses - test query to get courses for a center ===');
  try {
    const [centerWithCourses] = await db.query(`
      SELECT c.id, c.center_name, 
             GROUP_CONCAT(cr.name ORDER BY cr.name SEPARATOR ',') as courses_offered
      FROM centers c
      LEFT JOIN center_courses cc ON cc.center_id = c.id
      LEFT JOIN courses cr ON cr.id = cc.course_id
      WHERE c.approval_status = 'approved'
      GROUP BY c.id, c.center_name
      HAVING courses_offered IS NOT NULL
      LIMIT 5
    `);
    console.log('  Centers with courses (from join):');
    if (centerWithCourses.length === 0) {
      console.log('  NO data in center_courses table - join returns nothing');
      // Check count
      const [cnt] = await db.query('SELECT COUNT(*) as cnt FROM center_courses');
      console.log('  center_courses total rows:', cnt[0].cnt);
    } else {
      centerWithCourses.forEach((c) => console.log(`  ${c.center_name}: ${c.courses_offered}`));
    }
  } catch (e) {
    console.log('  Error:', e.message);
  }

  console.log('\n=== 6. users reset-password endpoint analysis ===');
  // Read the actual endpoint code
  const fs = require('fs');
  const path = require('path');
  const userRoutesPath = path.join(__dirname, 'src/api/v1/routes/user.routes.js');
  if (fs.existsSync(userRoutesPath)) {
    const content = fs.readFileSync(userRoutesPath, 'utf8');
    const resetIdx = content.indexOf('reset-password');
    if (resetIdx > -1) {
      console.log(
        '  reset-password route:',
        content.substring(Math.max(0, resetIdx - 100), resetIdx + 200)
      );
    }
  }

  await db.end();
  console.log('\n=== Investigation complete ===\n');
})().catch(console.error);
