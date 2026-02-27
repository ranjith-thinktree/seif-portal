/**
 * Quick API Verification Script for Scheduled Notifications
 * Run: node quick-api-test.js
 *
 * Tests all 8 scheduled notification endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';
let authToken = '';
let createdNotificationId = '';

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.blue}▶${colors.reset} ${msg}`),
};

/**
 * Test 1: Login as Admin
 */
async function testLogin() {
  log.step('Test 1: Admin Login');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@seif.org',
      password: 'Password123',
    });

    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      log.success(`Login successful - Token: ${authToken.substring(0, 20)}...`);
      return true;
    }
    log.error('Login failed - No token received');
    return false;
  } catch (error) {
    log.error(`Login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Test 2: Get Partners & Centers (to use in scheduled notification)
 */
async function getPartnersAndCenters() {
  log.step('Test 2: Get Partners & Centers from All Centers List');
  try {
    const response = await axios.get(`${BASE_URL}/admin/refurbishment/all-centers`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { limit: 10, offset: 0 },
    });

    if (response.data.success && response.data.data.length > 0) {
      const center = response.data.data[0];
      log.success(`Found ${response.data.data.length} centers`);
      log.info(`Using: ${center.organization_name} - ${center.name}`);
      log.info(`Partner ID: ${center.partner_id}, Center ID: ${center.center_id}`);
      return {
        partnerId: center.partner_id,
        partnerName: center.organization_name,
        centerId: center.center_id,
        centerName: center.name,
      };
    }
    log.warn('No centers found in database');
    return null;
  } catch (error) {
    log.error(`Get centers failed: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

/**
 * Test 4: Create Scheduled Notification
 */
async function testCreateScheduledNotification(partnerId, centerId) {
  log.step('Test 4: Create Scheduled Notification');
  try {
    const scheduledAt = new Date();
    scheduledAt.setMinutes(scheduledAt.getMinutes() + 10); // 10 min from now

    const response = await axios.post(
      `${BASE_URL}/admin/refurbishment/schedule-notification`,
      {
        partner_id: partnerId,
        center_id: centerId,
        scheduled_at: scheduledAt.toISOString(),
        frequency: 'daily',
        custom_day: null,
        custom_time: scheduledAt.toTimeString().split(' ')[0].substring(0, 5),
        message: 'Test automated scheduled notification',
        packages: [
          { packageId: 'pkg-1', quantity: 1, notes: null },
          { packageId: 'pkg-2', quantity: 1, notes: null },
        ],
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.data.success && response.data.data.notification) {
      createdNotificationId = response.data.data.notification.id;
      log.success(`Created notification: ${createdNotificationId}`);
      log.info(`Next send: ${response.data.data.notification.next_send_at}`);
      return true;
    }
    log.error('Create failed - No notification returned');
    return false;
  } catch (error) {
    log.error(`Create failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Test 5: Get All Scheduled Notifications
 */
async function testGetScheduledNotifications() {
  log.step('Test 5: Get All Scheduled Notifications');
  try {
    const response = await axios.get(`${BASE_URL}/admin/refurbishment/scheduled-notifications`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { limit: 10, offset: 0 },
    });

    if (response.data.success) {
      const count = response.data.data.total || response.data.data.notifications.length;
      log.success(`Found ${count} scheduled notifications`);
      return true;
    }
    log.error('Get list failed');
    return false;
  } catch (error) {
    log.error(`Get list failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Test 6: Get Single Scheduled Notification
 */
async function testGetScheduledNotificationById() {
  log.step('Test 6: Get Single Scheduled Notification');
  try {
    const response = await axios.get(
      `${BASE_URL}/admin/refurbishment/scheduled-notifications/${createdNotificationId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.data.success && response.data.data.notification) {
      log.success(`Retrieved notification: ${response.data.data.notification.id}`);
      log.info(`Status: ${response.data.data.notification.status}`);
      log.info(`Auto-send: ${response.data.data.notification.auto_send ? 'ON' : 'OFF'}`);
      return true;
    }
    log.error('Get by ID failed');
    return false;
  } catch (error) {
    log.error(`Get by ID failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Test 7: Toggle Auto-Send OFF
 */
async function testToggleAutoSendOff() {
  log.step('Test 7: Toggle Auto-Send OFF');
  try {
    const response = await axios.patch(
      `${BASE_URL}/admin/refurbishment/scheduled-notifications/${createdNotificationId}/toggle`,
      { enabled: false },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.data.success) {
      log.success('Auto-send toggled OFF');
      return true;
    }
    log.error('Toggle OFF failed');
    return false;
  } catch (error) {
    log.error(`Toggle OFF failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Test 8: Toggle Auto-Send ON
 */
async function testToggleAutoSendOn() {
  log.step('Test 8: Toggle Auto-Send ON');
  try {
    const response = await axios.patch(
      `${BASE_URL}/admin/refurbishment/scheduled-notifications/${createdNotificationId}/toggle`,
      { enabled: true },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.data.success) {
      log.success('Auto-send toggled ON');
      return true;
    }
    log.error('Toggle ON failed');
    return false;
  } catch (error) {
    log.error(`Toggle ON failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Test 9: Update Scheduled Notification
 */
async function testUpdateScheduledNotification() {
  log.step('Test 9: Update Scheduled Notification');
  try {
    const response = await axios.patch(
      `${BASE_URL}/admin/refurbishment/scheduled-notifications/${createdNotificationId}`,
      {
        frequency: 'weekly',
        custom_day: 1, // Monday
        message: 'Updated message - now weekly',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.data.success) {
      log.success('Notification updated to weekly frequency');
      return true;
    }
    log.error('Update failed');
    return false;
  } catch (error) {
    log.error(`Update failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Test 10: Get Execution History
 */
async function testGetExecutionHistory() {
  log.step('Test 10: Get Execution History');
  try {
    const response = await axios.get(
      `${BASE_URL}/admin/refurbishment/scheduled-notifications/${createdNotificationId}/history`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { limit: 50 },
      }
    );

    if (response.data.success) {
      const historyCount = response.data.data.history?.length || 0;
      log.success(`Retrieved execution history (${historyCount} entries)`);
      if (historyCount === 0) {
        log.info('No executions yet (expected for newly created notification)');
      }
      return true;
    }
    log.error('Get history failed');
    return false;
  } catch (error) {
    log.error(`Get history failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Test 11: Cancel Scheduled Notification
 */
async function testCancelScheduledNotification() {
  log.step('Test 11: Cancel Scheduled Notification');
  try {
    const response = await axios.delete(
      `${BASE_URL}/admin/refurbishment/scheduled-notifications/${createdNotificationId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { hardDelete: false }, // Soft delete
      }
    );

    if (response.data.success) {
      log.success('Notification cancelled (soft delete)');
      return true;
    }
    log.error('Cancel failed');
    return false;
  } catch (error) {
    log.error(`Cancel failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  SCHEDULED NOTIFICATIONS API TEST SUITE');
  console.log('='.repeat(60) + '\n');

  const results = {
    passed: 0,
    failed: 0,
  };

  // Test 1: Login
  if (!(await testLogin())) {
    log.error('Cannot proceed without authentication');
    process.exit(1);
  }
  results.passed++;

  // Test 2: Get partners and centers
  const centerData = await getPartnersAndCenters();
  if (!centerData) {
    log.error('Cannot proceed without partner and center data');
    process.exit(1);
  }
  results.passed++;

  // Test 3-10: Scheduled notification endpoints
  const tests = [
    () => testCreateScheduledNotification(centerData.partnerId, centerData.centerId),
    testGetScheduledNotifications,
    testGetScheduledNotificationById,
    testToggleAutoSendOff,
    testToggleAutoSendOn,
    testUpdateScheduledNotification,
    testGetExecutionHistory,
    testCancelScheduledNotification,
  ];

  for (const test of tests) {
    const passed = await test();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(
    `Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`
  );
  console.log('='.repeat(60) + '\n');

  if (results.failed === 0) {
    log.success('All tests passed! ✨');
    console.log('\n👉 Next: Test manually in frontend at http://localhost:5173');
    console.log('👉 See: SCHEDULED_NOTIFICATIONS_TEST_PLAN.md');
  } else {
    log.error('Some tests failed. Check backend logs for details.');
  }
}

// Run tests
runAllTests().catch((error) => {
  log.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
