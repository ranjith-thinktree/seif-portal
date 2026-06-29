'use strict';

const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputPath = process.argv[3] || inputPath;

if (!inputPath) {
  console.error('Usage: node convert-fy-to-date.js <input.csv> [output.csv]');
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

function financialYearToDate(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';

  const match = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (!match) return trimmed;

  const startYear = parseInt(match[1], 10);
  const endYear = startYear + 1;
  return `31st-March-${endYear}`;
}

const text = fs.readFileSync(inputPath, 'utf8');
const lines = text.split(/\r?\n/);
const hasTrailingNewline = text.endsWith('\n');

if (!lines.length || !lines[0].trim()) {
  console.error('CSV is empty');
  process.exit(1);
}

const header = parseCSVLine(lines[0]);
const refIdx = header.indexOf('Refurbuishment');
const upgIdx = header.indexOf('Upgradation');

if (refIdx === -1 || upgIdx === -1) {
  console.error('Could not find Refurbuishment or Upgradation columns');
  process.exit(1);
}

let converted = 0;
const examples = new Map();

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].length) continue;

  const fields = parseCSVLine(lines[i]);
  for (const idx of [refIdx, upgIdx]) {
    const original = (fields[idx] || '').trim();
    if (!original) continue;

    const updated = financialYearToDate(original);
    if (updated !== original) {
      if (!examples.has(original)) examples.set(original, updated);
      fields[idx] = updated;
      converted++;
    }
  }

  lines[i] = fields
    .map((field) => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    })
    .join(',');
}

const output = lines.join('\n') + (hasTrailingNewline ? '\n' : '');
fs.writeFileSync(outputPath, output, 'utf8');

console.log(`Converted ${converted} cells`);
console.log('Mappings used:');
for (const [from, to] of examples) {
  console.log(`  ${from} -> ${to}`);
}
console.log(`Output: ${outputPath}`);
