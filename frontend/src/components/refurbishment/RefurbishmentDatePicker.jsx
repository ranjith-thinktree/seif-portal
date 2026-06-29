import React, { useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

/**
 * Calendar popover date picker — same UX as Schedule Notification modal.
 * @param {string} value - YYYY-MM-DD
 * @param {(iso: string) => void} onChange
 */
export default function RefurbishmentDatePicker({
  value = "",
  onChange,
  placeholder = "Pick a date",
  minDate,
  maxDate,
  className = "",
  id,
}) {
  const [open, setOpen] = useState(false);

  const selectedDateObj = value ? new Date(`${value}T00:00:00`) : null;

  const displayDate = selectedDateObj
    ? selectedDateObj.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : placeholder;

  const handleDateSelect = (date) => {
    if (!date) return;
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    onChange?.(iso);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          className={`w-full h-11 px-4 rounded-xl border text-sm text-left flex items-center gap-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 max-w-xs ${
            selectedDateObj
              ? "border-green-300 bg-green-50/50 text-gray-900"
              : "border-gray-200 bg-white text-gray-400 hover:border-green-300"
          } ${className}`}
        >
          <CalendarDays
            className={`w-4 h-4 shrink-0 ${
              selectedDateObj ? "text-green-600" : "text-gray-400"
            }`}
          />
          <span className={selectedDateObj ? "font-medium" : ""}>
            {displayDate}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 rounded-2xl shadow-xl border-0"
        align="start"
      >
        <Calendar
          selected={selectedDateObj}
          onSelect={handleDateSelect}
          minDate={minDate}
          maxDate={maxDate}
          className="rounded-2xl"
        />
      </PopoverContent>
    </Popover>
  );
}
