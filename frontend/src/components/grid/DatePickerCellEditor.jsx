import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "@heroicons/react/24/outline";
import { Calendar } from "../ui/calendar";

/**
 * DatePickerCellEditor - Custom AG Grid v34 cell editor with Shadcn-style calendar
 * Uses AG Grid v34 modern functional component API (onValueChange + stopEditing)
 */
const DatePickerCellEditor = (props) => {
  const { value, column, onValueChange, stopEditing } = props;

  // Parse initial value to "yyyy-MM-dd"
  const parseDate = (val) => {
    if (!val) return "";
    try {
      const date = new Date(val);
      if (isNaN(date.getTime())) return "";
      return format(date, "yyyy-MM-dd");
    } catch {
      return "";
    }
  };

  const [selectedDate, setSelectedDate] = useState(parseDate(value));
  const [showCalendar, setShowCalendar] = useState(true);

  // Set min/max dates based on column
  const getDateConstraints = () => {
    const today = new Date();
    const field = column.colDef.field;

    if (field === "date_of_birth") {
      const maxDate = new Date(
        today.getFullYear() - 18,
        today.getMonth(),
        today.getDate(),
      );
      const minDate = new Date(today.getFullYear() - 100, 0, 1);
      return { min: minDate, max: maxDate };
    } else if (field === "enrollment_date") {
      const minDate = new Date(today.getFullYear() - 10, 0, 1);
      const maxDate = new Date(today.getFullYear() + 1, 11, 31);
      return { min: minDate, max: maxDate };
    }
    return { min: undefined, max: undefined };
  };

  const constraints = getDateConstraints();

  const handleDateSelect = (date) => {
    if (date) {
      const formatted = format(date, "yyyy-MM-dd");
      setSelectedDate(formatted);
      // Build ISO string preserving local date (avoid UTC-offset shift)
      const isoValue = new Date(formatted + "T00:00:00").toISOString();
      onValueChange(isoValue); // AG Grid v34: notify grid of new value
      setShowCalendar(false);
      stopEditing(); // commit and close editor
    }
  };

  const toggleCalendar = () => setShowCalendar(!showCalendar);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setShowCalendar(false);
      e.stopPropagation();
    }
  };

  const displayDate = selectedDate
    ? format(new Date(selectedDate + "T00:00:00"), "MMM dd, yyyy")
    : "Select date";

  return (
    <div
      className="ag-custom-component-popup"
      onKeyDown={handleKeyDown}
      style={{
        width: "280px",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow:
          "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
        zIndex: 10000,
      }}
    >
      <div className="p-3 border-b border-gray-200">
        <button
          type="button"
          onClick={toggleCalendar}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <CalendarIcon className="h-5 w-5 text-gray-500" />
          <span className="text-gray-700">{displayDate}</span>
        </button>
      </div>

      {showCalendar && (
        <div className="p-2">
          <Calendar
            selected={
              selectedDate ? new Date(selectedDate + "T00:00:00") : null
            }
            onSelect={handleDateSelect}
            minDate={constraints.min}
            maxDate={constraints.max}
          />
        </div>
      )}
    </div>
  );
};

DatePickerCellEditor.displayName = "DatePickerCellEditor";

export default DatePickerCellEditor;
