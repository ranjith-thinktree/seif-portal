const db = require('./src/database/connection');

async function findTestPartner() {
  const [partners] = await db.query(`
    SELECT 
      p.id, 
      p.name, 
      u.email,
      u.id as user_id,
      (SELECT COUNT(*) FROM centers WHERE partner_id = p.id) as center_count
    FROM partners p
    INNER JOIN users u ON u.partner_id = p.id
    WHERE u.role = 'PARTNER' AND u.status = 'active'
    HAVING center_count > 0
    ORDER BY center_count DESC
    LIMIT 5
  `);

  console.log('\n📋 Partners with centers:\n');
  console.table(
    partners.map((p) => ({
      Name: p.name,
      Email: p.email,
      Centers: p.center_count,
    }))
  );

  if (partners.length > 0) {
    const best = partners[0];
    const [centers] = await db.query(
      `
      SELECT id, center_name 
      FROM centers 
      WHERE partner_id = ? 
      LIMIT 3
    `,
      [best.id]
    );

    console.log(`\n✅ Best partner for testing: ${best.name}`);
    console.log(`   Email: ${best.email}`);
    console.log(`   Centers: ${best.center_count}`);
    console.log('\n📍 Sample centers:');
    centers.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.center_name} (${c.id})`);
    });
  } else {
    console.log('❌ No partners with centers found');
  }

  process.exit(0);
}

findTestPartner().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
