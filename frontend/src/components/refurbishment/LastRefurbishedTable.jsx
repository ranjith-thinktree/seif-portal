import React from "react";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import AdvancedSearchBar from "../common/AdvancedSearchBar";
import { BellIcon } from "@heroicons/react/24/outline";

const LastRefurbishedTable = ({
  centers,
  onCreateRequest,
  formatDate,
  pagination = { limit: 10, offset: 0, total: 0 },
  onPreviousPage,
  onNextPage,
  loading = false,
  searchTerm = "",
  onSearchChange,
  activeFilters = {},
  onFilterChange,
  onClearFilters,
  filterOptions = {},
  sortBy = "last_refurbished",
  sortOrder = "desc",
  onSortChange,
}) => {
  return (
    <div className="space-y-4">
      <AdvancedSearchBar
        value={searchTerm}
        onChange={onSearchChange}
        placeholder="Search refurbished centers..."
        filterGroups={[
          {
            label: "Partner",
            key: "partner",
            options: filterOptions.partners || [],
            multi: true,
          },
          {
            label: "State",
            key: "state",
            options: filterOptions.states || [],
            multi: true,
          },
          {
            label: "Refurbishment Recency",
            key: "recency",
            options: [
              { value: "last6months", label: "Last 6 months" },
              { value: "6-12months", label: "6-12 months" },
              { value: "over1year", label: "Over 1 year" },
            ],
            multi: false,
          },
        ]}
        activeFilters={activeFilters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
        sortOptions={[
          { label: "Center Name", value: "center_name" },
          { label: "Last Refurbished", value: "last_refurbished" },
          { label: "Last Notified", value: "last_notified" },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
        storageKey="refurbishment-last-refurbished"
      />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.NO.</TableHead>
              <TableHead>Training Center</TableHead>
              <TableHead>Partner Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Last Notified</TableHead>
              <TableHead>Last Refurbished</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!centers || centers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-gray-500"
                >
                  <p className="text-lg">No refurbishment history available</p>
                </TableCell>
              </TableRow>
            ) : (
              centers.map((center, index) => (
                <TableRow key={center.id}>
                  <TableCell>{pagination.offset + index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {center.center_name}
                  </TableCell>
                  <TableCell>{center.partner_name || "N/A"}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {center.center_type || "Corporate"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {center.last_notified
                      ? formatDate(center.last_notified)
                      : "Not sent"}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-blue-600">
                      {center.last_refurbishment_date
                        ? formatDate(center.last_refurbishment_date)
                        : "Never"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onCreateRequest(center)}
                    >
                      <BellIcon className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {centers && centers.length > 0 && (
        <div className="flex items-center justify-between pb-5 px-5">
          <p className="text-sm text-gray-600">
            Showing {pagination.offset + 1} to{" "}
            {Math.min(pagination.offset + pagination.limit, pagination.total)}{" "}
            of {pagination.total} results
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPreviousPage}
              disabled={loading || pagination.offset === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={
                loading ||
                pagination.offset + pagination.limit >= pagination.total
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LastRefurbishedTable;
