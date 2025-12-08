const mysql = require('mysql2/promise');

async function createMissingNotifications() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'seif',
    });

    console.log('✅ Connected to database');

    const partnerUserId = 'a0000000-0000-0000-0000-000000000005';

    // Insert 3 notifications
    const notifications = [
      {
        id: 'notif-001-pune-approved',
        type: 'DATA_APPROVED',
        alert_type: 'success',
        title: 'Center Approved',
        message: 'Center "Pune Training Center" has been approved and is now active.',
        related_entity_type: 'center',
        related_entity_id: 'a4c0ff4c-dd92-4ca0-b2db-eecc5eb7f533',
        created_at: '2025-11-26 08:28:56',
      },
      {
        id: 'notif-002-bangalore-approved',
        type: 'DATA_APPROVED',
        alert_type: 'success',
        title: 'Center Approved',
        message: 'Center "Bangalore Automation Center" has been approved and is now active.',
        related_entity_type: 'center',
        related_entity_id: 'ece3567f-3bd2-4fcd-9a1e-7f3054bc4dd2',
        created_at: '2025-11-26 08:30:08',
      },
      {
        id: 'notif-003-mumbai-rejected',
        type: 'DATA_REJECTED',
        alert_type: 'error',
        title: 'Center Rejected',
        message: 'Center "Mumbai Solar Hub" has been rejected. Reason: Not a Good',
        related_entity_type: 'uploaded_center',
        related_entity_id: 'e781fee0-c89f-11f0-94bf-00410e2b5e6e',
        created_at: '2025-11-26 08:30:40',
      },
    ];

    for (const notif of notifications) {
      await connection.query(
        `INSERT INTO notifications (
          id, recipient_id, type, alert_type, title, message,
          related_entity_type, related_entity_id, sent_via, is_read, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notif.id,
          partnerUserId,
          notif.type,
          notif.alert_type,
          notif.title,
          notif.message,
          notif.related_entity_type,
          notif.related_entity_id,
          'in_app',
          0,
          notif.created_at,
        ]
      );
      console.log(`✅ Created notification: ${notif.title}`);
    }

    // Verify
    const [result] = await connection.query(
      'SELECT id, type, alert_type, title, message, created_at FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 3',
      [partnerUserId]
    );

    console.log('\n📬 Latest notifications for partner:');
    result.forEach((n, i) => {
      console.log(`${i + 1}. [${n.alert_type}] ${n.title}: ${n.message}`);
    });

    console.log('\n✅ All missing notifications created successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createMissingNotifications();
