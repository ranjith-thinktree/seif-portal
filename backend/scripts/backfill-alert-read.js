const db = require('../src/database/connection');

async function main() {
  // Backfill: mark existing refurbishment_response notifications as read
  // if their linked request was already approved/rejected/completed
  const [result] = await db.query(
    `UPDATE notifications n
     INNER JOIN refurbishment_requests rr ON rr.id = n.related_entity_id
       AND n.related_entity_type = 'refurbishment_request'
     SET n.is_read = 1,
         n.read_at = NOW()
     WHERE n.alert_type = 'refurbishment_response'
       AND rr.status IN ('approved', 'rejected', 'completed')
       AND n.is_read = 0`
  );
  console.log('Backfilled notifications marked as read:', result.affectedRows);

  // Verify
  const [check] = await db.query(
    `SELECT n.id, n.alert_type, n.is_read, rr.status as request_status
     FROM notifications n
     LEFT JOIN refurbishment_requests rr ON rr.id = n.related_entity_id
     WHERE n.alert_type = 'refurbishment_response' AND n.recipient_role = 'ADMIN'`
  );
  console.log('Current state of refurbishment_response notifications:');
  check.forEach((r) => console.log(r));
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
