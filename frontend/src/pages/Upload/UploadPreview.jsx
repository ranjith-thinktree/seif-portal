import React, { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

/**
 * Upload Preview Modal
 * Shows summary of uploaded data before confirmation
 * Features: Dynamic partner name, center dropdown, batch cards with gender breakdown
 */
const ALL_CENTERS_KEY = "__all__";

const UploadPreview = ({ preview, onConfirm, onCancel, isLoading }) => {
  const [selectedCenterIdx, setSelectedCenterIdx] = useState(ALL_CENTERS_KEY);

  // Aggregate totals across all centers and batches
  const allCentersTotals = React.useMemo(() => {
    if (!preview?.centers)
      return { total: 0, male: 0, female: 0, batches: 0, centers: 0 };
    let total = 0,
      male = 0,
      female = 0,
      batches = 0;
    preview.centers.forEach((c) => {
      c.batches?.forEach((b) => {
        total += b.studentsCount || 0;
        male += b.maleStudents || 0;
        female += b.femaleStudents || 0;
        batches += 1;
      });
    });
    return { total, male, female, batches, centers: preview.centers.length };
  }, [preview]);

  const selectedCenter =
    selectedCenterIdx === ALL_CENTERS_KEY
      ? null
      : (preview?.centers?.[selectedCenterIdx] ?? null);

  if (!preview?.centers?.length) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with Dynamic Partner Name */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            Upload data - {preview.partnerName || "Partner"}
          </h2>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1 hover:bg-background-secondary rounded transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Center Dropdown */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Center
            </label>
            <select
              value={selectedCenterIdx}
              onChange={(e) =>
                setSelectedCenterIdx(
                  e.target.value === ALL_CENTERS_KEY
                    ? ALL_CENTERS_KEY
                    : parseInt(e.target.value),
                )
              }
              className="w-full px-4 py-2 border border-border rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={ALL_CENTERS_KEY}>
                All Centers ({preview.centers.length})
              </option>
              {preview.centers.map((center, idx) => (
                <option key={idx} value={idx}>
                  {center.centerName} - {center.city}, {center.state}
                </option>
              ))}
            </select>
          </div>
          {/* All Centers Summary */}
          {selectedCenterIdx === ALL_CENTERS_KEY ? (
            <div className="space-y-6">
              {/* Aggregate stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-5 rounded-lg border-2 border-blue-500 bg-blue-50 text-center">
                  <p className="text-xs font-medium text-blue-600 mb-1">
                    Total Students
                  </p>
                  <p className="text-3xl font-bold text-blue-700">
                    {allCentersTotals.total}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    {allCentersTotals.batches} batch
                    {allCentersTotals.batches !== 1 ? "es" : ""} across{" "}
                    {allCentersTotals.centers} center
                    {allCentersTotals.centers !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="p-5 rounded-lg border-2 border-green-500 bg-green-50 text-center">
                  <p className="text-xs font-medium text-green-600 mb-1">
                    Total Male
                  </p>
                  <p className="text-3xl font-bold text-green-700">
                    {allCentersTotals.male}
                  </p>
                  <p className="text-xs text-green-500 mt-1">
                    {allCentersTotals.total > 0
                      ? Math.round(
                          (allCentersTotals.male / allCentersTotals.total) *
                            100,
                        )
                      : 0}
                    % of total
                  </p>
                </div>
                <div className="p-5 rounded-lg border-2 border-purple-500 bg-purple-50 text-center">
                  <p className="text-xs font-medium text-purple-600 mb-1">
                    Total Female
                  </p>
                  <p className="text-3xl font-bold text-purple-700">
                    {allCentersTotals.female}
                  </p>
                  <p className="text-xs text-purple-500 mt-1">
                    {allCentersTotals.total > 0
                      ? Math.round(
                          (allCentersTotals.female / allCentersTotals.total) *
                            100,
                        )
                      : 0}
                    % of total
                  </p>
                </div>
              </div>

              {/* Per-center breakdown table */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Center-wise Breakdown
                </h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-background-secondary">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                          Center
                        </th>
                        <th className="text-center px-4 py-2 font-medium text-blue-600">
                          Total
                        </th>
                        <th className="text-center px-4 py-2 font-medium text-green-600">
                          Male
                        </th>
                        <th className="text-center px-4 py-2 font-medium text-purple-600">
                          Female
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.centers.map((center, idx) => {
                        const ct = center.batches?.reduce(
                          (acc, b) => ({
                            total: acc.total + (b.studentsCount || 0),
                            male: acc.male + (b.maleStudents || 0),
                            female: acc.female + (b.femaleStudents || 0),
                          }),
                          { total: 0, male: 0, female: 0 },
                        );
                        return (
                          <tr
                            key={idx}
                            className="border-t border-border hover:bg-background-secondary/50"
                          >
                            <td className="px-4 py-2 text-foreground">
                              <span className="font-medium">
                                {center.centerName}
                              </span>
                              <span className="text-muted-foreground text-xs ml-1">
                                — {center.city}, {center.state}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center font-semibold text-blue-700">
                              {ct.total}
                            </td>
                            <td className="px-4 py-2 text-center font-semibold text-green-700">
                              {ct.male}
                            </td>
                            <td className="px-4 py-2 text-center font-semibold text-purple-700">
                              {ct.female}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Single Center: existing per-batch view */
            <div className="space-y-6">
              {selectedCenter.batches.map((batch, batchIdx) => (
                <div
                  key={batchIdx}
                  className="border border-border rounded-lg p-5 bg-white shadow-sm"
                >
                  {/* Batch Number Header */}
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    {batch.batchNumber}
                  </h3>

                  {/* Batch Details - Input-styled Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Batch Number */}
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Batch Number
                      </label>
                      <div className="px-3 py-2 border border-border rounded-md bg-background-secondary text-foreground text-sm">
                        {batch.batchNumber}
                      </div>
                    </div>

                    {/* Start Date */}
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Start Date
                      </label>
                      <div className="px-3 py-2 border border-border rounded-md bg-background-secondary text-foreground text-sm">
                        {batch.startDate}
                      </div>
                    </div>

                    {/* Complete Date */}
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Complete Date
                      </label>
                      <div className="px-3 py-2 border border-border rounded-md bg-background-secondary text-foreground text-sm">
                        {batch.completeDate || "Not set"}
                      </div>
                    </div>
                  </div>

                  {/* Gender Demographics - Colored Boxes */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Student Demographics
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Total Students - Blue */}
                      <div className="p-4 rounded-lg border-2 border-blue-500 bg-blue-50">
                        <p className="text-xs font-medium text-blue-600 mb-1">
                          Total Students
                        </p>
                        <p className="text-2xl font-bold text-blue-700">
                          {batch.studentsCount}
                        </p>
                      </div>

                      {/* Male Students - Green */}
                      <div className="p-4 rounded-lg border-2 border-green-500 bg-green-50">
                        <p className="text-xs font-medium text-green-600 mb-1">
                          Male Students
                        </p>
                        <p className="text-2xl font-bold text-green-700">
                          {batch.maleStudents || 0}
                        </p>
                      </div>

                      {/* Female Students - Purple */}
                      <div className="p-4 rounded-lg border-2 border-purple-500 bg-purple-50">
                        <p className="text-xs font-medium text-purple-600 mb-1">
                          Female Students
                        </p>
                        <p className="text-2xl font-bold text-purple-700">
                          {batch.femaleStudents || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}{" "}
          {/* end ternary: All Centers / Single Center */}
          {/* Info Message */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <span className="font-semibold">Note:</span> After confirmation,
              this data will be sent to admin for approval. You will be notified
              once the review is complete.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-2 border border-border rounded-lg text-foreground hover:bg-background-secondary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Confirming...
              </span>
            ) : (
              "Confirm Upload"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadPreview;
