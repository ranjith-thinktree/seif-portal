/**
 * Clear and Reload Refurbishment Seed Data
 * 
 * Purpose: Clear existing seed data and reload fresh data
 * Run: node backend/scripts/clear-and-reload-seed.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../src/database/connection');

async function clearAndReload() {
  let connection;
  
  try {
    console.log('🧹 Clearing existing refurbishment data...\n');
    
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    // Clear existing data (in correct order due to foreign keys)
    await connection.query('DELETE FROM course_packages');
    console.log('  ✅ Cleared course_packages');
    
    await connection.query('DELETE FROM refurbishment_packages');
    console.log('  ✅ Cleared refurbishment_packages\n');
    
    console.log('📦 Inserting 25 refurbishment packages...\n');
    
    // Insert ELECTRICAL packages
    const electricalPackages = [
      { id: 'pkg-elec-001', name: 'Electrical Lab Equipment Set', desc: 'Complete set of 20 digital multimeters, 10 oscilloscopes, 10 function generators, and 10 breadboard kits. Suitable for 40 students.', category: 'electrical', order: 1 },
      { id: 'pkg-elec-002', name: 'Electrical Safety Equipment', desc: 'Safety gear including 50 insulated gloves, 50 safety goggles, 10 voltage testers, 10 fire extinguishers, first aid kits, and warning signage.', category: 'electrical', order: 2 },
      { id: 'pkg-elec-003', name: 'Electrical Wiring & Tools Kit', desc: '30 sets of screwdrivers, wire strippers, crimping tools, soldering irons, pliers, and testing equipment for practical wiring exercises.', category: 'electrical', order: 3 },
      { id: 'pkg-elec-004', name: 'Electrical Control Panels Training Kit', desc: '5 complete control panel assemblies with MCBs, contactors, relays, timers, and PLCs for hands-on learning.', category: 'electrical', order: 4 },
      { id: 'pkg-elec-005', name: 'Motor Control & Testing Station', desc: '10 motor control stations with 3-phase motors, DOL/Star-Delta starters, VFDs, and motor testing equipment.', category: 'electrical', order: 5 }
    ];
    
    // Insert SOLAR packages
    const solarPackages = [
      { id: 'pkg-solr-001', name: 'Solar Panel Installation Kit', desc: '20 solar panels (250W each), mounting structures, cables, MC4 connectors, junction boxes, and installation tools.', category: 'equipment', order: 6 },
      { id: 'pkg-solr-002', name: 'Solar Inverter & Battery System', desc: '5 complete off-grid systems with 5KW inverters, 200Ah batteries, charge controllers, and monitoring systems.', category: 'equipment', order: 7 },
      { id: 'pkg-solr-003', name: 'Solar System Testing Equipment', desc: 'Solar irradiance meters, panel testers, multimeters, infrared cameras, and diagnostic tools for system maintenance.', category: 'equipment', order: 8 },
      { id: 'pkg-solr-004', name: 'Solar Training Demonstration Kit', desc: '3 complete demonstration setups showing grid-tied, off-grid, and hybrid solar systems with real-time monitoring displays.', category: 'equipment', order: 9 },
      { id: 'pkg-solr-005', name: 'Solar Safety & Installation Tools', desc: 'Safety harnesses, ladders, roof anchors, power tools, cable management systems, and personal protective equipment.', category: 'equipment', order: 10 }
    ];
    
    // Insert INDUSTRIAL AUTOMATION packages
    const automationPackages = [
      { id: 'pkg-iaut-001', name: 'PLC Training Kits', desc: '10 complete PLC training systems with Siemens/Allen-Bradley PLCs, HMI panels, input/output modules, and programming software licenses.', category: 'equipment', order: 11 },
      { id: 'pkg-iaut-002', name: 'Robotics & Automation Lab Equipment', desc: '3 industrial robot arms, pneumatic systems, conveyor systems, sensors, and safety interlocks for automated manufacturing training.', category: 'equipment', order: 12 },
      { id: 'pkg-iaut-003', name: 'SCADA System Training Setup', desc: '5 SCADA workstations with licensed software, communication modules, simulation software, and industrial networking equipment.', category: 'equipment', order: 13 },
      { id: 'pkg-iaut-004', name: 'Sensor & Actuator Training Kit', desc: '50 proximity sensors, photoelectric sensors, pressure transducers, temperature sensors, pneumatic cylinders, and solenoid valves.', category: 'equipment', order: 14 },
      { id: 'pkg-iaut-005', name: 'Industrial Communication Systems', desc: 'Ethernet switches, profibus/profinet cables, modbus devices, wireless communication modules, and protocol analyzers.', category: 'equipment', order: 15 }
    ];
    
    // Insert FURNITURE packages (common)
    const furniturePackages = [
      { id: 'pkg-furn-001', name: 'Student Lab Benches (20 units)', desc: 'Heavy-duty workbenches with power outlets, storage drawers, anti-static surfaces, and ergonomic design for 40 students.', category: 'furniture', order: 16 },
      { id: 'pkg-furn-002', name: 'Instructor Desk & Demonstration Table', desc: 'Large demonstration table with built-in power distribution, AV equipment mounts, and instructor workstation with computer.', category: 'furniture', order: 17 },
      { id: 'pkg-furn-003', name: 'Tool & Equipment Storage Cabinets', desc: '10 lockable steel cabinets with organized compartments for tools, equipment, and safety gear storage.', category: 'furniture', order: 18 },
      { id: 'pkg-furn-004', name: 'Student Chairs & Stools', desc: '50 ergonomic lab stools with adjustable height, back support, and anti-slip feet suitable for long practical sessions.', category: 'furniture', order: 19 },
      { id: 'pkg-furn-005', name: 'Whiteboard & Display Systems', desc: '3 large whiteboards, 1 interactive smart board, 2 projection screens, and 1 high-lumen projector for classroom instruction.', category: 'furniture', order: 20 }
    ];
    
    // Insert INFRASTRUCTURE packages (common)
    const infraPackages = [
      { id: 'pkg-infra-001', name: 'Electrical Upgrades (Wiring & Distribution)', desc: 'Complete rewiring, circuit breakers, earthing system, surge protectors, and dedicated circuits for heavy equipment.', category: 'infrastructure', order: 21 },
      { id: 'pkg-infra-002', name: 'Lighting System Upgrade', desc: '40 LED tube lights, 10 focused task lights, emergency lighting, and motion sensors for energy-efficient illumination.', category: 'infrastructure', order: 22 },
      { id: 'pkg-infra-003', name: 'Ventilation & Climate Control', desc: '4 industrial exhaust fans, 2 air conditioning units (2-ton), air circulation fans, and air quality monitoring system.', category: 'infrastructure', order: 23 },
      { id: 'pkg-infra-004', name: 'Fire Safety & Emergency Systems', desc: 'Fire alarm system, smoke detectors, fire extinguishers (ABC type), emergency exit lighting, and fire evacuation signage.', category: 'infrastructure', order: 24 },
      { id: 'pkg-infra-005', name: 'Computer & IT Infrastructure', desc: '20 desktop computers, networking equipment, LAN cabling, internet router, uninterruptible power supplies (UPS), and IT furniture.', category: 'infrastructure', order: 25 }
    ];
    
    // Combine all packages
    const allPackages = [
      ...electricalPackages,
      ...solarPackages,
      ...automationPackages,
      ...furniturePackages,
      ...infraPackages
    ];
    
    // Insert packages
    for (const pkg of allPackages) {
      await connection.query(
        'INSERT INTO refurbishment_packages (id, package_name, description, category, is_active, display_order) VALUES (?, ?, ?, ?, 1, ?)',
        [pkg.id, pkg.name, pkg.desc, pkg.category, pkg.order]
      );
      console.log(`  ✅ ${pkg.name}`);
    }
    
    console.log(`\n🔗 Creating 45 course-package links...\n`);
    
    // Course IDs
    const courseIds = {
      electrical: '6275ba97-c89b-11f0-94bf-00410e2b5e6e',
      solar: '6276774f-c89b-11f0-94bf-00410e2b5e6e',
      automation: '6276796c-c89b-11f0-94bf-00410e2b5e6e'
    };
    
    // Link Electrical course packages
    const electricalLinks = [
      'pkg-elec-001', 'pkg-elec-002', 'pkg-elec-003', 'pkg-elec-004', 'pkg-elec-005',
      'pkg-furn-001', 'pkg-furn-002', 'pkg-furn-003', 'pkg-furn-004', 'pkg-furn-005',
      'pkg-infra-001', 'pkg-infra-002', 'pkg-infra-003', 'pkg-infra-004', 'pkg-infra-005'
    ];
    
    for (let i = 0; i < electricalLinks.length; i++) {
      await connection.query(
        'INSERT INTO course_packages (id, course_id, package_id) VALUES (?, ?, ?)',
        [`cp-elec-${String(i + 1).padStart(3, '0')}`, courseIds.electrical, electricalLinks[i]]
      );
    }
    console.log('  ✅ Linked 15 packages to Basic Electrican course');
    
    // Link Solar course packages
    const solarLinks = [
      'pkg-solr-001', 'pkg-solr-002', 'pkg-solr-003', 'pkg-solr-004', 'pkg-solr-005',
      'pkg-furn-001', 'pkg-furn-002', 'pkg-furn-003', 'pkg-furn-004', 'pkg-furn-005',
      'pkg-infra-001', 'pkg-infra-002', 'pkg-infra-003', 'pkg-infra-004', 'pkg-infra-005'
    ];
    
    for (let i = 0; i < solarLinks.length; i++) {
      await connection.query(
        'INSERT INTO course_packages (id, course_id, package_id) VALUES (?, ?, ?)',
        [`cp-solr-${String(i + 1).padStart(3, '0')}`, courseIds.solar, solarLinks[i]]
      );
    }
    console.log('  ✅ Linked 15 packages to Solar Solution course');
    
    // Link Automation course packages
    const automationLinks = [
      'pkg-iaut-001', 'pkg-iaut-002', 'pkg-iaut-003', 'pkg-iaut-004', 'pkg-iaut-005',
      'pkg-furn-001', 'pkg-furn-002', 'pkg-furn-003', 'pkg-furn-004', 'pkg-furn-005',
      'pkg-infra-001', 'pkg-infra-002', 'pkg-infra-003', 'pkg-infra-004', 'pkg-infra-005'
    ];
    
    for (let i = 0; i < automationLinks.length; i++) {
      await connection.query(
        'INSERT INTO course_packages (id, course_id, package_id) VALUES (?, ?, ?)',
        [`cp-iaut-${String(i + 1).padStart(3, '0')}`, courseIds.automation, automationLinks[i]]
      );
    }
    console.log('  ✅ Linked 15 packages to Industrial Automation course');
    
    await connection.commit();
    console.log('\n✅ Transaction committed\n');
    
    // Verify
    console.log('🔍 Verifying seed data...\n');
    
    const [packages] = await connection.query('SELECT COUNT(*) as count FROM refurbishment_packages');
    console.log(`   📦 Total packages: ${packages[0].count}`);
    
    const [links] = await connection.query('SELECT COUNT(*) as count FROM course_packages');
    console.log(`   🔗 Total course links: ${links[0].count}`);
    
    const [breakdown] = await connection.query(`
      SELECT 
        c.course_name,
        COUNT(cp.id) as package_count
      FROM courses c
      LEFT JOIN course_packages cp ON c.id = cp.course_id
      GROUP BY c.id, c.course_name
      ORDER BY c.course_code
    `);
    
    console.log('\n📊 Package breakdown:');
    breakdown.forEach(row => {
      console.log(`   ${row.course_name}: ${row.package_count} packages`);
    });
    
    console.log('\n🎉 Seed data loaded successfully!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (connection) {
      await connection.rollback();
      console.log('🔄 Transaction rolled back');
    }
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await db.pool.end();
    console.log('\n👋 Database connection closed');
  }
}

clearAndReload();
