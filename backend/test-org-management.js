/**
 * Organization Management - Comprehensive API Test
 */
require('dotenv').config();
const http = require('http');
const mysql = require('mysql2/promise');

function request(method, path, token, body = null) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(b) });
        } catch (e) {
          resolve({ status: res.statusCode, body: b });
        }
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (data) req.write(data);
    req.end();
  });
}

const PASS = '\x1b[32mPASS\x1b[0m';
const FAIL = '\x1b[31mFAIL\x1b[0m';
const WARN = '\x1b[33mWARN\x1b[0m';
const INFO = '\x1b[36mINFO\x1b[0m';

let issues = [];
let warnings = [];

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  [${PASS}] ${label}${detail ? ': ' + detail : ''}`);
  } else {
    console.log(`  [${FAIL}] ${label}${detail ? ': ' + detail : ''}`);
    issues.push(label + (detail ? ': ' + detail : ''));
  }
  return condition;
}

function warn(label, detail = '') {
  console.log(`  [${WARN}] ${label}${detail ? ': ' + detail : ''}`);
  warnings.push(label + (detail ? ': ' + detail : ''));
}

function info(label, detail = '') {
  console.log(`  [${INFO}] ${label}${detail ? ': ' + detail : ''}`);
}

(async () => {
  console.log('\n====================================================');
  console.log('  ORGANIZATION MANAGEMENT - FULL DIAGNOSTIC REPORT');
  console.log('====================================================\n');

  // ===== 1. LOGIN =====
  console.log('--- TEST 1: Authentication ---');
  const loginResp = await request('POST', '/api/v1/auth/login', '', {
    email: 'admin@seif.org',
    password: 'Password123',
  });
  check('Login HTTP 200', loginResp.status === 200);
  check('Login success:true', loginResp.body.success === true);
  check('Access token present', !!loginResp.body.data?.accessToken);
  check('User role is ADMIN', loginResp.body.data?.user?.role === 'ADMIN');
  const TOKEN = loginResp.body.data?.accessToken;
  if (!TOKEN) {
    console.log('\nCannot continue without token');
    process.exit(1);
  }

  // ===== 2. GET /partners =====
  console.log('\n--- TEST 2: GET /partners (OrganizationPartnersPage) ---');
  const partnersResp = await request(
    'GET',
    '/api/v1/partners?limit=1000&approval_status=approved',
    TOKEN
  );
  check('HTTP 200', partnersResp.status === 200);
  check('success:true', partnersResp.body.success === true);
  check('data is Array', Array.isArray(partnersResp.body.data));
  const partners = partnersResp.body.data || [];
  check('Partners returned', partners.length > 0, `count=${partners.length}`);

  if (partners.length > 0) {
    const p = partners[0];
    // Field presence checks (fields used by UI)
    check('field: name', 'name' in p, p.name || 'null');
    check('field: partner_id', 'partner_id' in p);
    check('field: organization_type', 'organization_type' in p);
    check('field: contact_person', 'contact_person' in p);
    check('field: contact_email', 'contact_email' in p);
    check('field: contact_phone', 'contact_phone' in p);
    check('field: address_line1', 'address_line1' in p);
    check('field: address_line2', 'address_line2' in p);
    check('field: city', 'city' in p);
    check('field: state', 'state' in p);
    check('field: postal_code', 'postal_code' in p);
    check('field: total_centers', 'total_centers' in p);
    check('field: status', 'status' in p);

    // Data quality checks
    const nullCities = partners.filter((p) => !p.city).length;
    const nullStates = partners.filter((p) => !p.state).length;
    const nullOrgType = partners.filter((p) => !p.organization_type).length;
    if (nullCities > 0) warn(`${nullCities}/${partners.length} partners have null city`);
    if (nullStates > 0) warn(`${nullStates}/${partners.length} partners have null state`);
    if (nullOrgType > 0)
      warn(`${nullOrgType}/${partners.length} partners have null organization_type`);

    // Status distribution
    const statusDist = {};
    partners.forEach((p) => {
      statusDist[p.status] = (statusDist[p.status] || 0) + 1;
    });
    info('Status distribution', JSON.stringify(statusDist));

    // Frontend filter check: only active/inactive shown
    const frontendFiltered = partners.filter(
      (p) => p.status === 'active' || p.status === 'inactive'
    );
    check(
      'Frontend filter (active/inactive) keeps data',
      frontendFiltered.length > 0,
      `${frontendFiltered.length} of ${partners.length} pass filter`
    );
    if (frontendFiltered.length < partners.length) {
      warn(
        `${partners.length - frontendFiltered.length} partners excluded by frontend status filter`
      );
    }

    // resetUserPassword uses partner.id (NOT partner.partner_id)
    check('Partner has .id field for resetPassword', 'id' in p);
    info('Reset password uses partner.id', `first partner id = ${p.id?.substring(0, 8)}...`);
  }

  // ===== 3. GET /centers =====
  console.log('\n--- TEST 3: GET /centers (OrganizationCentersPage) ---');
  const centersResp = await request(
    'GET',
    '/api/v1/centers?limit=1000&approval_status=approved',
    TOKEN
  );
  check('HTTP 200', centersResp.status === 200);
  check('success:true', centersResp.body.success === true);
  check('data is Array', Array.isArray(centersResp.body.data));
  const centers = centersResp.body.data || [];
  check('Centers returned', centers.length > 0, `count=${centers.length}`);

  if (centers.length > 0) {
    const c = centers[0];
    // Field presence checks (fields used by UI)
    check('field: center_name', 'center_name' in c, c.center_name || 'null');
    check('field: partner_name', 'partner_name' in c, c.partner_name || 'null');
    check('field: center_type', 'center_type' in c);
    check('field: region', 'region' in c);
    check('field: center_head', 'center_head' in c);
    check('field: mobile_number', 'mobile_number' in c);
    check('field: email', 'email' in c);
    check('field: address', 'address' in c);
    check('field: city', 'city' in c);
    check('field: state', 'state' in c);
    check('field: total_students', 'total_students' in c);
    check('field: status', 'status' in c);
    check('field: year_of_establishment', 'year_of_establishment' in c);

    // CRITICAL: courses_offered check
    const withCourses = centers.filter(
      (c) => c.courses_offered != null && c.courses_offered !== undefined
    );
    if (withCourses.length === 0) {
      check(
        'CRITICAL: courses_offered field present in API',
        false,
        'Field is MISSING from center records - DB has no courses_offered column'
      );
    } else {
      check(
        'courses_offered present',
        true,
        `${withCourses.length}/${centers.length} centers have it`
      );
      const firstWithCourses = withCourses[0];
      check(
        'courses_offered is array (for .join())',
        Array.isArray(firstWithCourses.courses_offered),
        typeof firstWithCourses.courses_offered
      );
    }

    // CSV export crash risk: courses_offered?.join() - safe with optional chaining
    info('CSV export courses_offered', 'uses ?. operator - safe even when undefined');

    // Status distribution
    const cStatusDist = {};
    centers.forEach((c) => {
      cStatusDist[c.status] = (cStatusDist[c.status] || 0) + 1;
    });
    info('Center status distribution', JSON.stringify(cStatusDist));

    // Frontend filter: only active/inactive
    const fcFiltered = centers.filter((c) => c.status === 'active' || c.status === 'inactive');
    check(
      'Frontend filter keeps data',
      fcFiltered.length > 0,
      `${fcFiltered.length} of ${centers.length}`
    );
  }

  // ===== 4. GET /users (for reset-password user lookup) =====
  console.log('\n--- TEST 4: GET /users endpoint ---');
  const usersRaw = await request('GET', '/api/v1/users?limit=2&role=PARTNER', TOKEN);
  check('HTTP 200', usersRaw.status === 200);
  check('success:true', usersRaw.body.success === true);
  const usersData = usersRaw.body.data;
  info('data type', typeof usersData);
  if (typeof usersData === 'string') {
    // data is message string - look for users in different key
    const bodyKeys = Object.keys(usersRaw.body);
    info('Response keys', bodyKeys.join(', '));
    const usersArr = usersRaw.body.users || usersRaw.body.result || [];
    check('Users array accessible', Array.isArray(usersArr), `found in .users: ${usersArr.length}`);
  } else if (Array.isArray(usersData)) {
    check('Users returned as array', true, `count=${usersData.length}`);
    if (usersData.length > 0) {
      check('User has .id field', 'id' in usersData[0]);
    }
  } else if (usersData && typeof usersData === 'object') {
    const nested = usersData.users || usersData.data || [];
    check('Users nested in data.users', Array.isArray(nested), `count=${nested.length}`);
    info('Full data keys', Object.keys(usersData).join(', '));
  }

  // ===== 5. POST /users/:id/reset-password =====
  console.log('\n--- TEST 5: POST /users/:id/reset-password ---');
  // Just check the route exists with a valid ID (won't crash if ID is valid format)
  if (partners.length > 0) {
    // We need the USER id of the partner, not the partner record id
    // The reset-password is called with selectedPartner.id
    // selectedPartner comes from getPartners() - so it's the PARTNER table id
    // But reset-password endpoint is /users/:id/reset-password - needs USER id
    const partnerObj = partners[0];
    info(
      'OrganizationPartnersPage calls resetUserPassword(selectedPartner.id)',
      `where selectedPartner.id = ${partnerObj.id?.substring(0, 8)} (PARTNER table id)`
    );
    warn(
      'POTENTIAL BUG: resetUserPassword uses partner.id but endpoint needs user.id',
      'Partner table id != Users table id - password reset may fail for correct partner user'
    );
  }

  // ===== 6. Check routes for reset-password =====
  console.log('\n--- TEST 6: Reset-Password Route Test ---');
  const fakeUUID = 'a0000000-0000-0000-0000-000000000001';
  const resetResp = await request('POST', `/api/v1/users/${fakeUUID}/reset-password`, TOKEN);
  check(
    'Reset-password route exists (not 404)',
    resetResp.status !== 404,
    `HTTP ${resetResp.status}`
  );
  info('Reset-password response', JSON.stringify(resetResp.body).substring(0, 100));

  // ===== 7. Check DB for courses_offered =====
  console.log('\n--- TEST 7: Database Schema Analysis ---');
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'seif',
    });
    const [cols] = await db.query('DESCRIBE centers');
    const colNames = cols.map((c) => c.Field);
    check(
      'centers.courses_offered column exists in DB',
      colNames.includes('courses_offered'),
      'Column missing - this is why courses_offered is always undefined in API'
    );

    const courseRelTables = colNames.filter((c) => c.toLowerCase().includes('course'));
    info('Center columns with "course"', courseRelTables.join(', ') || 'NONE');

    // Check for a separate courses junction table
    const [allTables] = await db.query('SHOW TABLES');
    const tableNames = allTables.map((t) => Object.values(t)[0]);
    const courseTables = tableNames.filter((t) => t.toLowerCase().includes('course'));
    info('Course-related tables', courseTables.join(', ') || 'NONE');

    // Check partners table columns - specifically address fields
    const [partCols] = await db.query('DESCRIBE partners');
    const partColNames = partCols.map((c) => c.Field);
    check('partners.address_line1 exists', partColNames.includes('address_line1'));
    check('partners.address_line2 exists', partColNames.includes('address_line2'));
    check('partners.postal_code exists', partColNames.includes('postal_code'));
    check('partners.city exists', partColNames.includes('city'));
    check('partners.state exists', partColNames.includes('state'));

    // Check centers address field
    check('centers.address exists', colNames.includes('address'));
    check('centers.city exists', colNames.includes('city'));
    check('centers.state exists', colNames.includes('state'));

    await db.end();
  } catch (dbErr) {
    warn('DB connection failed', dbErr.message);
  }

  // ===== 8. DELETE endpoints =====
  console.log('\n--- TEST 8: Delete Endpoint Routing ---');
  // Test with a UUID that doesn't exist - should get 404, not 500
  const fakeId = 'a0000000-0000-0000-0000-000000000999';
  const delPartnerResp = await request('DELETE', `/api/v1/partners/${fakeId}`, TOKEN);
  check(
    'DELETE /partners/:id route exists',
    delPartnerResp.status !== 404,
    `HTTP ${delPartnerResp.status}`
  );
  info('DELETE partner response', JSON.stringify(delPartnerResp.body).substring(0, 100));

  const delCenterResp = await request('DELETE', `/api/v1/centers/${fakeId}`, TOKEN);
  check(
    'DELETE /centers/:id route exists',
    delCenterResp.status !== 404,
    `HTTP ${delCenterResp.status}`
  );
  info('DELETE center response', JSON.stringify(delCenterResp.body).substring(0, 100));

  // ===== SUMMARY =====
  console.log('\n====================================================');
  console.log('  SUMMARY');
  console.log('====================================================');
  console.log(`\nTotal Issues (FAIL): ${issues.length}`);
  if (issues.length > 0) {
    issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
  }
  console.log(`\nTotal Warnings: ${warnings.length}`);
  if (warnings.length > 0) {
    warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
  }
  console.log('\n');
})().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
