/**
 * Run Password Management Migration
 * Executes the SQL migration to add password management fields
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'seif',
  multipleStatements: true,
};

async function runMigration() {
  let connection;

  try {
    console.log('='.repeat(80));
    console.log('SEIF PORTAL - PASSWORD MANAGEMENT MIGRATION');
    console.log('='.repeat(80));
    console.log('\n📊 Connecting to database...\n');

    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully!\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add_password_management_fields.sql');
    console.log(`📄 Reading migration file: ${migrationPath}\n`);

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('⏳ Executing migration...\n');

    // Execute SQL
    await connection.query(sql);

    console.log('✅ Migration executed successfully!\n');

    // Verify the changes
    console.log('='.repeat(80));
    console.log('VERIFICATION');
    console.log('='.repeat(80));

    // Check new columns
    console.log('\n1️⃣ Checking new columns in users table:\n');
    const [columns] = await connection.query(
      `
      SELECT 
        COLUMN_NAME,
        COLUMN_TYPE,
        COLUMN_DEFAULT,
        IS_NULLABLE,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME IN ('must_change_password', 'password_changed_at', 'first_login')
      ORDER BY ORDINAL_POSITION
    `,
      [dbConfig.database]
    );

    if (columns.length > 0) {
      columns.forEach((col) => {
        console.log(`   ✓ ${col.COLUMN_NAME}`);
        console.log(`     Type: ${col.COLUMN_TYPE}`);
        console.log(`     Default: ${col.COLUMN_DEFAULT}`);
        console.log(`     Nullable: ${col.IS_NULLABLE}`);
        console.log(`     Comment: ${col.COLUMN_COMMENT}`);
        console.log('');
      });
    } else {
      console.log('   ❌ No new columns found!\n');
    }

    // Check password_history table
    console.log('2️⃣ Checking password_history table:\n');
    const [tables] = await connection.query(
      `
      SELECT 
        TABLE_NAME,
        ENGINE,
        TABLE_ROWS,
        TABLE_COMMENT
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'password_history'
    `,
      [dbConfig.database]
    );

    if (tables.length > 0) {
      const table = tables[0];
      console.log(`   ✓ Table exists: ${table.TABLE_NAME}`);
      console.log(`     Engine: ${table.ENGINE}`);
      console.log(`     Rows: ${table.TABLE_ROWS}`);
      console.log(`     Comment: ${table.TABLE_COMMENT}`);
      console.log('');
    } else {
      console.log('   ❌ password_history table not found!\n');
    }

    // Check users who must change password
    console.log('3️⃣ Users who must change password:\n');
    const [mustChange] = await connection.query(`
      SELECT 
        email,
        full_name,
        role,
        must_change_password,
        first_login,
        last_login_at
      FROM users
      WHERE must_change_password = TRUE
      ORDER BY role, email
    `);

    if (mustChange.length > 0) {
      console.log(`   Found ${mustChange.length} user(s) who must change password:\n`);
      mustChange.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.full_name} (${user.email})`);
        console.log(`      Role: ${user.role}`);
        console.log(`      First Login: ${user.first_login ? 'Yes' : 'No'}`);
        console.log(`      Last Login: ${user.last_login_at || 'Never'}`);
        console.log('');
      });
    } else {
      console.log('   ℹ️  No users currently require password change.\n');
    }

    // Summary statistics
    console.log('4️⃣ Summary Statistics:\n');
    const [stats] = await connection.query(`
      SELECT 
        'Total Active Users' as metric,
        COUNT(*) as count
      FROM users
      WHERE status = 'active'
      
      UNION ALL
      
      SELECT 
        'Users Must Change Password',
        COUNT(*)
      FROM users
      WHERE must_change_password = TRUE
      
      UNION ALL
      
      SELECT 
        'First Time Login Users',
        COUNT(*)
      FROM users
      WHERE first_login = TRUE
      
      UNION ALL
      
      SELECT 
        'Password History Records',
        COUNT(*)
      FROM password_history
    `);

    stats.forEach((stat) => {
      console.log(`   ${stat.metric}: ${stat.count}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log('\n📋 Next Steps:\n');
    console.log("1. Restart backend server if it's running");
    console.log('2. Test password change flow');
    console.log('3. Test forced password change on first login');
    console.log('4. Test admin password reset\n');
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED!\n');
    console.error('Error:', error.message);
    console.error('\nStack Trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the migration
runMigration();
