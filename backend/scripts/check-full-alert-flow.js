const db = require('../src/database/connection');

async function main() {
  // 1. ALL refurbishment notifications in DB
  const [all] = await db.query(
    `SELECT id, alert_type, recipient_role, recipient_id, related_entity_type, related_entity_id, title, is_read, type, created_at
     FROM notifications WHERE alert_type LIKE 'refurbishment%' ORDER BY created_at DESC`
  );
  console.log('\n=== ALL refurbishment notifications:', all.length);
  all.forEach((r) =>
    console.log({
      id: r.id.slice(0, 8),
      alert_type: r.alert_type,
      type: r.type,
      recipient_role: r.recipient_role,
      recipient_id: r.recipient_id ? r.recipient_id.slice(0, 8) : null,
      entity_type: r.related_entity_type,
      entity_id: r.related_entity_id ? r.related_entity_id.slice(0, 8) : null,
      title: r.title ? r.title.slice(0, 60) : null,
      is_read: r.is_read,
      date: r.created_at,
    })
  );

  // 2. What getRefurbishmentAlerts query actually returns
  const [alerts] = await db.query(
    `SELECT n.id, n.alert_type, n.title, n.is_read, n.created_at,
            p.name as partner_name, c.center_name
     FROM notifications n
     LEFT JOIN refurbishment_requests rr ON rr.id = n.related_entity_id AND n.related_entity_type = 'refurbishment_request'
     LEFT JOIN centers c ON c.id = rr.center_id
     LEFT JOIN partners p ON p.id = c.partner_id
     WHERE n.alert_type IN ('refurbishment_response', 'refurbishment')
       AND n.recipient_role = 'ADMIN'
     ORDER BY n.created_at DESC`
  );
  console.log('\n=== getRefurbishmentAlerts result (shown in Alerts tab):', alerts.length);
  alerts.forEach((a) =>
    console.log({
      id: a.id.slice(0, 8),
      alert_type: a.alert_type,
      title: a.title ? a.title.slice(0, 60) : null,
      is_read: a.is_read,
      partner: a.partner_name,
      center: a.center_name,
    })
  );

  // 3. Check refurbishment_requests to correlate
  const [reqs] = await db.query(
    `SELECT rr.id, rr.status, rr.center_id, rr.created_at,
            c.center_name, p.name as partner_name, r.request_number
     FROM refurbishment_requests rr
     JOIN centers c ON c.id = rr.center_id
     JOIN partners p ON p.id = c.partner_id
     LEFT JOIN requests r ON r.id = rr.request_id
     ORDER BY rr.created_at DESC LIMIT 20`
  );
  console.log('\n=== refurbishment_requests:', reqs.length);
  reqs.forEach((r) =>
    console.log({
      id: r.id.slice(0, 8),
      status: r.status,
      center: r.center_name,
      partner: r.partner_name,
      request_number: r.request_number,
    })
  );

  // 4. Check if any refurbishment_response notifications DON'T match by their entity_id
  const [orphaned] = await db.query(
    `SELECT n.id, n.alert_type, n.related_entity_id, n.title
     FROM notifications n
     WHERE n.alert_type = 'refurbishment_response'
       AND n.recipient_role = 'ADMIN'
       AND NOT EXISTS (
         SELECT 1 FROM refurbishment_requests rr WHERE rr.id = n.related_entity_id
       )`
  );
  console.log(
    '\n=== Orphaned alerts (related_entity_id has no matching refurbishment_request):',
    orphaned.length
  );
  orphaned.forEach((o) => console.log(o));

  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
