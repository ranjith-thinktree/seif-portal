import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import {
  Plus,
  Trash2,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  getDashboardData,
  updateDashboardData,
} from "../../services/certification.service";
import {
  YEAR_TOTAL_FIELDS,
  MONTH_FIELDS,
  MONTHS,
  emptyYearData,
  applyMonthlyChange,
  applyAnnualChange,
  recomputeAllYears,
} from "../../utils/dashboardMetrics";

const MONTH_LABELS = {
  january: "January",
  february: "February",
  march: "March",
  april: "April",
  may: "May",
  june: "June",
  july: "July",
  august: "August",
  september: "September",
  october: "October",
  november: "November",
  december: "December",
};

const DashboardDataEditor = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState("all");
  const [addingYear, setAddingYear] = useState(false);
  const [newYearInput, setNewYearInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [monthlyExpanded, setMonthlyExpanded] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboardData();
      if (res.success) {
        setData(recomputeAllYears(res.data || {}));
      } else {
        setError(res.message || "Failed to load dashboard data");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedYears = data
    ? [
        "all",
        ...Object.keys(data)
          .filter((y) => y !== "all")
          .sort(),
      ]
    : ["all"];

  const handleYearTotalChange = (field, value) => {
    if (selectedYear === "all") return;
    setData((prev) => applyAnnualChange(prev, selectedYear, field, value));
  };

  const handleMonthlyChange = (month, field, value) => {
    setData((prev) =>
      applyMonthlyChange(prev, selectedYear, month, field, value),
    );
  };

  const handleAddYear = () => {
    const trimmed = newYearInput.trim();
    if (!/^\d{4}$/.test(trimmed)) {
      toast.error("Year must be a 4-digit number (e.g. 2026)");
      return;
    }
    if (data[trimmed]) {
      toast.error(`Year ${trimmed} already exists`);
      return;
    }
    setData((prev) => ({ ...prev, [trimmed]: emptyYearData() }));
    setSelectedYear(trimmed);
    setNewYearInput("");
    setAddingYear(false);
    toast.success(`Year ${trimmed} added — fill in values and click Save`);
  };

  const handleRemoveYear = (year) => {
    if (year === "all") return;
    setData((prev) => {
      const next = { ...prev };
      delete next[year];
      return recomputeAllYears(next);
    });
    setSelectedYear("all");
    setDeleteConfirm(null);
    toast.success(`Year ${year} removed — click Save to persist`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateDashboardData(recomputeAllYears(data));
      if (res.success) {
        if (res.data) setData(recomputeAllYears(res.data));
        toast.success("Dashboard data saved successfully!");
      } else {
        toast.error(res.message || "Save failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading dashboard data…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const currentYearData = data[selectedYear] || {};
  const hasMonthly = selectedYear !== "all" && currentYearData.monthly;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Edit historical student training statistics shown on the Overview
        dashboard. Changes are saved directly to the server data file and
        reflect immediately on the overview page.
      </p>

      {/* ── Year Selector ── */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Select Year
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {sortedYears.map((year) => (
            <div key={year} className="relative">
              <button
                onClick={() => {
                  setSelectedYear(year);
                  setDeleteConfirm(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  selectedYear === year
                    ? "bg-[#009530] text-white border-[#009530]"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {year === "all" ? "All Years" : year}
              </button>
              {/* Inline delete confirmation popover */}
              {year !== "all" && deleteConfirm === year && (
                <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-red-200 rounded-lg shadow-xl p-3 w-44">
                  <p className="text-xs text-gray-700 mb-2 font-medium">
                    Remove year {year}?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRemoveYear(year)}
                      className="flex-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Year */}
          {addingYear ? (
            <div className="flex items-center gap-2">
              <Input
                value={newYearInput}
                onChange={(e) => setNewYearInput(e.target.value)}
                placeholder="e.g. 2026"
                className="w-24 h-9 text-sm"
                maxLength={4}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddYear();
                  if (e.key === "Escape") {
                    setAddingYear(false);
                    setNewYearInput("");
                  }
                }}
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleAddYear}
                className="bg-[#009530] hover:bg-green-700 text-white h-9"
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAddingYear(false);
                  setNewYearInput("");
                }}
                className="h-9"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setAddingYear(true)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-white border border-dashed border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Year
            </button>
          )}
        </div>
      </div>

      {/* ── Year Header with Delete ── */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          {selectedYear === "all"
            ? "Overall Custom Totals (All Years Combined)"
            : `Year ${selectedYear} — Annual Data`}
        </h3>
        {selectedYear !== "all" && (
          <button
            onClick={() =>
              setDeleteConfirm(
                deleteConfirm === selectedYear ? null : selectedYear,
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove Year
          </button>
        )}
      </div>

      {/* ── Year Totals Card ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-700">
            {selectedYear === "all" ? "Cumulative Totals" : "Annual Totals"}
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            {selectedYear === "all"
              ? "Sum of every year's annual totals. Edit a year to change these numbers."
              : "Editing a month updates this total. Editing a total here clears that field in every month."}
          </p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {YEAR_TOTAL_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {label}
                  {key === "total_students" ? " (India + GI + NSI)" : ""}
                </label>
                <Input
                  type="number"
                  min="0"
                  readOnly={selectedYear === "all" || key === "total_students"}
                  value={currentYearData[key] ?? 0}
                  onChange={(e) => handleYearTotalChange(key, e.target.value)}
                  className={`h-9 text-sm ${selectedYear === "all" || key === "total_students" ? "bg-gray-50" : ""}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Monthly Breakdown (for non-"all" years) ── */}
      {hasMonthly && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Collapsible header */}
          <button
            onClick={() => setMonthlyExpanded(!monthlyExpanded)}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div>
              <h4 className="text-sm font-semibold text-gray-700 text-left">
                Monthly Breakdown
              </h4>
              <p className="text-xs text-gray-500 mt-0.5 text-left">
                Edit individual month statistics for {selectedYear}
              </p>
            </div>
            {monthlyExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {monthlyExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[110px] border-r border-gray-200">
                      Month
                    </th>
                    {MONTH_FIELDS.map(({ label }) => (
                      <th
                        key={label}
                        className="text-center px-2 py-3 font-semibold text-gray-600 min-w-[95px]"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MONTHS.map((month, idx) => {
                    const monthData = currentYearData.monthly?.[month] || {};
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={month}
                        className={isEven ? "bg-white" : "bg-gray-50/60"}
                      >
                        <td
                          className="px-4 py-1.5 font-medium text-gray-700 sticky left-0 z-10 border-r border-gray-200 capitalize"
                          style={{
                            backgroundColor: isEven
                              ? "white"
                              : "rgb(249 250 251 / 0.6)",
                          }}
                        >
                          {MONTH_LABELS[month]}
                        </td>
                        {MONTH_FIELDS.map(({ key }) => (
                          <td key={key} className="px-1.5 py-1">
                            <Input
                              type="number"
                              min="0"
                              readOnly={key === "total"}
                              value={monthData[key] ?? 0}
                              onChange={(e) =>
                                handleMonthlyChange(month, key, e.target.value)
                              }
                              className={`h-7 text-xs text-right px-2 w-full ${key === "total" ? "bg-gray-50" : ""}`}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Save / Reload Bar ── */}
      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> Saved changes are written directly to the
          server data file and affect the Overview dashboard immediately.
        </p>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading || saving}
            className="h-9"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Reload
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#009530] hover:bg-green-700 text-white h-9"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardDataEditor;
