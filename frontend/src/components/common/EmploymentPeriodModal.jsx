import { useState, useEffect } from "react";
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

const MONTHS = [
  { num: 1, short: "Jan", full: "January" },
  { num: 2, short: "Feb", full: "February" },
  { num: 3, short: "Mar", full: "March" },
  { num: 4, short: "Apr", full: "April" },
  { num: 5, short: "May", full: "May" },
  { num: 6, short: "Jun", full: "June" },
  { num: 7, short: "Jul", full: "July" },
  { num: 8, short: "Aug", full: "August" },
  { num: 9, short: "Sep", full: "September" },
  { num: 10, short: "Oct", full: "October" },
  { num: 11, short: "Nov", full: "November" },
  { num: 12, short: "Dec", full: "December" },
];

/**
 * EmploymentPeriodModal
 * Lets users pick a From and To period (month+year) before downloading the employment template.
 * Filters by batch_start_date falling within the selected range.
 *
 * Props:
 *   availablePeriods — null = loading, [] = no data, [{year, months[]}] = loaded
 *   onConfirm({ fromYear, fromMonth, toYear, toMonth }) — called with selected range
 */
const EmploymentPeriodModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  availablePeriods = null,
  error = null,
}) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [fromMonth, setFromMonth] = useState(1);
  const [fromYear, setFromYear] = useState(currentYear);
  const [toMonth, setToMonth] = useState(currentMonth);
  const [toYear, setToYear] = useState(currentYear);

  // When periods load (or modal opens fresh), default to most-recent available year
  useEffect(() => {
    if (isOpen && availablePeriods && availablePeriods.length > 0) {
      const mostRecentYear = availablePeriods[0].year;
      setFromMonth(1);
      setFromYear(mostRecentYear);
      setToMonth(12);
      setToYear(mostRecentYear);
    }
  }, [isOpen, availablePeriods]);

  if (!isOpen) return null;

  const isPeriodsLoading = availablePeriods === null;
  const hasNoPeriods = !isPeriodsLoading && availablePeriods.length === 0;

  // Available years from data (most recent first)
  const availableYears =
    availablePeriods && availablePeriods.length > 0
      ? availablePeriods.map((p) => p.year)
      : [currentYear];

  // Validation: To must be >= From
  const fromVal = fromYear * 100 + fromMonth;
  const toVal = toYear * 100 + toMonth;
  const isRangeValid = toVal >= fromVal;

  const fromLabel = `${MONTHS[fromMonth - 1].short} ${fromYear}`;
  const toLabel = `${MONTHS[toMonth - 1].short} ${toYear}`;
  const rangeLabel =
    fromVal === toVal ? fromLabel : `${fromLabel} → ${toLabel}`;

  const handleConfirm = () => {
    if (!isRangeValid) return;
    onConfirm({ fromYear, fromMonth, toYear, toMonth });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <CalendarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Download Employment Template
              </h2>
              <p className="text-xs text-primary-100 mt-0.5">
                Select batch start date range to include
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {isPeriodsLoading ? (
          /* Loading skeleton */
          <div className="p-6 space-y-5 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i}>
                <div className="h-3 w-10 bg-gray-200 rounded mb-3" />
                <div className="flex gap-2">
                  <div className="h-10 flex-1 bg-gray-200 rounded-lg" />
                  <div className="h-10 w-24 bg-gray-200 rounded-lg" />
                </div>
              </div>
            ))}
            <div className="h-10 bg-gray-100 rounded-lg" />
          </div>
        ) : hasNoPeriods ? (
          /* No data state */
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 mb-4">
              <CalendarIcon className="h-7 w-7 text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-1">
              No approved student data found
            </p>
            <p className="text-xs text-gray-500">
              Upload and get student records approved before downloading the
              employment template.
            </p>
          </div>
        ) : (
          /* Range selector */
          <div className="p-6 space-y-4">
            {/* From row */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                From
              </p>
              <div className="flex gap-2">
                <select
                  value={fromMonth}
                  onChange={(e) => setFromMonth(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                >
                  {MONTHS.map((m) => (
                    <option key={m.num} value={m.num}>
                      {m.full}
                    </option>
                  ))}
                </select>
                <select
                  value={fromYear}
                  onChange={(e) => setFromYear(Number(e.target.value))}
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* To row */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                To
              </p>
              <div className="flex gap-2">
                <select
                  value={toMonth}
                  onChange={(e) => setToMonth(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                >
                  {MONTHS.map((m) => (
                    <option key={m.num} value={m.num}>
                      {m.full}
                    </option>
                  ))}
                </select>
                <select
                  value={toYear}
                  onChange={(e) => setToYear(Number(e.target.value))}
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Validation error */}
            {!isRangeValid && (
              <p className="text-xs text-red-600 font-medium">
                &quot;To&quot; period must be the same as or after
                &quot;From&quot; period.
              </p>
            )}

            {/* Summary pill */}
            <div
              className={`rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm transition-colors ${
                isRangeValid
                  ? "bg-primary-50 border border-primary-200 text-primary-800"
                  : "bg-gray-50 border border-gray-200 text-gray-400"
              }`}
            >
              <CalendarIcon className="h-4 w-4 shrink-0" />
              <span className="font-medium">{rangeLabel}</span>
            </div>
          </div>
        )}

        {/* Download error banner — shown inside modal */}
        {error && (
          <div className="mx-6 mb-2 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <ExclamationCircleIcon className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {!hasNoPeriods && (
            <button
              onClick={handleConfirm}
              disabled={isLoading || isPeriodsLoading || !isRangeValid}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download Template
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmploymentPeriodModal;
