const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testAPIs() {
  console.log('\n=== TESTING REFURBISHMENT API ENDPOINTS ===\n');

  try {
    // Step 1: Login
    console.log('Step 1: Logging in as admin@seif.org...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@seif.org',
      password: 'Password123',
    });

    const token = loginRes.data.data.access_token;
    console.log('✓ Login successful');
    console.log(`  Token: ${token.substring(0, 20)}...`);
    console.log('');

    const headers = { Authorization: `Bearer ${token}` };

    // Step 2: Test eligible centers endpoint
    console.log('Step 2: Getting eligible centers...');
    const eligibleRes = await axios.get(`${BASE_URL}/admin/refurbishment/eligible-centers`, {
      headers,
    });
    console.log('✓ Eligible centers endpoint working');
    console.log(`  Total: ${eligibleRes.data.data.total}`);
    console.log(`  Returned: ${eligibleRes.data.data.centers.length} centers`);
    if (eligibleRes.data.data.centers.length > 0) {
      console.log(`  Sample: ${eligibleRes.data.data.centers[0].center_name}`);
    }
    console.log('');

    // Step 3: Test all centers endpoint
    console.log('Step 3: Getting all centers...');
    const allCentersRes = await axios.get(`${BASE_URL}/admin/refurbishment/all-centers`, {
      headers,
    });
    console.log('✓ All centers endpoint working');
    console.log(`  Total: ${allCentersRes.data.data.total}`);
    console.log(`  Returned: ${allCentersRes.data.data.centers.length} centers`);
    if (allCentersRes.data.data.centers.length > 0) {
      console.log(`  Sample: ${allCentersRes.data.data.centers[0].center_name}`);
    }
    console.log('');

    // Step 4: Test recently refurbished endpoint
    console.log('Step 4: Getting recently refurbished centers...');
    const recentRes = await axios.get(`${BASE_URL}/admin/refurbishment/recently-refurbished`, {
      headers,
      params: { limit: 10 },
    });
    console.log('✓ Recently refurbished endpoint working');
    console.log(`  Total: ${recentRes.data.data.total}`);
    console.log(`  Returned: ${recentRes.data.data.centers.length} centers`);
    console.log('');

    console.log('✅ ALL API ENDPOINTS WORKING!');
    console.log('');
    console.log('Summary:');
    console.log(`  Eligible Centers: ${eligibleRes.data.data.total}`);
    console.log(`  All Centers: ${allCentersRes.data.data.total}`);
    console.log(`  Recently Refurbished: ${recentRes.data.data.total}`);
    console.log('');
  } catch (error) {
    console.error('❌ ERROR:', error.response?.data || error.message);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testAPIs();
