const pool = require('../../../database/connection');

/**
 * Reset all data except users, courses, and partners
 * DANGER: This will delete all operational data
 */
const resetDatabase = async () => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Disable foreign key checks temporarily
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Tables to truncate in order (respecting dependencies)
    const tablesToTruncate = [
      // Upload related tables
      'data_edit_logs',
      'uploaded_students',
      'uploaded_batches',
      'uploaded_centers',
      'data_uploads',

      // Production data tables
      'students',
      'batches',
      'center_courses',
      'centers',

      // Notification tables
      'notifications',

      // Request related tables
      'request_comments',
      'request_attachments',
      'scheduled_requests',
      'requests',

      // Refurbishment tables
      'refurbishment_request_course_attachments',
      'refurbishment_request_course_packages',
      'refurbishment_admin_selected_packages',
      'refurbishment_upgradation_photos',
      'refurbishment_upgradation_rooms',
      'refurbishment_request_packages',
      'refurbishment_requests',

      // Other tables
      'download_logs',
      'audit_logs',
      'password_resets',
      'password_reset_requests',
    ];

    const truncatedTables = [];
    const skippedTables = [];

    // Truncate each table
    for (const table of tablesToTruncate) {
      try {
        await connection.query(`TRUNCATE TABLE \`${table}\``);
        truncatedTables.push(table);
      } catch (error) {
        // Table might not exist, skip it
        console.log(`Skipped table ${table}: ${error.message}`);
        skippedTables.push(table);
      }
    }

    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    await connection.commit();

    return {
      success: true,
      truncatedTables,
      skippedTables,
      totalTruncated: truncatedTables.length,
      preserved: ['users', 'courses', 'partners', 'refurbishment_packages', 'course_packages'],
    };
  } catch (error) {
    await connection.rollback();
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Get database statistics
 */
const getDatabaseStats = async () => {
  try {
    const stats = {};

    const tables = [
      'users',
      'partners',
      'courses',
      'centers',
      'batches',
      'students',
      'data_uploads',
      'uploaded_centers',
      'uploaded_batches',
      'uploaded_students',
      'notifications',
      'requests',
    ];

    for (const table of tables) {
      try {
        const [result] = await pool.query(`SELECT COUNT(*) as count FROM \`${table}\``);
        stats[table] = result[0].count;
      } catch (error) {
        stats[table] = 'N/A';
      }
    }

    return stats;
  } catch (error) {
    throw new Error(`Failed to get database stats: ${error.message}`);
  }
};

module.exports = {
  resetDatabase,
  getDatabaseStats,
};
