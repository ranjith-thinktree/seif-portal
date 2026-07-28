import { getRefurbishmentDisplayStatus } from "./refurbishmentUtils";

export function summarizeRefurbishmentRequests(rows = []) {
  let completed = 0;
  let rejected = 0;
  let inProgress = 0;
  rows.forEach((row) => {
    const status = String(row.status || "").toLowerCase();
    if (status === "completed") completed += 1;
    else if (status === "rejected") rejected += 1;
    else inProgress += 1;
  });
  return {
    requests: rows.length,
    completed,
    rejected,
    inProgress,
  };
}

/** Status mix for bar chart */
export function buildRefurbishmentStatusMix(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    const display = getRefurbishmentDisplayStatus(row);
    const key = display.key || "unknown";
    const label = display.label || key;
    if (!map.has(key)) map.set(key, { name: label, key, value: 0 });
    map.get(key).value += 1;
  });
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

/** Top partners by request count */
export function buildRefurbishmentPartnerChart(rows = [], limit = 10) {
  const map = new Map();
  rows.forEach((row) => {
    const partner =
      String(row.organization_name || row.partner_name || "Unknown").trim() ||
      "Unknown";
    if (!map.has(partner)) {
      map.set(partner, { partner, requests: 0, completed: 0 });
    }
    const entry = map.get(partner);
    entry.requests += 1;
    if (String(row.status || "").toLowerCase() === "completed") {
      entry.completed += 1;
    }
  });
  return Array.from(map.values())
    .sort(
      (a, b) =>
        b.requests - a.requests ||
        b.completed - a.completed ||
        a.partner.localeCompare(b.partner),
    )
    .slice(0, limit);
}
