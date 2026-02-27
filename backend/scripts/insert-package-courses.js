const mysql = require('mysql2/promise');
require('dotenv').config();

async function insertPackageCourses() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  });

  try {
    console.log('Connected to database...');

    // First, clear existing data
    await connection.query('DELETE FROM package_courses');
    console.log('Cleared existing package_courses data');

    // Insert new relationships
    const insertQuery = `
      INSERT INTO package_courses (package_id, course_id, created_at) VALUES
      -- Basic Electrican course packages
      ('e22455b2-0897-11f1-90b6-00410e2b5e6e', '6275ba97-c89b-11f0-94bf-00410e2b5e6e', '2026-02-16 11:30:00'),
      ('e224719d-0897-11f1-90b6-00410e2b5e6e', '6275ba97-c89b-11f0-94bf-00410e2b5e6e', '2026-02-16 11:30:00'),
      ('e2255f2a-0897-11f1-90b6-00410e2b5e6e', '6275ba97-c89b-11f0-94bf-00410e2b5e6e', '2026-02-16 11:30:00'),
      ('e2255202-0897-11f1-90b6-00410e2b5e6e', '6275ba97-c89b-11f0-94bf-00410e2b5e6e', '2026-02-16 11:30:00'),
      ('e225f4fa-0897-11f1-90b6-00410e2b5e6e', '6275ba97-c89b-11f0-94bf-00410e2b5e6e', '2026-02-16 11:30:00'),
      
      -- Solar Solution course packages
      ('e224704d-0897-11f1-90b6-00410e2b5e6e', '6276774f-c89b-11f0-94bf-00410e2b5e6e', '2026-02-16 11:30:00'),
      ('e22455b2-0897-11f1-90b6-00410e2b5e6e', '6276774f-c89b-11f0-94bf-00410e2b5e6e', '2026-02-16 11:30:00'),
      ('e2255f2a-0897-11f1-90b6-00410e2b5e6e', '6276774f-c89b-11f0-94bf-00410e2b5e6e', '2026-02-16 11:30:00'),
      ('e225f4fa-0897-11f1-90b6-00410e2b5e6e', '6276774f-c89b-11f0-94bf-00410e2b5e6e', '2026-02-16 11:30:00'),
      
      -- Industrial Automation course packages
      ('e225bd2e-0897-11f1-90b6-00410e2b5e6e', '6276796c-c89b-11f0-94bf-00410e2b5e6e', '2026-02-16 11:30:00'),
      ('e225c7a1-0897-11f1-90b6-00410e2b5e6e', '6276796c-c89b-11f0-94bf-00410e2b5e6e', '2026-02-16 11:30:00'),
      ('e225c703-0897-11f1-90b6-00410e2b5e6e', '6276796c-c89b-11f0-94bf-00410e2b5e6e', '2026-02-16 11:30:00'),
      ('e2250311-0897-11f1-90b6-00410e2b5e6e', '6276796c-c89b-11f0-94bf-00410e2b5e6e', '2026-02-16 11:30:00'),
      ('e2250f1d-0897-11f1-90b6-00410e2b5e6e', '6276796c-c89b-11f0-94bf-00410e2b5e6e', '2026-02-16 11:30:00'),
      ('e225f4fa-0897-11f1-90b6-00410e2b5e6e', '6276796c-c89b-11f0-94bf-00410e2b5e6e', '2026-02-16 11:30:00')
    `;

    const [result] = await connection.query(insertQuery);
    console.log(`✅ Successfully inserted ${result.affectedRows} package-course relationships`);

    // Verify the data
    const [rows] = await connection.query(`
      SELECT 
        rp.package_name,
        c.course_name,
        GROUP_CONCAT(c.course_name) as courses
      FROM package_courses pc
      JOIN refurbishment_packages rp ON pc.package_id = rp.id
      JOIN courses c ON pc.course_id = c.id
      GROUP BY rp.id
      ORDER BY rp.display_order
    `);

    console.log('\n📊 Verification - Packages with courses:');
    rows.forEach((row) => {
      console.log(`  - ${row.package_name}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('\nDatabase connection closed.');
  }
}

insertPackageCourses()
  .then(() => {
    console.log('\n✅ All done! Reload your browser to see the courses in the Labs column.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
