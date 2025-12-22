/**
 * Test Consolidated Analytics API
 * Verifies the new analytics endpoints are working correctly
 */

const http = require('http');

const API_BASE = 'http://localhost:5000';
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
      console.log('✅ Login successful\n');
      return response.data.data.accessToken;
    } else {
      throw new Error('Login failed - no token received');
    }
  } catch (error) {
    console.error('Login error:', error.message);
    throw error;
  }
}

async function testConsolidatedAnalytics(token) {
  console.log('📊 Testing Consolidated Analytics API...');

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/analytics/consolidated',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await makeRequest(options);

  console.log('✅ API Response Status:', response.status);
  console.log('\n=== SUMMARY STATS ===');
  console.log('Total Students:', response.data.data.summary.total_students);
  console.log('Male Students:', response.data.data.summary.male_students);
  console.log('Female Students:', response.data.data.summary.female_students);
  console.log('Total Partners:', response.data.data.summary.total_partners);
  console.log('Total Centers:', response.data.data.summary.total_centers);

  console.log('\n=== PARTNER BREAKDOWN ===');
  response.data.data.partnerBreakdown.forEach((partner, index) => {
    console.log(
      `${index + 1}. ${partner.partner_name}: ${partner.total_students} students (${partner.male_students}M, ${partner.female_students}F) - ${partner.centers_count} centers`
    );
  });

  console.log('\n=== CENTER BREAKDOWN ===');
  response.data.data.centerBreakdown.forEach((center, index) => {
    console.log(
      `${index + 1}. ${center.center_name} (${center.partner_name}): ${center.total_students} students (${center.male_students}M, ${center.female_students}F)`
    );
  });

  console.log('\n=== YEARLY TREND ===');
  response.data.data.yearlyTrend.forEach((year) => {
    console.log(
      `${year.financial_year}: ${year.total_students} students (${year.male_students}M, ${year.female_students}F)`
    );
  });

  console.log('\n=== AVAILABLE YEARS ===');
  console.log(response.data.data.availableYears.join(', '));

  return response.data;
}

async function testFilterOptions(token) {
  console.log('\n📋 Testing Filter Options API...');

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/analytics/filter-options',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await makeRequest(options);

  console.log('✅ API Response Status:', response.status);
  console.log('\n=== FILTER OPTIONS ===');
  console.log('Partners:', response.data.data.partners.length);
  console.log('Centers:', response.data.data.centers.length);

  return response.data;
}

async function testWithFilters(token) {
  console.log('\n🔍 Testing Analytics with Filters...');

  // Test with specific financial year
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/analytics/consolidated?financialYear=2025-2026',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await makeRequest(options);

  console.log('✅ Filtered Results (FY 2025-2026):');
  console.log('Total Students:', response.data.data.summary.total_students);
  console.log('Partners:', response.data.data.summary.total_partners);

  return response.data;
}

async function main() {
  try {
    console.log('🚀 Starting Consolidated Analytics API Test\n');
    console.log('='.repeat(60));

    // Step 1: Login
    const token = await loginAndGetToken();

    // Step 2: Test consolidated analytics (no filters)
    await testConsolidatedAnalytics(token);

    // Step 3: Test filter options
    await testFilterOptions(token);

    // Step 4: Test with filters
    await testWithFilters(token);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All Tests Passed Successfully!');
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    process.exit(1);
  }
}

main();
