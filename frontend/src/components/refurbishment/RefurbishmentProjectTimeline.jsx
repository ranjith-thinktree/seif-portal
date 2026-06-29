import React from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";

function fmtDateTime(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * Read-only project status timeline for partners (and reuse elsewhere).
 * @param {{ timeline?: { events?: Array, current_status?: string }, compact?: boolean }} props
 */
export default function RefurbishmentProjectTimeline({ timeline, compact = false }) {
  const events = (timeline?.events || []).filter(
    (event) => event.key !== "completed" && event.status !== "completed",
  );
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Status timeline will appear once the request progresses.
      </p>
    );
  }

  return (
    <div className={`space-y-0 ${compact ? "" : "rounded-2xl border border-gray-200 bg-gray-50/60 p-5"}`}>
      {!compact && (
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Project Status Timeline
        </p>
      )}
      <ol className="space-y-0">
        {events.map((event, index) => {
          const isCurrent = Boolean(event.is_current);
          const isLast = index === events.length - 1;
          const hasDate = Boolean(event.occurred_at);

          return (
            <li key={`${event.key}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
              {!isLast && (
                <span
                  className={`absolute left-[11px] top-6 bottom-0 w-px ${
                    hasDate ? "bg-green-300" : "bg-gray-200"
                  }`}
                  aria-hidden
                />
              )}
              <div className="relative z-10 mt-0.5 shrink-0">
                {hasDate ? (
                  <CheckCircle2
                    className={`w-6 h-6 ${
                      isCurrent ? "text-green-600" : "text-green-500"
                    }`}
                  />
                ) : isCurrent ? (
                  <Clock className="w-6 h-6 text-amber-500" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-300" />
                )}
              </div>
              <div
                className={`flex-1 min-w-0 rounded-xl border px-4 py-3 ${
                  isCurrent
                    ? "border-green-300 bg-green-50 shadow-sm"
                    : hasDate
                      ? "border-gray-200 bg-white"
                      : "border-gray-100 bg-white/70"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={`text-sm font-semibold ${
                      isCurrent ? "text-green-800" : "text-gray-900"
                    }`}
                  >
                    {event.label}
                  </p>
                  {isCurrent && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {hasDate ? fmtDateTime(event.occurred_at) : "Not reached yet"}
                </p>
                {event.detail && (
                  <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed">
                    {event.detail}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
