import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

/**
 * Shadcn-style Calendar Component
 * Clean, minimal calendar UI for date selection
 */
const Calendar = React.forwardRef(
  ({ className, selected, onSelect, minDate, maxDate, ...props }, ref) => {
    const [currentMonth, setCurrentMonth] = React.useState(
      selected ? new Date(selected) : new Date()
    );

    const getDaysInMonth = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      return { daysInMonth, startingDayOfWeek, year, month };
    };

    const isDateDisabled = (date) => {
      if (minDate && date < minDate) return true;
      if (maxDate && date > maxDate) return true;
      return false;
    };

    const isSameDay = (date1, date2) => {
      if (!date1 || !date2) return false;
      return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
      );
    };

    const handlePrevMonth = () => {
      setCurrentMonth(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
      );
    };

    const handleNextMonth = () => {
      setCurrentMonth(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
      );
    };

    const handleDateClick = (day) => {
      const newDate = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      if (!isDateDisabled(newDate)) {
        onSelect?.(newDate);
      }
    };

    const { daysInMonth, startingDayOfWeek, year, month } =
      getDaysInMonth(currentMonth);
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    // Generate calendar days including empty cells for alignment
    const calendarDays = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(day);
    }

    return (
      <div
        ref={ref}
        className={`p-3 bg-white rounded-lg shadow-lg border border-gray-200 ${
          className || ""
        }`}
        {...props}
      >
        {/* Header with month/year and navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <div className="text-sm font-semibold text-gray-900">
            {monthNames[month]} {year}
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-500 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-8" />;
            }

            const date = new Date(year, month, day);
            const isDisabled = isDateDisabled(date);
            const isSelected = selected && isSameDay(date, new Date(selected));
            const isToday = isSameDay(date, new Date());

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDateClick(day)}
                disabled={isDisabled}
                className={`
                  h-8 w-8 text-sm rounded-md flex items-center justify-center
                  transition-colors
                  ${
                    isSelected
                      ? "bg-blue-600 text-white font-semibold hover:bg-blue-700"
                      : isToday
                      ? "bg-blue-50 text-blue-600 font-semibold hover:bg-blue-100"
                      : isDisabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);

Calendar.displayName = "Calendar";

export { Calendar };
