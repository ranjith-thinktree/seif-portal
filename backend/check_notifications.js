const mysql = require('mysql2/promise');

async function checkNotifications() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'seif',
  });

  try {
    const [rows] = await conn.query(
      'SELECT id, recipient_id, recipient_role, type, title FROM notifications WHERE recipient_id = ?',
      ['a0000000-0000-0000-0000-000000000005']
    );

    console.log('Partner Notifications:', JSON.stringify(rows, null, 2));

    const [user] = await conn.query('SELECT id, email, role FROM users WHERE id = ?', [
      'a0000000-0000-0000-0000-000000000005',
    ]);

    console.log('\nPartner User:', JSON.stringify(user, null, 2));
  } finally {
    await conn.end();
  }
}

checkNotifications();
