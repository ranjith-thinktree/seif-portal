const mysql = require('mysql2/promise');
require('dotenv').config();

async function testRefurbishmentData() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('✅ Database connected\n');

    // Test 1: Check total active centers
    const [totalResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM centers WHERE status = "active"'
    );
    console.log(`📊 Total active centers: ${totalResult[0].total}\n`);

    // Test 2: Sample centers with establishment year
    const [centers] = await connection.execute(`
      SELECT 
        id,
        center_name, 
        year_of_establishment,
        last_refurbishment_date,
        status,
        YEAR(CURDATE()) - year_of_establishment as years_since_establishment
      FROM centers 
      WHERE status = 'active'
      LIMIT 10
    `);

    console.log('📋 Sample centers:');
    centers.forEach((c) => {
      const yearsSince = c.years_since_establishment;
      let tier = 'Not eligible';
      if (yearsSince >= 14) tier = '4th Refurbishment';
      else if (yearsSince >= 11) tier = '3rd Refurbishment';
      else if (yearsSince >= 8) tier = '2nd Refurbishment';
      else if (yearsSince >= 5) tier = '1st Refurbishment';

      console.log(`  - ${c.center_name}`);
      console.log(`    Est: ${c.year_of_establishment} (${yearsSince} years ago)`);
      console.log(`    Tier: ${tier}`);
      console.log(`    Last refurb: ${c.last_refurbishment_date || 'Never'}`);
      console.log('');
    });

    // Test 3: Count eligible centers (5+ years)
    const [eligibleResult] = await connection.execute(`
      SELECT COUNT(*) as eligible 
      FROM centers 
      WHERE status = 'active'
      AND YEAR(CURDATE()) - year_of_establishment >= 5
    `);
    console.log(`✅ Eligible centers (5+ years): ${eligibleResult[0].eligible}\n`);

    // Test 4: Recently refurbished (last 36 months)
    const [recentResult] = await connection.execute(`
      SELECT COUNT(*) as recent
      FROM centers 
      WHERE status = 'active'
      AND last_refurbishment_date IS NOT NULL
      AND TIMESTAMPDIFF(MONTH, last_refurbishment_date, CURDATE()) <= 36
    `);
    console.log(`✅ Recently refurbished (36 months): ${recentResult[0].recent}\n`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Connection closed');
    }
  }
}

testRefurbishmentData();
