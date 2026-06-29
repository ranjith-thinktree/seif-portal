require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  });

  const [statuses] = await c.query(
    'SELECT status, COUNT(*) as cnt FROM refurbishment_requests GROUP BY status'
  );
  console.log('Status counts:', statuses);

  const [total] = await c.query('SELECT COUNT(*) as total FROM refurbishment_requests');
  console.log('Total requests:', total[0].total);

  const [sample] = await c.query(
    `SELECT id, status, created_at, updated_at, YEAR(updated_at) as upd_year
     FROM refurbishment_requests ORDER BY updated_at DESC LIMIT 10`
  );
  console.log('Recent requests:', sample);

  const year = new Date().getFullYear();
  const activeStatuses = [
    'submitted',
    'sent_back',
    'approved',
    'material_procurement',
    'installation_in_progress',
    'refurbishment_started',
    'completed',
    'rejected',
  ];
  const placeholders = activeStatuses.map(() => '?').join(', ');

  const [yearFiltered] = await c.query(
    `SELECT COUNT(*) as cnt FROM refurbishment_requests
     WHERE status IN (${placeholders}) AND YEAR(updated_at) = ?`,
    [...activeStatuses, year]
  );
  console.log(`Past requests filter (year=${year}):`, yearFiltered[0].cnt);

  const [noYear] = await c.query(
    `SELECT COUNT(*) as cnt FROM refurbishment_requests WHERE status IN (${placeholders})`,
    activeStatuses
  );
  console.log('Past requests (no year filter):', noYear[0].cnt);

  const [years] = await c.query(
    `SELECT YEAR(updated_at) as y, COUNT(*) as cnt
     FROM refurbishment_requests
     WHERE status IN (${placeholders})
     GROUP BY YEAR(updated_at) ORDER BY y DESC`,
    activeStatuses
  );
  console.log('Requests by updated_at year:', years);

  await c.end();
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
