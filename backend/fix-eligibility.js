const mysql = require('mysql2/promise');

async function fixEligibility() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'seif',
  });

  console.log('\n=== FIXING REFURBISHMENT ELIGIBILITY ===\n');

  // Step 1: Set default frequency for centers that have NULL
  console.log(
    'Step 1: Setting default frequency (60 months = 5 years) for centers with NULL frequency...'
  );
  const [updateFreq] = await db.query(`
    UPDATE centers 
    SET refurbishment_frequency_months = 60
    WHERE refurbishment_frequency_months IS NULL
  `);
  console.log(`✓ Updated ${updateFreq.affectedRows} centers with default frequency\n`);

  // Step 2: Calculate and set eligibility based on the frequency
  console.log('Step 2: Calculating eligibility based on age and frequency...');
  const [updateEligible] = await db.query(`
    UPDATE centers
    SET refurbishment_eligible = CASE
      WHEN last_refurbishment_date IS NOT NULL 
        AND TIMESTAMPDIFF(MONTH, last_refurbishment_date, CURDATE()) >= refurbishment_frequency_months 
      THEN 1
      WHEN last_refurbishment_date IS NULL 
        AND TIMESTAMPDIFF(MONTH, DATE(CONCAT(year_of_establishment, '-01-01')), CURDATE()) >= refurbishment_frequency_months
      THEN 1
      ELSE 0
    END
    WHERE refurbishment_frequency_months IS NOT NULL
  `);
  console.log(`✓ Updated eligibility for ${updateEligible.affectedRows} centers\n`);

  // Step 3: Verify results
  const [stats] = await db.query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN refurbishment_eligible = 1 THEN 1 ELSE 0 END) as eligible,
      SUM(CASE WHEN refurbishment_frequency_months IS NULL THEN 1 ELSE 0 END) as null_frequency
    FROM centers
  `);

  console.log('Results:');
  console.log(`  Total Centers: ${stats[0].total}`);
  console.log(`  Eligible Centers: ${stats[0].eligible}`);
  console.log(`  NULL Frequency: ${stats[0].null_frequency}`);
  console.log('');

  // Show tier distribution
  const [tiers] = await db.query(`
    SELECT 
      CASE 
        WHEN TIMESTAMPDIFF(MONTH, 
          COALESCE(last_refurbishment_date, DATE(CONCAT(year_of_establishment, '-01-01'))), 
          CURDATE()) >= 168 THEN 'Tier 4 (14+ years)'
        WHEN TIMESTAMPDIFF(MONTH, 
          COALESCE(last_refurbishment_date, DATE(CONCAT(year_of_establishment, '-01-01'))), 
          CURDATE()) >= 132 THEN 'Tier 3 (11-14 years)'
        WHEN TIMESTAMPDIFF(MONTH, 
          COALESCE(last_refurbishment_date, DATE(CONCAT(year_of_establishment, '-01-01'))), 
          CURDATE()) >= 96 THEN 'Tier 2 (8-11 years)'
        WHEN TIMESTAMPDIFF(MONTH, 
          COALESCE(last_refurbishment_date, DATE(CONCAT(year_of_establishment, '-01-01'))), 
          CURDATE()) >= 60 THEN 'Tier 1 (5-8 years)'
        ELSE 'Not Eligible (<5 years)'
      END as tier,
      COUNT(*) as count
    FROM centers
    WHERE refurbishment_eligible = 1
    GROUP BY tier
    ORDER BY tier
  `);

  console.log('Eligible Centers by Tier:');
  if (tiers.length > 0) {
    tiers.forEach((t) => {
      console.log(`  ${t.tier}: ${t.count} centers`);
    });
  } else {
    console.log('  No eligible centers found');
  }
  console.log('');

  // Show sample eligible centers
  const [sample] = await db.query(`
    SELECT 
      center_name,
      year_of_establishment,
      last_refurbishment_date,
      refurbishment_frequency_months,
      TIMESTAMPDIFF(MONTH, 
        COALESCE(last_refurbishment_date, DATE(CONCAT(year_of_establishment, '-01-01'))), 
        CURDATE()) as months_since
    FROM centers
    WHERE refurbishment_eligible = 1
    ORDER BY months_since DESC
    LIMIT 5
  `);

  console.log('Sample Eligible Centers (oldest first):');
  sample.forEach((c) => {
    const years = Math.floor(c.months_since / 12);
    const months = c.months_since % 12;
    console.log(`  ${c.center_name}`);
    console.log(`    Established: ${c.year_of_establishment}`);
    console.log(`    Last Refurb: ${c.last_refurbishment_date || 'NEVER'}`);
    console.log(`    Age: ${years} years ${months} months`);
    console.log('');
  });

  await db.end();
  console.log('✅ Eligibility calculation complete!\n');
}

fixEligibility().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
