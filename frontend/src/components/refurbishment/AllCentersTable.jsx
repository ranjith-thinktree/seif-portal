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

const AllCentersTable = ({
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
  sortBy = "center_name",
  sortOrder = "asc",
  onSortChange,
}) => {
  return (
    <div className="space-y-4">
      <AdvancedSearchBar
        value={searchTerm}
        onChange={onSearchChange}
        placeholder="Search centers..."
        filterGroups={[
          {
            label: "Eligibility Status",
            key: "eligibility",
            options: filterOptions.eligibilityStatuses || [],
            multi: false,
          },
          {
            label: "Age Range",
            key: "age",
            options: filterOptions.ageRanges || [],
            multi: false,
          },
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
        ]}
        activeFilters={activeFilters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
        sortOptions={[
          { label: "Center Name", value: "center_name" },
          { label: "Age", value: "age" },
          { label: "Last Refurbished", value: "last_refurbished" },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
        storageKey="refurbishment-all-centers"
      />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.NO.</TableHead>
              <TableHead>Training Center</TableHead>
              <TableHead>Partner Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Eligibility Status</TableHead>
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
                  <p className="text-lg">No centers available</p>
                </TableCell>
              </TableRow>
            ) : (
              centers.map((center, index) => (
                <TableRow key={center.id}>
                  <TableCell>{pagination.offset + index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {center.center_name}
                  </TableCell>
                  <TableCell>{center.organization_name || "N/A"}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                      {center.years_since_establishment || 0} years
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        center.refurbishment_count === 0
                          ? "bg-gray-100 text-gray-800"
                          : center.refurbishment_count === 1
                            ? "bg-green-100 text-green-800"
                            : center.refurbishment_count === 2
                              ? "bg-yellow-100 text-yellow-800"
                              : center.refurbishment_count === 3
                                ? "bg-orange-100 text-orange-800"
                                : "bg-red-100 text-red-800"
                      }`}
                    >
                      {center.refurbishment_eligibility || "Not eligible"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {center.last_refurbishment_date
                      ? formatDate(center.last_refurbishment_date)
                      : "Never refurbished"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onCreateRequest(center)}
                      title="Create refurbishment request"
                    >
                      <BellIcon className="w-8 h-8" />
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

export default AllCentersTable;
