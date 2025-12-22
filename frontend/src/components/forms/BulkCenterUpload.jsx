import React, { useState } from "react";
import { toast } from "react-toastify";
import {
  XMarkIcon,
  CloudArrowUpIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import dataService from "../../services/data.service";

/**
 * Bulk Center Upload Component
 * Allows admins to upload multiple centers via CSV
 */
const BulkCenterUpload = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [results, setResults] = useState(null);

  /**
   * Handle file selection
   */
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (
        selectedFile.type !== "text/csv" &&
        !selectedFile.name.endsWith(".csv")
      ) {
        toast.error("Please select a CSV file");
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  /**
   * Handle drag events
   */
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  /**
   * Handle drop event
   */
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile.type !== "text/csv" &&
        !droppedFile.name.endsWith(".csv")
      ) {
        toast.error("Please drop a CSV file");
        return;
      }
      setFile(droppedFile);
      setResults(null);
    }
  };

  /**
   * Download template
   */
  const handleDownloadTemplate = async () => {
    try {
      await dataService.downloadCenterTemplate();
      toast.success("Template downloaded successfully");
    } catch (error) {
      console.error("Failed to download template:", error);
      toast.error("Failed to download template");
    }
  };

  /**
   * Handle upload
   */
  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);
    try {
      const response = await dataService.bulkUploadCenters(file);

      setResults(response.data);

      if (response.data.failed === 0) {
        toast.success(
          `Successfully uploaded ${response.data.successful} centers`
        );
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 2000);
      } else {
        toast.warning(
          `Uploaded ${response.data.successful} centers, ${response.data.failed} failed`
        );
      }
    } catch (error) {
      console.error("Bulk upload failed:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to upload centers";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Reset form
   */
  const handleReset = () => {
    setFile(null);
    setResults(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Bulk Center Upload
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload multiple centers using a CSV file
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background-secondary rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6">
          {/* Instructions */}
          <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <h3 className="font-semibold text-primary-900 mb-2">
              📋 Instructions
            </h3>
            <ul className="text-sm text-primary-800 space-y-1">
              <li>• Download the template CSV file below</li>
              <li>
                • Fill in center details (Training Center name and
                Implementation Partner are required)
              </li>
              <li>
                • Make sure Implementation Partner names match exactly with
                existing partners
              </li>
              <li>• Upload the completed CSV file</li>
              <li>• All centers will be created with approved status</li>
            </ul>
          </div>

          {/* Template Download */}
          <div className="mb-6">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition-colors"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Download CSV Template
            </button>
          </div>

          {/* File Upload Area */}
          {!results && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary-500 bg-primary-50"
                  : "border-border hover:border-primary-300"
              }`}
            >
              <CloudArrowUpIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />

              {file ? (
                <div className="space-y-2">
                  <p className="text-foreground font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-background-secondary transition-colors"
                    >
                      Choose Different File
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <ArrowPathIcon className="h-5 w-5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <CloudArrowUpIcon className="h-5 w-5" />
                          Upload Centers
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-foreground font-medium mb-2">
                    Drag and drop your CSV file here
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">or</p>
                  <label className="inline-block px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors cursor-pointer">
                    Browse Files
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-muted-foreground mt-2">
                    Maximum file size: 5MB
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-background-secondary rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total</p>
                  <p className="text-2xl font-bold text-foreground">
                    {results.total}
                  </p>
                </div>
                <div className="p-4 bg-primary-50 rounded-lg">
                  <p className="text-sm text-primary-700 mb-1">Successful</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {results.successful}
                  </p>
                </div>
                <div className="p-4 bg-destructive/10 rounded-lg">
                  <p className="text-sm text-destructive mb-1">Failed</p>
                  <p className="text-2xl font-bold text-destructive">
                    {results.failed}
                  </p>
                </div>
              </div>

              {/* Successful Results */}
              {results.results && results.results.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-primary-500" />
                    Successfully Created Centers
                  </h3>
                  <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-background-secondary sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Row</th>
                          <th className="px-3 py-2 text-left">Center Name</th>
                          <th className="px-3 py-2 text-left">Center ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {results.results.map((result, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">{result.row}</td>
                            <td className="px-3 py-2">{result.center_name}</td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {result.center_id}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Errors */}
              {results.errors && results.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                    <XCircleIcon className="h-5 w-5" />
                    Failed Centers
                  </h3>
                  <div className="max-h-48 overflow-y-auto border border-destructive/30 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-destructive/10 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Row</th>
                          <th className="px-3 py-2 text-left">Center Name</th>
                          <th className="px-3 py-2 text-left">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {results.errors.map((error, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">{error.row}</td>
                            <td className="px-3 py-2">{error.center_name}</td>
                            <td className="px-3 py-2 text-destructive">
                              {error.error}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-background-secondary transition-colors"
                >
                  Upload Another File
                </button>
                <button
                  onClick={() => {
                    if (onSuccess) onSuccess();
                    onClose();
                  }}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkCenterUpload;
