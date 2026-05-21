import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { KPI_LABELS, SECTION_LABELS } from "../reports.constants";
import { Toggle } from "../reports.helpers";

export default function ConfigDrawer({ config, onToggle, onClose, onReset }) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl border-l border-[#A5A5A5] z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#A5A5A5]">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Customise Report
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Control what is displayed on this page
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          {/* KPI Cards section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                KPI Cards
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    Object.keys(KPI_LABELS).forEach(
                      (k) => !config[k] && onToggle(k, true),
                    )
                  }
                  className="text-xs text-[#009530] hover:underline"
                >
                  All on
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() =>
                    Object.keys(KPI_LABELS).forEach(
                      (k) => config[k] && onToggle(k, false),
                    )
                  }
                  className="text-xs text-gray-400 hover:underline"
                >
                  All off
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {Object.entries(KPI_LABELS).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2 border-b border-gray-50"
                >
                  <span className="text-sm text-gray-700">{label}</span>
                  <Toggle
                    checked={!!config[key]}
                    onChange={(val) => onToggle(key, val)}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Dashboard Sections section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Dashboard Sections
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    Object.keys(SECTION_LABELS).forEach(
                      (k) => !config[k] && onToggle(k, true),
                    )
                  }
                  className="text-xs text-[#009530] hover:underline"
                >
                  All on
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() =>
                    Object.keys(SECTION_LABELS).forEach(
                      (k) => config[k] && onToggle(k, false),
                    )
                  }
                  className="text-xs text-gray-400 hover:underline"
                >
                  All off
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {Object.entries(SECTION_LABELS).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2 border-b border-gray-50"
                >
                  <span className="text-sm text-gray-700">{label}</span>
                  <Toggle
                    checked={!!config[key]}
                    onChange={(val) => onToggle(key, val)}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-[#A5A5A5] flex items-center justify-between">
          <button
            onClick={onReset}
            className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
          >
            Reset to defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-[#009530] hover:bg-[#007a28] rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
