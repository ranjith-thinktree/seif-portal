import React, { useState } from "react";
import { toast } from "react-toastify";
import {
  bulkUploadPartners,
  downloadPartnerTemplate,
} from "../../services/data.service";

/**
 * Bulk Partner Upload Component
 * Upload CSV to create multiple partners at once
 */
const BulkPartnerUpload = ({ onSuccess, onCancel }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [results, setResults] = useState(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  // Validate file
  const validateAndSetFile = (file) => {
    // Check file type
    if (!file.name.endsWith(".csv")) {
      toast.error("Only CSV files are allowed");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    setResults(null);
    toast.success(`File selected: ${file.name}`);
  };

  // Drag & Drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a CSV file");
      return;
    }

    setUploading(true);

    try {
      const response = await bulkUploadPartners(selectedFile);

      if (response.success) {
        const {
          total,
          successful,
          failed,
          results: uploadResults,
          errors,
        } = response.data;

        setResults({
          total,
          successful,
          failed,
          results: uploadResults,
          errors,
        });

        if (failed === 0) {
          toast.success(`🎉 All ${successful} partners created successfully!`);
          if (onSuccess) {
            setTimeout(() => onSuccess(), 2000);
          }
        } else {
          toast.warning(
            `⚠️ ${successful} succeeded, ${failed} failed. Check results below.`
          );
        }
      }
    } catch (error) {
      console.error("Bulk upload error:", error);
      toast.error(error.response?.data?.message || "Failed to upload partners");
    } finally {
      setUploading(false);
    }
  };

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const response = await downloadPartnerTemplate();

      // Create blob and download
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "partner_bulk_upload_template.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Template downloaded successfully");
    } catch (error) {
      console.error("Template download error:", error);
      toast.error("Failed to download template");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          📤 Bulk Partner Upload
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          ✕
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Download the CSV template below</li>
          <li>Fill in partner details (name, email, contact, phone, type)</li>
          <li>Upload the filled CSV file</li>
          <li>System will validate and create all partners</li>
          <li>Login credentials will be emailed to each partner</li>
        </ol>
      </div>

      {/* Download Template */}
      <div className="mb-6">
        <button
          onClick={handleDownloadTemplate}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center justify-center gap-2 font-medium"
        >
          <span>📥</span>
          <span>Step 1: Download CSV Template</span>
        </button>
      </div>

      {/* Upload Area */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-700 mb-3">
          Step 2: Upload Filled CSV
        </h4>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById("bulkFileInput").click()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400 bg-gray-50"
          }`}
        >
          <div className="text-6xl mb-4">📁</div>
          <h5 className="text-lg font-medium text-gray-700 mb-2">
            {selectedFile
              ? selectedFile.name
              : "Drop CSV file here or click to browse"}
          </h5>
          <p className="text-sm text-gray-500">Only CSV files (Max 5MB)</p>
          <input
            id="bulkFileInput"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {selectedFile && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium text-gray-800">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
                setResults(null);
              }}
              className="text-red-500 hover:text-red-700 text-xl"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        className={`w-full py-3 rounded-lg font-medium transition ${
          !selectedFile || uploading
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-green-500 text-white hover:bg-green-600"
        }`}
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            <span>Processing...</span>
          </span>
        ) : (
          "🚀 Step 3: Upload & Create Partners"
        )}
      </button>

      {/* Results */}
      {results && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">📊 Upload Results</h3>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {results.total}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">
                {results.successful}
              </div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-red-600">
                {results.failed}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>

          {/* Success List */}
          {results.results && results.results.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-green-700 mb-2">
                ✅ Successfully Created:
              </h4>
              <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-green-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Row</th>
                      <th className="px-4 py-2 text-left">Partner ID</th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.results.map((result, idx) => (
                      <tr key={idx} className="border-t border-green-200">
                        <td className="px-4 py-2">{result.row}</td>
                        <td className="px-4 py-2 font-medium">
                          {result.partner_id}
                        </td>
                        <td className="px-4 py-2">{result.name}</td>
                        <td className="px-4 py-2">{result.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error List */}
          {results.errors && results.errors.length > 0 && (
            <div>
              <h4 className="font-medium text-red-700 mb-2">
                ❌ Failed (Please fix and retry):
              </h4>
              <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-red-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Row</th>
                      <th className="px-4 py-2 text-left">Partner Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.errors.map((error, idx) => (
                      <tr key={idx} className="border-t border-red-200">
                        <td className="px-4 py-2">{error.row}</td>
                        <td className="px-4 py-2">{error.partner_name}</td>
                        <td className="px-4 py-2">{error.email}</td>
                        <td className="px-4 py-2 text-red-700">
                          {error.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkPartnerUpload;
