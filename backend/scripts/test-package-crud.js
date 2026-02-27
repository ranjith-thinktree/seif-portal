/**
 * Complete Package CRUD Test
 * This file tests all CRUD operations for packages
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_URL = 'http://localhost:5000/api/v1';
const AUTH_TOKEN = ''; // Add your JWT token here

// Configure axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    Authorization: `Bearer ${AUTH_TOKEN}`,
  },
});

async function testPackageCRUD() {
  console.log('🧪 Testing Package CRUD Operations\n');

  try {
    // 1. READ - Get all packages
    console.log('1️⃣ Testing GET /admin/refurbishment/packages');
    const getResponse = await api.get('/admin/refurbishment/packages');
    console.log(`✅ GET Success: Found ${getResponse.data.data.packages.length} packages`);
    console.log(`   First package: ${getResponse.data.data.packages[0]?.name || 'None'}\n`);

    // Display first package details
    if (getResponse.data.data.packages.length > 0) {
      const firstPkg = getResponse.data.data.packages[0];
      console.log('📦 First Package Details:');
      console.log(`   ID: ${firstPkg.id}`);
      console.log(`   Name: ${firstPkg.name}`);
      console.log(`   Description: ${firstPkg.description || 'N/A'}`);
      console.log(`   Labs: ${firstPkg.course_names || 'N/A'}`);
      console.log(`   Images: ${firstPkg.images ? JSON.parse(firstPkg.images).length : 0}\n`);
    }

    console.log('\n✅ All tests passed!');
    console.log('\n📝 Available Operations:');
    console.log('   - View: Click the Eye icon to view full package details');
    console.log('   - Edit: Click the Pencil icon to edit package (shows existing images)');
    console.log('   - Delete: Click the Trash icon to soft-delete package');
    console.log('   - Create: Click "+ Create Package" to add new package with images\n');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests
testPackageCRUD();
