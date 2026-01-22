/**
 * Load Seed Data for Refurbishment Packages
 * 
 * Purpose: Execute seed SQL file to populate refurbishment_packages and course_packages tables
 * Run: node backend/scripts/load-seed-data.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../src/database/connection');

const seedFilePath = path.join(__dirname, '..', 'sql', 'seed_refurbishment_packages.sql');

async function loadSeedData() {
  let connection;
  
  try {
    console.log('🌱 Starting seed data loading...');
    console.log('📄 Reading seed file:', seedFilePath);
    
    // Read the SQL file
    const sqlContent = fs.readFileSync(seedFilePath, 'utf-8');
    
    // Remove comments and split by semicolons
    const cleanedSQL = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');
    
    // Split by semicolons
    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements\n`);
    
    // Get a connection from the pool
    connection = await db.getConnection();
    
    // Begin transaction
    await connection.beginTransaction();
    console.log('🔒 Transaction started\n');
    
    let packageCount = 0;
    let courseLinkCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        // Skip comments and empty lines
        if (statement.startsWith('--') || statement.trim().length === 0) {
          continue;
        }
        
        await connection.query(statement);
        
        // Track what was inserted
        if (statement.includes('refurbishment_packages')) {
          packageCount++;
          if (packageCount <= 5) console.log(`  ✅ Inserted electrical package ${packageCount}`);
          else if (packageCount <= 10) console.log(`  ✅ Inserted solar package ${packageCount - 5}`);
          else if (packageCount <= 15) console.log(`  ✅ Inserted automation package ${packageCount - 10}`);
          else if (packageCount <= 20) console.log(`  ✅ Inserted furniture package ${packageCount - 15}`);
          else console.log(`  ✅ Inserted infrastructure package ${packageCount - 20}`);
        } else if (statement.includes('course_packages')) {
          courseLinkCount++;
          if (courseLinkCount % 15 === 0) {
            const course = courseLinkCount === 15 ? 'Electrical' : courseLinkCount === 30 ? 'Solar' : 'Automation';
            console.log(`  ✅ Linked all 15 packages to ${course} course`);
          }
        }
      } catch (error) {
        // Check if it's a duplicate key error (which is OK for re-runs)
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`  ⚠️  Skipped duplicate entry (already exists)`);
        } else {
          throw error;
        }
      }
    }
    
    // Commit transaction
    await connection.commit();
    console.log('\n✅ Transaction committed successfully\n');
    
    // Verify the data
    console.log('🔍 Verifying seed data...\n');
    
    const [packages] = await connection.query('SELECT COUNT(*) as count FROM refurbishment_packages');
    console.log(`   📦 Total packages: ${packages[0].count}`);
    
    const [links] = await connection.query('SELECT COUNT(*) as count FROM course_packages');
    console.log(`   🔗 Total course links: ${links[0].count}`);
    
    // Get package breakdown by course
    const [courseBreakdown] = await connection.query(`
      SELECT 
        c.course_name,
        COUNT(cp.id) as package_count
      FROM courses c
      LEFT JOIN course_packages cp ON c.id = cp.course_id
      GROUP BY c.id, c.course_name
      ORDER BY c.course_code
    `);
    
    console.log('\n📊 Package breakdown by course:');
    courseBreakdown.forEach(row => {
      console.log(`   ${row.course_name}: ${row.package_count} packages`);
    });
    
    console.log('\n🎉 Seed data loaded successfully!');
    
  } catch (error) {
    console.error('\n❌ Error loading seed data:', error.message);
    
    // Rollback on error
    if (connection) {
      await connection.rollback();
      console.log('🔄 Transaction rolled back');
    }
    
    process.exit(1);
  } finally {
    // Release connection back to pool
    if (connection) {
      connection.release();
    }
    
    // Close the pool
    await db.pool.end();
    console.log('\n👋 Database connection closed');
  }
}

// Run the script
loadSeedData();
