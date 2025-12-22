const { Country, State, City } = require('country-state-city');
const fs = require('fs');
const path = require('path');

/**
 * Generate Global Database Migration for Countries, States, and Cities
 * Uses country-state-city npm package
 */

console.log('🌍 Starting global database migration generation...\n');

// Get all data
const countries = Country.getAllCountries();
const allStates = State.getAllStates();
const allCities = City.getAllCities();

console.log(`📊 Data Summary:`);
console.log(`   Countries: ${countries.length}`);
console.log(`   States: ${allStates.length}`);
console.log(`   Cities: ${allCities.length}`);
console.log('');

// Filter cities by population (optional - to reduce size)
const MIN_POPULATION = 50000; // Only cities with 50k+ population
const filteredCities = allCities.filter((city) => {
  // Keep all cities for now, can filter later if needed
  return true; // Change to: city.population && parseInt(city.population) > MIN_POPULATION
});

console.log(`   Filtered Cities: ${filteredCities.length}\n`);

// Start building SQL
let sql = `-- =====================================================
-- GLOBAL COUNTRIES, STATES, AND CITIES DATA
-- =====================================================
-- Generated: ${new Date().toISOString()}
-- Source: country-state-city npm package
-- Countries: ${countries.length}
-- States: ${allStates.length}
-- Cities: ${filteredCities.length}
-- =====================================================

-- Temporarily disable foreign key checks for faster insertion
SET FOREIGN_KEY_CHECKS = 0;

`;

// Insert Countries
sql += `-- =====================================================\n`;
sql += `-- INSERT COUNTRIES (${countries.length} records)\n`;
sql += `-- =====================================================\n\n`;

sql += `INSERT INTO countries (id, name, code, iso3, phone_code, currency, is_active) VALUES\n`;

const countryValues = countries.map((country, index) => {
  const name = country.name.replace(/'/g, "''");
  const iso2 = country.isoCode || '';
  const iso3 = country.iso3 || '';
  const phoneCode = country.phonecode || '';
  const currency = country.currency || '';

  return `(${index + 1}, '${name}', '${iso2}', '${iso3}', '${phoneCode}', '${currency}', 1)`;
});

sql += countryValues.join(',\n');
sql += ';\n\n';

// Create country mapping (isoCode -> database ID)
const countryMap = {};
countries.forEach((country, index) => {
  countryMap[country.isoCode] = index + 1;
});

// Insert States
sql += `-- =====================================================\n`;
sql += `-- INSERT STATES (${allStates.length} records)\n`;
sql += `-- =====================================================\n\n`;

sql += `INSERT INTO states (id, country_id, name, code, is_active) VALUES\n`;

const stateValues = [];
const stateMap = {}; // Will store {countryCode-stateCode: dbId}
let stateId = 1;

allStates.forEach((state) => {
  const countryId = countryMap[state.countryCode];
  if (countryId) {
    const name = state.name.replace(/'/g, "''");
    const code = state.isoCode || '';

    stateValues.push(`(${stateId}, ${countryId}, '${name}', '${code}', 1)`);
    stateMap[`${state.countryCode}-${state.isoCode}`] = stateId;
    stateId++;
  }
});

sql += stateValues.join(',\n');
sql += ';\n\n';

// Insert Cities (in batches for performance)
sql += `-- =====================================================\n`;
sql += `-- INSERT CITIES (${filteredCities.length} records)\n`;
sql += `-- Note: Large dataset - may take 5-10 minutes to insert\n`;
sql += `-- =====================================================\n\n`;

const BATCH_SIZE = 1000;
let cityId = 1;
let batchCount = 0;

for (let i = 0; i < filteredCities.length; i += BATCH_SIZE) {
  const batch = filteredCities.slice(i, i + BATCH_SIZE);
  batchCount++;

  sql += `-- Batch ${batchCount} (${i + 1} to ${Math.min(i + BATCH_SIZE, filteredCities.length)})\n`;
  sql += `INSERT INTO cities (id, state_id, country_id, name, latitude, longitude, is_active) VALUES\n`;

  const cityValues = [];

  batch.forEach((city) => {
    const countryId = countryMap[city.countryCode];
    if (countryId) {
      const stateKey = `${city.countryCode}-${city.stateCode}`;
      const stateId = stateMap[stateKey] || null;
      const name = city.name.replace(/'/g, "''");
      const latitude = city.latitude || 'NULL';
      const longitude = city.longitude || 'NULL';

      const latVal = latitude === 'NULL' ? 'NULL' : `'${latitude}'`;
      const lonVal = longitude === 'NULL' ? 'NULL' : `'${longitude}'`;
      const stateVal = stateId ? stateId : 'NULL';

      cityValues.push(`(${cityId}, ${stateVal}, ${countryId}, '${name}', ${latVal}, ${lonVal}, 1)`);
      cityId++;
    }
  });

  sql += cityValues.join(',\n');
  sql += ';\n\n';
}

// Re-enable foreign key checks
sql += `-- Re-enable foreign key checks\n`;
sql += `SET FOREIGN_KEY_CHECKS = 1;\n\n`;

// Add verification queries
sql += `-- =====================================================\n`;
sql += `-- VERIFICATION QUERIES\n`;
sql += `-- =====================================================\n\n`;

sql += `-- Count records\n`;
sql += `SELECT 'Countries' as table_name, COUNT(*) as count FROM countries\n`;
sql += `UNION ALL\n`;
sql += `SELECT 'States', COUNT(*) FROM states\n`;
sql += `UNION ALL\n`;
sql += `SELECT 'Cities', COUNT(*) FROM cities;\n\n`;

sql += `-- Top 10 countries by number of states\n`;
sql += `SELECT c.name as country, COUNT(s.id) as state_count\n`;
sql += `FROM countries c\n`;
sql += `LEFT JOIN states s ON s.country_id = c.id\n`;
sql += `GROUP BY c.id, c.name\n`;
sql += `ORDER BY state_count DESC\n`;
sql += `LIMIT 10;\n\n`;

sql += `-- Top 10 countries by number of cities\n`;
sql += `SELECT c.name as country, COUNT(ct.id) as city_count\n`;
sql += `FROM countries c\n`;
sql += `LEFT JOIN cities ct ON ct.country_id = c.id\n`;
sql += `GROUP BY c.id, c.name\n`;
sql += `ORDER BY city_count DESC\n`;
sql += `LIMIT 10;\n\n`;

// Write to file
const outputPath = path.join(__dirname, 'global_location_data.sql');
fs.writeFileSync(outputPath, sql, 'utf8');

console.log('✅ Migration file generated successfully!');
console.log(`📁 Output: ${outputPath}`);
console.log(`📦 File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
console.log('');
console.log('⚡ Next steps:');
console.log('   1. Review the generated SQL file');
console.log('   2. Run: mysql -u root -p seif < migrations/global_location_data.sql');
console.log('   3. Wait 5-10 minutes for all inserts to complete');
console.log('');

// Generate summary JSON
const summary = {
  generated_at: new Date().toISOString(),
  counts: {
    countries: countries.length,
    states: allStates.length,
    cities: filteredCities.length,
  },
  sample_countries: countries.slice(0, 10).map((c) => c.name),
  file_size_mb: (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2),
};

const summaryPath = path.join(__dirname, 'global_location_data_summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

console.log(`📊 Summary saved: ${summaryPath}`);
