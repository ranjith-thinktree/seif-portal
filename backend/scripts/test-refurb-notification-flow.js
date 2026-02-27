/**
 * Comprehensive Test: Refurbishment Notification Flow
 * Tests 1st, 2nd, 3rd requests for same partner/center,
 * approval/rejection flows and partner notification visibility.
 *
 * Usage: node scripts/test-refurb-notification-flow.js
 */
const db = require('../src/database/connection');
const RefurbishmentService = require('../src/api/v1/services/refurbishment.service');
const {
  getUnreadCount,
  getGroupedNotifications,
} = require('../src/api/v1/services/notification.service');

// ─── Test Configuration ────────────────────────────────────────────────────
const PARTNER_ID = 'b316ec33-0470-40fb-bed9-fd098071394f'; // Sri Sri Rural
const PARTNER_USER_ID = '0b15423f-68ae-4665-bb73-2d0686b849af'; // srisri user
const CENTER_ID = '0038e63d-6777-4449-87c7-084127d91049'; // Govt ITI Srin Nagar
const ADMIN_USER_ID = 'a0000000-0000-0000-0000-000000000002'; // admin@seif.org

const createdRequestIds = []; // track for cleanup

// ─── Helpers ──────────────────────────────────────────────────────────────
const pass = (msg) => console.log(`  ✅ PASS: ${msg}`);
const fail = (msg, detail) => console.error(`  ❌ FAIL: ${msg}${detail ? ' → ' + detail : ''}`);
const section = (title) => console.log(`\n${'═'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`);

async function assert(condition, passMsg, failMsg, detail) {
  if (condition) pass(passMsg);
  else fail(failMsg, detail);
}

