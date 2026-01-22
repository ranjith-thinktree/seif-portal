import React, { useState, useEffect } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
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
import { Checkbox } from "../ui/checkbox";
import { cn } from "../../utils/cn";

/**
 * Enhanced DataTable Component with TanStack Table
 * Features:
 * - Column Visibility Toggle
 * - Resizable Columns
 * - Column State Persistence (LocalStorage)
 * - Pagination
 * - Drag-to-scroll
 * - Custom Rendering
 * - Row Selection with Checkboxes (Optional)
 */
const EnhancedDataTable = ({
  columns = [],
  data = [],
  pagination,
  onPageChange,
  onRowClick, // Callback when row is clicked
  isLoading = false,
  emptyMessage = "No data found",
  showSerialNumber = true,
  storageKey = "table", // Unique key for localStorage
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange,
  onTableReady, // Callback to pass table instance to parent
  enableRowSelection = false, // NEW: Enable row selection
  selectedRows = [], // NEW: Controlled selected rows
  onSelectionChange, // NEW: Callback when selection changes
  getRowId, // NEW: Function to get unique row ID
}) => {
  const { page, limit, total, totalPages } = pagination || {};

  // Load column visibility from localStorage or use default
  const getInitialColumnVisibility = () => {
    if (externalColumnVisibility !== undefined) {
      return externalColumnVisibility;
    }

    const saved = localStorage.getItem(`columnVisibility_${storageKey}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing column visibility:", e);
      }
    }

    // Default: all columns visible
    const defaultVisibility = {};
    if (columns && Array.isArray(columns)) {
      columns.forEach((col) => {
        if (col.id || col.accessorKey) {
          defaultVisibility[col.id || col.accessorKey] = true;
        }
      });
    }
    return defaultVisibility;
  };

  // Load column sizes from localStorage or use default
  const getInitialColumnSizing = () => {
    const saved = localStorage.getItem(`columnSizing_${storageKey}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing column sizing:", e);
      }
    }
    return {};
  };

  const [columnVisibility, setColumnVisibility] = useState(
    getInitialColumnVisibility()
  );
  const [columnSizing, setColumnSizing] = useState(getInitialColumnSizing());

  // Save to localStorage when visibility changes
  useEffect(() => {
    localStorage.setItem(
      `columnVisibility_${storageKey}`,
      JSON.stringify(columnVisibility)
    );
    if (onColumnVisibilityChange) {
      onColumnVisibilityChange(columnVisibility);
    }
  }, [columnVisibility, storageKey, onColumnVisibilityChange]);

  // Save to localStorage when sizing changes
  useEffect(() => {
    localStorage.setItem(
      `columnSizing_${storageKey}`,
      JSON.stringify(columnSizing)
    );
  }, [columnSizing, storageKey]);

  // Handle select all checkbox
  const handleSelectAll = (checked) => {
    if (checked) {
      // Select all rows on current page
      const allIds = data.map((row) => (getRowId ? getRowId(row) : row.id));
      if (onSelectionChange) {
        onSelectionChange(allIds);
      }
    } else {
      // Deselect all
      if (onSelectionChange) {
        onSelectionChange([]);
      }
    }
  };

  // Handle individual row selection
  const handleRowSelection = (rowId, checked) => {
    if (checked) {
      // Add to selection
      if (onSelectionChange) {
        onSelectionChange([...selectedRows, rowId]);
      }
    } else {
      // Remove from selection
      if (onSelectionChange) {
        onSelectionChange(selectedRows.filter((id) => id !== rowId));
      }
    }
  };

  // Check if all rows on current page are selected
  const allRowsSelected =
    data.length > 0 &&
    data.every((row) => {
      const rowId = getRowId ? getRowId(row) : row.id;
      return selectedRows.includes(rowId);
    });

  // Check if some (but not all) rows are selected
  const someRowsSelected =
    selectedRows.length > 0 &&
    data.some((row) => {
      const rowId = getRowId ? getRowId(row) : row.id;
      return selectedRows.includes(rowId);
    }) &&
    !allRowsSelected;

  // Add checkbox column if row selection is enabled
  let tableColumns = columns;

  // Add S.NO column if needed (add this FIRST)
  if (showSerialNumber) {
    tableColumns = [
      {
        id: "serial",
        header: () => (
          <div className="flex items-center justify-center">S.NO</div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center font-medium">
            {(page - 1) * limit + row.index + 1}
          </div>
        ),
        enableHiding: false,
        enableResizing: false,
        size: 90,
        minSize: 90,
        maxSize: 90,
      },
      ...tableColumns,
    ];
  }

  // Add checkbox column BEFORE S.NO (add this SECOND so it becomes first column)
  if (enableRowSelection) {
    tableColumns = [
      {
        id: "select",
        header: () => (
          <div className="flex items-center justify-center h-full">
            <Checkbox
              checked={allRowsSelected}
              onCheckedChange={handleSelectAll}
              aria-label="Select all"
              className={
                someRowsSelected ? "data-[state=checked]:bg-blue-600" : ""
              }
            />
          </div>
        ),
        cell: ({ row }) => {
          const rowId = getRowId ? getRowId(row.original) : row.original.id;
          return (
            <div
              className="flex items-center justify-center h-full"
              onClick={(e) => e.stopPropagation()} // Prevent row click
            >
              <Checkbox
                checked={selectedRows.includes(rowId)}
                onCheckedChange={(checked) =>
                  handleRowSelection(rowId, checked)
                }
                aria-label="Select row"
              />
            </div>
          );
        },
        enableHiding: false,
        enableResizing: false,
        size: 60,
        minSize: 60,
        maxSize: 60,
      },
      ...tableColumns,
    ];
  }

  const table = useReactTable({
    data: data || [],
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
    state: {
      columnVisibility,
      columnSizing,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    enableColumnResizing: true,
  });

  // Pass table instance to parent component
  useEffect(() => {
    if (onTableReady) {
      onTableReady(table);
    }
  }, [table, onTableReady]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Custom Styles */}
      <style>{`
        /* Vertical center alignment for table cells */
        .enhanced-data-table td,
        .enhanced-data-table th {
          vertical-align: middle;
        }
        
        /* Column dividers */
        .enhanced-data-table td,
        .enhanced-data-table th {
          border-right: 1px solid #e5e7eb;
        }
        
        /* Remove border from last column */
        .enhanced-data-table td:last-child,
        .enhanced-data-table th:last-child {
          border-right: none;
        }

        /* Resize handle hover effect */
        .enhanced-data-table .resize-handle:hover::before {
          background-color: #3b82f6;
        }

        /* Resize handle active effect */
        .enhanced-data-table .resize-handle.is-resizing::before {
          background-color: #2563eb;
        }
      `}</style>

      {/* Table */}
      <div className="enhanced-data-table rounded-md border bg-white overflow-x-auto overflow-y-visible custom-scrollbar">
        <Table
          className="table-fixed"
          style={{
            width: table.getCenterTotalSize(),
          }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                style={{ backgroundColor: "#EFEFEF" }}
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="group/head relative h-10 select-none px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                    colSpan={header.colSpan}
                    style={{
                      width: header.getSize(),
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="truncate">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </div>
                    )}
                    {/* Only show resize handle if column can be resized AND is not the serial column */}
                    {header.column.getCanResize() &&
                      header.column.id !== "serial" && (
                        <div
                          onDoubleClick={() => header.column.resetSize()}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`resize-handle absolute top-0 h-full w-4 cursor-col-resize select-none touch-none -right-2 z-10 flex justify-center before:absolute before:w-px before:inset-y-0 before:bg-border before:translate-x-px ${
                            header.column.getIsResizing() ? "is-resizing" : ""
                          }`}
                          style={{
                            userSelect: "none",
                          }}
                        />
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick && onRowClick(row.original)}
                  className={
                    onRowClick ? "cursor-pointer hover:bg-gray-50" : ""
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "px-6 py-4 text-sm",
                        cell.column.id === "actions"
                          ? "overflow-visible relative"
                          : "truncate"
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={tableColumns.length}
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

export default EnhancedDataTable;
