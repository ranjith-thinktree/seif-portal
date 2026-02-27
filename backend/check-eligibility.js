const mysql = require('mysql2/promise');

async function checkEligibility() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'seif',
  });

  console.log('\n=== REFURBISHMENT ELIGIBILITY CHECK ===\n');

  // Get total counts
  const [counts] = await db.query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN refurbishment_eligible = 1 THEN 1 ELSE 0 END) as eligible
    FROM centers
  `);
  console.log('Total Centers:', counts[0].total);
  console.log('Eligible Centers:', counts[0].eligible);
  console.log('');

  // Check sample centers and their eligibility calculation
  const [centers] = await db.query(`
    SELECT 
      id, 
      center_name, 
      year_of_establishment,
      last_refurbishment_date,
      refurbishment_frequency_months,
      refurbishment_eligible,
      TIMESTAMPDIFF(MONTH, 
        COALESCE(last_refurbishment_date, 
          CONCAT(year_of_establishment, '-01-01')), 
        CURDATE()
      ) as months_since,
      CASE 
        WHEN refurbishment_frequency_months IS NULL THEN 'NULL frequency'
        WHEN TIMESTAMPDIFF(MONTH, 
          COALESCE(last_refurbishment_date, 
            CONCAT(year_of_establishment, '-01-01')), 
          CURDATE()
        ) >= refurbishment_frequency_months THEN 'SHOULD BE ELIGIBLE'
        ELSE 'NOT YET ELIGIBLE'
      END as calculated_eligibility
    FROM centers
    ORDER BY year_of_establishment ASC
    LIMIT 10
  `);

  console.log('Sample Centers (oldest first):');
  console.log('');
  centers.forEach((c) => {
    console.log(`${c.center_name}`);
    console.log(`  Year: ${c.year_of_establishment}`);
    console.log(`  Last Refurb: ${c.last_refurbishment_date || 'NEVER'}`);
    console.log(`  Frequency: ${c.refurbishment_frequency_months || 'NULL'} months`);
    console.log(`  Months Since: ${c.months_since} months`);
    console.log(`  DB Flag: ${c.refurbishment_eligible ? 'YES' : 'NO'}`);
    console.log(`  Calculated: ${c.calculated_eligibility}`);
    console.log('');
  });

  // Show distribution of refurbishment_frequency_months
  const [freqDist] = await db.query(`
    SELECT 
      refurbishment_frequency_months,
      COUNT(*) as count
    FROM centers
    GROUP BY refurbishment_frequency_months
    ORDER BY refurbishment_frequency_months
  `);
  console.log('Refurbishment Frequency Distribution:');
  freqDist.forEach((f) => {
    console.log(`  ${f.refurbishment_frequency_months || 'NULL'} months: ${f.count} centers`);
  });

  await db.end();
}

checkEligibility().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
