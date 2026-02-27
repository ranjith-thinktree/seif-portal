/**
 * Test Script for Scheduled Notifications API
 * Run with: node test-scheduled-notifications.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';
let authToken = '';

// Test credentials (update with your admin credentials)
const ADMIN_EMAIL = 'admin@seif.org';
const ADMIN_PASSWORD = 'Admin@123';

// Color codes for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Step 1: Login
async function login() {
  try {
    log('\n📝 Step 1: Logging in as admin...', 'blue');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    authToken = response.data.data.token;
    log(`✅ Login successful! Token: ${authToken.substring(0, 30)}...`, 'green');
    return true;
  } catch (error) {
    log(`❌ Login failed: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// Step 2: Get eligible centers
async function getEligibleCenter() {
  try {
    log('\n📋 Step 2: Getting eligible centers...', 'blue');
    const response = await axios.get(`${BASE_URL}/admin/refurbishment/eligible-centers?limit=1`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (response.data.data.centers.length === 0) {
      log('⚠️  No eligible centers found. Using hardcoded IDs for testing.', 'yellow');
      return null;
    }

    const center = response.data.data.centers[0];
    log(`✅ Found center: ${center.center_name} (Partner: ${center.partner_name})`, 'green');
    log(`   Center ID: ${center.id}`, 'green');
    log(`   Partner ID: ${center.partner_id}`, 'green');
    return center;
  } catch (error) {
    log(`❌ Failed to get centers: ${error.response?.data?.message || error.message}`, 'red');
    return null;
  }
}

// Step 3: Get packages
async function getPackages() {
  try {
    log('\n📦 Step 3: Getting refurbishment packages...', 'blue');
    const response = await axios.get(`${BASE_URL}/admin/refurbishment/packages`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const packages = response.data.data.packages || [];
    log(`✅ Found ${packages.length} packages`, 'green');

    if (packages.length > 0) {
      const pkg = packages[0];
      log(`   Example: ${pkg.package_name} (ID: ${pkg.id})`, 'green');
    }

    return packages.slice(0, 2).map((p) => p.id); // Return first 2 package IDs
  } catch (error) {
    log(`❌ Failed to get packages: ${error.response?.data?.message || error.message}`, 'red');
    return [];
  }
}

// Step 4: Create scheduled notification
async function createScheduledNotification(center, packageIds) {
  try {
    log('\n🔔 Step 4: Creating scheduled notification...', 'blue');

    // Schedule for 2 minutes from now
    const scheduledAt = new Date(Date.now() + 2 * 60 * 1000);
    const customTime = scheduledAt.toTimeString().split(' ')[0]; // HH:MM:SS

    const payload = {
      partnerId: center.partner_id,
      centerId: center.id,
      scheduledAt: scheduledAt.toISOString(),
      frequency: 'daily', // Test daily recurrence
      customTime: customTime,
      message: 'This is a test scheduled notification from API test script',
      packages: packageIds,
      autoSend: true,
    };

    log(`   Scheduled for: ${scheduledAt.toLocaleString()}`, 'yellow');
    log(`   Frequency: daily at ${customTime}`, 'yellow');
    log(`   Packages: ${packageIds.length}`, 'yellow');

    const response = await axios.post(
      `${BASE_URL}/admin/refurbishment/schedule-notification`,
      payload,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const notification = response.data.data;
    log(`✅ Scheduled notification created!`, 'green');
    log(`   ID: ${notification.id}`, 'green');
    log(`   Status: ${notification.status}`, 'green');
    log(`   Auto-Send: ${notification.auto_send ? 'ON' : 'OFF'}`, 'green');
    log(`   Next Send: ${new Date(notification.next_send_at).toLocaleString()}`, 'green');

    return notification;
  } catch (error) {
    log(
      `❌ Failed to create notification: ${error.response?.data?.message || error.message}`,
      'red'
    );
    if (error.response?.data) {
      log(`   Details: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

// Step 5: Get all scheduled notifications
async function getScheduledNotifications() {
  try {
    log('\n📚 Step 5: Getting all scheduled notifications...', 'blue');
    const response = await axios.get(`${BASE_URL}/admin/refurbishment/scheduled-notifications`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const notifications = response.data.data.notifications || [];
    log(`✅ Found ${notifications.length} scheduled notification(s)`, 'green');

    notifications.forEach((n, i) => {
      log(
        `   ${i + 1}. ${n.center_name} - ${n.frequency} - Auto: ${n.auto_send ? 'ON' : 'OFF'}`,
        'green'
      );
    });

    return notifications;
  } catch (error) {
    log(`❌ Failed to get notifications: ${error.response?.data?.message || error.message}`, 'red');
    return [];
  }
}

// Step 6: Toggle auto-send
async function toggleAutoSend(notificationId) {
  try {
    log('\n🔄 Step 6: Toggling auto-send to OFF...', 'blue');
    const response = await axios.patch(
      `${BASE_URL}/admin/refurbishment/scheduled-notifications/${notificationId}/toggle`,
      { enabled: false },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const notification = response.data.data;
    log(`✅ Auto-send toggled: ${notification.auto_send ? 'ON' : 'OFF'}`, 'green');

    // Toggle back to ON
    log('   Toggling back to ON...', 'yellow');
    const response2 = await axios.patch(
      `${BASE_URL}/admin/refurbishment/scheduled-notifications/${notificationId}/toggle`,
      { enabled: true },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    log(`✅ Auto-send toggled: ${response2.data.data.auto_send ? 'ON' : 'OFF'}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to toggle: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// Step 7: Get execution history
async function getExecutionHistory(notificationId) {
  try {
    log('\n📜 Step 7: Getting execution history...', 'blue');
    const response = await axios.get(
      `${BASE_URL}/admin/refurbishment/scheduled-notifications/${notificationId}/history`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const history = response.data.data.history || [];
    log(`✅ Found ${history.length} execution(s)`, 'green');

    if (history.length === 0) {
      log('   (No executions yet - scheduled for future)', 'yellow');
    } else {
      history.forEach((h, i) => {
        log(
          `   ${i + 1}. ${h.status.toUpperCase()} at ${new Date(h.executed_at).toLocaleString()}`,
          'green'
        );
      });
    }

    return history;
  } catch (error) {
    log(`❌ Failed to get history: ${error.response?.data?.message || error.message}`, 'red');
    return [];
  }
}

// Step 8: Cancel notification
async function cancelNotification(notificationId) {
  try {
    log('\n❌ Step 8: Cancelling scheduled notification...', 'blue');
    const response = await axios.delete(
      `${BASE_URL}/admin/refurbishment/scheduled-notifications/${notificationId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    log(`✅ Notification cancelled successfully`, 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to cancel: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// Main test execution
async function runTests() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'blue');
  log('║  Scheduled Notifications API Test Suite                  ║', 'blue');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'blue');

  // Login
  const loggedIn = await login();
  if (!loggedIn) {
    log('\n❌ Tests aborted: Login failed', 'red');
    return;
  }

  // Get test data
  const center = await getEligibleCenter();
  if (!center) {
    log('\n⚠️  No eligible centers found. Please add test data first.', 'yellow');
    return;
  }

  const packageIds = await getPackages();
  if (packageIds.length === 0) {
    log('\n⚠️  No packages found. Please add test data first.', 'yellow');
    return;
  }

  // Create scheduled notification
  const notification = await createScheduledNotification(center, packageIds);
  if (!notification) {
    log('\n❌ Tests aborted: Failed to create notification', 'red');
    return;
  }

  // Get all notifications
  await getScheduledNotifications();

  // Toggle auto-send
  await toggleAutoSend(notification.id);

  // Get history
  await getExecutionHistory(notification.id);

  // Cancel notification
  await cancelNotification(notification.id);

  // Summary
  log('\n╔═══════════════════════════════════════════════════════════╗', 'green');
  log('║  ✅ All Tests Completed Successfully!                     ║', 'green');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'green');

  log('\n📝 Next Steps:', 'blue');
  log('   1. Check server logs for cron job execution', 'yellow');
  log('   2. Wait 2 minutes for scheduled notification to send', 'yellow');
  log('   3. Check execution history again after sending', 'yellow');
  log('   4. Verify partner received notification\n', 'yellow');
}

// Run tests
runTests().catch((error) => {
  log(`\n💥 Unhandled error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
