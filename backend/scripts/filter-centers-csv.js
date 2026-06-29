const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputPath = process.argv[3] || inputPath;

if (!inputPath) {
  console.error('Usage: node filter-centers-csv.js <input.csv> [output.csv]');
  process.exit(1);
}

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  result.push(cur);
  return result;
}

function escapeCSVField(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const text = fs.readFileSync(inputPath, 'utf8');
const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
const header = lines[0];
const cols = parseCSVLine(header);
const refIdx = cols.indexOf('Refurbuishment');
const upgIdx = cols.indexOf('Upgradation');

if (refIdx === -1 || upgIdx === -1) {
  console.error('Could not find Refurbuishment or Upgradation columns');
  console.error('Columns:', cols);
  process.exit(1);
}

const kept = [header];
const removed = [];

for (let i = 1; i < lines.length; i++) {
  const fields = parseCSVLine(lines[i]);
  const ref = (fields[refIdx] || '').trim();
  const upg = (fields[upgIdx] || '').trim();

  // Remove centers where BOTH Refurbuishment and Upgradation are empty.
  // Keep centers that have at least one of those fields filled.
  if (ref || upg) {
    kept.push(lines[i]);
  } else {
    const centerName = (fields[0] || '').trim();
    removed.push({ centerName, ref: ref || '(empty)', upg: upg || '(empty)' });
  }
}

const output = `${kept.join('\n')}\n`;
fs.writeFileSync(outputPath, output, 'utf8');

console.log(`Input: ${lines.length - 1} centers`);
console.log(`Kept: ${kept.length - 1} centers (at least one of Refurbuishment or Upgradation filled)`);
console.log(`Removed: ${removed.length} centers`);
if (removed.length > 0 && removed.length <= 20) {
  console.log('\nRemoved centers:');
  removed.forEach((r) => console.log(`  - ${r.centerName} (Refurbuishment: ${r.ref}, Upgradation: ${r.upg})`));
} else if (removed.length > 20) {
  console.log('\nFirst 10 removed centers:');
  removed.slice(0, 10).forEach((r) => console.log(`  - ${r.centerName} (Refurbuishment: ${r.ref}, Upgradation: ${r.upg})`));
  console.log(`  ... and ${removed.length - 10} more`);
}
console.log(`\nOutput written to: ${outputPath}`);
