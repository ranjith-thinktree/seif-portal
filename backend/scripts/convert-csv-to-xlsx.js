const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const docs = path.join(__dirname, '..', 'documents');
const files = [
  'trainee_upload_DonBosco.csv',
  'trainee_upload_AmbujaFdn.csv',
  'trainee_upload_DalmiaBharath.csv',
];

files.forEach((f) => {
  const csvPath = path.join(docs, f);
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.trim().split('\n');

  const wb = xlsx.utils.book_new();
  const wsData = lines.map((line) => {
    // Parse CSV properly handling quoted fields
    const cols = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        cols.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur);
    // Return each cell as an explicit text cell object
    return cols.map((val) => ({ v: val.trim(), t: 's' }));
  });

  const ws = xlsx.utils.aoa_to_sheet(wsData, { raw: true, cellDates: false });

  // Force all cells to string type
  Object.keys(ws).forEach((addr) => {
    if (addr[0] === '!') return;
    const cell = ws[addr];
    cell.t = 's';
    delete cell.z;
  });

  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  const outPath = csvPath.replace('.csv', '_fixed.xlsx');
  xlsx.writeFile(wb, outPath);
  console.log('Converted:', f.replace('.csv', '.xlsx'));
});
