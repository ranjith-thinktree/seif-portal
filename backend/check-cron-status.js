/**
 * Check Cron Service Status
 * Quick diagnostic to see if cron jobs are running
 */

const cronService = require('./src/services/cron.service');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║         CRON SERVICE STATUS CHECK                              ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const status = cronService.getStatus();

console.log('📊 Cron Service Status:');
console.log('='.repeat(60));
console.log(`Running: ${status.running ? '✅ YES' : '❌ NO'}`);
console.log(`\nJobs (${status.jobs.length}):`);

status.jobs.forEach((job, index) => {
  console.log(`\n${index + 1}. ${job.name}`);
  console.log(`   Status: ${job.running ? '🟢 Running' : '🔴 Stopped'}`);
});

if (!status.running) {
  console.log('\n⚠️  PROBLEM DETECTED: Cron service is NOT running!');
  console.log('\nPossible causes:');
  console.log('  1. Cron service was never started');
  console.log('  2. Cron service failed to start');
  console.log('  3. Cron service was stopped');
  console.log('\n🔧 Solution:');
  console.log('  - Check if cronService.start() is called in server.js');
  console.log('  - Restart the backend server');
  console.log('  - Check for startup errors in console');
} else {
  console.log('\n✅ Cron service is running normally');

  if (status.jobs.some((j) => !j.running)) {
    console.log('⚠️  Some jobs are not running though!');
  }
}

console.log('\n' + '='.repeat(60));
console.log('Check complete!\n');

process.exit(0);
