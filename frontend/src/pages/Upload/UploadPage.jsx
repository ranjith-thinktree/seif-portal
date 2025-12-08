import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  uploadCSV,
  confirmUpload,
  downloadDynamicTemplate,
  getUploads,
} from "../../services/upload.service";
import { MainLayout } from "../../components/layout";
import UploadPreview from "./UploadPreview";
import UploadInstructions from "./UploadInstructions";
import { UploadHistoryDataTable } from "../../components/upload/UploadHistoryDataTable";

/**
 * Upload Page
 * Partner page for uploading CSV files
 */
const UploadPage = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState("upload");

  // Upload tab state
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);

  // Upload History tab state
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  /**
   * Handle file selection
   */
  const handleFileSelect = (selectedFile) => {
    setError(null);
    setSuccess(null);

    // Validate file type
    if (!selectedFile.name.endsWith(".csv")) {
      setError("Invalid file type. Please upload a CSV file.");
      return;
    }

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    setFile(selectedFile);
  };

  /**
   * Handle drag events
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  /**
   * Trigger file input click
   */
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handle upload and validate
   */
  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await uploadCSV(file);

      if (result.success) {
        setPreview(result);
        setShowPreview(true);
      }
    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage =
        err.response?.data?.message || "Upload failed. Please try again.";
      const errors = err.response?.data?.errors || [];

      setError({
        message: errorMessage,
        errors: errors,
        totalErrors: err.response?.data?.totalErrors || 0,
      });
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handle confirm upload after preview
   */
  const handleConfirmUpload = async () => {
    if (!preview) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await confirmUpload(
        preview.uploadData.filePath,
        preview.uploadData.fileName
      );

      if (result.success) {
        setSuccess(`Upload successful! Awaiting admin approval.`);
        setFile(null);
        setPreview(null);
        setShowPreview(false);

        // Refresh page after 3 seconds
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    } catch (err) {
      console.error("Confirm upload error:", err);
      setError({
        message:
          err.response?.data?.message ||
          "Failed to confirm upload. Please try again.",
        errors: [],
      });
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handle download template with dynamic partner name
   */
  const handleDownloadTemplate = async () => {
    try {
      await downloadDynamicTemplate();
    } catch (err) {
      console.error("Download template error:", err);
      setError({
        message: "Failed to download template. Please try again.",
        errors: [],
      });
    }
  };

  /**
   * Clear file selection
   */
  const handleClearFile = () => {
    setFile(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Fetch upload history
   */
  const fetchUploads = useCallback(
    async (page = 1) => {
      setLoading(true);
      setHistoryError(null);

      try {
        const result = await getUploads(page, pagination.limit);
        console.log("Upload history result:", result);

        // Backend returns { success: true, data: [...], pagination: {...} }
        if (result && result.data) {
          setUploads(result.data);
          setPagination(result.pagination);
        } else {
          console.error("Unexpected response format:", result);
          setHistoryError("Invalid response format from server.");
        }
      } catch (err) {
        console.error("Failed to fetch uploads:", err);
        console.error("Error details:", err.response?.data);

        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to load upload history. Please try again.";
        setHistoryError(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit]
  );

  useEffect(() => {
    if (activeTab === "history") {
      fetchUploads();
    }
  }, [activeTab, fetchUploads]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-foreground">Upload Data</h1>
          <p className="text-muted-foreground mt-2">
            An overview of your program’s performance
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-primary-50 border border-primary-500 rounded-lg p-4 flex items-start gap-3">
            <CheckCircleIcon className="h-6 w-6 text-primary-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-primary-700">Success!</h3>
              <p className="text-primary-600 text-sm mt-1">{success}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive rounded-lg p-4">
            <div className="flex items-start gap-3">
              <XCircleIcon className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">
                  Upload Failed
                </h3>
                <p className="text-destructive/90 text-sm mt-1">
                  {error.message}
                </p>

                {error.errors && error.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-destructive">
                      Validation Errors{" "}
                      {error.totalErrors > error.errors.length &&
                        `(Showing first ${error.errors.length} of ${error.totalErrors})`}
                      :
                    </p>
                    <ul className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                      {error.errors.map((err, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-destructive/80 list-disc list-inside"
                        >
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === "upload"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Upload Data
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === "history"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Upload History
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "upload" ? (
          /* Main Content - Two Column Layout */
          <div className="grid grid-cols-1 lg:grid-cols-2 border border-[#A5A5A5] p-6 bg-white rounded-2xl">
            {/* Left Column - Upload Area */}
            <div className="border-r border-[#A5A5A5]">
              <div className="bg-white rounded-lg shadow-card p-8">
                {/* Drag and Drop Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                  border-2 border-dashed rounded-lg p-12 text-center transition-colors
                  ${
                    isDragging
                      ? "border-primary-500 bg-primary-50"
                      : "border-border bg-background-secondary"
                  }
                  ${file ? "border-primary-500" : ""}
                `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  <div className="flex flex-col items-center">
                    <ArrowUpTrayIcon className="h-12 w-12 text-muted-foreground mb-4" />

                    {!file ? (
                      <>
                        <p className="text-foreground font-medium mb-2">
                          Drag and drop your CSV file here
                        </p>
                        <p className="text-muted-foreground text-sm mb-4">
                          or click the button below to browse
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-primary-600 font-medium mb-2">
                          File selected: {file.name}
                        </p>
                        <p className="text-muted-foreground text-sm mb-4">
                          Size: {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleImportClick}
                        disabled={isUploading}
                        className="px-8 py-3 bg-[#333333] text-white rounded-full font-medium hover:bg-[#333333] transition-colors disabled:opacity-50 shadow-md"
                      >
                        {file ? "Change File" : "Import"}
                      </button>

                      {file && !isUploading && (
                        <button
                          onClick={handleClearFile}
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
                    onClick={handleUpload}
                    disabled={!file || isUploading}
                    className={`
                    px-12 py-4 rounded-full text-lg font-semibold transition-all w-full
                    ${
                      !file || isUploading
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-primary-500 text-white hover:bg-primary-600 shadow-lg hover:shadow-xl"
                    }
                  `}
                  >
                    {isUploading ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5"
                          viewBox="0 0 24 24"
                        >
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
                        Validating...
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
              <UploadInstructions onDownloadTemplate={handleDownloadTemplate} />
            </div>
          </div>
        ) : (
          /* Upload History Tab Content */
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            {historyError ? (
              <div className="text-center py-12">
                <p className="text-destructive">{historyError}</p>
                <button
                  onClick={() => fetchUploads()}
                  className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Retry
                </button>
              </div>
            ) : (
              <UploadHistoryDataTable
                data={uploads}
                pagination={pagination}
                onPageChange={fetchUploads}
                loading={loading}
              />
            )}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && preview && (
        <UploadPreview
          preview={preview.preview}
          onConfirm={handleConfirmUpload}
          onCancel={() => {
            setShowPreview(false);
            setPreview(null);
          }}
          isLoading={isUploading}
        />
      )}
    </MainLayout>
  );
};

export default UploadPage;
