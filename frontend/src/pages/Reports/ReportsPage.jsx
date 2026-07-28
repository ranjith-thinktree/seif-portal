// ──────────────────────────────────────────────────────────────────────────────
// Impact & Performance Dashboard  —  Admin Customisation + Row-based DnD
// ──────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { MainLayout } from "../../components/layout";
import StatCard from "../../components/common/StatCard";
import {
  Cog6ToothIcon,
  XMarkIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { useAuth } from "../../hooks";
import { ROLES } from "../../constants/roles";
import { MultiSelect } from "../../components/ui/multi-select";
import {
  getAnalyticsKpi,
  getAnalyticsGender,
  getAnalyticsState,
  getAnalyticsPerformance,
  getAnalyticsCourses,
  getAnalyticsPartners,
  getAnalyticsTrend,
  getAnalyticsCentersState,
  getAnalyticsCentersTrend,
  getAnalyticsCentersType,
  getAnalyticsCentersRegion,
  getAnalyticsCentersPerformance,
  getReportPreferences,
  saveReportPreferences,
} from "../../services/report.service";
import {
  DEFAULT_KPI_ORDER,
  KPI_ORDER_KEY,
  LAYOUT_ROWS_KEY,
  DEFAULT_CONFIG,
} from "./reports.constants";
import {
  fmt,
  sparkline,
  arrayMove,
  isSectionVisible,
  defaultLayoutRows,
  loadLayoutRows,
  persistLayoutRowsLocal,
  loadConfig,
  saveConfig,
  initKpiOrder,
  Skeleton,
} from "./reports.helpers";
import {
  REPORT_DOMAIN_OPTIONS,
  loadReportDomains,
  saveReportDomains,
  kpiVisibleForDomains,
  sectionVisibleForDomains,
  isDomainSelected,
  hasAnyImpactDomain,
  resolveReportControlsPlacement,
} from "./reports.domains";
import {
  defaultReportPeriodState,
  fyStartYearToImpactValue,
} from "./reports.sharedPeriod";
import ConfigDrawer from "./components/ConfigDrawer";
import DraggableCard from "./components/DraggableCard";
import DraggableRow from "./components/DraggableRow";
import SectionRenderer from "./components/SectionCards";
import CertificationReportsPanel from "./components/CertificationReportsPanel";
import RefurbishmentReportsPanel from "./components/RefurbishmentReportsPanel";
import ReportPeriodExportControls from "./components/ReportPeriodExportControls";

const DOMAIN_SELECT_OPTIONS = REPORT_DOMAIN_OPTIONS.map((d) => ({
  value: d.id,
  label: d.label,
}));

// ─── Main Page ────────────────────────────────────────────────────────────────
const ReportsPage = () => {
  const { role } = useAuth();
  const canCustomise = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
  const canExportExcel =
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.ADMIN ||
    role === ROLES.SEIF_READONLY_DOWNLOAD;

  const [config, setConfig] = useState(loadConfig);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [layoutEditMode, setLayoutEditMode] = useState(false);

  // Row-based layout
  const [layoutRows, setLayoutRows] = useState(loadLayoutRows);

  // Row-level DnD state
  const dragRowIdx = useRef(null);
  const [overRowIdx, setOverRowIdx] = useState(null);

  // KPI card DnD state
  const kpiDragId = useRef(null);
  const [kpiOverId, setKpiOverId] = useState(null);
  const [kpiOrder, setKpiOrder] = useState(initKpiOrder);

  const [year, setYear] = useState(() => {
    const initial = defaultReportPeriodState();
    return fyStartYearToImpactValue(initial.fyStartYear) || "all";
  });
  const [domains, setDomains] = useState(loadReportDomains);
  const [reportPeriod, setReportPeriod] = useState(defaultReportPeriodState);
  const [kpi, setKpi] = useState(null);
  const [gender, setGender] = useState([]);
  const [states, setStates] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [courses, setCourses] = useState([]);
  const [partners, setPartners] = useState([]);
  const [trend, setTrend] = useState([]);
  // Centers analytics state
  const [centersState, setCentersState] = useState([]);
  const [centersGrowth, setCentersGrowth] = useState([]);
  const [centersByType, setCentersByType] = useState([]);
  const [centersByRegion, setCentersByRegion] = useState([]);
  const [centersPerformance, setCentersPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const saveTimer = useRef(null);
  const dashboardRef = useRef(null);
  const captureRef = useRef(null);

  // Refs to always have latest values for the debounced DB save
  const configRef = useRef(config);
  const kpiOrderRef = useRef(kpiOrder);
  const layoutRowsRef = useRef(layoutRows);

  // Must be declared BEFORE the effects that reference it
  const schedulePreferencesSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveReportPreferences({
        layoutRows: layoutRowsRef.current,
        config: configRef.current,
        kpiOrder: kpiOrderRef.current,
      }).catch(() => {});
    }, 800);
  }, []);

  const persistLayout = useCallback(
    (rows) => {
      persistLayoutRowsLocal(rows);
      schedulePreferencesSave();
    },
    [schedulePreferencesSave],
  );

  // Keep refs in sync; save to localStorage and schedule DB save on user changes
  useEffect(() => {
    configRef.current = config;
    saveConfig(config);
    schedulePreferencesSave();
  }, [config, schedulePreferencesSave]);
  useEffect(() => {
    kpiOrderRef.current = kpiOrder;
    schedulePreferencesSave();
  }, [kpiOrder, schedulePreferencesSave]);
  useEffect(() => {
    layoutRowsRef.current = layoutRows;
  }, [layoutRows]);

  // Load saved preferences from DB on mount (source of truth across browsers)
  useEffect(() => {
    getReportPreferences()
      .then((prefs) => {
        if (!prefs) return;
        if (Array.isArray(prefs.layoutRows) && prefs.layoutRows.length) {
          setLayoutRows(prefs.layoutRows);
          persistLayoutRowsLocal(prefs.layoutRows);
        }
        if (prefs.config && typeof prefs.config === "object") {
          const merged = { ...DEFAULT_CONFIG, ...prefs.config };
          setConfig(merged);
          saveConfig(merged);
        }
        if (Array.isArray(prefs.kpiOrder) && prefs.kpiOrder.length) {
          setKpiOrder(prefs.kpiOrder);
          try {
            localStorage.setItem(KPI_ORDER_KEY, JSON.stringify(prefs.kpiOrder));
          } catch (_e) {
            /* ignore */
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleToggle = useCallback((key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleDomainsChange = useCallback((next) => {
    if (!Array.isArray(next) || !next.length) return;
    setDomains(next);
    saveReportDomains(next);
  }, []);

  const handleReportPeriodChange = useCallback((next) => {
    setReportPeriod(next);
    if (next?.mode === "financial_year") {
      const fy = fyStartYearToImpactValue(next.fyStartYear);
      if (fy) setYear(fy);
    } else {
      setYear("all");
    }
  }, []);

  const handleReset = useCallback(() => {
    setConfig({ ...DEFAULT_CONFIG });
    setKpiOrder([...DEFAULT_KPI_ORDER]);
    const rows = defaultLayoutRows();
    setLayoutRows(rows);
    persistLayout(rows);
    try {
      localStorage.removeItem(KPI_ORDER_KEY);
    } catch (_e) {
      /* ignore */
    }
  }, [persistLayout]);

  const fyEnabled = hasAnyImpactDomain(domains);
  const showCertification = isDomainSelected(domains, "certification");
  const showRefurbishment = isDomainSelected(domains, "refurbishment");
  const controlsPlacement = useMemo(
    () => resolveReportControlsPlacement(domains),
    [domains],
  );

  const isImpactSectionShown = useCallback(
    (sectionId) =>
      isSectionVisible(sectionId, config) &&
      sectionVisibleForDomains(sectionId, domains),
    [config, domains],
  );

  // Row-level DnD handlers
  function handleDragStart(rowIdx) {
    dragRowIdx.current = rowIdx;
  }
  function handleDragEnter(rowIdx) {
    setOverRowIdx(rowIdx);
  }
  function handleDragEnd() {
    if (
      dragRowIdx.current !== null &&
      overRowIdx !== null &&
      dragRowIdx.current !== overRowIdx
    ) {
      setLayoutRows((prev) => {
        const next = arrayMove(prev, dragRowIdx.current, overRowIdx);
        persistLayout(next);
        return next;
      });
    }
    dragRowIdx.current = null;
    setOverRowIdx(null);
  }

  // Pair another card into a row (makes it a 2-card row)
  function handlePair(rowIdx, cardId) {
    setLayoutRows((prev) => {
      const rows = prev.map((r) => ({
        ...r,
        slots: r.slots.map((s) => ({ ...s })),
      }));
      // Find and remove cardId from its current solo row
      const srcIdx = rows.findIndex(
        (r) => r.slots.length === 1 && r.slots[0].id === cardId,
      );
      if (srcIdx < 0) return prev;
      rows.splice(srcIdx, 1);
      // Recalculate target index after removal
      const tgt = srcIdx < rowIdx ? rowIdx - 1 : rowIdx;
      rows[tgt] = {
        slots: [
          { id: rows[tgt].slots[0].id, flex: 5 },
          { id: cardId, flex: 5 },
        ],
      };
      persistLayout(rows);
      return rows;
    });
  }

  // Ungroup a card from a 2-card row — moves it to its own row below
  function handleUnpair(rowIdx, slotIdx) {
    setLayoutRows((prev) => {
      const rows = prev.map((r) => ({
        ...r,
        slots: r.slots.map((s) => ({ ...s })),
      }));
      const removed = rows[rowIdx].slots.splice(slotIdx, 1)[0];
      rows[rowIdx].slots[0] = { ...rows[rowIdx].slots[0], flex: 10 };
      rows.splice(rowIdx + 1, 0, { slots: [{ id: removed.id, flex: 10 }] });
      persistLayout(rows);
      return rows;
    });
  }

  // Change the flex split of a 2-card row
  function handleRatioChange(rowIdx, a, b) {
    setLayoutRows((prev) => {
      const rows = prev.map((r) => ({
        ...r,
        slots: r.slots.map((s) => ({ ...s })),
      }));
      rows[rowIdx].slots[0].flex = a;
      rows[rowIdx].slots[1].flex = b;
      persistLayout(rows);
      return rows;
    });
  }

  // KPI card DnD handlers
  function handleKpiDragStart(id) {
    kpiDragId.current = id;
  }
  function handleKpiDragEnter(id) {
    setKpiOverId(id);
  }
  function handleKpiDragEnd() {
    if (kpiDragId.current && kpiOverId && kpiDragId.current !== kpiOverId) {
      setKpiOrder((prev) => {
        const from = prev.indexOf(kpiDragId.current);
        const to = prev.indexOf(kpiOverId);
        const next = arrayMove(prev, from, to);
        try {
          localStorage.setItem(KPI_ORDER_KEY, JSON.stringify(next));
        } catch (_e) {
          /* ignore */
        }
        return next;
      });
    }
    kpiDragId.current = null;
    setKpiOverId(null);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [k, g, s, p, c, pa, tr, cs, cg, ct, cr, cp] = await Promise.all([
        getAnalyticsKpi(year),
        getAnalyticsGender(year),
        getAnalyticsState(year),
        getAnalyticsPerformance(year),
        getAnalyticsCourses(year),
        getAnalyticsPartners(year),
        getAnalyticsTrend(),
        getAnalyticsCentersState(year),
        getAnalyticsCentersTrend(),
        getAnalyticsCentersType(year),
        getAnalyticsCentersRegion(year),
        getAnalyticsCentersPerformance(year),
      ]);
      setKpi(k);
      setGender(g);
      setStates(s);
      setPerformance(p);
      setCourses(c);
      setPartners(pa);
      setTrend(tr || []);
      setCentersState(cs || []);
      setCentersGrowth(cg || []);
      setCentersByType(ct || []);
      setCentersByRegion(cr || []);
      setCentersPerformance(cp || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load analytics",
      );
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const allKpiCards = [
    {
      key: "kpi_youth_trained",
      title: "Youth Trained",
      value: kpi?.totals?.youth_trained,
    },
    {
      key: "kpi_youth_employed",
      title: "Youth Employed",
      value: kpi?.totals?.youth_employed,
    },
    {
      key: "kpi_training_partners",
      title: "Training Partners",
      value: kpi?.totals?.training_partners,
    },
    {
      key: "kpi_training_centers",
      title: "Training Centers",
      value: kpi?.totals?.training_centers,
    },
    {
      key: "kpi_trainers_trained",
      title: "Trainers Trained (TOT)",
      value: kpi?.totals?.trainers_trained,
    },
    {
      key: "kpi_female_trainees",
      title: "Female Trainees",
      value: kpi?.totals?.female_trainees,
    },
    { key: "kpi_edp", title: "EDP", value: kpi?.totals?.edp },
    {
      key: "kpi_states_uts",
      title: "States \u0026 UTs",
      value: kpi?.totals?.states_uts,
    },
    {
      key: "kpi_greater_india",
      title: "Greater India",
      value: kpi?.totals?.greater_india,
    },
    { key: "kpi_nsi", title: "NSI", value: kpi?.totals?.nsi },
    { key: "kpi_alumni", title: "Alumni", value: kpi?.totals?.alumni },
  ];
  const visibleKpiCards = kpiOrder
    .filter((key) => config[key] && kpiVisibleForDomains(key, domains))
    .map((key) => allKpiCards.find((c) => c.key === key))
    .filter(Boolean);

  const sectionData = {
    gender,
    states,
    performance,
    courses,
    partners,
    trend,
    year,
    centersState,
    centersGrowth,
    centersByType,
    centersByRegion,
    centersPerformance,
  };

  // Which rows have at least one visible card
  const hasVisibleSection = layoutRows.some((row) =>
    row.slots.some((slot) => isImpactSectionShown(slot.id)),
  );
  const nothingVisible =
    visibleKpiCards.length === 0 &&
    !hasVisibleSection &&
    !showCertification &&
    !showRefurbishment;

  const showImpactBlock =
    fyEnabled && (visibleKpiCards.length > 0 || hasVisibleSection);
  const showImpactHeader =
    fyEnabled && (showImpactBlock || controlsPlacement.at === "impact");

  async function exportPng() {
    const target = captureRef.current;
    if (!target) return;
    setExporting(true);
    await new Promise((r) => setTimeout(r, 200));
    try {
      const yearLabel = year === "all" ? "cumulative" : year;
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f8fafc",
        logging: false,
        ignoreElements: (el) =>
          el.getAttribute("data-export-ignore") === "true",
      });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `SEIF_Report_${yearLabel}.png`;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  async function exportPdf() {
    const target = captureRef.current;
    if (!target) return;
    setExporting(true);
    await new Promise((r) => setTimeout(r, 200));
    try {
      const yearLabel = year === "all" ? "cumulative" : year;
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f8fafc",
        logging: false,
        ignoreElements: (el) =>
          el.getAttribute("data-export-ignore") === "true",
      });
      const imgData = canvas.toDataURL("image/png");
      const pxW = canvas.width / 2;
      const pxH = canvas.height / 2;
      const pdf = new jsPDF({
        orientation: pxW > pxH ? "landscape" : "portrait",
        unit: "px",
        format: [pxW, pxH],
      });
      pdf.addImage(imgData, "PNG", 0, 0, pxW, pxH);
      pdf.save(`SEIF_Report_${yearLabel}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  function exportExcel() {
    if (!canExportExcel) return;
    const yearLabel = year === "all" ? "cumulative" : year;
    const wb = XLSX.utils.book_new();

    if (kpi?.totals) {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Metric", "Value"],
        ...allKpiCards.map((c) => [c.title, c.value ?? 0]),
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "KPI");
    }
    if (gender.length) {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Gender", "Count"],
        ...gender.map((r) => [r.name, r.value]),
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "Gender");
    }
    if (trend.length) {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Financial Year", "Enrolled", "Female", "Employed"],
        ...trend.map((r) => [r.fy, r.enrolled, r.female, r.employed]),
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "YoY Trend");
    }
    if (states.length) {
      const ws = XLSX.utils.aoa_to_sheet([
        ["State", "Students"],
        ...states.map((r) => [r.state, r.students]),
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "State Distribution");
    }
    if (performance.length) {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Salary Band", "Count"],
        ...performance.map((r) => [r.band, r.count]),
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "Salary Distribution");
    }
    if (courses.length) {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Course", "Enrolled", "Employed", "Entrepreneurs", "Placement %"],
        ...courses.map((r) => [
          r.course_name,
          r.enrolled,
          r.employed,
          r.entrepreneurs,
          r.completion_rate,
        ]),
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "Course Performance");
    }
    if (partners.length) {
      const ws = XLSX.utils.aoa_to_sheet([
        [
          "Partner",
          "Centers",
          "Students Trained",
          "Placed",
          "Placement %",
          "Entrepreneur %",
          "Score",
        ],
        ...partners.map((r) => [
          r.partner_name,
          r.centers,
          r.students_trained,
          r.placed,
          r.placement_pct,
          r.entrepreneurship_pct,
          r.center_score ?? "",
        ]),
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "Partner Performance");
    }
    if (centersState.length) {
      const ws = XLSX.utils.aoa_to_sheet([
        ["State", "Centers"],
        ...centersState.map((r) => [r.state, r.centers]),
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "Centers by State");
    }
    if (centersGrowth.length) {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Financial Year", "Centers"],
        ...centersGrowth.map((r) => [r.fy, r.centers]),
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "Centers Growth");
    }
    if (centersByType.length) {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Center Type", "Centers"],
        ...centersByType.map((r) => [r.center_type, r.centers]),
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "Centers by Type");
    }
    if (centersByRegion.length) {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Region", "Centers"],
        ...centersByRegion.map((r) => [r.region, r.centers]),
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "Centers by Region");
    }
    if (centersPerformance.length) {
      const ws = XLSX.utils.aoa_to_sheet([
        [
          "Center",
          "Partner",
          "State",
          "Students Trained",
          "Placed",
          "Placement %",
        ],
        ...centersPerformance.map((r) => [
          r.center_name,
          r.partner_name,
          r.state || "",
          r.students_trained,
          r.placed,
          r.placement_pct,
        ]),
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "Center Performance");
    }
    XLSX.writeFile(wb, `SEIF_Analytics_Report_${yearLabel}.xlsx`);
  }

  const periodExportControls = controlsPlacement.at ? (
    <ReportPeriodExportControls
      period={reportPeriod}
      onPeriodChange={handleReportPeriodChange}
      canExportExcel={canExportExcel}
      exporting={exporting}
      disabled={exporting}
      onExportPng={exportPng}
      onExportPdf={exportPdf}
      onExportExcel={exportExcel}
    />
  ) : null;

  return (
    <MainLayout>
      <div
        ref={dashboardRef}
        className={`space-y-6 p-6 ${canCustomise && layoutEditMode ? "pl-14" : ""}`}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          data-export-ignore="true"
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Impact &amp; Performance Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Training outcomes across all partners, centers and courses
              {year !== "all" ? ` for ${year}` : ""}.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <div className="min-w-[220px] max-w-[320px]">
              <MultiSelect
                options={DOMAIN_SELECT_OPTIONS}
                selected={domains}
                onChange={handleDomainsChange}
                placeholder="Select domains…"
                searchPlaceholder="Search domains…"
                emptyMessage="No domains found."
                maxDisplay={2}
                className="w-full"
              />
            </div>
            {canCustomise && (
              <>
                <button
                  onClick={() => setLayoutEditMode((v) => !v)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    layoutEditMode
                      ? "text-white bg-[#009530] border-[#009530]"
                      : "text-gray-700 bg-white border-[#A5A5A5] hover:border-[#009530] hover:text-[#009530] hover:bg-green-50"
                  }`}
                >
                  <Bars3Icon className="w-4 h-4" />
                  Customise
                </button>
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-[#A5A5A5] hover:border-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                  Edit
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md flex items-start justify-between gap-3">
            <p className="text-sm text-yellow-700">
              <span className="font-medium">Notice: </span>
              {error} — data may be incomplete. Retry by changing the report
              period.
            </p>
            <button
              onClick={() => setError(null)}
              className="shrink-0 text-yellow-500 hover:text-yellow-700 transition-colors mt-0.5"
              aria-label="Dismiss"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Edit Layout Banner ─────────────────────────────────────── */}
        {layoutEditMode && (
          <div
            className="flex items-center justify-between gap-4 px-5 py-3 rounded-xl
            bg-[#009530]/8 border-2 border-[#009530]/30"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#009530] text-white shrink-0">
                <Bars3Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#009530]">
                  Layout Edit Mode
                </p>
                <p className="text-xs text-gray-500">
                  Drag the <span className="font-medium">≡ handle</span> on any
                  row to reorder &nbsp;·&nbsp; Use{" "}
                  <span className="font-medium">Place card alongside</span> to
                  put two cards side by side &nbsp;·&nbsp; Pick a{" "}
                  <span className="font-medium">width split</span> to adjust
                  proportions
                </p>
              </div>
            </div>
            <button
              onClick={() => setLayoutEditMode(false)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-semibold
                text-white bg-[#009530] hover:bg-[#007a28] rounded-lg transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
              Done
            </button>
          </div>
        )}

        {/* ── Dashboard content ─────────────────────────────────────────── */}
        <div ref={captureRef} className="space-y-6">
          {/* ── Impact header ────────────────────────────────────────────── */}
          {showImpactHeader && (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Impact</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Students, employment, courses, partners and centers
                  {year !== "all" ? ` · ${year}` : " · All years"}
                </p>
              </div>
              {controlsPlacement.at === "impact" ? periodExportControls : null}
            </div>
          )}

          {/* ── KPI Cards ─────────────────────────────────────────────────── */}
          {visibleKpiCards.length > 0 &&
            (loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 min-[1400px]:grid-cols-6 gap-4">
                {Array.from({ length: visibleKpiCards.length }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-[16px] border border-[#A5A5A5] p-3 min-h-[150px]"
                  >
                    <Skeleton h="h-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 min-[1400px]:grid-cols-6">
                {visibleKpiCards.map((c) => (
                  <DraggableCard
                    key={c.key}
                    id={c.key}
                    canDrag={canCustomise}
                    onDragStart={handleKpiDragStart}
                    onDragEnter={handleKpiDragEnter}
                    onDragEnd={handleKpiDragEnd}
                    isDragOver={
                      kpiOverId === c.key && kpiDragId.current !== c.key
                    }
                  >
                    <StatCard
                      title={c.title}
                      value={fmt(c.value)}
                      trend="up"
                      graphData={sparkline(c.value)}
                    />
                  </DraggableCard>
                ))}
              </div>
            ))}

          {/* ── Section rows ─────────────────────────────────────────────── */}
          <div className="space-y-8">
            {layoutRows.map((row, rowIdx) => {
              // Filter to visible slots only
              const visibleSlots = row.slots.filter((s) =>
                isImpactSectionShown(s.id),
              );
              if (visibleSlots.length === 0) return null;

              // Other single-card rows available for pairing (for the "Place alongside" menu)
              const singleRowIds = canCustomise
                ? layoutRows
                    .filter(
                      (r, i) =>
                        i !== rowIdx &&
                        r.slots.length === 1 &&
                        isImpactSectionShown(r.slots[0].id),
                    )
                    .map((r) => r.slots[0].id)
                : [];

              // Effective row: if one slot of a 2-card row is hidden, show the other full-width
              const effectiveSlots =
                row.slots.length === 2
                  ? row.slots.filter((s) => isImpactSectionShown(s.id))
                  : visibleSlots;
              const isSplit = effectiveSlots.length === 2;

              const rowKey = row.slots.map((s) => s.id).join("+");

              return (
                <DraggableRow
                  key={rowKey}
                  rowIdx={rowIdx}
                  row={row}
                  isDragOver={
                    overRowIdx === rowIdx && dragRowIdx.current !== rowIdx
                  }
                  canCustomise={canCustomise}
                  editMode={layoutEditMode}
                  singleRowIds={singleRowIds}
                  onDragStart={handleDragStart}
                  onDragEnter={handleDragEnter}
                  onDragEnd={handleDragEnd}
                  onPair={handlePair}
                  onUnpair={handleUnpair}
                  onRatioChange={handleRatioChange}
                >
                  {/* Row content: flex layout for side-by-side */}
                  <div
                    className={isSplit ? "flex gap-6 items-stretch" : "block"}
                  >
                    {row.slots.map((slot, slotIdx) => {
                      if (!isImpactSectionShown(slot.id)) return null;
                      return (
                        <div
                          key={slot.id}
                          style={
                            isSplit
                              ? { flex: slot.flex, minWidth: 0 }
                              : undefined
                          }
                          className={
                            isSplit
                              ? "relative group/card flex flex-col"
                              : "relative group/card"
                          }
                        >
                          {/* Ungroup button — always visible in edit mode */}
                          {layoutEditMode && isSplit && (
                            <button
                              onClick={() => handleUnpair(rowIdx, slotIdx)}
                              title="Move to its own row"
                              className="absolute -top-2 -right-2 z-20 flex items-center justify-center
                              w-6 h-6 rounded-full bg-white border border-red-200 shadow-md
                              text-red-400 hover:text-red-600 hover:border-red-400 hover:scale-110
                              transition-all duration-150"
                            >
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          )}
                          <SectionRenderer
                            id={slot.id}
                            loading={loading}
                            data={sectionData}
                          />
                        </div>
                      );
                    })}
                  </div>
                </DraggableRow>
              );
            })}
          </div>

          {showCertification && (
            <CertificationReportsPanel
              period={reportPeriod}
              headerActions={
                controlsPlacement.at === "certification"
                  ? periodExportControls
                  : null
              }
            />
          )}

          {showRefurbishment && (
            <RefurbishmentReportsPanel
              period={reportPeriod}
              headerActions={
                controlsPlacement.at === "refurbishment"
                  ? periodExportControls
                  : null
              }
            />
          )}

          {/* ── Empty state ──────────────────────────────────────────────── */}
          {!loading && !error && nothingVisible && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Cog6ToothIcon className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-500">
                All sections are hidden
              </h3>
              {canCustomise && (
                <p className="text-sm text-gray-400 mt-1">
                  Click <strong>Customise</strong> to enable sections, or select
                  domains above.
                </p>
              )}
              {!canCustomise && (
                <p className="text-sm text-gray-400 mt-1">
                  Select one or more domains above to view reports.
                </p>
              )}
            </div>
          )}
        </div>
        {/* end captureRef */}
      </div>
      {/* end dashboardRef */}

      {/* ── Config Drawer ─────────────────────────────────────────────── */}
      {drawerOpen && (
        <ConfigDrawer
          config={config}
          onToggle={handleToggle}
          onClose={() => setDrawerOpen(false)}
          onReset={handleReset}
        />
      )}
    </MainLayout>
  );
};

export default ReportsPage;
