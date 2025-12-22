import React, { useState, forwardRef, useImperativeHandle } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "@heroicons/react/24/outline";
import { Calendar } from "../ui/calendar";

/**
 * DatePickerCellEditor - Custom AG Grid cell editor with Shadcn-style calendar
 * Production-ready component for Date of Birth and Enrollment Date columns
 *
 * Features:
 * - Beautiful Shadcn-style calendar UI
 * - Calendar icon button trigger
 * - Keyboard navigation (Tab, Enter, Esc)
 * - Min/Max date validation
 * - Visual date selection
 * - Clean AG Grid integration
 */
const DatePickerCellEditor = forwardRef((props, ref) => {
  const { value, column } = props;

  // Parse initial value
  const parseDate = (val) => {
    if (!val) return "";
    try {
      const date = new Date(val);
      if (isNaN(date.getTime())) return "";
      // Format as YYYY-MM-DD for input[type="date"]
      return format(date, "yyyy-MM-dd");
    } catch {
      return "";
    }
  };

  const [selectedDate, setSelectedDate] = useState(parseDate(value));
  const [showCalendar, setShowCalendar] = useState(true); // Auto-show on mount

  // Set min/max dates based on column
  const getDateConstraints = () => {
    const today = new Date();
    const field = column.colDef.field;

    if (field === "date_of_birth") {
      // DOB: Min = 100 years ago, Max = 18 years ago
      const maxDate = new Date(
        today.getFullYear() - 18,
        today.getMonth(),
        today.getDate()
      );
      const minDate = new Date(today.getFullYear() - 100, 0, 1);
      return {
        min: minDate,
        max: maxDate,
      };
    } else if (field === "enrollment_date") {
      // Enrollment: Min = 10 years ago, Max = 1 year in future
      const minDate = new Date(today.getFullYear() - 10, 0, 1);
      const maxDate = new Date(today.getFullYear() + 1, 11, 31);
      return {
        min: minDate,
        max: maxDate,
      };
    }

    return { min: undefined, max: undefined };
  };

  const constraints = getDateConstraints();

  // AG Grid API - required methods
  useImperativeHandle(ref, () => ({
    // Return the current value
    getValue: () => {
      if (!selectedDate) return null;
      // Return as ISO date string
      return new Date(selectedDate).toISOString();
    },

    // Check if value is valid before accepting
    isCancelBeforeStart: () => false,

    // Check if popup should close after selection
    isCancelAfterEnd: () => false,
  }));

  const handleDateSelect = (date) => {
    if (date) {
      setSelectedDate(format(date, "yyyy-MM-dd"));
      // Close calendar after selection
      setTimeout(() => setShowCalendar(false), 100);
    }
  };

  const toggleCalendar = () => {
    setShowCalendar(!showCalendar);
  };

  const handleKeyDown = (e) => {
    // Close on Escape
    if (e.key === "Escape") {
      setShowCalendar(false);
      e.stopPropagation();
    }
  };

  const displayDate = selectedDate
    ? format(new Date(selectedDate), "MMM dd, yyyy")
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
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        zIndex: 10000,
      }}
    >
      {/* Input field with calendar icon */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleCalendar}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <CalendarIcon className="h-5 w-5 text-gray-500" />
            <span className="text-gray-700">{displayDate}</span>
          </button>
        </div>
      </div>

      {/* Calendar dropdown */}
      {showCalendar && (
        <div className="p-2">
          <Calendar
            selected={selectedDate ? new Date(selectedDate) : null}
            onSelect={handleDateSelect}
            minDate={constraints.min}
            maxDate={constraints.max}
          />
        </div>
      )}
    </div>
  );
});

DatePickerCellEditor.displayName = "DatePickerCellEditor";

export default DatePickerCellEditor;
