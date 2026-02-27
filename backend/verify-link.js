const db = require('./src/database/connection');

(async () => {
  try {
    console.log('=== Understanding the ID relationship ===\n');

    const notificationRecipientId = 'ff64776d-1e8c-4518-9fa8-eca534eedf5e'; // notifications.recipient_id (USER ID)
    const scheduledPartnerId = '6d3c73d0-b814-40ee-b45f-72eb7cf392fc'; // scheduled_refurbishment_notifications.partner_id (PARTNER ID)

    // Get user info
    const [users] = await db.query('SELECT id, email, partner_id FROM users WHERE id = ?', [
      notificationRecipientId,
    ]);
    console.log('1. Notification Recipient (USER):');
    console.log('   ID:', users[0].id);
    console.log('   Email:', users[0].email);
    console.log('   Partner ID:', users[0].partner_id);

    // Get partner info for this user
    const [userPartner] = await db.query('SELECT id, name FROM partners WHERE id = ?', [
      users[0].partner_id,
    ]);
    console.log("\n2. User's Partner:");
    console.log('   ID:', userPartner[0].id);
    console.log('   Name:', userPartner[0].name);

    // Get the scheduled notification's partner
    const [schedPartner] = await db.query('SELECT id, name FROM partners WHERE id = ?', [
      scheduledPartnerId,
    ]);
    console.log('\n3. Scheduled Notification Partner:');
    console.log('   ID:', schedPartner[0].id);
    console.log('   Name:', schedPartner[0].name);

    console.log('\n=== CONCLUSION ===');
    if (users[0].partner_id === scheduledPartnerId) {
      console.log('✅ MATCH! user.partner_id === scheduled_refurbishment_notifications.partner_id');
      console.log('\nCorrect join:');
      console.log('  notifications.recipient_id -> users.id');
      console.log('  users.partner_id -> partners.id');
      console.log('  scheduled_refurbishment_notifications.partner_id -> partners.id');
    } else {
      console.log('❌ MISMATCH!');
      console.log('   user.partner_id:', users[0].partner_id);
      console.log('   scheduled...partner_id:', scheduledPartnerId);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
