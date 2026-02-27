/**
 * Run MySQL Events Migration
 * Executes the notification queue setup SQL
 */

const db = require('./src/database/connection');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     RUNNING NOTIFICATION QUEUE MIGRATION                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Read migration file
    const migrationPath = path.join(
      __dirname,
      'migrations',
      'add_mysql_event_notification_queue.sql'
    );
    console.log('Reading migration file...');
    let sql = fs.readFileSync(migrationPath, 'utf8');

    // Remove comments
    sql = sql.replace(/--[^\n]*\n/g, '\n');
    sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');

    // Split by DELIMITER markers
    const parts = sql.split(/DELIMITER\s+\$\$/gi);
    const statements = [];

    // Process non-delimiter sections (normal SQL with ;)
    if (parts[0]) {
      const normalStatements = parts[0]
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 20);
      statements.push(...normalStatements);
    }

    // Process delimiter sections (procedures, events with $$)
    for (let i = 1; i < parts.length; i++) {
      const delimiterSection = parts[i].split(/DELIMITER\s+;/gi);
      if (delimiterSection[0]) {
        const procStatements = delimiterSection[0]
          .split('$$')
          .map((s) => s.trim())
          .filter((s) => s.length > 20);
        statements.push(...procStatements);
      }
      // Process remaining normal statements after delimiter reset
      if (delimiterSection[1]) {
        const normalStatements = delimiterSection[1]
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 20);
        statements.push(...normalStatements);
      }
    }

    console.log(`Found ${statements.length} SQL statement(s)\n`);

    // Execute each statement
    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();

      if (!statement || statement.length < 10) {
        skipCount++;
        continue;
      }

      // Extract statement type for logging
      const firstLine = statement.split('\n')[0].substring(0, 60);
      console.log(`[${i + 1}/${statements.length}] Executing: ${firstLine}...`);

      try {
        // Use unprepared query for EVENT DDL commands (not supported in prepared statements)
        if (statement.toUpperCase().includes('EVENT')) {
          const connection = await db.getConnection();
          try {
            await connection.query(statement);
            connection.release();
          } catch (err) {
            connection.release();
            throw err;
          }
        } else {
          await db.query(statement);
        }
        successCount++;
        console.log('     ✅ Success\n');
      } catch (error) {
        // Ignore "already exists" errors
        if (
          error.message.includes('already exists') ||
          error.code === 'ER_TABLE_EXISTS_ERROR' ||
          error.code === 'ER_EVENT_ALREADY_EXISTS'
        ) {
          console.log('     ⚠️  Already exists, skipping\n');
          skipCount++;
        } else {
          console.error('     ❌ Error:', error.message);
          console.error('     SQL:', firstLine);

          // Continue with other statements
          if (!error.message.includes('Duplicate')) {
            throw error;
          }
        }
      }
    }

    console.log('='.repeat(70));
    console.log(`Migration Summary:`);
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ⚠️  Skipped: ${skipCount}`);
    console.log('='.repeat(70));

    // Now enable event scheduler
    console.log('\n🔧 Enabling Event Scheduler...');
    try {
      await db.query('SET GLOBAL event_scheduler = ON');
      console.log('✅ Event scheduler enabled\n');
    } catch (error) {
      console.error('❌ Failed to enable event scheduler:', error.message);
      console.log('Note: You may need SUPER privilege. Check manual steps below.\n');
    }

    // Verify setup
    console.log('🔍 Verifying setup...\n');

    const [tables] = await db.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME IN ('notification_queue', 'mysql_event_execution_log')
    `);

    console.log(`Tables created: ${tables.length}/2`);
    tables.forEach((t) => console.log(`  ✅ ${t.TABLE_NAME}`));

    const [events] = await db.query(`
      SELECT EVENT_NAME, STATUS
      FROM INFORMATION_SCHEMA.EVENTS
      WHERE EVENT_SCHEMA = DATABASE()
        AND EVENT_NAME IN ('process_scheduled_notifications', 'cleanup_event_logs')
    `);

    console.log(`\nEvents created: ${events.length}/2`);
    events.forEach((e) => console.log(`  ✅ ${e.EVENT_NAME} (${e.STATUS})`));

    const [scheduler] = await db.query(`SHOW VARIABLES LIKE 'event_scheduler'`);
    console.log(`\nEvent Scheduler: ${scheduler[0]?.Value || 'UNKNOWN'}`);

    if (scheduler[0]?.Value.toUpperCase() !== 'ON') {
      console.log('\n⚠️  WARNING: Event scheduler is still OFF');
      console.log('To enable manually, run:');
      console.log('  SET GLOBAL event_scheduler = ON;');
    }

    console.log('\n✅ Migration completed!');
    console.log('\nNext steps:');
    console.log('  1. Run: node test-mysql-events-setup.js');
    console.log('  2. Deploy optimized cron service');
    console.log('  3. Restart backend server\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();
