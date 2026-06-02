const db = require('../src/database/connection');
const { syncUploadLifecycle } = require('../src/utils/uploadStatus.util');

async function resync() {
  const conn = await db.getConnection();
  try {
    const [uploads] = await conn.query(`
      SELECT du.id, du.centers_approved, du.centers_total,
        SUM(CASE WHEN uc.review_status = 'approved' THEN 1 ELSE 0 END) as live_approved,
        COUNT(uc.id) as live_total
      FROM data_uploads du
      LEFT JOIN uploaded_centers uc ON uc.data_upload_id = du.id
      GROUP BY du.id
      HAVING live_approved != du.centers_approved OR live_total != du.centers_total
    `);
    console.log('Stale uploads found:', uploads.length);
    uploads.forEach((u) =>
      console.log(
        ` Upload: ${u.id} | cached: ${u.centers_approved}/${u.centers_total} | live: ${u.live_approved}/${u.live_total}`
      )
    );

    for (const upload of uploads) {
      await syncUploadLifecycle(conn, upload.id, null, 'partial');
      console.log('Resynced:', upload.id);
    }
    console.log('Done.');
  } finally {
    conn.release();
    process.exit(0);
  }
}
resync().catch((e) => {
  console.error(e);
  process.exit(1);
});
