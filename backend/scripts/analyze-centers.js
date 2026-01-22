/**
 * Center Name Analysis Script
 * Compares CSV data with Database.sql to find matching/non-matching centers
 * Extracts city from Location column and generates comparison report
 */

const fs = require('fs');
const path = require('path');

// Read files
const csvPath = path.join(__dirname, '../../documents/Final Sheet 25-26 -last 3 years details .csv');
const dbPath = path.join(__dirname, '../../Database.sql');
const jsonPath = path.join(__dirname, '../../frontend/src/data/historicalCenterData.json');

console.log('📁 Reading files...\n');

const csvContent = fs.readFileSync(csvPath, 'utf8');
const dbContent = fs.readFileSync(dbPath, 'utf8');
const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Parse CSV (skip header)
const csvLines = csvContent.split('\n').slice(1).filter(line => line.trim());
const csvCenters = csvLines.map((line, index) => {
  const parts = line.split(',');
  if (parts.length < 3) return null;
  
  const centerName = parts[1]?.trim().replace(/^"|"$/g, '');
  const location = parts[2]?.trim().replace(/^"|"$/g, '');
  const state = parts[3]?.trim().replace(/^"|"$/g, '');
  
  // Extract city from location
  let city = location;
  if (location) {
    // Remove "DIKSHa-" prefix
    city = location.replace(/^DIKSHa-\s*/i, '');
    // Remove state name if present (e.g., "Jatni, Odisha" -> "Jatni")
    city = city.split(',')[0].trim();
    // Remove "-solar" suffix
    city = city.replace(/-solar$/i, '').trim();
  }
  
  return {
    csvIndex: index + 2, // +2 for 1-based and header row
    centerName,
    location,
    city,
    state
  };
}).filter(Boolean);

console.log(`✅ Parsed ${csvCenters.length} centers from CSV\n`);

// Extract database center names
const centerMatches = dbContent.match(/INSERT INTO `centers` VALUES[^;]+;/gs);
if (!centerMatches) {
  console.error('❌ Could not find center data in Database.sql');
  process.exit(1);
}

const dbCentersRaw = centerMatches[0];
const centerEntries = dbCentersRaw.split(/\),\(/g);

