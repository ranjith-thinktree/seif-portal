const axios = require('axios');

async function testBackendAPIs() {
  console.log('🔍 Testing Backend APIs...\n');

  const baseURL = 'http://localhost:5000/api/v1';

  try {
    // 1. Test Login
    console.log('1️⃣  Testing Login...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@seif.org',
      password: 'Password123',
    });

    const { token, user } = loginResponse.data.data;
    console.log('✅ Login successful');
    console.log(`   Role: ${user.role}`);
    console.log(`   Token: ${token.substring(0, 20)}...\n`);

    // Set auth header
    const config = {
      headers: { Authorization: `Bearer ${token}` },
    };

    // 2. Test All Centers
    console.log('2️⃣  Testing Get All Centers...');
    const allCentersRes = await axios.get(
      `${baseURL}/admin/refurbishment/all-centers?limit=10`,
      config
    );
    console.log('✅ All Centers:', allCentersRes.data.data.centers?.length || 0, 'centers');
    console.log('   Sample:', allCentersRes.data.data.centers?.[0]?.center_name || 'None\n');

    // 3. Test Eligible Centers
    console.log('3️⃣  Testing Get Eligible Centers...');
    const eligibleRes = await axios.get(
      `${baseURL}/admin/refurbishment/eligible-centers?limit=10`,
      config
    );
    console.log('✅ Eligible Centers:', eligibleRes.data.data.centers?.length || 0, 'centers\n');

    // 4. Test Recently Refurbished
    console.log('4️⃣  Testing Get Recently Refurbished...');
    const recentRes = await axios.get(
      `${baseURL}/admin/refurbishment/recently-refurbished?limit=10`,
      config
    );
    console.log('✅ Recently Refurbished:', recentRes.data.data.centers?.length || 0, 'centers\n');

    console.log('✅ All API tests passed!');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

testBackendAPIs();
