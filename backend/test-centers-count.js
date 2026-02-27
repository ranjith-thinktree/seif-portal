const db = require('./src/database/connection');

async function test() {
  try {
    // Count active centers
    const [activeRows] = await db.query('SELECT COUNT(*) as count FROM centers WHERE status = ?', [
      'active',
    ]);
    console.log('✓ Active centers:', activeRows[0].count);

    // Count all centers
    const [allRows] = await db.query('SELECT COUNT(*) as count FROM centers');
    console.log('✓ Total centers:', allRows[0].count);

    // Get sample centers with year
    const [sampleRows] = await db.query(
      'SELECT id, center_name, year_of_establishment, last_refurbishment_date FROM centers ORDER BY year_of_establishment DESC LIMIT 5'
    );
    console.log('\n✓ Sample centers:');
    sampleRows.forEach((c) => {
      const age = new Date().getFullYear() - c.year_of_establishment;
      console.log(`  - ${c.center_name}: ${c.year_of_establishment} (${age} years old)`);
    });

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
}

test();
