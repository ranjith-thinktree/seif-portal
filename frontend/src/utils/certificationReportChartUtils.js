/**
 * Pure helpers to derive Certification report charts from archive rows.
 * No API changes — uses the same rows already loaded for the table/KPIs.
 */

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function assessmentKey(row) {
  const raw = row?.assessment_date;
  if (!raw) return null;
  const s = String(raw);
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (iso) return iso[1];
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthKeyFromIso(iso) {
  return iso ? iso.slice(0, 7) : null;
}

/** Trend chart only for Range / Calendar Year / Financial Year */
export function shouldShowCertificationTrend(mode) {
  return mode === "range" || mode === "calendar_year" || mode === "financial_year";
}

/**
 * Results mix bar data from KPIs (preferred) or row sums.
 * Failed is always summed from rows (KPI payload has no failed).
 * @returns {{ name: string, value: number, fill: string }[]}
 */
export function buildCertificationResultsMix(kpis = {}, rows = []) {
  let registered = num(kpis.registered);
  let attended = num(kpis.attended);
  let passed = num(kpis.passed);
  let failed = 0;

  rows.forEach((row) => {
    failed += num(row.failed);
  });

  if (!registered && !attended && !passed && rows.length) {
    registered = 0;
    attended = 0;
    passed = 0;
    rows.forEach((row) => {
      registered += num(row.registered);
      attended += num(row.attended);
      passed += num(row.passed);
    });
  }

  return [
    { name: "Registered", value: registered, fill: "#64748b" },
    { name: "Attended", value: attended, fill: "#f59e0b" },
    { name: "Passed", value: passed, fill: "#009530" },
    { name: "Failed", value: failed, fill: "#ef4444" },
  ];
}

/**
 * Top partners by passed (fallback registered).
 * @returns {{ partner: string, registered: number, attended: number, passed: number, failed: number }[]}
 */
export function buildCertificationPartnerChart(rows = [], limit = 10) {
  const map = new Map();
  rows.forEach((row) => {
    const partner = String(row.partner_name || "Unknown").trim() || "Unknown";
    if (!map.has(partner)) {
      map.set(partner, {
        partner,
        registered: 0,
        attended: 0,
        passed: 0,
        failed: 0,
      });
    }
    const entry = map.get(partner);
    entry.registered += num(row.registered);
    entry.attended += num(row.attended);
    entry.passed += num(row.passed);
    entry.failed += num(row.failed);
  });

  return Array.from(map.values())
    .sort(
      (a, b) =>
        b.passed - a.passed ||
        b.registered - a.registered ||
        a.partner.localeCompare(b.partner),
    )
    .slice(0, limit);
}

/**
 * Decide day vs month buckets for trend.
 * Range ≤ 45 days → day; otherwise month. CY/FY → month.
 */
export function resolveCertificationTrendGranularity(mode, rows = []) {
  if (mode === "calendar_year" || mode === "financial_year") return "month";
  if (mode !== "range") return "month";

  const keys = rows.map(assessmentKey).filter(Boolean).sort();
  if (keys.length < 2) return "day";
  const start = new Date(`${keys[0]}T00:00:00`);
  const end = new Date(`${keys[keys.length - 1]}T00:00:00`);
  const days = Math.round((end - start) / 86400000) + 1;
  return days <= 45 ? "day" : "month";
}

/**
 * Trend series: requests + trainee totals by day or month.
 */
export function buildCertificationTrend(rows = [], mode = "range") {
  const granularity = resolveCertificationTrendGranularity(mode, rows);
  const map = new Map();

  rows.forEach((row) => {
    const iso = assessmentKey(row);
    if (!iso) return;
    const key = granularity === "day" ? iso : monthKeyFromIso(iso);
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, {
        period: key,
        requests: 0,
        registered: 0,
        attended: 0,
        passed: 0,
        failed: 0,
      });
    }
    const entry = map.get(key);
    entry.requests += 1;
    entry.registered += num(row.registered);
    entry.attended += num(row.attended);
    entry.passed += num(row.passed);
    entry.failed += num(row.failed);
  });

  return {
    granularity,
    data: Array.from(map.values()).sort((a, b) =>
      a.period.localeCompare(b.period),
    ),
  };
}
