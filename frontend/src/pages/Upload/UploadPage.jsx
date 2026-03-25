import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  BriefcaseIcon,
  InformationCircleIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import {
  uploadCSV,
  confirmUpload,
  downloadDynamicTemplate,
  getUploads,
  deleteUpload,
} from "../../services/upload.service";
import {
  uploadEmploymentCSV,
  downloadEmploymentTemplate,
  getEmploymentUploads,
  getEmploymentUploadDetails,
  checkApprovedStudents,
} from "../../services/employment.service";
import {
  uploadCertificationData,
  downloadCertificationTemplate,
} from "../../services/certification.service";
import { getMyCenters, getBatchesByCenter } from "../../services/data.service";
import { MainLayout } from "../../components/layout";
import UploadPreview from "./UploadPreview";
import UploadInstructions from "./UploadInstructions";

/**
 * Upload Page
 * Partner page for uploading CSV files
 */
const UploadPage = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState("upload");

  // Upload state
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);

  // Upload history state
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [uploadToDelete, setUploadToDelete] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Employment upload state
  const [employmentFile, setEmploymentFile] = useState(null);
  const [isEmploymentDragging, setIsEmploymentDragging] = useState(false);
  const [isEmploymentUploading, setIsEmploymentUploading] = useState(false);
  const [employmentError, setEmploymentError] = useState(null);
  const [employmentSuccess, setEmploymentSuccess] = useState(null);
  const employmentFileInputRef = useRef(null);
  const [selectedEmploymentUpload, setSelectedEmploymentUpload] =
    useState(null);
  const [showEmploymentErrorModal, setShowEmploymentErrorModal] =
    useState(false);

  // Approved students check state
  const [hasApprovedStudents, setHasApprovedStudents] = useState(true); // Optimistic default
  const [checkingApprovedStudents, setCheckingApprovedStudents] =
    useState(true);

  // Certification upload state
  const [certDataFile, setCertDataFile] = useState(null);
  const [certValidationDoc, setCertValidationDoc] = useState(null);
  const [certCenterId, setCertCenterId] = useState("");
  const [certBatchId, setCertBatchId] = useState("");
  const [certCenters, setCertCenters] = useState([]);
  const [certBatches, setCertBatches] = useState([]);
  const [certUploading, setCertUploading] = useState(false);
  const [certError, setCertError] = useState(null);
  const [certSuccess, setCertSuccess] = useState(null);
  const [certDataDragging, setCertDataDragging] = useState(false);
  const [certDocDragging, setCertDocDragging] = useState(false);

  /**
   * Fetch uploads for unified history tab (both student and employment)
   */
  const fetchUploads = useCallback(async () => {
    setLoading(true);
    setHistoryError(null);

    try {
      // Fetch both student uploads and employment uploads in parallel
      const [studentResult, employmentResult] = await Promise.all([
        getUploads(pagination.page, pagination.limit),
        getEmploymentUploads(pagination.page, pagination.limit),
      ]);

      // Add type property to distinguish between upload types
      const studentUploads = (studentResult.data || []).map((upload) => ({
        ...upload,
        type: "Student Data",
        upload_type: "student", // for filtering/sorting
      }));

      const employmentUploads = (employmentResult.data || []).map((upload) => ({
        ...upload,
        type: "Employment Data",
        upload_type: "employment", // for filtering/sorting
        // Map employment fields to match student upload structure
        total_records: upload.total_records || 0,
        status: upload.status || "completed",
        file_name: upload.file_name || "",
        created_at: upload.created_at,
        reviewed_at: upload.reviewed_at || null,
        uploaded_by_name: upload.uploaded_by_name || "Partner",
        reviewed_by_name: upload.reviewed_by_name || "-",
      }));

      // Merge both arrays
      let filteredData = [...studentUploads, ...employmentUploads];

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filteredData = filteredData.filter(
          (upload) =>
            upload.file_name?.toLowerCase().includes(search) ||
            upload.uploaded_by_name?.toLowerCase().includes(search) ||
            upload.reviewed_by_name?.toLowerCase().includes(search) ||
            upload.type?.toLowerCase().includes(search),
        );
      }

      // Status filter
      if (statusFilter) {
        filteredData = filteredData.filter(
          (upload) => upload.status === statusFilter,
        );
      }

      // Sorting - default by created_at desc (newest first)
      filteredData.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];

        // Handle dates
        if (sortBy === "created_at" || sortBy === "reviewed_at") {
          aVal = new Date(aVal || 0);
          bVal = new Date(bVal || 0);
        }

        if (sortOrder === "asc") {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      setUploads(filteredData);
      setPagination((prev) => ({
        ...prev,
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / prev.limit),
      }));
    } catch (err) {
      console.error("Failed to fetch uploads:", err);
      setHistoryError("Failed to load upload history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    statusFilter,
    sortBy,
    sortOrder,
  ]);

  /**
   * Load uploads when history tab is active
   */
  useEffect(() => {
    if (activeTab === "history") {
      fetchUploads();
    }
  }, [activeTab, fetchUploads]);

  /**
   * Check if partner has approved students when Employment Data tab is opened
   */
  useEffect(() => {
    const checkForApprovedStudents = async () => {
      if (activeTab === "employment") {
        setCheckingApprovedStudents(true);
        try {
          const result = await checkApprovedStudents();
          setHasApprovedStudents(result.hasApprovedStudents);
        } catch (error) {
          console.error("Error checking approved students:", error);
          // On error, optimistically assume they have students
          setHasApprovedStudents(true);
        } finally {
          setCheckingApprovedStudents(false);
        }
      }
    };

    checkForApprovedStudents();
  }, [activeTab]);

  /**
   * Handle file selection - Updated to support multiple formats
   */
  const handleFileSelect = (selectedFile) => {
    setError(null);
    setSuccess(null);

    // Validate file type - accept CSV, XLSX, XLS, XLSM
    const fileName = selectedFile.name.toLowerCase();
    const validExtensions = [".csv", ".xlsx", ".xls", ".xlsm"];
    const hasValidExtension = validExtensions.some((ext) =>
      fileName.endsWith(ext),
    );

    if (!hasValidExtension) {
      setError(
        "Invalid file type. Supported formats: CSV (.csv), Excel (.xlsx, .xls, .xlsm). We accept all Excel formats!",
      );
      return;
    }

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError(
        "File size exceeds 10MB limit. Please compress or split your data.",
      );
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
        preview.uploadData.fileName,
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
   * Handle delete upload
   */
  const handleDeleteClick = (upload) => {
    setUploadToDelete(upload);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!uploadToDelete) return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await deleteUpload(uploadToDelete.id);
      setUploadToDelete(null);
      fetchUploads(); // Refresh the list
    } catch (err) {
      console.error("Failed to delete upload:", err);
      setDeleteError(
        err.response?.data?.message ||
          "Failed to delete upload. Please try again.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setUploadToDelete(null);
    setDeleteError(null);
  };

  // ============================================
  // EMPLOYMENT UPLOAD HANDLERS
  // ============================================

  /**
   * Handle employment file selection
   */
  const handleEmploymentFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateEmploymentFile(selectedFile);
    }
  };

  /**
   * Validate employment file
   */
  const validateEmploymentFile = (selectedFile) => {
    // Check file type
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const fileExt = selectedFile.name
      .toLowerCase()
      .substring(selectedFile.name.lastIndexOf("."));

    if (!validExtensions.includes(fileExt)) {
      setEmploymentError({
        message: "Invalid file type. Please upload a CSV, XLS, or XLSX file.",
        errors: [],
      });
      return;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setEmploymentError({
        message: "File size exceeds 10MB. Please upload a smaller file.",
        errors: [],
      });
      return;
    }

    setEmploymentFile(selectedFile);
    setEmploymentError(null);
  };

  /**
   * Handle employment file drag events
   */
  const handleEmploymentDragOver = (e) => {
    e.preventDefault();
    setIsEmploymentDragging(true);
  };

  const handleEmploymentDragLeave = () => {
    setIsEmploymentDragging(false);
  };

  const handleEmploymentDrop = (e) => {
    e.preventDefault();
    setIsEmploymentDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateEmploymentFile(droppedFile);
    }
  };

  /**
   * Handle employment file upload
   */
  const handleEmploymentUpload = async () => {
    if (!employmentFile) return;

    setIsEmploymentUploading(true);
    setEmploymentError(null);
    setEmploymentSuccess(null);

    try {
      const result = await uploadEmploymentCSV(employmentFile);

      if (result.success) {
        setEmploymentSuccess(
          `Successfully uploaded ${result.data.records_processed} employment records!`,
        );
        setEmploymentFile(null);
        if (employmentFileInputRef.current) {
          employmentFileInputRef.current.value = "";
        }

        // Refresh unified history
        setTimeout(() => {
          fetchUploads(); // Refresh the unified history tab
          setEmploymentSuccess(null);
        }, 2000);
      } else {
        setEmploymentError({
          message: result.message || "Upload failed",
          errors: result.errors || [],
        });
      }
    } catch (err) {
      console.error("Employment upload error:", err);
      setEmploymentError({
        message:
          err.response?.data?.message ||
          "Failed to upload employment data. Please try again.",
        errors: err.response?.data?.errors || [],
      });
    } finally {
      setIsEmploymentUploading(false);
    }
  };

  /**
   * Download employment template
   */
  const handleDownloadEmploymentTemplate = async () => {
    try {
      await downloadEmploymentTemplate();
    } catch (err) {
      console.error("Download employment template error:", err);

      let errorMessage = "Failed to download template. Please try again.";

      // Check for specific error types
      if (err.response) {
        // Server responded with error - use backend message if available
        if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.status === 400) {
          errorMessage =
            "No approved students found. Please upload and get student data approved first.";
        } else if (err.response.status === 401) {
          errorMessage = "You are not authorized. Please log in again.";
        } else if (err.response.status === 403) {
          errorMessage = "You don't have permission to download this template.";
        } else if (err.response.status === 404) {
          errorMessage = "Template not found on server.";
        } else if (err.response.status === 500) {
          errorMessage =
            "Server error while generating template. Please contact support.";
        }

        // If backend sent NO_APPROVED_STUDENTS code, refresh the check
        if (err.response.data?.code === "NO_APPROVED_STUDENTS") {
          setHasApprovedStudents(false);
        }
      } else if (err.request) {
        // Request was made but no response
        errorMessage =
          "Cannot connect to server. Please check your internet connection.";
      }

      setEmploymentError({
        message: errorMessage,
        errors: [],
      });
    }
  };

  /**
   * Clear employment file selection
   */
  const handleClearEmploymentFile = () => {
    setEmploymentFile(null);
    setEmploymentError(null);
    setEmploymentSuccess(null);
    if (employmentFileInputRef.current) {
      employmentFileInputRef.current.value = "";
    }
  };

  /**
   * View employment upload error details
   */
  const handleViewEmploymentErrors = async (upload) => {
    try {
      const result = await getEmploymentUploadDetails(upload.id);
      if (result.success) {
        setSelectedEmploymentUpload(result.data);
        setShowEmploymentErrorModal(true);
      }
    } catch (err) {
      console.error("Failed to fetch error details:", err);
    }
  };

  // ── Certification handlers ──────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "certification" && certCenters.length === 0) {
      getMyCenters({ status: "approved" })
        .then((res) => setCertCenters(res.data || []))
        .catch(() => {});
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCertCenterChange = async (centerId) => {
    setCertCenterId(centerId);
    setCertBatchId("");
    setCertBatches([]);
    if (!centerId) return;
    try {
      const res = await getBatchesByCenter(centerId);
      setCertBatches(res.data || res || []);
    } catch {
      setCertBatches([]);
    }
  };

  const handleCertUpload = async () => {
    if (!certDataFile || !certValidationDoc) {
      setCertError(
        "Please select both the data CSV and the validation document.",
      );
      return;
    }
    if (!certCenterId || !certBatchId) {
      setCertError("Please select a center and a batch.");
      return;
    }
    setCertUploading(true);
    setCertError(null);
    setCertSuccess(null);
    try {
      const result = await uploadCertificationData(
        certDataFile,
        certValidationDoc,
        certCenterId,
        certBatchId,
      );
      if (result.success) {
        setCertSuccess(
          `Successfully uploaded ${result.data?.total_records || 0} certification records! Awaiting admin approval.`,
        );
        setCertDataFile(null);
        setCertValidationDoc(null);
        setCertCenterId("");
        setCertBatchId("");
        setCertBatches([]);
      } else {
        setCertError(result.message || "Upload failed. Please try again.");
      }
    } catch (err) {
      setCertError(
        err.response?.data?.message || "Upload failed. Please try again.",
      );
    } finally {
      setCertUploading(false);
    }
  };

  const handleDownloadCertTemplate = async () => {
    try {
      await downloadCertificationTemplate();
    } catch {
      // silently ignore – user will see browser error
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Upload Data</h1>
          <p className="text-muted-foreground mt-2">
            Upload your center and student data for approval
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab("upload")}
            className={`pb-3 px-2 font-medium transition-colors relative ${
              activeTab === "upload"
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Upload Data
          </button>
          <button
            onClick={() => setActiveTab("employment")}
            className={`pb-3 px-2 font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === "employment"
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BriefcaseIcon className="h-4 w-4" />
            Employment Data
          </button>
          <button
            onClick={() => setActiveTab("certification")}
            className={`pb-3 px-2 font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === "certification"
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AcademicCapIcon className="h-4 w-4" />
            Certification Data
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 px-2 font-medium transition-colors relative ${
              activeTab === "history"
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Upload History
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "upload" ? (
          <div>
            {/* Important Warning Banner */}
            <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5"
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
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-800 mb-1">
                    ⚠️ Important: Centers Must Be Approved
                  </h3>
                  <p className="text-amber-700 text-sm">
                    You can only upload data for{" "}
                    <strong>approved centers</strong>. If you try to upload data
                    for centers that are pending approval, the upload will be
                    rejected. Please ensure all centers in your CSV file have
                    been approved by the admin before uploading.
                  </p>
                  <p className="text-amber-700 text-sm mt-2">
                    👉 Check your centers' approval status in the{" "}
                    <strong>"My Centers"</strong> page.
                  </p>
                </div>
              </div>
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

            {/* Main Content - Two Column Layout */}
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
                      accept=".csv,.xlsx,.xls,.xlsm"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    <div className="flex flex-col items-center">
                      <ArrowUpTrayIcon className="h-12 w-12 text-muted-foreground mb-4" />

                      {!file ? (
                        <>
                          <p className="text-foreground font-medium mb-2">
                            Drag and drop your file here
                          </p>
                          <p className="text-muted-foreground text-sm mb-4">
                            Supports: CSV, Excel (XLSX, XLS, XLSM) • Max 10MB
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-primary-600 font-medium mb-2">
                            ✓ {file.name}
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
                <UploadInstructions
                  onDownloadTemplate={handleDownloadTemplate}
                />
              </div>
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
          </div>
        ) : activeTab === "employment" ? (
          /* Employment Upload Tab */
          <div>
            {/* No Approved Students Banner */}
            {!checkingApprovedStudents && !hasApprovedStudents && (
              <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
                <div className="flex items-start gap-3">
                  <InformationCircleIcon className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-800 mb-2">
                      📋 No Approved Students Found
                    </h3>
                    <p className="text-blue-700 text-sm mb-3">
                      You need to have approved students before you can upload
                      employment data. Employment information can only be added
                      for students who have been approved by the admin.
                    </p>
                    <p className="text-blue-700 text-sm mb-3">
                      <strong>Next steps:</strong>
                    </p>
                    <ol className="text-blue-700 text-sm space-y-1 ml-4 list-decimal">
                      <li>Upload your student data in the "Upload Data" tab</li>
                      <li>
                        Wait for admin to review and approve your students
                      </li>
                      <li>
                        Once approved, return here to add employment information
                      </li>
                    </ol>
                    <button
                      onClick={() => setActiveTab("upload")}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Go to Upload Data Tab
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Important Warning Banner */}
            <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5"
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
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-800 mb-1">
                    ⚠️ Important: Students Must Be Approved
                  </h3>
                  <p className="text-amber-700 text-sm">
                    You can only upload employment data for{" "}
                    <strong>approved students</strong>. Employment records for
                    students that are pending approval or rejected will be
                    skipped. Please ensure all students in your CSV file have
                    been approved by the admin before uploading.
                  </p>
                  <p className="text-amber-700 text-sm mt-2">
                    👉 Student ID must match your{" "}
                    <strong>partner_student_id</strong> records.
                  </p>
                </div>
              </div>
            </div>

            {/* Success Message */}
            {employmentSuccess && (
              <div className="mb-6 bg-primary-50 border border-primary-500 rounded-lg p-4 flex items-start gap-3">
                <CheckCircleIcon className="h-6 w-6 text-primary-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-primary-700">Success!</h3>
                  <p className="text-primary-600 text-sm mt-1">
                    {employmentSuccess}
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {employmentError && (
              <div className="mb-6 bg-destructive/10 border border-destructive rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircleIcon className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-destructive">
                      Upload Failed
                    </h3>
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
                          onClick={() =>
                            employmentFileInputRef.current?.click()
                          }
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
                                    <td className="px-4 py-2">
                                      {error.student_id}
                                    </td>
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
        ) : activeTab === "certification" ? (
          /* ── Certification Data Tab ─────────────────────────────────── */
          <div>
            {/* Success banner */}
            {certSuccess && (
              <div className="mb-6 bg-green-50 border border-green-400 rounded-lg p-4 flex items-start gap-3">
                <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-700">
                    Upload Submitted!
                  </h3>
                  <p className="text-green-600 text-sm mt-0.5">{certSuccess}</p>
                </div>
              </div>
            )}

            {/* Error banner */}
            {certError && (
              <div className="mb-6 bg-red-50 border border-red-400 rounded-lg p-4 flex items-start gap-3">
                <XCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-700">Upload Error</h3>
                  <p className="text-red-600 text-sm mt-0.5">{certError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: upload zones (2/3) */}
              <div className="lg:col-span-2 space-y-5">
                {/* Center + batch selection */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="font-semibold text-gray-800 mb-4">
                    Select Center &amp; Batch
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Center *
                      </label>
                      <select
                        value={certCenterId}
                        onChange={(e) => handleCertCenterChange(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                      >
                        <option value="">-- Select center --</option>
                        {certCenters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Batch *
                      </label>
                      <select
                        value={certBatchId}
                        onChange={(e) => setCertBatchId(e.target.value)}
                        disabled={!certCenterId}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-gray-50"
                      >
                        <option value="">-- Select batch --</option>
                        {certBatches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.batch_number || b.name || b.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Two drop zones side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Data CSV */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setCertDataDragging(true);
                    }}
                    onDragLeave={() => setCertDataDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setCertDataDragging(false);
                      const f = e.dataTransfer.files[0];
                      if (f) setCertDataFile(f);
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      certDataDragging
                        ? "border-primary-400 bg-primary-50"
                        : "border-gray-300 hover:border-primary-400 hover:bg-gray-50"
                    }`}
                    onClick={() =>
                      document.getElementById("certDataInput").click()
                    }
                  >
                    <input
                      id="certDataInput"
                      type="file"
                      accept=".csv,.xlsx,.xls,.xlsm"
                      className="hidden"
                      onChange={(e) =>
                        setCertDataFile(e.target.files[0] || null)
                      }
                    />
                    <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    {certDataFile ? (
                      <div>
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {certDataFile.name}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCertDataFile(null);
                          }}
                          className="mt-1 text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Batch Data CSV/Excel
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Drag &amp; drop or click
                        </p>
                        <p className="text-xs text-gray-400">
                          .csv / .xlsx / .xls / .xlsm
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Validation doc */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setCertDocDragging(true);
                    }}
                    onDragLeave={() => setCertDocDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setCertDocDragging(false);
                      const f = e.dataTransfer.files[0];
                      if (f) setCertValidationDoc(f);
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      certDocDragging
                        ? "border-primary-400 bg-primary-50"
                        : "border-gray-300 hover:border-primary-400 hover:bg-gray-50"
                    }`}
                    onClick={() =>
                      document.getElementById("certDocInput").click()
                    }
                  >
                    <input
                      id="certDocInput"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) =>
                        setCertValidationDoc(e.target.files[0] || null)
                      }
                    />
                    <DocumentArrowDownIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    {certValidationDoc ? (
                      <div>
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {certValidationDoc.name}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCertValidationDoc(null);
                          }}
                          className="mt-1 text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Validation Document
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Drag &amp; drop or click
                        </p>
                        <p className="text-xs text-gray-400">
                          PDF / JPEG / PNG
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload button */}
                <button
                  onClick={handleCertUpload}
                  disabled={
                    certUploading ||
                    !certDataFile ||
                    !certValidationDoc ||
                    !certCenterId ||
                    !certBatchId
                  }
                  className="w-full py-3 bg-[#009530] disabled:opacity-60 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  {certUploading ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />{" "}
                      Uploading…
                    </>
                  ) : (
                    <>
                      <ArrowUpTrayIcon className="h-4 w-4" /> Upload
                      Certification Data
                    </>
                  )}
                </button>
              </div>

              {/* Right: instructions (1/3) */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <AcademicCapIcon className="h-4 w-4 text-primary-600" />
                    Instructions
                  </h2>
                  <ol className="text-sm text-gray-600 space-y-2 list-decimal ml-4">
                    <li>Download the CSV template using the button below.</li>
                    <li>
                      Fill in trainee details: name, course, marks, status,
                      assessment date, trainer name.
                    </li>
                    <li>
                      Attach a validation document (signed PDF or photo) proving
                      assessment was conducted.
                    </li>
                    <li>
                      Select the center and batch, then upload both files.
                    </li>
                    <li>
                      Admin will review and approve. ESSCI will then upload the
                      certificate PDF.
                    </li>
                  </ol>

                  <button
                    onClick={handleDownloadCertTemplate}
                    className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-primary-500 text-primary-600 rounded-lg hover:bg-primary-50 text-sm font-medium transition-colors"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    Download CSV Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Upload History Tab */
          <div className="space-y-6">
            {/* Search, Filter, Sort Bar */}
            <div className="bg-white p-4 rounded-lg shadow-card">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by file name, uploader, or reviewer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                    showFilters || statusFilter
                      ? "bg-primary-50 border-primary-500 text-primary-700"
                      : "border-border hover:bg-background-secondary"
                  }`}
                >
                  <FunnelIcon className="h-5 w-5" />
                  Filters
                  {statusFilter && (
                    <span className="ml-1 px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">
                      1
                    </span>
                  )}
                </button>

                {/* Sort Dropdown */}
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split("-");
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                  <option value="file_name-asc">File Name (A-Z)</option>
                  <option value="file_name-desc">File Name (Z-A)</option>
                  <option value="status-asc">Status (A-Z)</option>
                  <option value="status-desc">Status (Z-A)</option>
                </select>
              </div>

              {/* Expandable Filters */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Status
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="partial">Partial</option>
                      </select>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {statusFilter && (
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Active filters:
                      </span>
                      <button
                        onClick={() => setStatusFilter("")}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full hover:bg-primary-200"
                      >
                        Status: {statusFilter}
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Upload History Table */}
            <div className="bg-white rounded-lg shadow-card overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <ArrowPathIcon className="h-8 w-8 text-primary-500 animate-spin" />
                </div>
              ) : historyError ? (
                <div className="text-center py-12">
                  <p className="text-destructive">{historyError}</p>
                  <button
                    onClick={fetchUploads}
                    className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    Try Again
                  </button>
                </div>
              ) : uploads.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No uploads yet</p>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="inline-block mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    Upload Your First File
                  </button>
                </div>
              ) : (
                <>
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            File Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Version
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Records
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Uploaded
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Reviewed
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {uploads.map((upload) => (
                          <tr
                            key={`${upload.upload_type}-${upload.id}`}
                            className="hover:bg-background-secondary"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-foreground">
                                {upload.file_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                                  upload.upload_type === "student"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-purple-100 text-purple-700"
                                }`}
                              >
                                {upload.upload_type === "student" ? (
                                  <svg
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                    />
                                  </svg>
                                ) : (
                                  <BriefcaseIcon className="h-3.5 w-3.5" />
                                )}
                                {upload.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-muted-foreground">
                                {upload.version ? `v${upload.version}` : "-"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-foreground">
                                {upload.total_records || 0}
                                {upload.upload_type === "employment" &&
                                  upload.records_processed && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      ({upload.records_processed} processed)
                                    </span>
                                  )}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                                  upload.status === "pending"
                                    ? "bg-secondary-100 text-secondary-700"
                                    : upload.status === "approved"
                                      ? "bg-primary-100 text-primary-700"
                                      : upload.status === "rejected"
                                        ? "bg-destructive/10 text-destructive"
                                        : upload.status === "partial"
                                          ? "bg-blue-100 text-blue-700"
                                          : upload.status === "completed"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {upload.status?.charAt(0).toUpperCase() +
                                  upload.status?.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-muted-foreground">
                                {new Date(upload.created_at).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                by {upload.uploaded_by_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {upload.reviewed_at ? (
                                <>
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(
                                      upload.reviewed_at,
                                    ).toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    by {upload.reviewed_by_name}
                                  </div>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center gap-3">
                                {upload.upload_type === "employment" ? (
                                  // Employment uploads: Show "View Errors" if there are failed records
                                  upload.records_failed &&
                                  upload.records_failed > 0 ? (
                                    <button
                                      onClick={() =>
                                        handleViewEmploymentErrors(upload)
                                      }
                                      className="text-destructive hover:text-destructive/80 font-medium"
                                    >
                                      View Errors ({upload.records_failed})
                                    </button>
                                  ) : (
                                    <span className="text-green-600 font-medium">
                                      ✓ Success
                                    </span>
                                  )
                                ) : (
                                  // Student uploads: Show View and Delete buttons
                                  <>
                                    <button className="text-primary-600 hover:text-primary-700 font-medium">
                                      View
                                    </button>
                                    {(upload.status === "pending" ||
                                      upload.status === "rejected") && (
                                      <button
                                        onClick={() =>
                                          handleDeleteClick(upload)
                                        }
                                        className="text-destructive hover:text-destructive/80 font-medium"
                                        title="Delete upload"
                                      >
                                        <TrashIcon className="h-5 w-5" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {(pagination.page - 1) * pagination.limit + 1}{" "}
                        to{" "}
                        {Math.min(
                          pagination.page * pagination.limit,
                          pagination.total,
                        )}{" "}
                        of {pagination.total} results
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              page: prev.page - 1,
                            }))
                          }
                          disabled={pagination.page === 1}
                          className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-secondary"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              page: prev.page + 1,
                            }))
                          }
                          disabled={pagination.page === pagination.totalPages}
                          className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-secondary"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Delete Confirmation Modal */}
            {uploadToDelete && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Confirm Deletion
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Are you sure you want to delete the upload "
                    <span className="font-medium text-foreground">
                      {uploadToDelete.file_name}
                    </span>
                    "? This action cannot be undone.
                  </p>

                  {deleteError && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive">{deleteError}</p>
                    </div>
                  )}

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={handleDeleteCancel}
                      disabled={deleteLoading}
                      className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-background-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={deleteLoading}
                      className="px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {deleteLoading && (
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default UploadPage;
