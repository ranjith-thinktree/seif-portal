const db = require('../src/database/connection');

async function main() {
  // Check what refurbishment notifications exist
  const [rows] = await db.query(
    `SELECT id, alert_type, recipient_role, recipient_id, related_entity_type, related_entity_id, title, is_read, created_at 
     FROM notifications 
     WHERE alert_type LIKE 'refurbishment%' 
     ORDER BY created_at DESC LIMIT 20`
  );
  console.log('=== Refurbishment notifications in DB:', rows.length);
  rows.forEach((r) =>
    console.log({
      alert_type: r.alert_type,
      recipient_role: r.recipient_role,
      recipient_id: r.recipient_id ? r.recipient_id.slice(0, 8) : null,
      entity_type: r.related_entity_type,
      title: r.title ? r.title.slice(0, 60) : null,
      is_read: r.is_read,
      date: r.created_at,
    })
  );

  // Check what the getRefurbishmentAlerts query returns
  const [alerts] = await db.query(
    `SELECT n.id, n.alert_type, n.title, n.message, n.is_read, rr.id as rr_id, p.name as partner_name, c.center_name
     FROM notifications n
     LEFT JOIN refurbishment_requests rr ON rr.id = n.related_entity_id AND n.related_entity_type = 'refurbishment_request'
     LEFT JOIN requests req ON req.id = rr.request_id
     LEFT JOIN centers c ON c.id = rr.center_id
     LEFT JOIN partners p ON p.id = c.partner_id
     WHERE n.alert_type IN ('refurbishment_response', 'refurbishment')
       AND n.recipient_role = 'ADMIN'
     ORDER BY n.created_at DESC LIMIT 20`
  );
  console.log('\n=== getRefurbishmentAlerts query result:', alerts.length);
  alerts.forEach((a) =>
    console.log({
      alert_type: a.alert_type,
      title: a.title ? a.title.slice(0, 60) : null,
      partner_name: a.partner_name,
      center_name: a.center_name,
      rr_id: a.rr_id ? a.rr_id.slice(0, 8) : null,
    })
  );

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
