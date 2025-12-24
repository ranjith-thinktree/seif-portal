// Runtime diagnostic script to check what's actually being executed
const db = require('./src/config/database');

async function diagnose() {
  console.log('=== RUNTIME DIAGNOSTICS ===\n');

  console.log('1. Process Info:');
  console.log('   - CWD:', process.cwd());
  console.log('   - Node Version:', process.version);
  console.log('   - PID:', process.pid);
  console.log('   - Uptime:', process.uptime(), 'seconds');

  console.log('\n2. Module Cache Check:');
  const serviceModule = require.resolve('./src/api/v1/services/analytics.service');
  console.log('   - Service Module Path:', serviceModule);
  console.log('   - Is Cached:', !!require.cache[serviceModule]);

  console.log('\n3. Database Config:');
  console.log('   - Host:', process.env.DB_HOST);
  console.log('   - Database:', process.env.DB_NAME);
  console.log('   - User:', process.env.DB_USER);

  console.log('\n4. Test Direct Query:');
  try {
    const query = `SELECT 
      (SELECT COUNT(*) FROM partners WHERE status = 'active') as total_partners,
      (SELECT COUNT(*) FROM centers WHERE status = 'active') as total_centers
    FROM dual`;

    console.log('   - Query:', query);
    const result = await db.query(query);
    console.log('   - Result:', JSON.stringify(result[0]));
  } catch (error) {
    console.error('   - Error:', error.message);
  }

  console.log('\n5. Test Analytics Service:');
  try {
    // Clear cache first
    delete require.cache[require.resolve('./src/api/v1/services/analytics.service')];

    const analyticsService = require('./src/api/v1/services/analytics.service');
    const result = await analyticsService.getConsolidatedAnalytics({ financialYear: 'all' });
    console.log(
      '   - Service Result:',
      JSON.stringify({
        total_partners: result.summary.total_partners,
        total_centers: result.summary.total_centers,
        total_students: result.summary.total_students,
      })
    );
  } catch (error) {
    console.error('   - Error:', error.message);
    console.error('   - Stack:', error.stack);
  }

  console.log('\n6. File System Check:');
  const fs = require('fs');
  const filePath = './src/api/v1/services/analytics.service.js';
  const stats = fs.statSync(filePath);
  console.log('   - File Size:', stats.size, 'bytes');
  console.log('   - Modified:', stats.mtime);

  // Read first 50 lines to check for FROM dual
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const dualLineIndex = lines.findIndex((line) => line.includes('FROM dual'));
  console.log('   - Contains "FROM dual":', dualLineIndex !== -1);
  if (dualLineIndex !== -1) {
    console.log('   - At line:', dualLineIndex + 1);
    console.log(
      '   - Context:',
      lines.slice(Math.max(0, dualLineIndex - 2), dualLineIndex + 3).join('\n')
    );
  }

  process.exit(0);
}

diagnose().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
