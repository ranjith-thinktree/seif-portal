/**
 * Get test data for refurbishment notification tests
 */
const db = require('../src/database/connection');

async function getTestData() {
  // Get a partner with at least one center
  const [partners] = await db.query(`
    SELECT p.id as partner_id, p.name, u.id as user_id, u.email, u.role,
           c.id as center_id, c.center_name
    FROM partners p
    JOIN users u ON u.partner_id = p.id AND u.role = 'PARTNER' AND u.status = 'active'
    JOIN centers c ON c.partner_id = p.id AND c.status = 'active'
    LIMIT 3
  `);
  console.log('=== Test Partners/Centers ===');
  console.log(JSON.stringify(partners, null, 2));

  // Get admin user
  const [admins] = await db.query(
    "SELECT id, email FROM users WHERE role IN ('ADMIN','SUPER_ADMIN') AND status='active' LIMIT 1"
  );
  console.log('\n=== Admin User ===');
  console.log(JSON.stringify(admins, null, 2));

  process.exit(0);
}

getTestData().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