const dbCenters = centerEntries.map(entry => {
  const matches = entry.match(/'([^']+)'/g);
  if (!matches || matches.length < 11) return null;
  
  const centerName = matches[4]?.replace(/'/g, '');
  const city = matches[9]?.replace(/'/g, '');
  const state = matches[10]?.replace(/'/g, '');
  
  return { centerName, city, state };
}).filter(Boolean);

console.log(`✅ Extracted ${dbCenters.length} centers from Database.sql\n`);

// Create lookup maps
const dbCentersByName = new Map();
dbCenters.forEach(c => {
  const key = c.centerName.toLowerCase().trim();
  if (!dbCentersByName.has(key)) {
    dbCentersByName.set(key, []);
  }
  dbCentersByName.get(key).push(c);
});

const dbCentersByCity = new Map();
dbCenters.forEach(c => {
  const key = `${c.centerName.toLowerCase().trim()}|${c.city.toLowerCase().trim()}`;
  dbCentersByCity.set(key, c);
});

// Analyze matches
console.log('🔍 ANALYSIS REPORT\n');
console.log('='.repeat(100) + '\n');

const results = {
  exactMatches: [],
  partialMatches: [],
  noMatches: [],
  multipleMatches: []
};

csvCenters.forEach(csv => {
  const csvNameLower = csv.centerName.toLowerCase().trim();
  const csvCityLower = csv.city.toLowerCase().trim();
  const lookupKey = `${csvNameLower}|${csvCityLower}`;
  
  // Check exact match (name + city)
  if (dbCentersByCity.has(lookupKey)) {
    const db = dbCentersByCity.get(lookupKey);
    results.exactMatches.push({
      csv,
      db,
      matchType: 'EXACT'
    });
    return;
  }
  
  // Check partial match (name only)
  if (dbCentersByName.has(csvNameLower)) {
    const dbMatches = dbCentersByName.get(csvNameLower);
    
    if (dbMatches.length === 1) {
      // Only one center with this name - check if city is similar
      const db = dbMatches[0];
      const cityMatch = db.city.toLowerCase().includes(csvCityLower) || 
                       csvCityLower.includes(db.city.toLowerCase());
      
      results.partialMatches.push({
        csv,
        db,
        matchType: cityMatch ? 'CITY_SIMILAR' : 'NAME_ONLY',
        cityMatch
      });
    } else {
      // Multiple centers with same name
      const cityMatch = dbMatches.find(db => 
        db.city.toLowerCase() === csvCityLower ||
        db.city.toLowerCase().includes(csvCityLower) ||
        csvCityLower.includes(db.city.toLowerCase())
      );
      
      if (cityMatch) {
        results.partialMatches.push({
          csv,
          db: cityMatch,
          matchType: 'MULTIPLE_FOUND_CITY',
          allMatches: dbMatches
        });
      } else {
        results.multipleMatches.push({
          csv,
          dbMatches,
          matchType: 'MULTIPLE_NO_CITY'
        });
      }
    }
    return;
  }
  
  // No match found
  results.noMatches.push(csv);
});

// Print results
console.log(`✅ EXACT MATCHES (${results.exactMatches.length})`);
console.log('-'.repeat(100));
results.exactMatches.forEach((match, i) => {
  console.log(`${i + 1}. CSV Row ${match.csv.csvIndex}: "${match.csv.centerName}" | City: ${match.csv.city}`);
  console.log(`   DB Match: "${match.db.centerName}" | City: ${match.db.city}`);
  console.log();
});

console.log(`\n⚠️  PARTIAL MATCHES (${results.partialMatches.length})`);
console.log('-'.repeat(100));
results.partialMatches.forEach((match, i) => {
  console.log(`${i + 1}. CSV Row ${match.csv.csvIndex}: "${match.csv.centerName}" | City: ${match.csv.city}`);
  console.log(`   DB Match: "${match.db.centerName}" | City: ${match.db.city}`);
  console.log(`   Match Type: ${match.matchType}`);
  if (match.allMatches) {
    console.log(`   Other Matches: ${match.allMatches.map(m => `${m.city}`).join(', ')}`);
  }
  console.log();
});

console.log(`\n🔴 NO MATCHES - NEED ATTENTION (${results.noMatches.length})`);
console.log('-'.repeat(100));
results.noMatches.forEach((csv, i) => {
  console.log(`${i + 1}. CSV Row ${csv.csvIndex}: "${csv.centerName}"`);
  console.log(`   Location: ${csv.location}`);
  console.log(`   Extracted City: ${csv.city}`);
  console.log(`   State: ${csv.state}`);
  
  // Try to find similar names in database
  const similarNames = dbCenters.filter(db => 
    db.centerName.toLowerCase().includes(csv.centerName.toLowerCase().substring(0, 10)) ||
    csv.centerName.toLowerCase().includes(db.centerName.toLowerCase().substring(0, 10))
  ).slice(0, 3);
  
  if (similarNames.length > 0) {
    console.log(`   Similar in DB: ${similarNames.map(s => `"${s.centerName}" (${s.city})`).join(', ')}`);
  }
  console.log();
});

console.log(`\n🔵 MULTIPLE MATCHES - AMBIGUOUS (${results.multipleMatches.length})`);
console.log('-'.repeat(100));
results.multipleMatches.forEach((match, i) => {
  console.log(`${i + 1}. CSV Row ${match.csv.csvIndex}: "${match.csv.centerName}" | City: ${match.csv.city}`);
  console.log(`   DB Matches Found:`);
  match.dbMatches.forEach(db => {
    console.log(`     - "${db.centerName}" | City: ${db.city} | State: ${db.state}`);
  });
  console.log();
});

// Summary
console.log('\n' + '='.repeat(100));
console.log('📊 SUMMARY');
console.log('='.repeat(100));
console.log(`Total CSV Centers: ${csvCenters.length}`);
console.log(`Total DB Centers: ${dbCenters.length}`);
console.log(`✅ Exact Matches: ${results.exactMatches.length}`);
console.log(`⚠️  Partial Matches: ${results.partialMatches.length}`);
console.log(`🔴 No Matches: ${results.noMatches.length}`);
console.log(`🔵 Multiple Matches: ${results.multipleMatches.length}`);

// Dalmia specific analysis
console.log('\n' + '='.repeat(100));
console.log('🎯 DALMIA BHARATH FOUNDATION ANALYSIS');
console.log('='.repeat(100));

const dalmiaCsv = csvCenters.filter(c => c.centerName.toLowerCase().includes('dalmia'));
const dalmiaDb = dbCenters.filter(c => c.centerName.toLowerCase().includes('dalmia'));

console.log(`\nCSV Dalmia Centers (${dalmiaCsv.length}):`);
dalmiaCsv.forEach(c => {
  console.log(`  - Row ${c.csvIndex}: "${c.centerName}" | Location: ${c.location} | City: ${c.city}`);
});

console.log(`\nDatabase Dalmia Centers (${dalmiaDb.length}):`);
dalmiaDb.forEach(c => {
  console.log(`  - "${c.centerName}" | City: ${c.city} | State: ${c.state}`);
});

// Save results to JSON for further processing
const reportPath = path.join(__dirname, 'center-analysis-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  summary: {
    totalCsv: csvCenters.length,
    totalDb: dbCenters.length,
    exactMatches: results.exactMatches.length,
    partialMatches: results.partialMatches.length,
    noMatches: results.noMatches.length,
    multipleMatches: results.multipleMatches.length
  },
  results
}, null, 2));

console.log(`\n✅ Full report saved to: ${reportPath}`);
