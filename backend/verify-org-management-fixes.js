/**
 * Organization Management - FIX VERIFICATION TEST
 * Verifies all 3 bugs are fixed
 */
require('dotenv').config();
const http = require('http');

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
const INFO = '\x1b[36mINFO\x1b[0m';

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  [${PASS}] ${label}${detail ? ' → ' + detail : ''}`);
    passed++;
  } else {
    console.log(`  [${FAIL}] ${label}${detail ? ' → ' + detail : ''}`);
    failed++;
  }
}

function info(label, detail = '') {
  console.log(`  [${INFO}] ${label}${detail ? ': ' + detail : ''}`);
}

(async () => {
  console.log('\n=====================================================');
  console.log('  BUG FIX VERIFICATION - Organization Management');
  console.log('=====================================================\n');

  // Login
  const loginResp = await request('POST', '/api/v1/auth/login', '', {
    email: 'admin@seif.org',
    password: 'Password123',
  });
  const TOKEN = loginResp.body.data?.accessToken;
  check('Login successful', !!TOKEN);
  if (!TOKEN) process.exit(1);

  // ========== BUG 1: courses_offered in getAllCenters ==========
  console.log('\n--- BUG 1 FIX: courses_offered in GET /centers ---');
  console.log('  Issue: getAllCenters had no JOIN with center_courses/courses tables');
  console.log('  Fix: Added GROUP_CONCAT subquery → transforms to array\n');

  const centersResp = await request(
    'GET',
    '/api/v1/centers?limit=10&approval_status=approved',
    TOKEN
  );
  const centers = centersResp.body.data || [];

  check('GET /centers returns HTTP 200', centersResp.status === 200);
  check(
    'courses_offered field present in EVERY center',
    centers.every((c) => 'courses_offered' in c),
    `checked ${centers.length} centers`
  );
  check(
    'courses_offered is always an Array (never undefined)',
    centers.every((c) => Array.isArray(c.courses_offered)),
    `type=${typeof centers[0]?.courses_offered}`
  );
  check(
    'courses_offered safe for .join()',
    centers.every((c) => typeof c.courses_offered.join === 'function')
  );
  check(
    'courses_offered safe for .length access',
    centers.every((c) => typeof c.courses_offered.length === 'number')
  );
  check(
    'no courses_offered_raw leaking into response',
    centers.every((c) => !('courses_offered_raw' in c))
  );

  if (centers.length > 0) {
    info('Sample center courses_offered', JSON.stringify(centers[0].courses_offered));
  }

  // ========== BUG 2: resetPassword uses wrong ID ==========
  console.log('\n--- BUG 2 FIX: resetPassword uses partner.user_id (not partner.id) ---');
  console.log('  Issue: Frontend used selectedPartner.id (PARTNER table UUID)');
  console.log('  Fix: Added user_id subquery in getAllPartners → frontend uses user_id\n');

  const partnersResp = await request(
    'GET',
    '/api/v1/partners?limit=10&approval_status=approved',
    TOKEN
  );
  const partners = partnersResp.body.data || [];

  check('GET /partners returns HTTP 200', partnersResp.status === 200);
  check(
    'user_id field present in partner records',
    partners.every((p) => 'user_id' in p),
    `checked ${partners.length} partners`
  );

  const partnersWithUser = partners.filter((p) => p.user_id != null);
  info('Partners with linked user_id', `${partnersWithUser.length}/${partners.length}`);

  if (partnersWithUser.length > 0) {
    const sample = partnersWithUser[0];
    check(
      'user_id is different from partner.id',
      sample.user_id !== sample.id,
      `partner.id=${sample.id?.substring(0, 8)}... user_id=${sample.user_id?.substring(0, 8)}...`
    );

    // Test reset-password with user_id (not partner.id)
    const resetResp = await request(
      'POST',
      `/api/v1/users/${sample.user_id}/reset-password`,
      TOKEN
    );
    check(
      'resetPassword with user_id → HTTP 200',
      resetResp.status === 200,
      `HTTP ${resetResp.status}`
    );
    check('resetPassword response success:true', resetResp.body.success === true);

    // Confirm it FAILS with partner.id (partner id ≠ user id)
    const resetWrongResp = await request(
      'POST',
      `/api/v1/users/${sample.id}/reset-password`,
      TOKEN
    );
    check(
      'resetPassword with partner.id → fails (confirms they are different)',
      resetWrongResp.status !== 200,
      `HTTP ${resetWrongResp.status} - "${resetWrongResp.body.message?.substring?.(0, 40)}"`
    );
  } else {
    console.log('  [WARN] No partners with linked users found - check DB data');
  }

  // ========== BUG 3: ApiResponse.success parameter order ==========
  console.log('\n--- BUG 3 FIX: ApiResponse.success parameter order in resetPassword ---');
  console.log('  Issue: Args were swapped: success(res, message_string, data_object)');
  console.log('  Fix: Corrected to success(res, data_object, message_string)\n');

  // Use a known valid user (admin itself for safe testing)
  const adminLoginBody = loginResp.body.data;
  if (adminLoginBody?.user?.id) {
    const adminId = adminLoginBody.user.id;
    const resetResp2 = await request('POST', `/api/v1/users/${adminId}/reset-password`, TOKEN);
    check(
      'Response message is string (not object)',
      typeof resetResp2.body.message === 'string',
      `type=${typeof resetResp2.body.message}, value="${resetResp2.body.message}"`
    );
    check(
      'Response data is object with .message property',
      typeof resetResp2.body.data === 'object' && 'message' in (resetResp2.body.data || {}),
      `data.message="${resetResp2.body.data?.message}"`
    );
    check('Response success:true', resetResp2.body.success === true);
  }

  // ========== BUG 4: CSV Export crash when empty (bonus fix) ==========
  console.log('\n--- BONUS FIX: CSV Export crash guard when no data ---');
  console.log('  Issue: csvData[0] crashes when filteredCenters/filteredPartners is empty');
  console.log('  Fix: Added early return with toast.warn when data is empty\n');
  info('Fix applied', 'OrganizationCentersPage & OrganizationPartnersPage - handleExport guard');

  // ========== DELETE endpoints - correct behavior check ==========
  console.log('\n--- DELETE Endpoints - Correct Behavior Verification ---');
  const fakeId = 'a0000000-0000-0000-0000-000000000999';

  const delPResp = await request('DELETE', `/api/v1/partners/${fakeId}`, TOKEN);
  check(
    'DELETE /partners/:id - route exists (body has message)',
    typeof delPResp.body.message === 'string' && delPResp.body.message.includes('not found'),
    `HTTP ${delPResp.status}: "${delPResp.body.message}"`
  );

  const delCResp = await request('DELETE', `/api/v1/centers/${fakeId}`, TOKEN);
  check(
    'DELETE /centers/:id - route exists (body has message)',
    typeof delCResp.body.message === 'string' && delCResp.body.message.includes('not found'),
    `HTTP ${delCResp.status}: "${delCResp.body.message}"`
  );

  // ========== SUMMARY ==========
  console.log('\n=====================================================');
  console.log('  FINAL RESULTS');
  console.log('=====================================================');
  console.log(`\n  PASSED : ${passed}`);
  console.log(`  FAILED : ${failed}`);
  const allGood = failed === 0;
  if (allGood) {
    console.log(
      '\n  \x1b[32mAll checks passed! Organization Management is working correctly.\x1b[0m'
    );
  } else {
    console.log('\n  \x1b[31mSome checks failed. Review above output.\x1b[0m');
  }
  console.log('\n');
})().catch((err) => {
  console.error('Verification runner error:', err);
  process.exit(1);
});
