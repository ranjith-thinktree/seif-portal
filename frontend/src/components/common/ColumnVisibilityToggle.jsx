import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

/**
 * Column Visibility Toggle Component
 * Allows users to show/hide table columns with search and reset functionality
 */
const ColumnVisibilityToggle = ({ table, storageKey }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleReset = () => {
    table.resetColumnVisibility();
    setSearchQuery("");

    // Clear from localStorage
    if (storageKey) {
      localStorage.removeItem(`columnVisibility_${storageKey}`);
    }
  };

  // Count hidden columns
  const hiddenCount = table
    .getAllColumns()
    .filter((column) => column.getCanHide() && !column.getIsVisible()).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 whitespace-nowrap"
          size="default"
        >
          <AdjustmentsHorizontalIcon className="h-4 w-4" />
          Columns
          {hiddenCount > 0 && (
            <span className="ml-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium">
              {hiddenCount} hidden
            </span>
          )}
          <ChevronDownIcon className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[250px]">
        {/* Search Input */}
        <div className="relative p-2">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
            placeholder="Search columns..."
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <DropdownMenuSeparator />

        {/* Column List */}
        <div className="max-h-[300px] overflow-y-auto">
          {table
            .getAllColumns()
            .filter((column) => column.getCanHide())
            .map((column) => {
              const columnLabel =
                typeof column.columnDef.header === "string"
                  ? column.columnDef.header
                  : column.id;

              // Filter by search query
              if (
                searchQuery &&
                !columnLabel.toLowerCase().includes(searchQuery.toLowerCase())
              ) {
                return null;
              }

              return (
                <DropdownMenuItem
                  key={column.id}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    column.toggleVisibility(!column.getIsVisible());
                  }}
                >
                  <Checkbox
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => {
                      column.toggleVisibility(!!value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="flex-1 capitalize truncate">
                    {columnLabel}
                  </span>
                  {!column.getCanHide() && (
                    <span className="text-xs text-gray-500">(locked)</span>
                  )}
                </DropdownMenuItem>
              );
            })}
        </div>

        <DropdownMenuSeparator />

        {/* Reset Button */}
        <DropdownMenuItem
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-2 cursor-pointer text-blue-600 hover:text-blue-700"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Reset to Default
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColumnVisibilityToggle;
