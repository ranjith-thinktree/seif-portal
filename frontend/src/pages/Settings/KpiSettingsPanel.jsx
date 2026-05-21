import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import {
  getKpiSettings,
  updateKpiSetting,
  KPI_CARD_DEFINITIONS,
  getKpiLiveValues,
  reorderKpiSettings,
} from "../../services/kpi.service";

const YEAR_OPTIONS = [
  { value: "all", label: "All Years (Global)" },
  { value: "2023-24", label: "2023-24" },
  { value: "2024-25", label: "2024-25" },
  { value: "2025-26", label: "2025-26" },
];

/**
 * Admin panel for managing KPI card order, custom values, and visibility.
 * Drag rows to reorder; the order is persisted globally and reflected on the dashboard.
 */
const KpiSettingsPanel = () => {
  const [selectedYear, setSelectedYear] = useState("all");
  const [settings, setSettings] = useState({});
  const [orderedDefs, setOrderedDefs] = useState([...KPI_CARD_DEFINITIONS]);
  const [liveValues, setLiveValues] = useState({});
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [loadError, setLoadError] = useState(null);
  const dragIndexRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await getKpiSettings(selectedYear);
      setSettings(data);
      // Sort order is global — only update orderedDefs when on the 'all' view
      if (selectedYear === "all") {
        const sorted = [...KPI_CARD_DEFINITIONS].sort((a, b) => {
          const orderA = data[a.key]?.sortOrder ?? 99;
          const orderB = data[b.key]?.sortOrder ?? 99;
          return orderA - orderB;
        });
        setOrderedDefs(sorted);
      }
    } catch {
      setLoadError("Failed to load KPI settings.");
    }
  }, [selectedYear]);

  // Fetch live DB counts once on mount (year-independent)
  useEffect(() => {
    getKpiLiveValues()
      .then(setLiveValues)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleCustomValueChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        customValue: value === "" ? "" : parseInt(value, 10) || 0,
      },
    }));
  };

  const handleCustomLabelChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        customLabel: value,
      },
    }));
  };

  const handleToggleVisibility = async (key) => {
    const current = settings[key]?.isVisible !== false;
    const newIsVisible = !current;
    await saveField(key, { isVisible: newIsVisible });
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], isVisible: newIsVisible },
    }));
  };

  const saveField = async (key, payload) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      await updateKpiSetting(key, { year: selectedYear, ...payload });
      setSaved((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 1500);
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const saveCustomValue = async (key) => {
    const val = settings[key]?.customValue;
    await saveField(key, {
      customValue: val === "" ? 0 : parseInt(val, 10) || 0,
    });
  };

  const saveCustomLabel = async (key) => {
    await saveField(key, {
      year: "all",
      customLabel: settings[key]?.customLabel ?? "",
    });
  };

  // ── Drag & Drop handlers ──────────────────────────────────────────────────
  const handleDragStart = (e, idx) => {
    dragIndexRef.current = idx;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(idx);
  };

  const handleDrop = async (e, dropIdx) => {
    e.preventDefault();
    const fromIdx = dragIndexRef.current;
    if (fromIdx === null || fromIdx === dropIdx) {
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...orderedDefs];
    const [dragged] = newOrder.splice(fromIdx, 1);
    newOrder.splice(dropIdx, 0, dragged);

    setOrderedDefs(newOrder);
    setDragOverIndex(null);
    dragIndexRef.current = null;

    try {
      await reorderKpiSettings(newOrder.map((d) => d.key));
    } catch {
      // Rollback on failure
      setOrderedDefs(orderedDefs);
    }
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Info bar */}
      <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
        <span className="text-green-600 mt-0.5">ℹ</span>
        <span>
          Drag rows to reorder KPI cards on the dashboard. Set a custom value to
          add to the live count, rename the dashboard title, or hide individual
          cards. Order and titles are global — custom values and visibility can
          be configured per financial year.
        </span>
      </div>

      {/* Year Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">
          Financial Year:
        </label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y.value} value={y.value}>
              {y.label}
            </option>
          ))}
        </select>
      </div>

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {/* KPI Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 w-10" />
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                KPI Card
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-700 w-32">
                Live DB Count
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-700 w-44">
                Custom Value{" "}
                <span className="font-normal text-gray-400">(+ added)</span>
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-700 w-32">
                Displayed Total
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-700 w-24">
                Visible
              </th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orderedDefs.map((definition, idx) => {
              const { key, label } = definition;
              const setting = settings[key] || {
                customValue: 0,
                isVisible: true,
                customLabel: "",
              };
              const isVisible = setting.isVisible !== false;
              const liveCount =
                typeof liveValues[key] === "number" ? liveValues[key] : null;
              const customVal =
                typeof setting.customValue === "number"
                  ? setting.customValue
                  : 0;
              const displayedTotal =
                liveCount !== null ? liveCount + customVal : null;
              const isDragTarget =
                dragOverIndex === idx && dragIndexRef.current !== idx;

              return (
                <tr
                  key={key}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={[
                    "transition-colors select-none",
                    isVisible ? "" : "opacity-50",
                    isDragTarget
                      ? "bg-green-50 border-t-2 border-green-400"
                      : "hover:bg-gray-50",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {/* Drag handle */}
                  <td className="px-3 py-3 text-gray-400 cursor-grab active:cursor-grabbing">
                    <Bars3Icon className="h-4 w-4 mx-auto" />
                  </td>

                  {/* KPI label */}
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <input
                      type="text"
                      value={setting.customLabel ?? ""}
                      onChange={(e) =>
                        handleCustomLabelChange(key, e.target.value)
                      }
                      onBlur={() => saveCustomLabel(key)}
                      placeholder={label}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </td>

                  {/* Live DB count */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-xs">
                      {liveCount !== null ? liveCount.toLocaleString() : "—"}
                    </span>
                  </td>

                  {/* Custom value input */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      value={
                        setting.customValue === ""
                          ? ""
                          : (setting.customValue ?? 0)
                      }
                      onChange={(e) =>
                        handleCustomValueChange(key, e.target.value)
                      }
                      onBlur={() => saveCustomValue(key)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </td>

                  {/* Displayed total */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded bg-green-50 text-green-700 font-semibold text-xs">
                      {displayedTotal !== null
                        ? displayedTotal.toLocaleString()
                        : "—"}
                    </span>
                  </td>

                  {/* Visibility toggle */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleVisibility(key)}
                      disabled={saving[key]}
                      title={isVisible ? "Click to hide" : "Click to show"}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      {isVisible ? (
                        <EyeIcon className="h-5 w-5 text-[#009530]" />
                      ) : (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </td>

                  {/* Save indicator */}
                  <td className="px-4 py-3 text-center">
                    {saved[key] && (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />
                    )}
                    {saving[key] && (
                      <svg
                        className="animate-spin h-4 w-4 text-[#009530] mx-auto"
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
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Drag rows to reorder · Titles and order apply across all years · Custom
        values save on blur · Visibility toggles instantly
      </p>
    </div>
  );
};

export default KpiSettingsPanel;
