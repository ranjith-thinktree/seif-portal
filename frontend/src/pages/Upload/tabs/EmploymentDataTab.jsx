import React from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import UploadInstructions from "../UploadInstructions";

const EmploymentDataTab = ({
  empNoteOpen,
  setEmpNoteOpen,
  employmentSuccess,
  employmentError,
  employmentFile,
  isEmploymentDragging,
  isEmploymentUploading,
  showEmploymentErrorModal,
  setShowEmploymentErrorModal,
  selectedEmploymentUpload,
  hasApprovedStudents,
  employmentFileInputRef,
  handleEmploymentDragOver,
  handleEmploymentDragLeave,
  handleEmploymentDrop,
  handleEmploymentFileChange,
  handleClearEmploymentFile,
  handleEmploymentUpload,
  handleDownloadEmploymentTemplate,
}) => {
  return (
    /* Employment Upload Tab */
    <div>
      {/* Collapsible Important Note - Employment */}
      <div className="mb-6 border-l-4 border-amber-500 rounded-r-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setEmpNoteOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 bg-amber-50 px-4 py-3 text-left hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-amber-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="font-semibold text-amber-800 text-sm">
              Note ! &nbsp;Students Must Be Approved
            </span>
          </div>
          <svg
            className={`h-4 w-4 text-amber-600 flex-shrink-0 transition-transform duration-200 ${
              empNoteOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {empNoteOpen && (
          <div className="bg-amber-50 px-4 pb-4 pt-1 border-t border-amber-200">
            <p className="text-amber-700 text-sm">
              You can only upload employment data for{" "}
              <strong>approved students</strong>. Employment records for
              students that are pending approval or rejected will be skipped.
              Please ensure all students in your CSV file have been approved by
              the admin before uploading.
            </p>
            <p className="text-amber-700 text-sm mt-2">
              👉 Student ID must match the SEIF-generated student ID assigned
              after admin approval.
            </p>
          </div>
        )}
      </div>

      {/* Success Message */}
      {employmentSuccess && (
        <div className="mb-6 bg-primary-50 border border-primary-500 rounded-lg p-4 flex items-start gap-3">
          <CheckCircleIcon className="h-6 w-6 text-primary-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-primary-700">Success!</h3>
            <p className="text-primary-600 text-sm mt-1">{employmentSuccess}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {employmentError && (
        <div className="mb-6 bg-destructive/10 border border-destructive rounded-lg p-4">
          <div className="flex items-start gap-3">
            <XCircleIcon className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">Upload Failed</h3>
              <p className="text-destructive/90 text-sm mt-1">
                {employmentError.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 border border-[#A5A5A5] p-6 bg-white rounded-2xl">
        {/* Left Column - Upload Area */}
        <div className="border-r border-[#A5A5A5]">
          <div className="bg-white rounded-lg shadow-card p-8">
            {/* Drag and Drop Area */}
            <div
              onDragOver={handleEmploymentDragOver}
              onDragLeave={handleEmploymentDragLeave}
              onDrop={handleEmploymentDrop}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center transition-colors
                ${
                  isEmploymentDragging
                    ? "border-primary-500 bg-primary-50"
                    : "border-border bg-background-secondary"
                }
                ${employmentFile ? "border-primary-500" : ""}
              `}
            >
              <input
                ref={employmentFileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleEmploymentFileChange}
                className="hidden"
              />

              <div className="flex flex-col items-center">
                <ArrowUpTrayIcon className="h-12 w-12 text-muted-foreground mb-4" />

                {!employmentFile ? (
                  <>
                    <p className="text-foreground font-medium mb-2">
                      Drag and drop your file here
                    </p>
                    <p className="text-muted-foreground text-sm mb-4">
                      Supports: CSV, Excel (XLSX, XLS) • Max 10MB
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-primary-600 font-medium mb-2">
                      ✓ {employmentFile.name}
                    </p>
                    <p className="text-muted-foreground text-sm mb-4">
                      Size: {(employmentFile.size / 1024).toFixed(2)} KB
                    </p>
                  </>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => employmentFileInputRef.current?.click()}
                    disabled={isEmploymentUploading}
                    className="px-8 py-3 bg-[#333333] text-white rounded-full font-medium hover:bg-[#333333] transition-colors disabled:opacity-50 shadow-md"
                  >
                    {employmentFile ? "Change File" : "Import"}
                  </button>

                  {employmentFile && !isEmploymentUploading && (
                    <button
                      onClick={handleClearEmploymentFile}
                      className="px-6 py-2 bg-white border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Upload Button */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleEmploymentUpload}
                disabled={!employmentFile || isEmploymentUploading}
                className={`
                  px-12 py-4 rounded-full text-lg font-semibold transition-all w-full
                  ${
                    !employmentFile || isEmploymentUploading
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary-500 text-white hover:bg-primary-600 shadow-lg hover:shadow-xl"
                  }
                `}
              >
                {isEmploymentUploading ? (
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
                    Uploading...
                  </span>
                ) : (
                  "Upload"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Instructions */}
        <div>
          <UploadInstructions
            onDownloadTemplate={handleDownloadEmploymentTemplate}
            disabled={!hasApprovedStudents}
            disabledMessage="You need approved students before downloading the employment template. Please upload and get student data approved first."
          />
        </div>
      </div>

      {/* Employment Error Modal */}
      {showEmploymentErrorModal && selectedEmploymentUpload && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEmploymentErrorModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Upload Errors - {selectedEmploymentUpload.file_name}
              </h3>

              <div className="mb-6 p-4 bg-background-secondary rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Records</p>
                    <p className="text-lg font-semibold text-foreground">
                      {selectedEmploymentUpload.total_records}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Processed</p>
                    <p className="text-lg font-semibold text-green-600">
                      {selectedEmploymentUpload.records_processed}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Failed</p>
                    <p className="text-lg font-semibold text-destructive">
                      {selectedEmploymentUpload.records_failed}
                    </p>
                  </div>
                </div>
              </div>

              {selectedEmploymentUpload.error_log &&
                selectedEmploymentUpload.error_log.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-background-secondary">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">
                            Row
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Student ID
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedEmploymentUpload.error_log.map(
                          (error, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2">{error.row}</td>
                              <td className="px-4 py-2">{error.student_id}</td>
                              <td className="px-4 py-2 text-destructive">
                                {error.error}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowEmploymentErrorModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-foreground rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmploymentDataTab;
