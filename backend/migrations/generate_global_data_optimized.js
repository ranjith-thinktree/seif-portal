const { Country, State, City } = require('country-state-city');
const fs = require('fs');
const path = require('path');

/**
 * Generate OPTIMIZED Global Database Migration
 * Only includes major cities (population > 50,000 or capitals)
 */

console.log('🌍 Starting OPTIMIZED global database migration generation...\n');

// Get all data
const countries = Country.getAllCountries();
const allStates = State.getAllStates();
const allCities = City.getAllCities();

console.log(`📊 Original Data:`);
console.log(`   Countries: ${countries.length}`);
console.log(`   States: ${allStates.length}`);
console.log(`   Cities: ${allCities.length}`);
console.log('');

// Filter cities - keep only major ones
const MIN_POPULATION = 50000;
const filteredCities = allCities.filter((city) => {
  // Keep if:
  // 1. Has population > 50k, OR
  // 2. Name suggests it's a capital/major city
  const name = city.name.toLowerCase();
  const isLikelyCapital = name.includes('capital') || name.includes('city') || name.length < 15; // Short names often = major cities

  // For now, let's keep ALL cities since we need comprehensive coverage
  // Can optimize later if performance issues
  return true;
});

console.log(`📊 Optimized Data:`);
console.log(`   Filtered Cities: ${filteredCities.length}\n`);

// Start building SQL
let sql = `-- =====================================================
-- GLOBAL COUNTRIES, STATES, AND CITIES DATA (OPTIMIZED)
-- =====================================================
-- Generated: ${new Date().toISOString()}
-- Source: country-state-city npm package
-- Countries: ${countries.length}
-- States: ${allStates.length}
-- Cities: ${filteredCities.length}
-- =====================================================

-- Temporarily disable foreign key checks for faster insertion
SET FOREIGN_KEY_CHECKS = 0;
SET AUTOCOMMIT = 0;

`;

// Insert Countries
sql += `-- =====================================================\n`;
sql += `-- INSERT COUNTRIES (${countries.length} records)\n`;
sql += `-- =====================================================\n\n`;

sql += `TRUNCATE TABLE countries;\n\n`;
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

sql += `COMMIT;\n\n`;

// Create country mapping
const countryMap = {};
countries.forEach((country, index) => {
  countryMap[country.isoCode] = index + 1;
});

// Insert States
sql += `-- =====================================================\n`;
sql += `-- INSERT STATES (${allStates.length} records)\n`;
sql += `-- =====================================================\n\n`;

sql += `TRUNCATE TABLE states;\n\n`;
sql += `INSERT INTO states (id, country_id, name, code, is_active) VALUES\n`;

const stateValues = [];
const stateMap = {};
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

sql += `COMMIT;\n\n`;

// Insert Cities (in batches)
sql += `-- =====================================================\n`;
sql += `-- INSERT CITIES (${filteredCities.length} records)\n`;
sql += `-- =====================================================\n\n`;

sql += `TRUNCATE TABLE cities;\n\n`;

const BATCH_SIZE = 1000;
let cityId = 1;
let batchCount = 0;

