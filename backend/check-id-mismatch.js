const db = require('./src/database/connection');

(async () => {
  try {
    // Check the recipient vs partner ID issue
    const notificationRecipientId = 'ff64776d-1e8c-4518-9fa8-eca534eedf5e'; // This is a user_id
    const scheduledPartnerId = '6d3c73d0-b814-40ee-b45f-72eb7cf392fc'; // This might be a partner_id directly

    console.log('=== NOTIFICATION RECIPIENT ===');
    const [user] = await db.query('SELECT id, email, reference_id FROM users WHERE id = ?', [
      notificationRecipientId,
    ]);
    if (user.length > 0) {
      console.log('User:', user[0]);

      if (user[0].reference_id) {
        const [partner] = await db.query('SELECT id, name FROM partners WHERE id = ?', [
          user[0].reference_id,
        ]);
        console.log('Partner:', partner[0]);
      }
    }

    console.log('\n=== SCHEDULED PARTNER ===');
    // Try as partner_id first
    const [partner] = await db.query('SELECT id, name FROM partners WHERE id = ?', [
      scheduledPartnerId,
    ]);
    if (partner.length > 0) {
      console.log('✅ It IS a partner_id!');
      console.log('Partner:', partner[0]);
    } else {
      // Try as user_id
      const [user2] = await db.query('SELECT id, email, reference_id FROM users WHERE id = ?', [
        scheduledPartnerId,
      ]);
      console.log('It is a user_id');
      console.log('User:', user2[0]);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
