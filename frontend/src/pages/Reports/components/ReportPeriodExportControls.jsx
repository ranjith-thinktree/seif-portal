import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  DocumentArrowDownIcon,
  PhotoIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { GREEN } from "../reports.constants";
import {
  REPORT_PERIOD_MODE_OPTIONS,
  getSharedFyOptions,
  getSharedMonthOptions,
  getSharedYearOptions,
  normalizeReportPeriod,
} from "../reports.sharedPeriod";

const selectClass =
  "appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer";
const dateClass =
  "bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";

const SelectChevron = () => (
  <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
);

/**
 * Inline Report period + Export (no card).
 * Period modes drive Cert/Refurb; FY also drives Impact year via onChange.
 */
const ReportPeriodExportControls = ({
  period,
  onPeriodChange,
  canExportExcel = false,
  exporting = false,
  disabled = false,
  onExportPng,
  onExportPdf,
  onExportExcel,
}) => {
  const draft = normalizeReportPeriod(period);
  const monthOptions = useMemo(() => getSharedMonthOptions(), []);
  const yearOptions = useMemo(() => getSharedYearOptions(6), []);
  const fyOptions = useMemo(() => getSharedFyOptions(6), []);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const update = (patch) => {
    onPeriodChange?.(normalizeReportPeriod({ ...draft, ...patch }));
  };

  return (
    <div
      data-export-ignore="true"
      className="flex flex-wrap items-center justify-end gap-2"
    >
      <div className="relative">
        <select
          value={draft.mode}
          onChange={(e) => update({ mode: e.target.value })}
          className={selectClass}
          aria-label="Report period mode"
          disabled={disabled}
        >
          {REPORT_PERIOD_MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <SelectChevron />
      </div>

      {draft.mode === "month" && (
        <>
          <div className="relative">
            <select
              value={draft.month}
              onChange={(e) => update({ month: e.target.value })}
              className={selectClass}
              aria-label="Report month"
              disabled={disabled}
            >
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
          <div className="relative">
            <select
              value={draft.year}
              onChange={(e) => update({ year: e.target.value })}
              className={selectClass}
              aria-label="Report year"
              disabled={disabled}
            >
              {yearOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </>
      )}

      {draft.mode === "day" && (
        <input
          type="date"
          value={draft.day}
          onChange={(e) => update({ day: e.target.value })}
          className={dateClass}
          aria-label="Report day"
          disabled={disabled}
        />
      )}

      {draft.mode === "range" && (
        <>
          <input
            type="date"
            value={draft.fromDate}
            onChange={(e) => update({ fromDate: e.target.value })}
            className={dateClass}
            aria-label="Report from date"
            disabled={disabled}
          />
          <span className="text-xs text-gray-500">to</span>
          <input
            type="date"
            value={draft.toDate}
            onChange={(e) => update({ toDate: e.target.value })}
            className={dateClass}
            aria-label="Report to date"
            disabled={disabled}
          />
        </>
      )}

      {draft.mode === "calendar_year" && (
        <div className="relative">
          <select
            value={draft.year}
            onChange={(e) => update({ year: e.target.value })}
            className={selectClass}
            aria-label="Report calendar year"
            disabled={disabled}
          >
            {yearOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <SelectChevron />
        </div>
      )}

      {draft.mode === "financial_year" && (
        <div className="relative">
          <select
            value={draft.fyStartYear}
            onChange={(e) => update({ fyStartYear: e.target.value })}
            className={selectClass}
            aria-label="Report financial year"
            disabled={disabled}
          >
            {fyOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <SelectChevron />
        </div>
      )}

      <div className="relative" ref={exportRef}>
        <button
          type="button"
          onClick={() => setExportOpen((v) => !v)}
          disabled={disabled || exporting}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 hover:opacity-90"
          style={{ backgroundColor: GREEN }}
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          {exporting ? "Exporting…" : "Export"}
          <ChevronDownIcon className="w-3 h-3" />
        </button>
        {exportOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <button
              type="button"
              onClick={() => {
                setExportOpen(false);
                onExportPng?.();
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <PhotoIcon className="w-4 h-4 text-gray-400" />
              Export as PNG
            </button>
            <button
              type="button"
              onClick={() => {
                setExportOpen(false);
                onExportPdf?.();
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <DocumentArrowDownIcon className="w-4 h-4 text-gray-400" />
              Export as PDF
            </button>
            {canExportExcel && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  onClick={() => {
                    setExportOpen(false);
                    onExportExcel?.();
                  }}
                  className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <TableCellsIcon className="w-4 h-4 text-gray-400" />
                  Export as Excel
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportPeriodExportControls;
