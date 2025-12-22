/**
 * Check API Response for Grouped Notifications
 * This script tests the /api/v1/notifications/grouped endpoint
 */

const http = require('http');

const API_BASE = 'http://localhost:5000';

// Admin credentials
const ADMIN_EMAIL = 'superadmin@seif.org';
const ADMIN_PASSWORD = 'Password123';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(JSON.stringify(postData));
    }

    req.end();
  });
}

async function loginAndGetToken() {
  try {
    console.log('🔐 Logging in as admin...');

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const response = await makeRequest(options, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (response.data.success && response.data.data.accessToken) {
      console.log('✅ Login successful');
      return response.data.data.accessToken;
    } else {
      throw new Error('Login failed - no token received');
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    throw error;
  }
}

async function getGroupedNotifications(token) {
  try {
    console.log('\n📥 Fetching grouped notifications...');

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/notifications/grouped?page=1&limit=20',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await makeRequest(options);
    return response.data;
  } catch (error) {
    console.error('❌ API error:', error.message);
    throw error;
  }
}

async function main() {
  try {
    // Step 1: Login
    const token = await loginAndGetToken();

    // Step 2: Get grouped notifications
    const data = await getGroupedNotifications(token);

    console.log('\n=== API RESPONSE ===');
    console.log('Success:', data.success);
    console.log('Total notifications:', data.data?.length || 0);
    console.log('\nPagination:', JSON.stringify(data.pagination, null, 2));

    console.log('\n=== NOTIFICATIONS BREAKDOWN ===');
    if (data.data && data.data.length > 0) {
      const centerNotifs = data.data.filter((n) => n.notification_type === 'center');
      const uploadNotifs = data.data.filter((n) => n.notification_type === 'upload');

      console.log(`\n📋 Center Notifications: ${centerNotifs.length}`);
      centerNotifs.forEach((notif, index) => {
        console.log(`\n${index + 1}. ${notif.title}`);
        console.log(`   Type: ${notif.type}`);
        console.log(`   Message: ${notif.message}`);
        console.log(`   Alert Type: ${notif.alert_type}`);
        console.log(`   Read: ${notif.is_read}`);
        console.log(`   Created: ${notif.created_at}`);
      });

      console.log(`\n📦 Upload Notifications: ${uploadNotifs.length}`);
      uploadNotifs.forEach((notif, index) => {
        console.log(`\n${index + 1}. ${notif.title}`);
        console.log(`   Upload ID: ${notif.upload_id}`);
        console.log(`   Status: ${notif.aggregated_status}`);
        console.log(`   Alert Type: ${notif.alert_type}`);
        console.log(`   Centers: ${notif.total_centers} (${notif.approved_centers}A, ${notif.rejected_centers}R, ${notif.pending_centers}P)`);
        console.log(`   Read: ${notif.is_read}`);
        console.log(`   Version: ${notif.version}`);
      });
    } else {
      console.log('No notifications found');
    }

    console.log('\n✅ Test completed successfully');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
