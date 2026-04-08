import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { MainLayout } from "../components/layout";
import {
  BriefcaseIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PaperClipIcon,
  ClockIcon,
  XMarkIcon,
  ArrowPathIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

/**
 * EmploymentUploadPage - Two-tab interface for employment data management
 *
 * Tab 1: Upload employment CSV with drag-drop
 * Tab 2: Upload history with error logs
 */
const EmploymentUploadPage = () => {
  const [activeTab, setActiveTab] = useState("upload"); // 'upload' or 'history'
  const [uploadHistory, setUploadHistory] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [templatePeriod, setTemplatePeriod] = useState("all");
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState([]);

  // B11: History filters
  const [showHistoryFilters, setShowHistoryFilters] = useState(false);
  const [historyStatusFilter, setHistoryStatusFilter] = useState("");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");

  // Fetch upload history
  const fetchUploadHistory = useCallback(async () => {
    try {
      const params = { page: currentPage, limit: 10 };
      if (historyStatusFilter) params.status = historyStatusFilter;
      if (historyDateFrom) params.dateFrom = historyDateFrom;
      if (historyDateTo) params.dateTo = historyDateTo;

      const response = await axios.get("/api/v1/employment/uploads", {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data.success) {
        setUploadHistory(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching upload history:", error);
      toast.error("Failed to load upload history");
    }
  }, [currentPage, historyStatusFilter, historyDateFrom, historyDateTo]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchUploadHistory();
    }
  }, [activeTab, fetchUploadHistory]);

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
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (
      !validTypes.includes(file.type) &&
      !file.name.match(/\.(csv|xlsx|xls)$/i)
    ) {
      toast.error("Please upload a CSV or Excel file");
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    toast.success(`File selected: ${file.name}`);
  };

  // Drag & Drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
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
      toast.warning("Please select a file first");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // B7: append attachment files if any
      attachmentFiles.forEach((f) => formData.append("attachments", f));

      const response = await axios.post("/api/v1/employment/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data.success) {
        toast.success(response.data.message);

        // Show error summary if there are failed records
        if (response.data.failedCount > 0) {
          toast.warning(
            `${response.data.failedCount} records failed. Click "View History" to see details.`,
          );
        }

        // Clear file and switch to history tab
        setSelectedFile(null);
        setAttachmentFiles([]);
        setActiveTab("history");
        fetchUploadHistory();
      } else {
        toast.error(response.data.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error.response?.data?.message || "Failed to upload employment data",
      );
    } finally {
      setUploading(false);
    }
  };

  // Download template (B4 — supports time-period for pre-filled data)
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const response = await axios.get("/api/v1/employment/template", {
        params: { period: templatePeriod },
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const periodLabel =
        templatePeriod === "all" ? "All" : templatePeriod.toUpperCase();
      link.setAttribute(
        "download",
        `Employment_Template_${periodLabel}_${Date.now()}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Pre-filled template downloaded");
    } catch (error) {
      console.error("Template download error:", error);
      if (error.response?.status === 400) {
        // Parse blob error response
        const text = await error.response.data.text();
        const parsed = JSON.parse(text);
        toast.error(
          parsed.message ||
            "No approved students found for the selected period",
        );
      } else {
        toast.error("Failed to download template");
      }
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // View upload details with errors
  const handleViewDetails = async (upload) => {
    try {
      const response = await axios.get(
        `/api/v1/employment/uploads/${upload.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (response.data.success) {
        setSelectedUpload(response.data.data);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error("Error fetching upload details:", error);
      toast.error("Failed to load upload details");
    }
  };

  const PERIOD_OPTIONS = [
    { value: "1m", label: "Last 1 Month" },
    { value: "6m", label: "Last 6 Months" },
    { value: "1y", label: "Last 1 Year" },
    { value: "all", label: "All Time" },
  ];

  const tabs = [
    { id: "upload", label: "Upload Data", icon: ArrowUpTrayIcon },
    { id: "history", label: "Upload History", icon: ClockIcon },
  ];

  const statusBadge = (status) => {
    const map = {
      completed: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      processing: "bg-yellow-100 text-yellow-700",
    };
    return map[status] || "bg-gray-100 text-gray-600";
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* ── Page Header ── */}
        <div className="mb-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <BriefcaseIcon className="w-6 h-6 text-[#009530]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Employment Data Upload
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Upload employment status for approved students
            </p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === id
                  ? "text-[#009530] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#009530]"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Upload Tab ── */}
        {activeTab === "upload" && (
          <div className="space-y-5">
            {/* Step 1 — Download Template */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                <ArrowDownTrayIcon className="w-5 h-5 text-[#009530]" />
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">
                    Step 1: Download Pre-Filled Template
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Choose a time period — the template will be pre-filled with
                    your approved students' details.
                  </p>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-600 mb-4">
                  Students approved in:
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTemplatePeriod(opt.value)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        templatePeriod === opt.value
                          ? "bg-[#009530] border-[#009530] text-white"
                          : "bg-white border-gray-300 text-gray-600 hover:border-[#009530] hover:text-[#009530]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-[#009530] hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {downloadingTemplate ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Downloading…
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Download Pre-Filled Template
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 2 — Upload Filled Template */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                <ArrowUpTrayIcon className="w-5 h-5 text-[#009530]" />
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">
                    Step 2: Upload Filled Template
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    CSV, XLS or XLSX — max 10 MB
                  </p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {/* Drag & Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("fileInput").click()}
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                    dragActive
                      ? "border-[#009530] bg-green-50"
                      : selectedFile
                        ? "border-[#009530] bg-green-50"
                        : "border-gray-300 bg-gray-50 hover:border-gray-400"
                  }`}
                >
                  <ArrowUpTrayIcon className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                  {selectedFile ? (
                    <p className="text-sm font-medium text-gray-700">
                      {selectedFile.name}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700">
                        Drop your file here or click to browse
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Supported formats: CSV, XLS, XLSX
                      </p>
                    </>
                  )}
                  <input
                    id="fileInput"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Selected file chip */}
                {selectedFile && (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-green-800 font-medium">
                      {selectedFile.name}{" "}
                      <span className="font-normal text-green-600">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </span>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-green-600 hover:text-red-500 transition-colors ml-3"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3 — Attachments */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PaperClipIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">
                      Step 3: Supporting Documents{" "}
                      <span className="font-normal text-gray-400">
                        (Optional)
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Offer letters, payslips or ZIP bundle — PDF, JPEG, PNG,
                      ZIP · up to 10 files
                    </p>
                  </div>
                </div>
                <label
                  htmlFor="attachmentInput"
                  className="px-3 py-1.5 text-sm font-semibold border border-[#009530] text-[#009530] rounded-lg cursor-pointer hover:bg-green-50 transition-colors"
                >
                  + Add Files
                </label>
                <input
                  id="attachmentInput"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.zip"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const newFiles = Array.from(e.target.files);
                    setAttachmentFiles((prev) => {
                      const combined = [...prev, ...newFiles];
                      if (combined.length > 10) {
                        toast.warning("Maximum 10 attachments allowed");
                        return combined.slice(0, 10);
                      }
                      return combined;
                    });
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="p-5">
                {attachmentFiles.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    No attachments added yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {attachmentFiles.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      >
                        <span className="text-gray-700">
                          {f.name}{" "}
                          <span className="text-gray-400">
                            ({(f.size / 1024).toFixed(0)} KB)
                          </span>
                        </span>
                        <button
                          onClick={() =>
                            setAttachmentFiles((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            )
                          }
                          className="text-gray-400 hover:text-red-500 transition-colors ml-3"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#009530] hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
            >
              {uploading ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="w-5 h-5" />
                  Upload Employment Data
                </>
              )}
            </button>

            {/* Notes */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                Important Notes
              </p>
              <ul className="space-y-1 text-sm text-amber-800 list-disc list-inside">
                <li>
                  Only approved students can have employment data uploaded
                </li>
                <li>
                  Student ID must match the partner_student_id in your records
                </li>
                <li>
                  If a student is not found, the record will be logged as failed
                </li>
                <li>
                  Employment Status: Employed, Self-Employed, Entrepreneur,
                  Higher Study, NA, Unemployed, Further Education
                </li>
                <li>Date format: YYYY-MM-DD (e.g., 2024-01-15)</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── History Tab ── */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Upload History
                </span>
                <button
                  onClick={() => setShowHistoryFilters(!showHistoryFilters)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                    showHistoryFilters ||
                    historyStatusFilter ||
                    historyDateFrom ||
                    historyDateTo
                      ? "bg-green-50 border-[#009530] text-[#009530]"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  <FunnelIcon className="w-4 h-4" />
                  Filters
                  {(historyStatusFilter ||
                    historyDateFrom ||
                    historyDateTo) && (
                    <span className="ml-1 px-1.5 py-0.5 bg-[#009530] text-white text-xs rounded-full">
                      {
                        [
                          historyStatusFilter,
                          historyDateFrom,
                          historyDateTo,
                        ].filter(Boolean).length
                      }
                    </span>
                  )}
                </button>
              </div>

              {showHistoryFilters && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Status
                      </label>
                      <select
                        value={historyStatusFilter}
                        onChange={(e) => setHistoryStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009530] focus:border-[#009530]"
                      >
                        <option value="">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="processing">Processing</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={historyDateFrom}
                        onChange={(e) => setHistoryDateFrom(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009530] focus:border-[#009530]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={historyDateTo}
                        onChange={(e) => setHistoryDateTo(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009530] focus:border-[#009530]"
                      />
                    </div>
                  </div>
                  {(historyStatusFilter ||
                    historyDateFrom ||
                    historyDateTo) && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {historyStatusFilter && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          Status: {historyStatusFilter}
                          <button onClick={() => setHistoryStatusFilter("")}>
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {historyDateFrom && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          From: {historyDateFrom}
                          <button onClick={() => setHistoryDateFrom("")}>
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {historyDateTo && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          To: {historyDateTo}
                          <button onClick={() => setHistoryDateTo("")}>
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setHistoryStatusFilter("");
                          setHistoryDateFrom("");
                          setHistoryDateTo("");
                        }}
                        className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[
                      "Upload Date",
                      "File Name",
                      "Total",
                      "Processed",
                      "Failed",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {uploadHistory.length > 0 ? (
                    uploadHistory.map((upload) => (
                      <tr
                        key={upload.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-700">
                          {new Date(upload.created_at).toLocaleDateString()}
                          <br />
                          <span className="text-xs text-gray-400">
                            {new Date(upload.created_at).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                          {upload.file_name}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {upload.total_records}
                        </td>
                        <td className="px-4 py-3 font-semibold text-green-600">
                          {upload.records_processed}
                        </td>
                        <td className="px-4 py-3 font-semibold text-red-500">
                          {upload.records_failed}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(upload.status)}`}
                          >
                            {upload.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {upload.records_failed > 0 && (
                            <button
                              onClick={() => handleViewDetails(upload)}
                              className="text-xs font-semibold text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 rounded-lg px-3 py-1 transition-colors"
                            >
                              View Errors
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-4 py-16 text-center">
                        <ClockIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm font-medium text-gray-500">
                          No upload history yet
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Upload your first employment data file to see it here
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-gray-100">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-1.5 text-sm font-medium border border-gray-300 rounded-lg disabled:opacity-40 hover:border-[#009530] hover:text-[#009530] transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-1.5 text-sm font-medium border border-gray-300 rounded-lg disabled:opacity-40 hover:border-[#009530] hover:text-[#009530] transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Error Details Modal ── */}
        {showErrorModal && selectedUpload && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowErrorModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Upload Errors</h3>
                  <p className="text-xs text-gray-500 mt-0.5 truncate max-w-sm">
                    {selectedUpload.file_name}
                  </p>
                </div>
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Summary */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex gap-6 text-sm">
                <span className="text-gray-600">
                  Total: <strong>{selectedUpload.total_records}</strong>
                </span>
                <span className="text-green-600">
                  Processed: <strong>{selectedUpload.records_processed}</strong>
                </span>
                <span className="text-red-500">
                  Failed: <strong>{selectedUpload.records_failed}</strong>
                </span>
              </div>

              {/* Error table */}
              <div className="overflow-auto flex-1">
                {selectedUpload.error_log &&
                selectedUpload.error_log.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                      <tr>
                        {["Row", "Student ID", "Error"].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedUpload.error_log.map((err, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2.5 text-gray-600">
                            {err.row}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">
                            {err.student_id}
                          </td>
                          <td className="px-4 py-2.5 text-red-600">
                            {err.error}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-6 py-8 text-sm text-gray-400 text-center">
                    No errors found.
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="px-4 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default EmploymentUploadPage;
