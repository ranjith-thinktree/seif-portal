/**
 * MANUAL CRON TRIGGER TEST
 *
 * This script manually triggers the cron job to test if notifications can be sent
 */

require('dotenv').config();
const cronService = require('./src/services/cron.service');
const db = require('./src/database/connection');

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║     MANUAL CRON JOB EXECUTION TEST                            ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

async function testCronExecution() {
  try {
    console.log('[TEST] Testing database connection...');
    const [result] = await db.query('SELECT 1');
    console.log('✅ Database connected\n');

    console.log('[TEST] Manually triggering pending notifications execution...');
    console.log('[TEST] This should process any notifications that are due\n');

    // Manually execute the cron job function
    await cronService.executePendingNotifications();

    console.log('\n[TEST] Execution complete. Check output above for results.');
    console.log('[TEST] If successful, you should see notification(s) being sent.');
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    await db.closePool();
    process.exit(0);
  }
}

testCronExecution();
