const db = require('./src/database/connection');

(async () => {
  try {
    console.log('Checking all scheduled_refurbishment_notifications...\n');

    const [all] = await db.query(`
      SELECT id, center_id, partner_id, status, partner_responded, 
             scheduled_at, created_at
      FROM scheduled_refurbishment_notifications
    `);

    console.log(`Total scheduled notifications: ${all.length}\n`);

    if (all.length > 0) {
      all.forEach((s, i) => {
        console.log(`${i + 1}. ID: ${s.id}`);
        console.log(`   Center: ${s.center_id.substring(0, 8)}...`);
        console.log(`   Partner: ${s.partner_id.substring(0, 8)}...`);
        console.log(`   Status: ${s.status}`);
        console.log(`   Partner Responded: ${s.partner_responded}`);
        console.log(`   Scheduled: ${s.scheduled_at}`);
        console.log();
      });

      // Now check if any of these match our notification center IDs
      const notifCenterIds = [
        '4f05ac64-a11f-4d7f-b641-b6f6c9610446', // Don Bosco Aizwal
        '00442b28-684d-4c00-84ae-bc6aeaf27b38', // Don Bosco Lalitpur
      ];

      const matches = all.filter((s) => notifCenterIds.includes(s.center_id));
      console.log(`\nMatching notification center IDs: ${matches.length}`);
      matches.forEach((m) => {
        console.log(`  - ${m.id}: status=${m.status}, center=${m.center_id}`);
      });
    } else {
      console.log('⚠️  Table is EMPTY - no scheduled refurbishment notifications exist');
      console.log('\nThis means:');
      console.log('  1. Records were deleted after sending');
      console.log('  2. System creates notifications without scheduled entries');
      console.log('  3. Data was cleared during development');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