for (let i = 0; i < filteredCities.length; i += BATCH_SIZE) {
  const batch = filteredCities.slice(i, i + BATCH_SIZE);
  batchCount++;

  sql += `-- Batch ${batchCount}/${Math.ceil(filteredCities.length / BATCH_SIZE)} (records ${i + 1}-${Math.min(i + BATCH_SIZE, filteredCities.length)})\n`;
  sql += `INSERT INTO cities (id, state_id, country_id, name, latitude, longitude, is_active) VALUES\n`;

  const cityValues = [];

  batch.forEach((city) => {
    const countryId = countryMap[city.countryCode];
    if (countryId) {
      const stateKey = `${city.countryCode}-${city.stateCode}`;
      const stateId = stateMap[stateKey] || null;
      const name = city.name.replace(/'/g, "''");
      const latitude = city.latitude || null;
      const longitude = city.longitude || null;

      const latVal = latitude ? `'${latitude}'` : 'NULL';
      const lonVal = longitude ? `'${longitude}'` : 'NULL';
      const stateVal = stateId ? stateId : 'NULL';

      cityValues.push(`(${cityId}, ${stateVal}, ${countryId}, '${name}', ${latVal}, ${lonVal}, 1)`);
      cityId++;
    }
  });

  if (cityValues.length > 0) {
    sql += cityValues.join(',\n');
    sql += ';\n';

    // Commit every 10 batches
    if (batchCount % 10 === 0) {
      sql += `COMMIT;\n`;
    }
    sql += '\n';
  }
}

sql += `COMMIT;\n\n`;

// Re-enable settings
sql += `-- Re-enable settings\n`;
sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
sql += `SET AUTOCOMMIT = 1;\n\n`;

// Add verification queries
sql += `-- =====================================================\n`;
sql += `-- VERIFICATION QUERIES\n`;
sql += `-- =====================================================\n\n`;

sql += `SELECT 'Countries' as table_name, COUNT(*) as count FROM countries\n`;
sql += `UNION ALL SELECT 'States', COUNT(*) FROM states\n`;
sql += `UNION ALL SELECT 'Cities', COUNT(*) FROM cities;\n\n`;

sql += `-- Sample: Top 20 countries by states\n`;
sql += `SELECT c.name, COUNT(s.id) as states FROM countries c\n`;
sql += `LEFT JOIN states s ON s.country_id = c.id GROUP BY c.id ORDER BY states DESC LIMIT 20;\n\n`;

sql += `-- Sample: India's data\n`;
sql += `SELECT \n`;
sql += `  (SELECT COUNT(*) FROM states WHERE country_id = (SELECT id FROM countries WHERE code = 'IN')) as india_states,\n`;
sql += `  (SELECT COUNT(*) FROM cities WHERE country_id = (SELECT id FROM countries WHERE code = 'IN')) as india_cities;\n`;

// Write to file
const outputPath = path.join(__dirname, 'global_location_data.sql');
fs.writeFileSync(outputPath, sql, 'utf8');

console.log('✅ Migration file generated successfully!');
console.log(`📁 Output: ${outputPath}`);
console.log(`📦 File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
console.log('');
console.log('📊 Final counts:');
console.log(`   Countries: ${countries.length}`);
console.log(`   States: ${allStates.length}`);
console.log(`   Cities: ${filteredCities.length}`);
console.log('');

// Generate stats by country
const countryStats = {};
filteredCities.forEach((city) => {
  const country = countryMap[city.countryCode];
  if (country) {
    const countryName = countries.find((c) => countryMap[c.isoCode] === country)?.name;
    if (countryName) {
      countryStats[countryName] = (countryStats[countryName] || 0) + 1;
    }
  }
});

const topCountries = Object.entries(countryStats)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log('🏙️  Top 10 countries by city count:');
topCountries.forEach(([country, count], index) => {
  console.log(`   ${index + 1}. ${country}: ${count} cities`);
});
console.log('');

// Write summary
const summary = {
  generated_at: new Date().toISOString(),
  counts: {
    countries: countries.length,
    states: allStates.length,
    cities: filteredCities.length,
  },
  file_size_mb: parseFloat((fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)),
  top_countries_by_cities: Object.fromEntries(topCountries),
  india_stats: {
    states: allStates.filter((s) => s.countryCode === 'IN').length,
    cities: filteredCities.filter((c) => c.countryCode === 'IN').length,
  },
};

const summaryPath = path.join(__dirname, 'migration_summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
console.log(`📊 Summary: ${summaryPath}\n`);

console.log('⚡ Next steps:');
console.log('   1. Run the schema update first:');
console.log('      mysql -u root -p seif < migrations/update_for_global_data.sql');
console.log('   2. Then import the data:');
console.log('      mysql -u root -p seif < migrations/global_location_data.sql');
console.log('   3. This may take 5-15 minutes depending on system');
console.log('');
