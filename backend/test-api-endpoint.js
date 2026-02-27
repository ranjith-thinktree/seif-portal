/**
 * Test Actual API Endpoint
 * Makes a real HTTP request to the notifications API
 */

const axios = require('axios');
const db = require('./src/database/connection');

async function testAPIEndpoint() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║     TEST ACTUAL API ENDPOINT                                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get partner login token
    console.log('1️⃣  Getting partner authentication token...');
    console.log('='.repeat(75));

    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'non@seif.in',
      password: 'password123', // Use actual password
    });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed. Using test credentials might be wrong.');
      console.log('   Try logging in via UI first to verify credentials.');
      process.exit(1);
    }

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Authentication successful\n');

    // Test unread count API
    console.log('2️⃣  Testing Unread Count API...');
    console.log('='.repeat(75));

    const unreadResponse = await axios.get(
      'http://localhost:5000/api/v1/notifications/unread-count',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log(`✅ Unread Count: ${unreadResponse.data.data.count}\n`);

    // Test grouped notifications API
    console.log('3️⃣  Testing Grouped Notifications API...');
    console.log('='.repeat(75));

    const notifsResponse = await axios.get('http://localhost:5000/api/v1/notifications/grouped', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        page: 1,
        limit: 20,
      },
    });

    const notifications = notifsResponse.data.data;
    console.log(`✅ Notifications Returned: ${notifications.length}\n`);

    if (notifications.length > 0) {
      console.log('📋 Notification Details:');
      console.log('='.repeat(75));
      notifications.forEach((notif, i) => {
        console.log(`\n${i + 1}. ${notif.title}`);
        console.log(`   ID: ${notif.id}`);
        console.log(`   Type: ${notif.notification_type || notif.type}`);
        console.log(`   Alert Type: ${notif.alert_type}`);
        console.log(`   Message: ${notif.message}`);
        console.log(`   Read: ${notif.is_read ? 'Yes' : 'No'}`);
        console.log(`   Created: ${new Date(notif.created_at).toLocaleString()}`);
      });

      console.log('\n' + '='.repeat(75));
      console.log('✅ SUCCESS! API is returning notifications correctly.');
      console.log('\n💡 Partner should now see these in their inbox:');
      console.log('   1. Open frontend at http://localhost:5173');
      console.log('   2. Login as non@seif.in');
      console.log('   3. Click bell icon or go to Inbox');
      console.log(`   4. Should see ${notifications.length} notifications`);
    } else {
      console.log('⚠️  API returned 0 notifications.');
      console.log('   This might mean all notifications were processed or filtered.');
    }

    console.log('\n' + '='.repeat(75));
    process.exit(0);
  } catch (error) {
    console.error('\n❌ API Test Failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || error.message}`);

      if (error.response.status === 401) {
        console.log('\n💡 Login credentials may be incorrect.');
        console.log('   Try these common partner passwords:');
        console.log('   - password123');
        console.log('   - Password123');
        console.log('   - seif123');
        console.log('\n   Or check the database:');
        console.log('   SELECT email FROM users WHERE email = "non@seif.in";');
      }
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

testAPIEndpoint();
