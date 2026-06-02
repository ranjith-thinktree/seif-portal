import React from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import UploadInstructions from "../UploadInstructions";

const TotDataTab = ({
  totNoteOpen,
  setTotNoteOpen,
  totSuccess,
  totError,
  totFile,
  isTotDragging,
  totUploading,
  totFileInputRef,
  setIsTotDragging,
  setTotFile,
  setTotError,
  setTotSuccess,
  handleTotFileChange,
  handleTotUpload,
  handleDownloadTotTemplate,
}) => {
  return (
    /* ── TOT Data Tab ─────────────────────────────────────────────── */
    <div>
      {/* Collapsible Note */}
      <div className="mb-6 border-l-4 border-amber-500 rounded-r-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setTotNoteOpen((o) => !o)}
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
              Note ! &nbsp;Trainer Records Must Be Complete
            </span>
          </div>
          <svg
            className={`h-4 w-4 text-amber-600 flex-shrink-0 transition-transform duration-200 ${totNoteOpen ? "rotate-180" : ""}`}
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
        {totNoteOpen && (
          <div className="bg-amber-50 px-4 pb-4 pt-1 border-t border-amber-200">
            <p className="text-amber-700 text-sm">
              Upload trainer records with all required columns:{" "}
              <strong>TOT Center, Trainer Module Trained, First Name</strong>.
            </p>
            <p className="text-amber-700 text-sm mt-2">
              👉 Download the template below to ensure your file has the correct
              format before uploading.
            </p>
          </div>
        )}
      </div>

      {/* Success Message */}
      {totSuccess && (
        <div className="mb-6 bg-primary-50 border border-primary-500 rounded-lg p-4 flex items-start gap-3">
          <CheckCircleIcon className="h-6 w-6 text-primary-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-primary-700">Success!</h3>
            <p className="text-primary-600 text-sm mt-1">{totSuccess}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {totError && (
        <div className="mb-6 bg-destructive/10 border border-destructive rounded-lg p-4">
          <div className="flex items-start gap-3">
            <XCircleIcon className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">Upload Failed</h3>
              <p className="text-destructive/90 text-sm mt-1">
                {totError.message}
              </p>
              {totError.errors && totError.errors.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-destructive">
                    Validation Errors:
                  </p>
                  <ul className="mt-2 space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {totError.errors.map((err, idx) => {
                      const match = err.match(
                        /^(Row \d+),\s*Column:\s*([^—]+)\s*—\s*(.+)$/,
                      );
                      if (match) {
                        return (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm bg-red-50 border border-red-200 rounded px-2 py-1.5"
                          >
                            <span className="shrink-0 font-semibold text-red-700 text-xs bg-red-100 rounded px-1.5 py-0.5 mt-0.5">
                              {match[1]}
                            </span>
                            <span className="shrink-0 font-medium text-orange-700 text-xs bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 mt-0.5">
                              {match[2].trim()}
                            </span>
                            <span className="text-red-600">
                              {match[3].trim()}
                            </span>
                          </li>
                        );
                      }
                      return (
                        <li
                          key={idx}
                          className="text-sm text-destructive/80 list-disc list-inside"
                        >
                          {err}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
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
              onDragOver={(e) => {
                e.preventDefault();
                setIsTotDragging(true);
              }}
              onDragLeave={() => setIsTotDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsTotDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) {
                  setTotFile(f);
                  setTotError(null);
                  setTotSuccess(null);
                }
              }}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors
                ${isTotDragging ? "border-primary-500 bg-primary-50" : "border-border bg-background-secondary"}
                ${totFile ? "border-primary-500" : ""}
              `}
            >
              <input
                ref={totFileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleTotFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center">
                <ArrowUpTrayIcon className="h-12 w-12 text-muted-foreground mb-4" />
                {!totFile ? (
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
                      ✓ {totFile.name}
                    </p>
                    <p className="text-muted-foreground text-sm mb-4">
                      Size: {(totFile.size / 1024).toFixed(2)} KB
                    </p>
                  </>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => totFileInputRef.current?.click()}
                    disabled={totUploading}
                    className="px-8 py-3 bg-[#333333] text-white rounded-full font-medium hover:bg-[#444444] transition-colors disabled:opacity-50 shadow-md"
                  >
                    {totFile ? "Change File" : "Import"}
                  </button>
                  {totFile && !totUploading && (
                    <button
                      onClick={() => {
                        setTotFile(null);
                        setTotError(null);
                        setTotSuccess(null);
                        if (totFileInputRef.current)
                          totFileInputRef.current.value = "";
                      }}
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
                onClick={handleTotUpload}
                disabled={!totFile || totUploading}
                className={`px-12 py-4 rounded-full text-lg font-semibold transition-all w-full
                  ${
                    !totFile || totUploading
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary-500 text-white hover:bg-primary-600 shadow-lg hover:shadow-xl"
                  }`}
              >
                {totUploading ? (
                  <span className="flex items-center justify-center gap-2">
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
          <UploadInstructions onDownloadTemplate={handleDownloadTotTemplate} />
        </div>
      </div>
    </div>
  );
};

export default TotDataTab;
