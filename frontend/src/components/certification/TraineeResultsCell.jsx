import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from "../../utils/cn";

const TRAINEE_RESULT_ITEMS = [
  {
    key: "registered",
    short: "R",
    label: "Registered",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    tooltipClass: "text-slate-700",
  },
  {
    key: "attended",
    short: "A",
    label: "Attended",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    tooltipClass: "text-amber-800",
  },
  {
    key: "passed",
    short: "P",
    label: "Passed",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    tooltipClass: "text-emerald-700",
  },
  {
    key: "failed",
    short: "F",
    label: "Failed",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    tooltipClass: "text-red-700",
  },
];

const TraineeResultsCell = ({ row, compact = false, visibleMetrics }) => {
  const values = {
    registered: row?.registered ?? 0,
    attended: row?.attended ?? 0,
    passed: row?.passed ?? 0,
    failed: row?.failed ?? 0,
  };

  const selected =
    Array.isArray(visibleMetrics) && visibleMetrics.length > 0
      ? visibleMetrics.map(String)
      : null;
  const items = selected
    ? TRAINEE_RESULT_ITEMS.filter((item) => selected.includes(item.key))
    : TRAINEE_RESULT_ITEMS;

  if (!items.length) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex flex-wrap items-center gap-1 cursor-help">
            {items.map((item) => (
              <span
                key={item.key}
                className={cn(
                  "inline-flex items-center rounded-full border font-semibold",
                  compact ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs",
                  item.badgeClass,
                )}
              >
                {item.short} {values[item.key]}
              </span>
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3">
          <p className="text-xs font-semibold text-foreground mb-2">
            {selected ? "Selected trainee results" : "Trainees results"}
          </p>
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4 text-sm">
                <span className={cn("font-medium", item.tooltipClass)}>{item.label}</span>
                <span className="font-semibold text-foreground">{values[item.key]}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TraineeResultsCell;
