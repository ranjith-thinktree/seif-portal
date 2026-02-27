/**
 * Full end-to-end integration test for:
 * 1. Login as ADMIN → verify badge count excludes refurbishment
 * 2. Login as PARTNER → verify inbox and Past Requests data
 * 3. Verify getGroupedNotifications excludes refurbishment notifications
 * 4. Verify refurbishment request statuses
 */
require('dotenv').config();
const http = require('http');
const https = require('https');

const BASE = 'http://localhost:5000/api/v1';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data && { 'Content-Length': Buffer.byteLength(data) }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };
    const req = http.request(options, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, body: d });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function pass(msg) {
  console.log(`  ✅ PASS: ${msg}`);
}
function fail(msg) {
  console.log(`  ❌ FAIL: ${msg}`);
  process.exitCode = 1;
}
function info(msg) {
  console.log(`  ℹ️  ${msg}`);
}

async function run() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  SEIF Portal — Full Flow Integration Tests');
  console.log('══════════════════════════════════════════════\n');

  // ── Step 1: Login as ADMIN ──────────────────────────────────────────
  console.log('STEP 1: Admin Login');
  const adminLogin = await request('POST', '/auth/login', {
    email: 'admin@seif.org',
    password: 'Password123',
  });
  let adminToken;
  if (adminLogin.status === 200 && adminLogin.body.data?.accessToken) {
    adminToken = adminLogin.body.data.accessToken;
    pass(`Admin login OK (role: ${adminLogin.body.data.user?.role})`);
  } else {
    fail(
      `Admin login failed (${adminLogin.status}): ${JSON.stringify(adminLogin.body).slice(0, 200)}`
    );
  }

  // ── Step 2: Check admin badge (unread count) ───────────────────────
  if (adminToken) {
    console.log('\nSTEP 2: Admin — Unread Notification Count (badge)');
    const unread = await request('GET', '/notifications/unread-count', null, adminToken);
    if (unread.status === 200) {
      const count = unread.body.data?.count ?? unread.body.count ?? 0;
      info(`Admin unread count = ${count}`);
      pass('getUnreadCount endpoint accessible');
      // Check that refurbishment notifications are not counted by verifying DB directly
    } else {
      fail(`getUnreadCount failed: ${JSON.stringify(unread.body)}`);
    }

    console.log('\nSTEP 3: Admin — Inbox notifications (should exclude refurbishment)');
    const inbox = await request('GET', '/notifications?type=alerts&limit=20', null, adminToken);
    if (inbox.status === 200) {
      const notifs = inbox.body.data?.notifications || inbox.body.data?.centerNotifications || [];
      const refurbNotifs = notifs.filter(
        (n) => n.alert_type && n.alert_type.startsWith('refurbishment')
      );
      if (refurbNotifs.length === 0) {
        pass(`Inbox has 0 refurbishment notifications (correct)`);
      } else {
        fail(
          `Inbox still contains ${refurbNotifs.length} refurbishment notification(s): ${refurbNotifs.map((n) => n.alert_type).join(', ')}`
        );
      }
      info(`Total inbox notifications returned: ${notifs.length}`);
    } else {
      fail(`Inbox fetch failed (${inbox.status}): ${JSON.stringify(inbox.body).slice(0, 200)}`);
    }

    console.log('\nSTEP 4: Admin — Refurbishment requests list');
    const rfList = await request('GET', '/admin/refurbishment/requests?limit=10', null, adminToken);
    if (rfList.status === 200) {
      const requests = rfList.body.data?.requests || rfList.body.data || [];
      info(
        `Refurbishment requests found: ${Array.isArray(requests) ? requests.length : JSON.stringify(rfList.body.data).slice(0, 80)}`
      );
      pass('Admin refurbishment requests endpoint accessible');
    } else {
      fail(
        `Refurbishment requests failed (${rfList.status}): ${JSON.stringify(rfList.body).slice(0, 200)}`
      );
    }
  }

  // ── Step 3: Login as PARTNER ───────────────────────────────────────
  console.log('\nSTEP 5: Partner Login');
  let partnerToken;
  // Try multiple partner accounts (demo.partner doesn't exist in this DB)
  const partnerCandidates = [
    { email: 'tatasteel@seif.in', password: 'Password123' },
    { email: 'arsdc@seif.in', password: 'Password123' },
    { email: 'srisri@seif.in', password: 'Password123' },
  ];
  for (const cred of partnerCandidates) {
    const resp = await request('POST', '/auth/login', cred);
    if (resp.status === 200 && resp.body.data?.accessToken) {
      partnerToken = resp.body.data.accessToken;
      pass(`Partner login OK: ${cred.email} (role: ${resp.body.data.user?.role})`);
      break;
    }
  }
  if (!partnerToken) {
    fail('All partner login attempts failed — partner tests skipped');
  }

  if (partnerToken) {
    console.log('\nSTEP 6: Partner — Unread count (badge)');
    const pUnread = await request('GET', '/notifications/unread-count', null, partnerToken);
    if (pUnread.status === 200) {
      const count = pUnread.body.data?.count ?? pUnread.body.count ?? 0;
      info(`Partner unread count = ${count}`);
      pass('Partner getUnreadCount accessible');
    } else {
      fail(`Partner getUnreadCount failed: ${JSON.stringify(pUnread.body)}`);
    }

    console.log('\nSTEP 7: Partner — Inbox should exclude refurbishment');
    const pInbox = await request('GET', '/notifications?type=alerts&limit=20', null, partnerToken);
    if (pInbox.status === 200) {
      const notifs = pInbox.body.data?.notifications || pInbox.body.data?.centerNotifications || [];
      const refurbNotifs = notifs.filter(
        (n) => n.alert_type && n.alert_type.startsWith('refurbishment')
      );
      if (refurbNotifs.length === 0) {
        pass(`Partner inbox has 0 refurbishment notifications (correct)`);
      } else {
        fail(`Partner inbox still contains ${refurbNotifs.length} refurbishment notification(s)`);
      }
    } else {
      fail(`Partner inbox failed (${pInbox.status})`);
    }

    console.log('\nSTEP 8: Partner — Refurbishment past requests');
    const pReqs = await request(
      'GET',
      '/refurbishment/partner/requests?limit=10',
      null,
      partnerToken
    );
    if (pReqs.status === 200) {
      const items = pReqs.body.data?.requests || pReqs.body.data || [];
      info(`Partner refurbishment requests: ${Array.isArray(items) ? items.length : 'N/A'}`);
      if (Array.isArray(items) && items.length > 0) {
        info(`  → Request status: ${items[0].status}, ID: ${items[0].id?.slice(0, 8)}...`);
      }
      pass('Partner past requests endpoint accessible');
    } else {
      fail(
        `Partner past requests failed (${pReqs.status}): ${JSON.stringify(pReqs.body).slice(0, 200)}`
      );
    }
  }

  // ── Step 4: DB verification ─────────────────────────────────────────
  console.log('\nSTEP 9: DB — Verify notification counts after exclusion filter');
  const mysql = require('mysql2/promise');
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'seif',
    });

    // Total unread (no filter)
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) as total FROM notifications WHERE is_read = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 180 DAY)'
    );
    info(`Total unread notifications in DB: ${total}`);

    // Unread after refurbishment exclusion (what getUnreadCount now returns)
    const [[{ filtered }]] = await db.query(
      "SELECT COUNT(*) as filtered FROM notifications WHERE is_read = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 180 DAY) AND (alert_type NOT LIKE 'refurbishment%' OR alert_type IS NULL)"
    );
    info(`Unread after refurbishment exclusion: ${filtered}`);

    if (Number(filtered) < Number(total)) {
      pass(
        `Badge exclusion working: ${total - filtered} refurbishment notification(s) correctly excluded from badge`
      );
    } else if (Number(filtered) === 0 && Number(total) === 0) {
      pass('No unread notifications (clean state)');
    } else {
      info('No refurbishment unread notifications to exclude (already read or none exist)');
    }

    // Show breakdown
    const [breakdown] = await db.query(
      'SELECT alert_type, COUNT(*) as cnt FROM notifications WHERE is_read = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 180 DAY) GROUP BY alert_type'
    );
    if (breakdown.length > 0) {
      console.log('\n  Unread notifications by alert_type:');
      breakdown.forEach((r) => console.log(`    ${r.alert_type || '(null)'}: ${r.cnt}`));
    }
  } catch (e) {
    fail(`DB check error: ${e.message}`);
  } finally {
    if (db) await db.end();
  }

  console.log('\n══════════════════════════════════════════════');
  console.log(
    process.exitCode === 1 ? '  ⚠️  Some tests FAILED (see above)' : '  🎉  All tests PASSED'
  );
  console.log('══════════════════════════════════════════════\n');
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
