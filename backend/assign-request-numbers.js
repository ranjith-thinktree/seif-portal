const db = require('./src/database/connection');

(async () => {
  try {
    console.log('Assigning request numbers to existing scheduled notifications...\n');

    const [existing] = await db.query(`
      SELECT id FROM scheduled_refurbishment_notifications 
      ORDER BY created_at ASC
    `);

    console.log(`Found ${existing.length} scheduled notifications`);

    let requestNumber = 1;
    for (const record of existing) {
      await db.query(
        `
        UPDATE scheduled_refurbishment_notifications 
        SET request_number = ? 
        WHERE id = ?
      `,
        [requestNumber, record.id]
      );

      console.log(
        `  Assigned RQ-${String(requestNumber).padStart(6, '0')} to ${record.id.substring(0, 8)}...`
      );
      requestNumber++;
    }

    console.log(`\n✅ Assigned request numbers to ${existing.length} records`);
    console.log(`Next request number will be: RQ-${String(requestNumber).padStart(6, '0')}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
