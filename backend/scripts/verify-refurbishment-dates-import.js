'use strict';

const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  });

  const [[{ total }]] = await conn.query(
    `SELECT COUNT(*) AS total FROM centers WHERE last_refurbishment_date IS NOT NULL`
  );
  const [[{ y2025 }]] = await conn.query(
    `SELECT COUNT(*) AS y2025 FROM centers WHERE last_refurbishment_date = '2025-03-31'`
  );
  const [[{ y2026 }]] = await conn.query(
    `SELECT COUNT(*) AS y2026 FROM centers WHERE last_refurbishment_date = '2026-03-31'`
  );

  const [recent] = await conn.query(
    `SELECT c.center_name, c.center_id, c.last_refurbishment_date, p.name AS partner_name
     FROM centers c
     LEFT JOIN partners p ON p.id = c.partner_id
     WHERE c.last_refurbishment_date IS NOT NULL
     ORDER BY c.last_refurbishment_date DESC, c.center_name ASC
     LIMIT 5`
  );

  console.log('Centers with last_refurbishment_date set:', total);
  console.log('  2025-03-31:', y2025);
  console.log('  2026-03-31:', y2026);
  console.log('\nSample recently refurbished centers:');
  recent.forEach((r) =>
    console.log(`  ${r.center_name} (${r.center_id}) -> ${String(r.last_refurbishment_date).slice(0, 10)}`)
  );

  await conn.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
