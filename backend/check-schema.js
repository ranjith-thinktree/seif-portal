const mysql = require('mysql2/promise');

async function checkSchema() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'seif',
  });

  const [columns] = await db.query(`
    DESCRIBE centers
  `);

  console.log('\nCenters Table Schema:\n');
  columns.forEach((col) => {
    console.log(`${col.Field}`);
    console.log(`  Type: ${col.Type}`);
    console.log(`  Null: ${col.Null}`);
    console.log(`  Key: ${col.Key}`);
    console.log(`  Default: ${col.Default}`);
    console.log(`  Extra: ${col.Extra}`);
    console.log('');
  });

  await db.end();
}

checkSchema().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
