const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function resetPartnerPassword() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'seif',
    });

    // Get partner email from command line or use default
    const email = process.argv[2] || 'ranjith@thinktreemedia.in';

    // Generate new temporary password
    const tempPassword = 'TempPass@123'; // Simple temporary password
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    console.log(`\n🔐 Resetting password for: ${email}\n`);

    // Update password and set flags
    const [result] = await connection.query(
      `
      UPDATE users 
      SET 
        password_hash = ?,
        must_change_password = 1,
        password_changed_at = NOW()
      WHERE email = ? AND role = 'PARTNER'
    `,
      [passwordHash, email]
    );

    if (result.affectedRows === 0) {
      console.log('❌ Partner not found with that email');
      return;
    }

    console.log('✅ Password reset successfully!\n');
    console.log('='.repeat(50));
    console.log('📧 Email:', email);
    console.log('🔑 Temporary Password:', tempPassword);
    console.log('='.repeat(50));
    console.log('\n⚠️  IMPORTANT:');
    console.log('1. Use this temporary password to log in');
    console.log('2. You will be forced to change it on first login');
    console.log('3. Choose a strong password (8+ chars, upper, lower, number, special char)\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

resetPartnerPassword();
