/**
 * Simple Query - Just check executions
 */

const db = require('./src/database/connection');

async function simpleCheck() {
  try {
    // First get column names
    console.log('\n📋 Table Structure:');
    const [cols] = await db.query(`SHOW COLUMNS FROM scheduled_notification_executions`);
    console.log('Columns:', cols.map((c) => c.Field).join(', '));

    // Get all executions
    console.log('\n📋 All Executions:');
    const [execs] = await db.query(`SELECT * FROM scheduled_notification_executions LIMIT 20`);
    console.log('Found:', execs.length, 'execution(s)');
    if (execs.length > 0) {
      console.table(execs);
    }

    // Get completed scheduled notifications
    console.log('\n📋 Completed Scheduled Notifications:');
    const [completed] = await db.query(`
      SELECT id, status, send_count, last_sent_at, created_at 
      FROM scheduled_refurbishment_notifications 
      WHERE send_count > 0
    `);
    console.log('Found:', completed.length);
    if (completed.length > 0) {
      console.table(completed);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

simpleCheck();
