const fs = require('fs');

const inputPath = process.argv[2];
const text = fs.readFileSync(inputPath, 'utf8');
const lines = text.split(/\r?\n/).filter((l) => l.length > 0);

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

const cols = parseCSVLine(lines[0]);
const refIdx = cols.indexOf('Refurbuishment');
const upgIdx = cols.indexOf('Upgradation');

let bothEmpty = 0;
let onlyRef = 0;
let onlyUpg = 0;
let bothFilled = 0;

for (let i = 1; i < lines.length; i++) {
  const f = parseCSVLine(lines[i]);
  const ref = (f[refIdx] || '').trim();
  const upg = (f[upgIdx] || '').trim();
  if (!ref && !upg) bothEmpty++;
  else if (ref && !upg) onlyRef++;
  else if (!ref && upg) onlyUpg++;
  else bothFilled++;
}

console.log('Total:', lines.length - 1);
console.log('Both empty:', bothEmpty);
console.log('Only Refurbuishment filled:', onlyRef);
console.log('Only Upgradation filled:', onlyUpg);
console.log('Both filled:', bothFilled);
console.log('\nIf remove when EITHER empty -> keep:', bothFilled);
console.log('If remove when BOTH empty -> keep:', onlyRef + onlyUpg + bothFilled);