// ─── Cleanup helper ────────────────────────────────────────────────────────
async function cleanupTestData() {
  if (createdRequestIds.length === 0) return;
  console.log('\n  🧹 Cleaning up test data...');

  // Delete refurbishment_requests + requests rows + notifications
  for (const id of createdRequestIds) {
    // delete from refurbishment_request_packages
    await db.query(
      'DELETE FROM refurbishment_request_packages WHERE refurbishment_request_id = ?',
      [id]
    );
    // get request_id
    const [rows] = await db.query('SELECT request_id FROM refurbishment_requests WHERE id = ?', [
      id,
    ]);
    await db.query('DELETE FROM refurbishment_requests WHERE id = ?', [id]);
    if (rows.length > 0 && rows[0].request_id) {
      await db.query(
        'DELETE FROM notifications WHERE related_entity_id = ? AND alert_type LIKE "refurbishment%"',
        [CENTER_ID]
      );
      await db.query('DELETE FROM requests WHERE id = ?', [rows[0].request_id]);
    }
  }

  console.log('  ✅ Cleanup complete');
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 1 — sendRefurbishmentNotification (eligibility alert)
// ═══════════════════════════════════════════════════════════════════════════
async function test1_EligibilityNotification() {
  section('TEST 1: Eligibility Notification (Bell send in Requests tab)');

  const result = await RefurbishmentService.sendRefurbishmentNotification(
    CENTER_ID,
    PARTNER_ID,
    'Your center is due for refurbishment. Please submit your requirements.'
  );

  assert(result && result.notificationId, 'Notification created', 'Notification NOT created');

  // Verify it's in DB
  const [rows] = await db.query('SELECT * FROM notifications WHERE id = ?', [
    result.notificationId,
  ]);
  assert(rows.length > 0, 'Notification in DB', 'Notification missing from DB');
  assert(
    rows[0].alert_type === 'refurbishment',
    'alert_type = refurbishment',
    'Wrong alert_type',
    rows[0].alert_type
  );
  assert(
    rows[0].recipient_id === PARTNER_USER_ID,
    'Correct recipient',
    'Wrong recipient',
    rows[0].recipient_id
  );

  return result.notificationId;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 2 — Create 1st, 2nd, 3rd refurbishment requests for same center
// ═══════════════════════════════════════════════════════════════════════════
async function test2_MultipleRequests() {
  section('TEST 2: Create 1st, 2nd, 3rd Requests for Same Center');

  const requests = [];

  for (let i = 1; i <= 3; i++) {
    console.log(`\n  → Creating request #${i}...`);
    const result = await RefurbishmentService.createRefurbishmentRequestWithPackages({
      partnerId: PARTNER_ID,
      centerId: CENTER_ID,
      reason: `Test refurbishment request #${i} — ${new Date().toISOString()}`,
      description: `Description for request ${i}`,
      packages: [],
      autoNotify: false,
    });

    assert(
      result && result.requestId,
      `Request #${i} created (requestId present)`,
      `Request #${i} creation failed`
    );

    // Find the refurbishment_request ID
    const [rrRows] = await db.query(
      'SELECT id, status FROM refurbishment_requests WHERE request_id = ?',
      [result.requestId]
    );
    assert(
      rrRows.length > 0,
      `Request #${i} in refurbishment_requests table`,
      `Request #${i} NOT in DB`
    );
    assert(
      rrRows[0].status === 'submitted',
      `Request #${i} status = submitted`,
      `Wrong status`,
      rrRows[0].status
    );

    // Check notification was created
    const [notifRows] = await db.query(
      `SELECT * FROM notifications WHERE recipient_id = ? AND alert_type = 'refurbishment_request' AND related_entity_id = ? ORDER BY created_at DESC LIMIT 1`,
      [PARTNER_USER_ID, CENTER_ID]
    );
    assert(
      notifRows.length > 0,
      `Request #${i} notification created for partner`,
      `No notification for request #${i}`
    );

    if (rrRows.length > 0) {
      createdRequestIds.push(rrRows[0].id);
      requests.push({ refurbishmentRequestId: rrRows[0].id, ...result });
    }

    // Small delay to avoid timing collisions
    await new Promise((r) => setTimeout(r, 100));
  }

  return requests;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 3 — Partner can see all requests via getPartnerRefurbishmentRequests
// ═══════════════════════════════════════════════════════════════════════════
async function test3_PartnerRequestsVisible(expectedMinCount) {
  section('TEST 3: Partner Can See Their Refurbishment Requests');

  const result = await RefurbishmentService.getPartnerRefurbishmentRequests({
    partnerId: PARTNER_ID,
    limit: 50,
    offset: 0,
  });

  assert(
    result && Array.isArray(result.requests),
    'getPartnerRefurbishmentRequests returns array',
    'Invalid return'
  );
  assert(
    result.total >= expectedMinCount,
    `Partner sees >= ${expectedMinCount} requests (got ${result.total})`,
    `Partner only sees ${result.total} requests, expected >= ${expectedMinCount}`
  );

  // List the requests
  console.log(`  📋 Requests found: ${result.total}`);
  result.requests.forEach((r) => {
    console.log(
      `     - ${r.requestId || r.request_id} | status=${r.status} | ${new Date(r.created_at).toLocaleDateString()}`
    );
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 4 — Admin approves 1st request
// ═══════════════════════════════════════════════════════════════════════════
async function test4_ApproveRequest(refurbishmentRequestId) {
  section('TEST 4: Admin Approves Request → Partner Gets Notification');

  console.log(`  → Approving request: ${refurbishmentRequestId}`);
  const result = await RefurbishmentService.approveRefurbishmentRequest(
    refurbishmentRequestId,
    ADMIN_USER_ID,
    'Approved for testing'
  );

  assert(result.success === true, 'Approval succeeded', 'Approval failed', JSON.stringify(result));

  // Verify status changed
  const [rows] = await db.query('SELECT status FROM refurbishment_requests WHERE id = ?', [
    refurbishmentRequestId,
  ]);
  assert(
    rows[0].status === 'approved',
    'Status = approved in DB',
    'Status NOT approved',
    rows[0].status
  );

  // Check partner notification
  const [notifs] = await db.query(
    `SELECT * FROM notifications WHERE recipient_id = ? AND alert_type = 'refurbishment_approved' ORDER BY created_at DESC LIMIT 1`,
    [PARTNER_USER_ID]
  );
  assert(
    notifs.length > 0,
    'Partner received approval notification',
    'No approval notification found'
  );
  if (notifs.length > 0) {
    console.log(`  📨 Notification: "${notifs[0].title}"`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 5 — Admin rejects 2nd request
// ═══════════════════════════════════════════════════════════════════════════
async function test5_RejectRequest(refurbishmentRequestId) {
  section('TEST 5: Admin Rejects 2nd Request → Partner Gets Notification');

  console.log(`  → Rejecting request: ${refurbishmentRequestId}`);
  const result = await RefurbishmentService.rejectRefurbishmentRequest(
    refurbishmentRequestId,
    ADMIN_USER_ID,
    'Not eligible at this time — testing'
  );

  assert(
    result.success === true,
    'Rejection succeeded',
    'Rejection failed',
    JSON.stringify(result)
  );

  // Verify status
  const [rows] = await db.query('SELECT status FROM refurbishment_requests WHERE id = ?', [
    refurbishmentRequestId,
  ]);
  assert(
    rows[0].status === 'rejected',
    'Status = rejected in DB',
    'Status NOT rejected',
    rows[0].status
  );

  // Check partner notification
  const [notifs] = await db.query(
    `SELECT * FROM notifications WHERE recipient_id = ? AND alert_type = 'refurbishment_rejected' ORDER BY created_at DESC LIMIT 1`,
    [PARTNER_USER_ID]
  );
  assert(
    notifs.length > 0,
    'Partner received rejection notification',
    'No rejection notification found'
  );
  if (notifs.length > 0) {
    console.log(`  📨 Notification: "${notifs[0].title}"`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 6 — getUnreadCount includes refurbishment notifications
// ═══════════════════════════════════════════════════════════════════════════
async function test6_UnreadCount() {
  section('TEST 6: Unread Count Includes Refurbishment Notifications');

  const count = await getUnreadCount(PARTNER_USER_ID, 'PARTNER');
  console.log(`  📊 Unread count for partner: ${count}`);
  assert(
    count > 0,
    `Unread count > 0 (got ${count})`,
    'Unread count is 0 — notifications still filtered!'
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 7 — getGroupedNotifications includes refurbishment notifications
// ═══════════════════════════════════════════════════════════════════════════
async function test7_GroupedNotifications() {
  section('TEST 7: Grouped Notifications Include Refurbishment Entries');

  const result = await getGroupedNotifications(PARTNER_USER_ID, 'PARTNER', {
    limit: 50,
    days: 180,
  });

  const total = result.notifications.length;
  const refurbishmentNotifs = result.notifications.filter(
    (n) => n.alert_type && n.alert_type.startsWith('refurbishment')
  );

  console.log(`  📊 Total notifications: ${total}`);
  console.log(`  🔔 Refurbishment notifications: ${refurbishmentNotifs.length}`);
  refurbishmentNotifs.forEach((n) => {
    console.log(`     - [${n.alert_type}] "${n.title}" (read=${n.is_read})`);
  });

  assert(
    refurbishmentNotifs.length > 0,
    `Found ${refurbishmentNotifs.length} refurbishment notifications in inbox`,
    'NO refurbishment notifications in inbox — filter still active!'
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 8 — 3rd request still visible (no conflicts)
// ═══════════════════════════════════════════════════════════════════════════
async function test8_ThirdRequestVisible() {
  section('TEST 8: 3rd Request Is Still Visible to Partner');

  const result = await RefurbishmentService.getPartnerRefurbishmentRequests({
    partnerId: PARTNER_ID,
    limit: 50,
    offset: 0,
  });

  const submittedRequests = result.requests.filter((r) => r.status === 'submitted');
  console.log(`  📋 Submitted requests: ${submittedRequests.length}`);
  assert(
    submittedRequests.length >= 1,
    `At least 1 submitted request visible (got ${submittedRequests.length})`,
    'No submitted requests found'
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  REFURBISHMENT NOTIFICATION FLOW — COMPREHENSIVE TEST');
  console.log('═'.repeat(60));
  console.log(`  Partner:  ${PARTNER_ID}`);
  console.log(`  Center:   ${CENTER_ID}`);
  console.log(`  Admin:    ${ADMIN_USER_ID}`);

  try {
    // Run tests
    await test1_EligibilityNotification();
    const requests = await test2_MultipleRequests();
    await test3_PartnerRequestsVisible(3); // expect at least 3 (1 existing + 3 new, but may have more from existing data)

    if (requests.length >= 2) {
      await test4_ApproveRequest(requests[0].refurbishmentRequestId);
      await test5_RejectRequest(requests[1].refurbishmentRequestId);
    }

    await test6_UnreadCount();
    await test7_GroupedNotifications();
    await test8_ThirdRequestVisible();

    console.log('\n' + '═'.repeat(60));
    console.log('  ALL TESTS COMPLETE');
    console.log('═'.repeat(60) + '\n');
  } catch (err) {
    console.error('\n  💥 TEST SUITE ERROR:', err.message);
    console.error(err.stack);
  } finally {
    await cleanupTestData();
    process.exit(0);
  }
}

main();
