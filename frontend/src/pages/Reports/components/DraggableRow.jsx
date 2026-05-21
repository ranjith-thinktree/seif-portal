import React, { useState, useEffect, useRef } from "react";
import { Bars3Icon, PlusIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { RATIO_PRESETS, SECTION_META } from "../reports.constants";

export default function DraggableRow({
  rowIdx,
  row,
  isDragOver,
  canCustomise,
  editMode,
  singleRowIds,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onPair,
  onUnpair,
  onRatioChange,
  children,
}) {
  const [showPairMenu, setShowPairMenu] = useState(false);
  const isSplit = row.slots.length === 2;
  const activeA = isSplit ? row.slots[0].flex : null;

  // Close pair menu on outside click
  const menuRef = useRef(null);
  useEffect(() => {
    if (!showPairMenu) return;
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setShowPairMenu(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPairMenu]);

  return (
    <div
      onDragEnter={
        editMode
          ? (e) => {
              e.preventDefault();
              onDragEnter(rowIdx);
            }
          : undefined
      }
      onDragOver={editMode ? (e) => e.preventDefault() : undefined}
      className={`relative transition-all duration-200 ${
        isDragOver ? "ring-2 ring-[#009530] ring-offset-2 rounded-xl" : ""
      } ${
        editMode
          ? "rounded-xl border-2 border-dashed border-[#009530]/30 p-3"
          : ""
      }`}
    >
      {/* Row drag handle — always visible in edit mode */}
      {editMode && (
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            onDragStart(rowIdx);
          }}
          onDragEnd={onDragEnd}
          title="Drag to reorder this row"
          className="absolute -left-10 top-1/2 -translate-y-1/2 z-10
            flex items-center justify-center w-8 h-10 rounded-lg
            text-[#009530] bg-green-50 border border-[#009530]/20
            cursor-grab active:cursor-grabbing select-none hover:bg-green-100 transition-colors"
        >
          <Bars3Icon className="w-5 h-5" />
        </div>
      )}

      {/* Row content */}
      {children}

      {/* Controls bar — always visible in edit mode */}
      {editMode && (
        <div className="flex items-center flex-wrap gap-2 mt-3 pt-2.5 border-t border-[#009530]/20 min-h-[36px]">
          {/* Ratio pills — for 2-card rows */}
          {isSplit && (
            <>
              <span className="text-xs font-medium text-gray-500 mr-1 whitespace-nowrap">
                Width split:
              </span>
              {RATIO_PRESETS.map((p) => {
                const active = activeA === p.a;
                return (
                  <button
                    key={p.label}
                    onClick={() => onRatioChange(rowIdx, p.a, p.b)}
                    className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                      active
                        ? "bg-[#009530] text-white border-[#009530] shadow-sm"
                        : "text-gray-500 border-gray-200 hover:border-[#009530] hover:text-[#009530] bg-white"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </>
          )}

          {/* Pair button — for single-card rows */}
          {!isSplit && singleRowIds.length > 0 && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowPairMenu((v) => !v)}
                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-all ${
                  showPairMenu
                    ? "bg-[#009530] text-white border-[#009530]"
                    : "text-[#009530] border-[#009530]/40 bg-green-50 hover:bg-[#009530] hover:text-white hover:border-[#009530]"
                }`}
              >
                <PlusIcon className="w-4 h-4" />
                Place card alongside
              </button>

              {showPairMenu && (
                <div className="absolute top-full mt-1.5 left-0 z-30 bg-white rounded-xl shadow-xl border border-[#A5A5A5] py-1.5 min-w-[220px]">
                  <p className="px-4 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Select a card to place alongside
                  </p>
                  {singleRowIds.map((sid) => (
                    <button
                      key={sid}
                      onClick={() => {
                        onPair(rowIdx, sid);
                        setShowPairMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-[#009530] transition-colors flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#009530]/40 shrink-0" />
                      {SECTION_META[sid]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Label for paired rows */}
          {isSplit && (
            <span className="ml-auto text-xs text-gray-400 italic">
              side-by-side
            </span>
          )}
        </div>
      )}
    </div>
  );
}
