const axios = require('axios');

(async () => {
  try {
    // First login as partner to get token
    console.log('Logging in as partner...');
    const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'non@seif.in',
      password: 'password',
    });

    const token = loginRes.data.token;
    console.log('✅ Logged in successfully\n');

    // Get grouped notifications to find a refurbishment notification
    console.log('Fetching grouped notifications...');
    const groupedRes = await axios.get('http://localhost:5000/api/v1/notifications/grouped', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const refurbNotif = groupedRes.data.data.groups.find(
      (g) => g.notifications && g.notifications.some((n) => n.alert_type === 'refurbishment')
    );

    if (!refurbNotif) {
      console.log('❌ No refurbishment notifications found');
      process.exit(1);
    }

    const notificationId = refurbNotif.notifications[0].id;
    console.log(`✅ Found refurbishment notification: ${notificationId}\n`);

    // Test the new refurbishment details endpoint
    console.log('Fetching refurbishment details...');
    const detailsRes = await axios.get(
      `http://localhost:5000/api/v1/notifications/${notificationId}/refurbishment-details`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('\n✅ SUCCESS! Refurbishment Details:');
    console.log(JSON.stringify(detailsRes.data.data, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    process.exit(1);
  }
})();
