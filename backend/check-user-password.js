const db = require('./src/database/connection');

(async () => {
  try {
    // Get partner user details
    const [users] = await db.query(`
      SELECT id, email, full_name, role, partner_id 
      FROM users 
      WHERE email = 'non@seif.in'
    `);

    if (users.length > 0) {
      console.log('Partner User Found:');
      console.log(users[0]);
      console.log('\nNOTE: The test uses "password" as the password');
      console.log('You may need to reset the password or use the correct one');
    } else {
      console.log('User not found');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
