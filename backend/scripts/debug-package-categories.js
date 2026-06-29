require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif_db',
  });
  const [cats] = await c.query(
    `SELECT category, COUNT(*) AS cnt FROM refurbishment_packages WHERE is_active=1 GROUP BY category`
  );
  console.log('Categories:', cats);
  const [samples] = await c.query(
    `SELECT id, package_name, category FROM refurbishment_packages WHERE is_active=1 ORDER BY category, package_name LIMIT 20`
  );
  console.log('Samples:', samples);
  await c.end();
})().catch(console.error);
