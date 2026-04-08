const db = require('../src/database/connection');

(async () => {
  try {
    const [cols1] = await db.query("SHOW COLUMNS FROM uploaded_students LIKE 'country'");
    if (cols1.length === 0) {
      await db.query(
        'ALTER TABLE uploaded_students ADD COLUMN country VARCHAR(100) NULL AFTER district'
      );
      console.log('Added country to uploaded_students');
    } else {
      console.log('uploaded_students.country already exists');
    }

    const [cols2] = await db.query("SHOW COLUMNS FROM students LIKE 'country'");
    if (cols2.length === 0) {
      await db.query(
        "ALTER TABLE students ADD COLUMN country VARCHAR(100) NULL DEFAULT 'India' AFTER district"
      );
      console.log('Added country to students');
    } else {
      console.log('students.country already exists');
    }

    console.log('Done');
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
