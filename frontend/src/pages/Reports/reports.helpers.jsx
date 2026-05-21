import React, { useState, useRef, useEffect } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import {
  DEFAULT_ORDER,
  DEFAULT_KPI_ORDER,
  LAYOUT_ROWS_KEY,
  CONFIG_KEY,
  DEFAULT_CONFIG,
  KPI_ORDER_KEY,
  GREEN,
} from "./reports.constants";

// ─── Number formatters ─────────────────────────────────────────────────────────
export const fmt = (n) => (n != null ? Number(n).toLocaleString("en-IN") : "—");
export const fmtPct = (n) => (n != null ? `${Number(n).toFixed(1)}%` : "—");
export const sparkline = (value) =>
  [0, 0, 0, 0, 0, 0, Number(value) || 0].map((v) => ({ value: v }));

// ─── Array helpers ─────────────────────────────────────────────────────────────
export function arrayMove(arr, from, to) {
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

// ─── CSV download ──────────────────────────────────────────────────────────────
export function downloadCSV(rows, filename) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Section visibility ────────────────────────────────────────────────────────
export function isSectionVisible(id, config) {
  switch (id) {
    case "india_map":
      return config.sec_india_map;
    case "gender_pie":
      return config.sec_gender_pie;
    case "yoy_trend":
      return config.sec_yoy_trend;
    case "salary_dist":
      return config.sec_salary_dist;
    case "state_dist":
      return config.sec_state_dist;
    case "course_table":
      return config.sec_course_table;
    case "course_chart":
      return config.sec_course_chart;
    case "partner_table":
      return config.sec_partner_table;
    case "center_state_dist":
      return config.sec_center_state_dist;
    case "center_growth_trend":
      return config.sec_center_growth_trend;
    case "center_type_chart":
      return config.sec_center_type_chart;
    case "center_region_chart":
      return config.sec_center_region_chart;
    case "center_performance":
      return config.sec_center_performance;
    default:
      return false;
  }
}

// ─── Row-based layout helpers ──────────────────────────────────────────────────
export function defaultLayoutRows() {
  return DEFAULT_ORDER.map((id) => ({ slots: [{ id, flex: 10 }] }));
}

export function loadLayoutRows() {
  try {
    const raw = localStorage.getItem(LAYOUT_ROWS_KEY);
    if (!raw) return defaultLayoutRows();
    const p = JSON.parse(raw);
    if (!Array.isArray(p) || !p.length) return defaultLayoutRows();

    // Merge in any new section IDs from DEFAULT_ORDER not yet in stored layout
    const storedIds = new Set(p.flatMap((r) => r.slots.map((s) => s.id)));
    const newIds = DEFAULT_ORDER.filter((id) => !storedIds.has(id));
    if (newIds.length) {
      // Append each new ID as its own single-slot full-width row
      const newRows = newIds.map((id) => ({ slots: [{ id, flex: 10 }] }));
      return [...p, ...newRows];
    }
    return p;
  } catch {
    return defaultLayoutRows();
  }
}

export function persistLayoutRowsLocal(rows) {
  try {
    localStorage.setItem(LAYOUT_ROWS_KEY, JSON.stringify(rows));
  } catch {}
}

export function rowsToFlatOrder(rows) {
  return rows.flatMap((r) => r.slots.map((s) => s.id));
}

// ─── Config (localStorage) helpers ────────────────────────────────────────────
export function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(cfg) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  } catch {}
}

// ─── KPI order initialiser (merges new keys into a saved order) ────────────────
export function initKpiOrder() {
  try {
    const raw = localStorage.getItem(KPI_ORDER_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p) && p.length) {
        const newKeys = DEFAULT_KPI_ORDER.filter((k) => !p.includes(k));
        return newKeys.length ? [...p, ...newKeys] : p;
      }
    }
  } catch {}
  return [...DEFAULT_KPI_ORDER];
}

// ─── Small UI atoms ────────────────────────────────────────────────────────────
export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[140px]">
      {label != null && (
        <p className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wide">
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ background: p.color }}
            />
            {p.name}
          </span>
          <span className="font-semibold text-slate-900 tabular-nums">
            {Number(p.value).toLocaleString("en-IN")}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Skeleton({ h }) {
  return <div className={`bg-gray-100 rounded animate-pulse ${h} w-full`} />;
}

export function PctBadge({ value }) {
  const n = Number(value);
  const bg = n >= 60 ? "#DCFCE7" : n >= 30 ? "#FEF9C3" : "#FEE2E2";
  const fg = n >= 60 ? "#166534" : n >= 30 ? "#854D0E" : "#991B1B";
  return (
    <span
      className="px-1.5 py-0.5 rounded text-xs font-semibold"
      style={{ background: bg, color: fg }}
    >
      {fmtPct(value)}
    </span>
  );
}

export function DownloadBtn({ rows, filename }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const base = (filename || "download").replace(/\.(csv|xlsx|png|pdf)$/i, "");

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const getCard = () =>
    wrapRef.current?.closest('[class*="rounded-xl"]') ||
    wrapRef.current?.parentElement?.parentElement;

  const doCSV = () => {
    setOpen(false);
    downloadCSV(rows, base + ".csv");
  };

  const doExcel = () => {
    setOpen(false);
    if (!rows?.length) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, base + ".xlsx");
  };

  const doPng = async () => {
    setOpen(false);
    const card = getCard();
    if (!card) return;
    await new Promise((r) => setTimeout(r, 80));
    const canvas = await html2canvas(card, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const link = document.createElement("a");
    link.download = base + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const doPdf = async () => {
    setOpen(false);
    const card = getCard();
    if (!card) return;
    await new Promise((r) => setTimeout(r, 80));
    const canvas = await html2canvas(card, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgW = canvas.width;
    const imgH = canvas.height;
    const pdf = new jsPDF({
      orientation: imgW > imgH ? "landscape" : "portrait",
      unit: "px",
      format: [imgW / 2, imgH / 2],
    });
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      imgW / 2,
      imgH / 2,
    );
    pdf.save(base + ".pdf");
  };

  const items = [
    { label: "PNG", action: doPng },
    { label: "PDF", action: doPdf },
    { label: "Excel", action: doExcel },
    { label: "CSV", action: doCSV },
  ];

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Download"
        className="p-2 rounded-lg text-gray-400 hover:text-[#009530] hover:bg-green-50 transition-colors"
      >
        <ArrowDownTrayIcon className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[110px]">
          {items.map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#009530] focus:ring-offset-1 ${
        checked ? "bg-[#009530]" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
