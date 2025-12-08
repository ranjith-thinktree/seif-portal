import React, { useRef, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

/**
 * Reusable DataTable Component
 * Features: Pagination, Custom rendering, Actions, Export, S.NO column, Drag-to-scroll
 */
const DataTable = ({
  columns,
  data,
  pagination,
  onPageChange,
  onExport,
  onRowClick,
  isLoading = false,
  emptyMessage = "No data found",
  showExport = false,
  showSerialNumber = true,
}) => {
  const { page, limit, total, totalPages } = pagination || {};
  const scrollContainerRef = useRef(null);

  // Drag-to-scroll functionality
  useEffect(() => {
    const ele = scrollContainerRef.current;
    if (!ele) return;

    let pos = { top: 0, left: 0, x: 0, y: 0 };
    let isDragging = false;

    const mouseDownHandler = function (e) {
      // Ignore if clicking on buttons, links, or interactive elements
      if (e.target.closest("button, a, input, select, textarea")) return;

      isDragging = false;
      ele.style.cursor = "grabbing";
      ele.style.userSelect = "none";

      pos = {
        left: ele.scrollLeft,
        top: ele.scrollTop,
        x: e.clientX,
        y: e.clientY,
      };

      document.addEventListener("mousemove", mouseMoveHandler);
      document.addEventListener("mouseup", mouseUpHandler);
    };

    const mouseMoveHandler = function (e) {
      const dx = e.clientX - pos.x;
      const dy = e.clientY - pos.y;

      // Mark as dragging if moved more than 5px
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDragging = true;
      }

      if (isDragging) {
        ele.scrollTop = pos.top - dy;
        ele.scrollLeft = pos.left - dx;
      }
    };

    const mouseUpHandler = function () {
      ele.style.cursor = "grab";
      ele.style.userSelect = "";

      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);

      // Small delay to prevent click events after drag
      if (isDragging) {
        setTimeout(() => {
          isDragging = false;
        }, 10);
      }
    };

    // Set initial cursor
    ele.style.cursor = "grab";
    ele.addEventListener("mousedown", mouseDownHandler);

    return () => {
      ele.removeEventListener("mousedown", mouseDownHandler);
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
    };
  }, []);

  const handlePrevPage = () => {
    if (page > 1) {
      onPageChange(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      onPageChange(page + 1);
    }
  };

  const renderCellValue = (row, column) => {
    if (column.render) {
      return column.render(row);
    }

    const value = column.accessor
      .split(".")
      .reduce((obj, key) => obj?.[key], row);

    return value !== null && value !== undefined ? value : "-";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Custom Styles for Vertical Alignment and Column Dividers */}
      <style>{`
        /* Vertical center alignment for table cells */
        .data-table-container td,
        .data-table-container th {
          vertical-align: middle;
        }
        
        /* Column dividers */
        .data-table-container td,
        .data-table-container th {
          border-right: 1px solid #e5e7eb;
        }
        
        /* Remove border from last column */
        .data-table-container td:last-child,
        .data-table-container th:last-child {
          border-right: none;
        }
      `}</style>

      {/* Export Button */}
      {showExport && onExport && (
        <div className="flex justify-end">
          <Button
            onClick={onExport}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      )}

      {/* Table */}
      <div
        ref={scrollContainerRef}
        className="data-table-container rounded-md border bg-white overflow-x-auto custom-scrollbar"
      >
        <Table>
          <TableHeader>
            <TableRow style={{ backgroundColor: "#EFEFEF" }}>
              {showSerialNumber && (
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  S.NO
                </TableHead>
              )}
              {columns.map((column, index) => (
                <TableHead
                  key={index}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider ${
                    column.headerClassName || ""
                  }`}
                  style={{ width: column.width }}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data && data.length > 0 ? (
              data.map((row, rowIndex) => (
                <TableRow
                  key={row.id || rowIndex}
                  className={
                    onRowClick ? "cursor-pointer hover:bg-gray-50" : ""
                  }
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {showSerialNumber && (
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(page - 1) * limit + rowIndex + 1}
                    </TableCell>
                  )}
                  {columns.map((column, colIndex) => (
                    <TableCell
                      key={colIndex}
                      className={`px-6 py-4 whitespace-nowrap text-sm ${
                        column.cellClassName || ""
                      }`}
                    >
                      {renderCellValue(row, column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={
                    showSerialNumber ? columns.length + 1 : columns.length
                  }
                  className="h-24 text-center text-gray-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {data.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
            {Math.min(page * limit, total)} of {total} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={page <= 1}
              className="font-medium"
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={page >= totalPages}
              className="font-medium"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Status Badge Component Helper
 */
export const StatusBadge = ({ status }) => {
  const variants = {
    active: "bg-green-100 text-green-800 py-2 px-4",
    inactive: "bg-gray-100 text-gray-800 py-2 px-4",
    pending: "bg-orange-100 text-orange-800 py-2 px-4",
    approved: "bg-green-100 text-green-800 py-2 px-4",
    rejected: "bg-red-100 text-red-800 py-2 px-4",
    completed: "bg-blue-100 text-blue-800 py-2 px-4",
    cancelled: "bg-red-100 text-red-800 py-2 px-4",
  };

  return (
    <Badge
      className={`${variants[status] || variants.inactive} capitalize`}
      variant="outline"
    >
      {status}
    </Badge>
  );
};

export default DataTable;
