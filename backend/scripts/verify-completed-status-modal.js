require('dotenv').config();
const db = require('../src/database/connection');
const RefurbishmentService = require('../src/api/v1/services/refurbishment.service');

(async () => {
  try {
    const [rows] = await db.query(
      `SELECT id, status, approved_at, material_procurement_at,
              installation_in_progress_at, completed_at, completion_statement
       FROM refurbishment_requests
       WHERE status = 'completed'
       ORDER BY completed_at DESC
       LIMIT 1`
    );

    if (!rows.length) {
      console.log('SKIP: no completed requests in database');
      process.exit(0);
    }

    const row = rows[0];
    console.log('Testing completed request:', row.id);

    const timeline = RefurbishmentService.buildRefurbishmentStatusTimeline(row);
    console.log(
      'Timeline keys:',
      timeline.events.map((e) => `${e.key}@${e.occurred_at || 'null'}`).join(', ')
    );

    const adminId = process.env.ADMIN_USER_ID || 'a0000000-0000-0000-0000-000000000002';
    const review = await RefurbishmentService.getRefurbishmentRequestForReview(
      row.id,
      adminId
    );

    console.log('status_dates:', review.status_dates);
    console.log(
      'completion_summary.admin:',
      review.completion_summary?.admin
        ? {
            statement: review.completion_summary.admin.statement?.slice(0, 40),
            files: review.completion_summary.admin.files?.length || 0,
          }
        : null
    );
    console.log('OK: review payload ready for completed status modal');
  } catch (err) {
    console.error('FAIL:', err.message);
    process.exitCode = 1;
  } finally {
    try {
      await db.end?.();
    } catch (_) {
      /* ignore */
    }
    process.exit(process.exitCode || 0);
  }
})();
