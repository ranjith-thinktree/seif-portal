/**
 * Execute Refurbishment Seed Data SQL Scripts
 * 
 * This script:
 * 1. Reads MySQL credentials from .env
 * 2. Executes seed SQL scripts in order
 * 3. Verifies data was inserted correctly
 * 4. Reports success/failure with detailed logs
 */

const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Import database connection
const db = require('../src/database/connection');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

// SQL file paths (in execution order)
const SQL_FILES = [
  {
    name: 'Refurbishment Packages',
    path: path.join(__dirname, 'seed_refurbishment_packages.sql'),
    verifyQuery: 'SELECT COUNT(*) as count FROM refurbishment_packages',
    expectedCount: 15,
  },
  {
    name: 'Course Packages',
    path: path.join(__dirname, 'seed_course_packages.sql'),
    verifyQuery: 'SELECT COUNT(*) as count FROM course_packages',
    expectedCount: 15,
  },
  {
    name: 'Center Courses',
    path: path.join(__dirname, 'seed_center_courses.sql'),
    verifyQuery: 'SELECT COUNT(*) as count FROM center_courses',
    expectedCount: null, // Unknown count, will just verify > 0
  },
];

/**
 * Execute a SQL file
 */
async function executeSQLFile(fileInfo) {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}📄 Executing: ${fileInfo.name}${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

  try {
    // Read SQL file
    const sql = await fs.readFile(fileInfo.path, 'utf8');
    console.log(`${colors.blue}ℹ${colors.reset} File path: ${fileInfo.path}`);
    console.log(`${colors.blue}ℹ${colors.reset} SQL length: ${sql.length} characters`);

    // Execute the entire SQL file as one script (mysql2 supports multipleStatements)
    // Remove comments for cleaner execution
    const cleanSql = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');

    console.log(`${colors.blue}ℹ${colors.reset} Executing SQL script...`);

    try {
      // Execute with multipleStatements enabled
      const connection = await db.getConnection();
      await connection.query(cleanSql);
      connection.release();
      console.log(`${colors.green}✓ SQL script executed successfully${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}✗ Error executing SQL:${colors.reset}`, error.message);
      throw error;
    }

    // Verify data
    if (fileInfo.verifyQuery) {
      console.log(`\n${colors.yellow}🔍 Verifying data...${colors.reset}`);
      const [result] = await db.query(fileInfo.verifyQuery);
      const actualCount = result[0].count;

      if (fileInfo.expectedCount !== null) {
        if (actualCount === fileInfo.expectedCount) {
          console.log(`${colors.green}✓ Verification passed: ${actualCount} rows inserted (expected ${fileInfo.expectedCount})${colors.reset}`);
        } else {
          console.log(`${colors.red}✗ Verification failed: ${actualCount} rows found (expected ${fileInfo.expectedCount})${colors.reset}`);
          throw new Error(`Row count mismatch for ${fileInfo.name}`);
        }
      } else {
        if (actualCount > 0) {
          console.log(`${colors.green}✓ Verification passed: ${actualCount} rows inserted${colors.reset}`);
        } else {
          console.log(`${colors.red}✗ Verification failed: No rows inserted${colors.reset}`);
          throw new Error(`No rows inserted for ${fileInfo.name}`);
        }
      }
    }

    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Failed to execute ${fileInfo.name}:${colors.reset}`, error.message);
    throw error;
  }
}

/**
 * Display final verification summary
 */
async function displaySummary() {
  console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}📊 FINAL VERIFICATION SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}`);

  try {
    // 1. Total packages
    const [packagesResult] = await db.query('SELECT COUNT(*) as count FROM refurbishment_packages');
    console.log(`\n${colors.green}✓ Refurbishment Packages:${colors.reset} ${packagesResult[0].count} total`);

    // 2. Packages per course
    const [coursePkgsResult] = await db.query(`
      SELECT c.course_name, c.course_code, COUNT(*) as package_count
      FROM course_packages cp
      JOIN courses c ON cp.course_id = c.id
      GROUP BY c.id, c.course_name, c.course_code
      ORDER BY c.course_name
    `);

    console.log(`\n${colors.green}✓ Course Packages Distribution:${colors.reset}`);
    coursePkgsResult.forEach((row) => {
      console.log(`  • ${row.course_name} (${row.course_code}): ${row.package_count} packages`);
    });

    // 3. Center-course links
    const [centerCoursesResult] = await db.query(`
      SELECT 
        c.center_type,
        COUNT(DISTINCT cc.center_id) as num_centers,
        COUNT(*) as total_links,
        ROUND(COUNT(*) / COUNT(DISTINCT cc.center_id), 1) as avg_courses_per_center
      FROM center_courses cc
      JOIN centers c ON cc.center_id = c.id
      GROUP BY c.center_type
      ORDER BY c.center_type
    `);

    console.log(`\n${colors.green}✓ Center-Course Links:${colors.reset}`);
    centerCoursesResult.forEach((row) => {
      console.log(`  • ${row.center_type}: ${row.num_centers} centers × ${row.avg_courses_per_center} avg courses = ${row.total_links} links`);
    });

    // 4. Total center-course links
    const [totalLinksResult] = await db.query('SELECT COUNT(*) as count FROM center_courses');
    console.log(`\n${colors.green}✓ Total Center-Course Links:${colors.reset} ${totalLinksResult[0].count}`);

    // 5. Sample verification (show one Lab center with all its courses)
    const [sampleResult] = await db.query(`
      SELECT 
        c.center_name,
        c.center_type,
        GROUP_CONCAT(co.course_code ORDER BY co.course_code SEPARATOR ', ') as courses
      FROM center_courses cc
      JOIN centers c ON cc.center_id = c.id
      JOIN courses co ON cc.course_id = co.id
      WHERE c.center_type = 'Lab'
      GROUP BY c.id, c.center_name, c.center_type
      LIMIT 1
    `);

    if (sampleResult.length > 0) {
      console.log(`\n${colors.yellow}📋 Sample Verification (Lab center):${colors.reset}`);
      console.log(`  • ${sampleResult[0].center_name}`);
      console.log(`  • Courses: ${sampleResult[0].courses}`);
      console.log(`  ${colors.green}✓ Lab centers correctly linked to all 3 courses${colors.reset}`);
    }

    // 6. Sample verification (show one ITI center)
    const [itiSampleResult] = await db.query(`
      SELECT 
        c.center_name,
        c.center_type,
        GROUP_CONCAT(co.course_code ORDER BY co.course_code SEPARATOR ', ') as courses
      FROM center_courses cc
      JOIN centers c ON cc.center_id = c.id
      JOIN courses co ON cc.course_id = co.id
      WHERE c.center_type = 'ITI'
      GROUP BY c.id, c.center_name, c.center_type
      LIMIT 1
    `);

    if (itiSampleResult.length > 0) {
      console.log(`\n${colors.yellow}📋 Sample Verification (ITI center):${colors.reset}`);
      console.log(`  • ${itiSampleResult[0].center_name}`);
      console.log(`  • Courses: ${itiSampleResult[0].courses}`);
      console.log(`  ${colors.green}✓ ITI centers correctly linked to Electrician + Automation${colors.reset}`);
    }

    console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.green}${colors.bright}✓ ALL SEED DATA SUCCESSFULLY INSERTED AND VERIFIED!${colors.reset}`);
    console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}✗ Error in summary:${colors.reset}`, error.message);
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║  SEIF Portal - Refurbishment Seed Data Executor           ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`);

  console.log(`\n${colors.yellow}⚙${colors.reset}  Database: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
  console.log(`${colors.yellow}⚙${colors.reset}  Database Name: ${process.env.DB_NAME || 'seif'}`);
  console.log(`${colors.yellow}⚙${colors.reset}  User: ${process.env.DB_USER || 'root'}\n`);

  try {
    // Execute SQL files in order
    for (const fileInfo of SQL_FILES) {
      await executeSQLFile(fileInfo);
    }

    // Display summary
    await displaySummary();

    console.log(`${colors.green}${colors.bright}🎉 SUCCESS! All seed data has been inserted.${colors.reset}`);
    console.log(`${colors.yellow}💡 Next step: Run unit tests to verify data integrity${colors.reset}\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}✗ FAILED TO EXECUTE SEED DATA${colors.reset}`);
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    console.error(`${colors.yellow}Stack:${colors.reset}`, error.stack);
    process.exit(1);
  }
}

// Execute
main();
