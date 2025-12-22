const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'seif',
  multipleStatements: true,
};

async function runMigration() {
  let connection;

  try {
    console.log('========================================================================');
    console.log('        SEIF PORTAL - PASSWORD HISTORY TABLE MIGRATION');
    console.log('========================================================================\n');

    console.log('📊 Connecting to database...\n');
    connection = await mysql.createConnection(config);
    console.log('✅ Database connected successfully!\n');

    const sqlPath = path.join(__dirname, 'migrations', 'create_password_history_table.sql');
    console.log(`📄 Reading migration file: ${sqlPath}`);
    const sql = await fs.readFile(sqlPath, 'utf8');

    console.log('⏳ Executing migration...\n');
    const [results] = await connection.query(sql);

    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!\n');
    console.log('========================================================================');
    console.log('VERIFICATION:');
    console.log('========================================================================\n');

    // Verify password_history table
    const [tableCheck] = await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'seif' AND TABLE_NAME = 'password_history'"
    );

    if (tableCheck.length > 0) {
      console.log('✅ password_history table exists');

      // Show table structure
      const [structure] = await connection.query('DESCRIBE password_history');
      console.log('\n📋 Table Structure:');
      console.table(structure);

      // Show indexes
      const [indexes] = await connection.query('SHOW INDEX FROM password_history');
      console.log('\n📋 Indexes:');
      console.table(indexes);

      // Show foreign keys
      const [fks] = await connection.query(`
        SELECT 
          CONSTRAINT_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = 'seif'
          AND TABLE_NAME = 'password_history'
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      console.log('\n📋 Foreign Keys:');
      console.table(fks);
    } else {
      console.log('❌ password_history table NOT found');
    }

    console.log('\n========================================================================');
    console.log('🎉 Password history table is ready to use!');
    console.log('========================================================================\n');
  } catch (error) {
    console.log('\n❌ MIGRATION FAILED!\n');
    console.log('Error:', error.message);
    console.log('\nStack Trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('📊 Database connection closed.');
    }
  }
}

runMigration();
