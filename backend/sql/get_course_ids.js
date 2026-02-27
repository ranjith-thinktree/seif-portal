const db = require('../src/database/connection');

async function getCourseIds() {
  try {
    const [rows] = await db.query(
      'SELECT id, course_name, course_code FROM courses ORDER BY course_code'
    );
    console.log('\n=== ACTUAL COURSE IDs IN DATABASE ===\n');
    rows.forEach((row) => {
      console.log(`Course: ${row.course_name}`);
      console.log(`Code: ${row.course_code}`);
      console.log(`ID: ${row.id}`);
      console.log('---');
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

getCourseIds();
