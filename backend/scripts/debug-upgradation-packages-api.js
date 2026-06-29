require('dotenv').config();
const RefurbishmentService = require('../src/api/v1/services/refurbishment.service');
const mysql = require('mysql2/promise');

(async () => {
  const requestId = process.argv[2] || '5df88506-bfb0-4edb-83d0-46f01a5a71ae';
  const adminId = 'a0000000-0000-0000-0000-000000000002';

  try {
    const result = await RefurbishmentService.getUpgradationPackagesForRequest(requestId);
    console.log('Current API count:', result.available_packages.length);
    console.log(
      'Packages:',
      result.available_packages.map((p) => `${p.name || p.package_name} (${p.category})`),
    );
  } catch (e) {
    console.log('API error (may need admin):', e.message);

    const c = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'seif_db',
    });
    const [[req]] = await c.query(
      `SELECT center_id FROM refurbishment_requests WHERE id = ?`,
      [requestId],
    );
    const [courses] = await c.query(
      `SELECT course_id FROM center_courses WHERE center_id = ?`,
      [req.center_id],
    );
    const courseIds = courses.map((r) => r.course_id);
    const [upgOnly] = await c.query(
      `SELECT COUNT(DISTINCT rp.id) AS cnt FROM refurbishment_packages rp
       LEFT JOIN package_courses pc ON pc.package_id = rp.id
       WHERE rp.category = 'upgradation' AND rp.is_active = 1`,
    );
    const [both] = await c.query(
      `SELECT COUNT(DISTINCT rp.id) AS cnt FROM refurbishment_packages rp
       LEFT JOIN package_courses pc ON pc.package_id = rp.id
       WHERE rp.category IN ('upgradation','refurbishment') AND rp.is_active = 1`,
    );
    console.log('Center courses:', courseIds.length);
    console.log('Upgradation-only packages (all):', upgOnly[0].cnt);
    console.log('Upgradation+refurbishment packages (all):', both[0].cnt);
    await c.end();
  }
})().catch(console.error);
