import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import {
  MagnifyingGlassIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import {
  uploadCSV,
  confirmUpload,
  downloadDynamicTemplate,
  getUploads,
  deleteUpload,
  downloadUploadFile,
} from "../../services/upload.service";
import {
  uploadEmploymentCSV,
  downloadEmploymentTemplate,
  fetchAvailablePeriods,
  getEmploymentUploads,
  getEmploymentUploadDetails,
  getEmploymentUploadAttachments,
  downloadEmploymentFile,
  checkApprovedStudents,
} from "../../services/employment.service";
import { uploadCertificationData } from "../../services/certification.service";
import { uploadTotCSV, downloadTotTemplate } from "../../services/tot.service";
import partnerService from "../../services/partner.service";
import {
  getMyCenters,
  getCenters,
  getBatchesByCenter,
} from "../../services/data.service";
import { MainLayout } from "../../components/layout";
import EmploymentPeriodModal from "../../components/common/EmploymentPeriodModal";
import TraineeDataTab from "./tabs/TraineeDataTab";
import EmploymentDataTab from "./tabs/EmploymentDataTab";
import CertificationDataTab from "./tabs/CertificationDataTab";
import TotDataTab from "./tabs/TotDataTab";
import PartnerHistoryTab from "./tabs/PartnerHistoryTab";
import { ROUTES } from "../../constants/routes";

const VALID_UPLOAD_TABS = [
  "upload",
  "employment",
  "certification",
  "tot",
  "history",
];

/**
 * Upload Page
 * Partner page for uploading CSV files
 */
const UploadPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // Auth
  const user = useSelector((s) => s.auth?.user);
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.role);

  // Admin: upload on behalf of partner
  const [targetPartnerId, setTargetPartnerId] = useState("");
  const [partnerList, setPartnerList] = useState([]);
  const [partnerSearch, setPartnerSearch] = useState("");

  // Filtered partner list for the picker (admin only)
  const filteredPartners = useMemo(() => {
    if (!partnerSearch.trim()) return partnerList;
    const q = partnerSearch.toLowerCase();
    return partnerList.filter((p) => p.name.toLowerCase().includes(q));
  }, [partnerList, partnerSearch]);

  // Tab state
  const [activeTab, setActiveTab] = useState(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    return VALID_UPLOAD_TABS.includes(requestedTab) ? requestedTab : "upload";
  });

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

  // Certification upload state
  const [certCenterId, setCertCenterId] = useState("");
  const [certBatchId, setCertBatchId] = useState("");
  const [certCenters, setCertCenters] = useState([]);
  const [certBatches, setCertBatches] = useState([]);
  const [certCentersLoading, setCertCentersLoading] = useState(false);
  const [certBatchesLoading, setCertBatchesLoading] = useState(false);
  const [certBatchStartDate, setCertBatchStartDate] = useState("");
  const [certBatchEndDate, setCertBatchEndDate] = useState("");
  const [certAssessmentDate, setCertAssessmentDate] = useState("");
  const [certSupportDoc, setCertSupportDoc] = useState(null);
  const [certUploading, setCertUploading] = useState(false);
  const [certError, setCertError] = useState(null);
  const [certSuccess, setCertSuccess] = useState(null);

  // Collapsible note state (per tab)
  const [noteOpen, setNoteOpen] = useState(false);
  const [empNoteOpen, setEmpNoteOpen] = useState(false);
  const [certNoteOpen, setCertNoteOpen] = useState(false);

  // Employment period modal state
  const [showEmpPeriodModal, setShowEmpPeriodModal] = useState(false);
  const [empAvailablePeriods, setEmpAvailablePeriods] = useState(null);
  const [empPeriodLoading, setEmpPeriodLoading] = useState(false);
  const [empPeriodError, setEmpPeriodError] = useState(null);

  // TOT upload state
  const [totFile, setTotFile] = useState(null);
  const [isTotDragging, setIsTotDragging] = useState(false);
  const [totUploading, setTotUploading] = useState(false);
  const [totError, setTotError] = useState(null);
  const [totSuccess, setTotSuccess] = useState(null);
  const [totNoteOpen, setTotNoteOpen] = useState(false);

  const totFileInputRef = useRef(null);

  const handleTabChange = useCallback(
    (tab) => {
      setActiveTab(tab);
      const nextParams = new URLSearchParams(searchParams);

      if (tab === "upload") {
        nextParams.delete("tab");
      } else {
        nextParams.set("tab", tab);
      }

      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    let nextTab = VALID_UPLOAD_TABS.includes(requestedTab)
      ? requestedTab
      : "upload";

    // Admins must not land on the history tab
    if (isAdmin && nextTab === "history") nextTab = "upload";

    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, isAdmin, searchParams]);

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
        file_url: upload.file_url || "",
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
   * Load partner list for admin users
   */
  useEffect(() => {
    if (isAdmin) {
      partnerService
        .getSimpleList()
        .then((res) => {
          setPartnerList(res.data || []);
        })
        .catch(() => setPartnerList([]));
    }
  }, [isAdmin]);

  /**
   * Check if partner has approved students when Employment Data tab is opened
   */
  useEffect(() => {
    const checkForApprovedStudents = async () => {
      if (activeTab === "employment") {
        try {
          const result = await checkApprovedStudents();
          setHasApprovedStudents(result.hasApprovedStudents);
        } catch (error) {
          console.error("Error checking approved students:", error);
          // On error, optimistically assume they have students
          setHasApprovedStudents(true);
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
      const result = await uploadCSV(
        file,
        isAdmin ? targetPartnerId || null : null,
      );

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
        helpText: err.response?.data?.helpText || null,
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
        isAdmin ? targetPartnerId || null : null,
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
      await downloadDynamicTemplate(isAdmin ? targetPartnerId || null : null);
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
   * Handle download original upload file (B10)
   */
  const handleDownloadUpload = async (upload) => {
    try {
      await downloadUploadFile(upload.id, upload.file_name);
    } catch (err) {
      console.error("Failed to download upload file:", err);
      const msg =
        err?.response?.data?.message ||
        "File is no longer available. It may have been removed after a server update. Please re-upload if needed.";
      toast.error(msg);
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
      const result = await uploadEmploymentCSV(
        employmentFile,
        isAdmin ? targetPartnerId || null : null,
      );

      if (result.success) {
        setEmploymentSuccess(
          `Successfully uploaded ${result.processed} employment records!`,
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
   * Download employment template â€” opens period picker modal first
   */
  const handleDownloadEmploymentTemplate = async () => {
    // For admins, targetPartnerId must be selected
    if (isAdmin && !targetPartnerId) {
      setEmploymentError({
        message:
          "Please select a partner first before downloading the employment template.",
        errors: [],
      });
      return;
    }

    // Fetch available periods then open modal
    setEmpAvailablePeriods(null); // triggers loading state in modal
    setEmpPeriodError(null);
    setShowEmpPeriodModal(true);
    try {
      const result = await fetchAvailablePeriods(
        isAdmin ? targetPartnerId : null,
      );
      setEmpAvailablePeriods(result?.data?.periods ?? []);
    } catch {
      setEmpAvailablePeriods([]);
    }
  };

  /**
   * Called when user confirms period selection in the modal
   */
  const handleEmpPeriodConfirm = async (period) => {
    setEmpPeriodLoading(true);
    try {
      await downloadEmploymentTemplate(
        isAdmin ? targetPartnerId : null,
        period,
      );
      setShowEmpPeriodModal(false);
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

      setEmpPeriodError(errorMessage);
    } finally {
      setEmpPeriodLoading(false);
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

  const handleDownloadEmploymentFile = async (upload) => {
    try {
      await downloadEmploymentFile(upload.id, upload.file_name);
    } catch (err) {
      console.error("Failed to download employment file:", err);
      toast.error(
        err?.response?.data?.message ||
          "File is no longer available. It may have been removed after a server update.",
      );
    }
  };

  const handleViewEmploymentAttachments = async (upload) => {
    try {
      const result = await getEmploymentUploadAttachments(upload.id);
      const attachments = result.data?.attachments || [];
      if (attachments.length === 0) {
        toast.info("No supporting attachments found for this upload.");
        return;
      }

      attachments.forEach((attachment) => {
        if (attachment?.url) {
          window.open(attachment.url, "_blank", "noopener,noreferrer");
        }
      });
    } catch (err) {
      console.error("Failed to fetch attachments:", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to load attachments for this upload.",
      );
    }
  };

  // â”€â”€ Certification handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (activeTab !== "certification") return;
    // For admin, require a partner to be selected first
    if (isAdmin && !targetPartnerId) {
      setCertCenters([]);
      return;
    }
    setCertCenters([]);
    setCertCenterId("");
    setCertBatchId("");
    setCertBatches([]);
    setCertCentersLoading(true);
    const loadCenters = isAdmin
      ? getCenters({
          partner_id: targetPartnerId,
          approval_status: "approved",
          limit: 1000,
        })
      : getMyCenters({ limit: 1000 });
    loadCenters
      .then((res) => {
        const all = res.data || [];
        // Only show centers approved by admin
        setCertCenters(all.filter((c) => c.approval_status === "approved"));
      })
      .catch(() =>
        setCertError("Failed to load centers. Please refresh the page."),
      )
      .finally(() => setCertCentersLoading(false));
  }, [activeTab, isAdmin, targetPartnerId]);

  const handleCertCenterChange = async (centerId) => {
    setCertCenterId(centerId);
    setCertBatchId("");
    setCertBatches([]);
    if (!centerId) return;
    setCertBatchesLoading(true);
    try {
      const res = await getBatchesByCenter(centerId);
      setCertBatches(res.data || res || []);
    } catch {
      setCertBatches([]);
      setCertError("Failed to load batches for the selected center.");
    } finally {
      setCertBatchesLoading(false);
    }
  };

  const handleCertUpload = async () => {
    if (!certCenterId || !certBatchId) {
      setCertError("Please select a center and a batch.");
      return;
    }
    setCertUploading(true);
    setCertError(null);
    setCertSuccess(null);
    try {
      const result = await uploadCertificationData(
        certCenterId,
        certBatchId,
        certBatchStartDate || undefined,
        certBatchEndDate || undefined,
        certAssessmentDate || undefined,
        certSupportDoc || undefined,
        isAdmin ? targetPartnerId || null : null,
      );
      if (result.success) {
        setCertSuccess(
          "Certification data submitted successfully! Awaiting admin approval.",
        );
        setCertCenterId("");
        setCertBatchId("");
        setCertBatches([]);
        setCertBatchStartDate("");
        setCertBatchEndDate("");
        setCertAssessmentDate("");
        setCertSupportDoc(null);
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

  // â”€â”€ TOT upload handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleTotFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf("."));
    if (![".csv", ".xlsx", ".xls"].includes(ext)) {
      setTotError({
        message: "Invalid file type. Use CSV, XLS, or XLSX.",
        errors: [],
      });
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setTotError({ message: "File size exceeds 10MB.", errors: [] });
      return;
    }
    setTotFile(f);
    setTotError(null);
  };

  const handleTotUpload = async () => {
    if (!totFile) return;
    setTotUploading(true);
    setTotError(null);
    setTotSuccess(null);
    try {
      const result = await uploadTotCSV(
        totFile,
        isAdmin ? targetPartnerId || null : null,
      );
      if (result.success) {
        setTotSuccess(
          `Successfully uploaded ${result.data?.processed || 0} TOT records! Awaiting admin approval.`,
        );
        setTotFile(null);
        if (totFileInputRef.current) totFileInputRef.current.value = "";
      } else {
        setTotError({
          message: result.message || "Upload failed",
          errors: result.errors || [],
        });
      }
    } catch (err) {
      setTotError({
        message:
          err.response?.data?.message ||
          "Failed to upload TOT data. Please try again.",
        errors: err.response?.data?.errors || [],
      });
    } finally {
      setTotUploading(false);
    }
  };

  const handleDownloadTotTemplate = async () => {
    try {
      await downloadTotTemplate();
    } catch {
      setTotError({ message: "Failed to download template.", errors: [] });
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Upload Data</h1>
            <p className="text-muted-foreground mt-2">
              Upload your center and student data for approval
            </p>
          </div>
          {isAdmin && (
            <Link
              to={ROUTES.DATA_UPLOADS}
              className="shrink-0 mt-1 text-sm font-medium text-[#009530] hover:text-[#007a2a] underline underline-offset-2 transition-colors"
            >
              View Admin Upload History
            </Link>
          )}
        </div>

        {/* Admin: mandatory partner selection gate */}
        {isAdmin && !targetPartnerId && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl bg-white border border-[#A5A5A5] rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <UserGroupIcon className="h-7 w-7 text-[#009530]" />
                <h2 className="text-xl font-bold text-gray-800">
                  Select a Partner to Continue
                </h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                As an admin, you must select the partner you are uploading data
                on behalf of. This selection applies to all upload tabs and
                template downloads.
              </p>

              {/* Search */}
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search partnersâ€¦"
                  value={partnerSearch}
                  onChange={(e) => setPartnerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[#A5A5A5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009530]/40"
                />
              </div>

              {/* Partner list */}
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {partnerList.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    Loading partnersâ€¦
                  </p>
                ) : filteredPartners.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No partners match your search.
                  </p>
                ) : (
                  filteredPartners.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setTargetPartnerId(p.id);
                        setPartnerSearch("");
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl border border-[#A5A5A5] hover:border-[#009530] hover:bg-green-50 transition-colors flex items-center justify-between group"
                    >
                      <span className="font-medium text-gray-800 text-sm">
                        {p.name}
                      </span>
                      <span className="text-xs text-[#009530] opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                        Select â†’
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Admin: selected partner header bar (shown once partner is chosen) */}
        {isAdmin && targetPartnerId && (
          <div className="mb-6 flex items-center justify-between bg-green-50 border border-[#009530]/30 rounded-xl px-5 py-3">
            <div className="flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5 text-[#009530]" />
              <span className="text-sm font-semibold text-gray-700">
                Uploading on behalf of:
              </span>
              <span className="text-sm font-bold text-[#009530]">
                {partnerList.find((p) => p.id === targetPartnerId)?.name}
              </span>
            </div>
            <button
              onClick={() => setTargetPartnerId("")}
              className="text-xs text-gray-500 hover:text-red-600 underline transition-colors"
            >
              Change Partner
            </button>
          </div>
        )}

        {/* Tabs and tab content â€” hidden for admin until partner is selected */}
        {(!isAdmin || targetPartnerId) && (
          <div>
            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-border">
              <button
                onClick={() => handleTabChange("upload")}
                className={`pb-3 px-2 font-medium transition-colors relative ${
                  activeTab === "upload"
                    ? "text-primary-600 border-b-2 border-primary-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Trainee Data
              </button>
              <button
                onClick={() => handleTabChange("employment")}
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
                onClick={() => handleTabChange("certification")}
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
                onClick={() => handleTabChange("tot")}
                className={`pb-3 px-2 font-medium transition-colors relative flex items-center gap-2 ${
                  activeTab === "tot"
                    ? "text-primary-600 border-b-2 border-primary-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserGroupIcon className="h-4 w-4" />
                TOT Data
              </button>
              {!isAdmin && (
                <button
                  onClick={() => handleTabChange("history")}
                  className={`pb-3 px-2 font-medium transition-colors relative ${
                    activeTab === "history"
                      ? "text-primary-600 border-b-2 border-primary-600"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Upload History
                </button>
              )}
            </div>

            {/* Tab Content */}
            {activeTab === "upload" ? (
              <TraineeDataTab
                noteOpen={noteOpen}
                setNoteOpen={setNoteOpen}
                success={success}
                error={error}
                file={file}
                isDragging={isDragging}
                isUploading={isUploading}
                showPreview={showPreview}
                preview={preview}
                setShowPreview={setShowPreview}
                setPreview={setPreview}
                fileInputRef={fileInputRef}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                handleFileInputChange={handleFileInputChange}
                handleImportClick={handleImportClick}
                handleClearFile={handleClearFile}
                handleUpload={handleUpload}
                handleConfirmUpload={handleConfirmUpload}
                handleDownloadTemplate={handleDownloadTemplate}
              />
            ) : activeTab === "employment" ? (
              <EmploymentDataTab
                empNoteOpen={empNoteOpen}
                setEmpNoteOpen={setEmpNoteOpen}
                employmentSuccess={employmentSuccess}
                employmentError={employmentError}
                employmentFile={employmentFile}
                isEmploymentDragging={isEmploymentDragging}
                isEmploymentUploading={isEmploymentUploading}
                showEmploymentErrorModal={showEmploymentErrorModal}
                setShowEmploymentErrorModal={setShowEmploymentErrorModal}
                selectedEmploymentUpload={selectedEmploymentUpload}
                hasApprovedStudents={hasApprovedStudents}
                employmentFileInputRef={employmentFileInputRef}
                handleEmploymentDragOver={handleEmploymentDragOver}
                handleEmploymentDragLeave={handleEmploymentDragLeave}
                handleEmploymentDrop={handleEmploymentDrop}
                handleEmploymentFileChange={handleEmploymentFileChange}
                handleClearEmploymentFile={handleClearEmploymentFile}
                handleEmploymentUpload={handleEmploymentUpload}
                handleDownloadEmploymentTemplate={
                  handleDownloadEmploymentTemplate
                }
              />
            ) : activeTab === "certification" ? (
              <CertificationDataTab
                certNoteOpen={certNoteOpen}
                setCertNoteOpen={setCertNoteOpen}
                certSuccess={certSuccess}
                certError={certError}
                certCenters={certCenters}
                certBatches={certBatches}
                certCenterId={certCenterId}
                certBatchId={certBatchId}
                setCertBatchId={setCertBatchId}
                certCentersLoading={certCentersLoading}
                certBatchesLoading={certBatchesLoading}
                certBatchStartDate={certBatchStartDate}
                setCertBatchStartDate={setCertBatchStartDate}
                certBatchEndDate={certBatchEndDate}
                setCertBatchEndDate={setCertBatchEndDate}
                certAssessmentDate={certAssessmentDate}
                setCertAssessmentDate={setCertAssessmentDate}
                certSupportDoc={certSupportDoc}
                setCertSupportDoc={setCertSupportDoc}
                certUploading={certUploading}
                handleCertCenterChange={handleCertCenterChange}
                handleCertUpload={handleCertUpload}
              />
            ) : activeTab === "tot" ? (
              <TotDataTab
                totNoteOpen={totNoteOpen}
                setTotNoteOpen={setTotNoteOpen}
                totSuccess={totSuccess}
                totError={totError}
                totFile={totFile}
                isTotDragging={isTotDragging}
                totUploading={totUploading}
                totFileInputRef={totFileInputRef}
                setIsTotDragging={setIsTotDragging}
                setTotFile={setTotFile}
                setTotError={setTotError}
                setTotSuccess={setTotSuccess}
                handleTotFileChange={handleTotFileChange}
                handleTotUpload={handleTotUpload}
                handleDownloadTotTemplate={handleDownloadTotTemplate}
              />
            ) : !isAdmin ? (
              <PartnerHistoryTab
                uploads={uploads}
                loading={loading}
                historyError={historyError}
                pagination={pagination}
                setPagination={setPagination}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sortBy={sortBy}
                setSortBy={setSortBy}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                uploadToDelete={uploadToDelete}
                deleteLoading={deleteLoading}
                deleteError={deleteError}
                handleDownloadUpload={handleDownloadUpload}
                handleDeleteClick={handleDeleteClick}
                handleDeleteConfirm={handleDeleteConfirm}
                handleDeleteCancel={handleDeleteCancel}
                handleDownloadEmploymentFile={handleDownloadEmploymentFile}
                handleViewEmploymentErrors={handleViewEmploymentErrors}
                handleViewEmploymentAttachments={
                  handleViewEmploymentAttachments
                }
                handleTabChange={handleTabChange}
                fetchUploads={fetchUploads}
              />
            ) : null}
          </div>
        )}
      </div>
      {/* Employment Period Modal */}
      <EmploymentPeriodModal
        isOpen={showEmpPeriodModal}
        onClose={() => {
          setShowEmpPeriodModal(false);
          setEmpPeriodError(null);
        }}
        onConfirm={handleEmpPeriodConfirm}
        isLoading={empPeriodLoading}
        availablePeriods={empAvailablePeriods}
        error={empPeriodError}
      />
    </MainLayout>
  );
};

export default UploadPage;
