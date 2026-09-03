const fs = require('fs').promises;
const path = require('path');

const DASHBOARD_DATA_PATH = path.resolve(__dirname, '../../data/dashboardData.json');

const YEAR_TOTAL_FIELDS = [
  'total_students',
  'india',
  'greater_india',
  'nsi',
  'female',
  'male',
  'tot',
  'employment',
  'alumni',
  'edp',
];

const MONTH_FIELDS = [
  'total',
  'india',
  'greater_india',
  'nsi',
  'female',
  'male',
  'tot',
  'employment',
  'alumni',
  'edp',
];

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const emptyTotals = () =>
  YEAR_TOTAL_FIELDS.reduce((acc, field) => {
    acc[field] = 0;
    return acc;
  }, {});

const sumYearRecords = (records) => {
  const totals = emptyTotals();
  for (const record of records) {
    if (!record || typeof record !== 'object') continue;
    for (const field of YEAR_TOTAL_FIELDS) {
      totals[field] += toNumber(record[field]);
    }
  }
  return totals;
};

const calendarYearsForFinancialYear = (financialYear) => {
  if (!financialYear || financialYear === 'all') return null;
  const start = String(financialYear).split('-')[0];
  if (start === '2025') return ['2025', '2026'];
  return [/^\d{4}$/.test(start) ? start : null].filter(Boolean);
};

const getCustomStats = (data, financialYear = 'all') => {
  if (!data || typeof data !== 'object') return emptyTotals();
  const years = calendarYearsForFinancialYear(financialYear);
  if (!years) {
    return sumYearRecords(
      Object.entries(data)
        .filter(([key]) => key !== 'all' && /^\d{4}$/.test(key))
        .map(([, value]) => value)
    );
  }
  return sumYearRecords(years.map((year) => data[year]));
};

const syncDerivedStudentTotals = (yearData) => {
  if (!yearData || typeof yearData !== 'object') return yearData;
  yearData.total_students =
    toNumber(yearData.india) + toNumber(yearData.greater_india) + toNumber(yearData.nsi);
  if (yearData.monthly) {
    for (const month of MONTHS) {
      const row = yearData.monthly[month];
      if (!row) continue;
      row.total = toNumber(row.india) + toNumber(row.greater_india) + toNumber(row.nsi);
    }
  }
  return yearData;
};

const recomputeAll = (data) => {
  const next = { ...data };
  Object.entries(next).forEach(([key, value]) => {
    if (key === 'all' || !/^\d{4}$/.test(key)) return;
    syncDerivedStudentTotals(value);
  });
  next.all = sumYearRecords(
    Object.entries(next)
      .filter(([key]) => key !== 'all' && /^\d{4}$/.test(key))
      .map(([, value]) => value)
  );
  return next;
};

async function readDashboardDataFile() {
  let raw = await fs.readFile(DASHBOARD_DATA_PATH, 'utf-8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw);
}

async function writeDashboardDataFile(data) {
  const normalized = recomputeAll(data);
  await fs.writeFile(DASHBOARD_DATA_PATH, `${JSON.stringify(normalized, null, 2)}\n`, 'utf-8');
  return normalized;
}

async function loadCustomStats(financialYear = 'all') {
  try {
    const data = await readDashboardDataFile();
    return getCustomStats(data, financialYear);
  } catch (error) {
    console.warn('[dashboardData] could not load custom stats:', error.message);
    return emptyTotals();
  }
}

module.exports = {
  DASHBOARD_DATA_PATH,
  YEAR_TOTAL_FIELDS,
  MONTH_FIELDS,
  MONTHS,
  toNumber,
  emptyTotals,
  getCustomStats,
  recomputeAll,
  syncDerivedStudentTotals,
  readDashboardDataFile,
  writeDashboardDataFile,
  loadCustomStats,
};
