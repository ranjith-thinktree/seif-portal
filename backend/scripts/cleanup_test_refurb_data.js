/**
 * One-time cleanup: remove dummy "Test Partner Ltd / Test Center Delhi"
 * refurbishment requests and all their cascaded data + notifications.
 *
 * Run:  node scripts/cleanup_test_refurb_data.js
 */
require('dotenv').config();
const db = require('../src/database/connection');

const DUMMY_IDS = [
  '37773c8a-d9fe-46aa-931b-434ec73484d9',
  '37aea595-428a-47dc-9ba7-1f53e907b230',
  '8ae1a657-43ed-4a87-9d73-8010af7e9b97',
  'a9d98356-608d-4324-8010-915aa19508d8',
  'cc9e09fb-0a87-401d-9441-1c9e1ba4859c',
  '93398519-2bfc-4fda-a21b-77b2d1fa6b35',
  '4653105b-af08-452e-a919-98c1ade3de4f',
  '076114cd-1788-487c-ba82-c8b2fcc3835b',
  '9e740e72-164a-40fa-947d-bfa12e776753',
  '2370da48-4123-47b5-a47d-542f35f52a0e',
  'ee7fbe3f-be0e-480b-8e15-aff4b48b5b94',
  'af04c98f-3c61-42a4-be5e-448ee9852733',
  '02fa2e29-b56f-426d-88d7-ab6ad6bccc98',
  '1b4b90cd-e791-4717-9f69-63d932db6ba7',
  '4eab5030-56c7-4171-b17f-9cc402995bca',
  'e2d47a04-88a6-4558-9377-26343a3f7128',
  '55f84c24-744e-4da2-8bf4-5f27a5eff760',
  'a3bff38b-30ee-4c0d-8c38-5fb3b0942af1',
  'd64af4c3-47a5-4895-a3fc-0185559ea631',
  '0c56617d-e023-4172-9e73-e813af1bc6ef',
  '0b63fb1d-75e8-4c83-b854-82db7f050bfa',
];

async function run() {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Helpers
    const del = async (table, col) => {
      const [res] = await conn.query(`DELETE FROM \`${table}\` WHERE \`${col}\` IN (?)`, [
        DUMMY_IDS,
      ]);
      console.log(`  ${table}: ${res.affectedRows} row(s) deleted`);
    };

    // 1. Notifications
    const [n] = await conn.query(
      `DELETE FROM notifications
       WHERE related_entity_id IN (?)
         AND related_entity_type = 'refurbishment_request'`,
      [DUMMY_IDS]
    );
    console.log(`  notifications: ${n.affectedRows} row(s) deleted`);

    // 2. Upgradation photos (join through rooms)
    const [p] = await conn.query(
      `DELETE ph FROM refurbishment_upgradation_photos ph
       JOIN refurbishment_upgradation_rooms r ON r.id = ph.upgradation_room_id
       WHERE r.refurbishment_request_id IN (?)`,
      [DUMMY_IDS]
    );
    console.log(`  refurbishment_upgradation_photos: ${p.affectedRows} row(s) deleted`);

    // 3. Upgradation rooms
    await del('refurbishment_upgradation_rooms', 'refurbishment_request_id');

    // 4. Upgradation packages
    await del('refurbishment_upgradation_request_packages', 'refurbishment_request_id');

    // 5. Course attachments
    await del('refurbishment_request_course_attachments', 'refurbishment_request_id');

    // 6. Partner-selected course packages
    await del('refurbishment_request_course_packages', 'refurbishment_request_id');

    // 7. Admin-added packages
    await del('refurbishment_admin_added_packages', 'refurbishment_request_id');

    // 8. Admin pre-selected packages (linked via requests.id FK)
    const [rr] = await conn.query(`SELECT request_id FROM refurbishment_requests WHERE id IN (?)`, [
      DUMMY_IDS,
    ]);
    const requestIds = rr.map((r) => r.request_id).filter(Boolean);
    if (requestIds.length) {
      const [asp] = await conn.query(
        `DELETE FROM refurbishment_admin_selected_packages WHERE request_id IN (?)`,
        [requestIds]
      );
      console.log(`  refurbishment_admin_selected_packages: ${asp.affectedRows} row(s) deleted`);
    }

    // 9. The refurbishment_requests rows themselves
    await del('refurbishment_requests', 'id');

    // 10. Orphan requests rows (RQ-000001 with no remaining refurbishment_request)
    if (requestIds.length) {
      // Only delete if the requests.id isn't referenced by any remaining row
      const [verifyRr] = await conn.query(
        `SELECT request_id FROM refurbishment_requests WHERE request_id IN (?)`,
        [requestIds]
      );
      const stillUsed = new Set(verifyRr.map((r) => r.request_id));
      const orphans = requestIds.filter((id) => !stillUsed.has(id));
      if (orphans.length) {
        const [orph] = await conn.query(`DELETE FROM requests WHERE id IN (?)`, [orphans]);
        console.log(`  requests (orphans): ${orph.affectedRows} row(s) deleted`);
      }
    }

    await conn.commit();
    console.log('\n✓ Cleanup complete!');
  } catch (err) {
    await conn.rollback();
    console.error('✗ Error — rolled back:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

run();
