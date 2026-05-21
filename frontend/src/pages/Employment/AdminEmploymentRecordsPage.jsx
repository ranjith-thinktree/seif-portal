import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
} from "ag-grid-community";
import { MainLayout } from "../../components/layout";
import Breadcrumb from "../../components/common/Breadcrumb";
import SuccessModal from "../../components/common/SuccessModal";
import RejectionModal from "../../components/common/RejectionModal";
import { showToast } from "../../utils/toast.util";
import { ROUTES } from "../../constants/routes";
import {
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  getCenterEmploymentRecords,
  approveEmploymentUpload,
  rejectEmploymentUpload,
} from "../../services/employment.service";
import DatePickerCellEditor from "../../components/grid/DatePickerCellEditor";
import apiClient from "../../api/client";

ModuleRegistry.registerModules([AllCommunityModule]);

const VALID_EMPLOYMENT_STATUSES = [
  "Employed",
  "Self-Employed",
  "Entrepreneur",
  "Higher Study",
  "Further Education",
  "NA",
];

const EMPLOYMENT_STATUS_COLORS = {
  Employed: "bg-green-100 text-green-700",
  "Self-Employed": "bg-blue-100 text-blue-700",
  Entrepreneur: "bg-purple-100 text-purple-700",
  "Higher Study": "bg-indigo-100 text-indigo-700",
  "Further Education": "bg-cyan-100 text-cyan-700",
  NA: "bg-gray-100 text-gray-600",
};

// AG Grid cell renderer for employment status badge
const EmploymentStatusRenderer = ({ value }) => {
  if (!value) return <span className="text-gray-400">—</span>;
  const colorClass =
    EMPLOYMENT_STATUS_COLORS[value] || "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {value}
    </span>
  );
};

const AdminEmploymentRecordsPage = () => {
  const { uploadId, centerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const gridRef = useRef(null);

  const upload = location.state?.upload || null;
  const center = location.state?.center || null;

  const [records, setRecords] = useState([]);
  const [originalRecords, setOriginalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const breadcrumbItems = [
    { label: "Dashboard", path: ROUTES.DASHBOARD },
    { label: "Employment Review", path: ROUTES.EMPLOYMENT_REVIEW },
    {
      label: upload?.partner_name || "Upload",
      path: ROUTES.EMPLOYMENT_REVIEW_CENTERS.replace(":uploadId", uploadId),
    },
    { label: center?.center_name || "Center Records", path: "#" },
  ];

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCenterEmploymentRecords(uploadId, centerId);
      const enriched = (res.data || []).map((r) => ({ ...r, edited_fields: {} }));
      setRecords(enriched);
      setOriginalRecords(JSON.parse(JSON.stringify(enriched)));
    } catch {
      showToast.error("Failed to load employment records");
    } finally {
      setLoading(false);
    }
  }, [uploadId, centerId]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Block browser context menu
  useEffect(() => {
    const handler = (e) => e.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  // ── Context Menu ──────────────────────────────────────────────────────────
  const handleCellContextMenu = useCallback((event) => {
    event.event?.preventDefault();
    setContextMenu({
      x: event.event?.clientX || 0,
      y: event.event?.clientY || 0,
      cellValue: event.value,
      field: event.column?.getColDef().field,
      editable: event.column?.getColDef().editable,
      rowNode: event.node,
    });
  }, []);

  const handleCopyCell = useCallback(() => {
    if (contextMenu?.cellValue !== undefined && contextMenu?.cellValue !== null) {
      navigator.clipboard
        .writeText(String(contextMenu.cellValue))
        .then(() => showToast.success("Copied to clipboard!"))
        .catch(() => showToast.error("Copy failed"));
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleClearCell = useCallback(() => {
    if (contextMenu?.rowNode && contextMenu?.field && contextMenu?.editable) {
      const rowId = contextMenu.rowNode.data.id;
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          return {
            ...r,
            [contextMenu.field]: null,
            is_edited: true,
            edited_fields: { ...r.edited_fields, [contextMenu.field]: true },
          };
        }),
      );
      setHasChanges(true);
    }
    setContextMenu(null);
  }, [contextMenu]);

  // ── Cell value changed ────────────────────────────────────────────────────
  const onCellValueChanged = useCallback((event) => {
    const { field } = event.colDef;
    const rowId = event.data.id;
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          [field]: event.newValue,
          is_edited: true,
          edited_fields: { ...r.edited_fields, [field]: true },
        };
      }),
    );
    setHasChanges(true);
  }, []);

  // ── Edit mode handlers ────────────────────────────────────────────────────
  const handleEditClick = () => {
    if (isEditMode && hasChanges) {
      showToast.warning("Please save or discard changes first");
      return;
    }
    setIsEditMode(!isEditMode);
  };

  const handleDiscardChanges = () => {
    setRecords(JSON.parse(JSON.stringify(originalRecords)));
    setIsEditMode(false);
    setHasChanges(false);
    showToast.info("Changes discarded");
  };

  const handleSaveChanges = async () => {
    if (!hasChanges) {
      showToast.info("No changes to save");
      return;
    }
    setIsSaving(true);
    try {
      const editedRecords = records
        .filter((r) => r.is_edited)
        .map((r) => ({
          id: r.id,
          employment_status: r.employment_status,
          company_name: r.company_name,
          company_location: r.company_location,
          designation: r.designation,
          date_of_joining: r.date_of_joining,
          salary_per_month: r.salary_per_month,
        }));

      await apiClient.post(
        `/employment/admin/review-uploads/${uploadId}/centers/${centerId}/save-edits`,
        { records: editedRecords },
      );

      showToast.success("Changes saved successfully");
      setHasChanges(false);
      setIsEditMode(false);

      // Refresh from server
      const res = await getCenterEmploymentRecords(uploadId, centerId);
      const enriched = (res.data || []).map((r) => ({ ...r, edited_fields: {} }));
      setRecords(enriched);
      setOriginalRecords(JSON.parse(JSON.stringify(enriched)));
    } catch (error) {
      showToast.error(error.response?.data?.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  // Quick search filter on grid
  const onSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    gridRef.current?.api?.setGridOption("quickFilterText", val);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await approveEmploymentUpload(uploadId);
      showToast.success("Employment upload approved successfully");
      setShowApproveModal(false);
      navigate(ROUTES.EMPLOYMENT_REVIEW);
    } catch (err) {
      showToast.error(
        err?.response?.data?.message || "Failed to approve upload",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async ({ reason, remarks }) => {
    setProcessing(true);
    try {
      await rejectEmploymentUpload(uploadId, reason, remarks);
      showToast.success("Employment upload rejected");
      setShowRejectModal(false);
      navigate(ROUTES.EMPLOYMENT_REVIEW);
    } catch (err) {
      showToast.error(
        err?.response?.data?.message || "Failed to reject upload",
      );
    } finally {
      setProcessing(false);
    }
  };

  const columnDefs = useMemo(
    () => [
      {
        headerName: "S.No",
        valueGetter: (p) =>
          p.node?.rowIndex != null ? p.node.rowIndex + 1 : "",
        width: 70,
        pinned: "left",
        sortable: false,
        filter: false,
        editable: false,
        cellStyle: {
          color: "#6b7280",
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
        },
      },
      {
        field: "partner_student_id",
        headerName: "Student ID",
        width: 160,
        pinned: "left",
        editable: false,
        cellStyle: {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#374151",
          background: "#f9fafb",
          display: "flex",
          alignItems: "center",
        },
      },
      {
        field: "student_name",
        headerName: "Student Name",
        width: 280,
        editable: false,
        cellStyle: {
          fontWeight: "500",
          color: "#111827",
          display: "flex",
          alignItems: "center",
        },
      },
      {
        field: "employment_status",
        headerName: "Employment Status",
        width: 180,
        editable: isEditMode,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: VALID_EMPLOYMENT_STATUSES },
        cellStyle: (params) => ({
          display: "flex",
          alignItems: "center",
          backgroundColor: params.data?.edited_fields?.employment_status
            ? "#fef3c7"
            : undefined,
        }),
        cellRenderer: EmploymentStatusRenderer,
      },
      {
        field: "company_name",
        headerName: "Company Name",
        width: 250,
        editable: isEditMode,
        cellStyle: (params) => ({
          color: "#374151",
          display: "flex",
          alignItems: "center",
          backgroundColor: params.data?.edited_fields?.company_name
            ? "#fef3c7"
            : undefined,
        }),
      },
      {
        field: "company_location",
        headerName: "Company Location",
        width: 200,
        editable: isEditMode,
        cellStyle: (params) => ({
          color: "#6b7280",
          display: "flex",
          alignItems: "center",
          backgroundColor: params.data?.edited_fields?.company_location
            ? "#fef3c7"
            : undefined,
        }),
      },
      {
        field: "date_of_joining",
        headerName: "Date of Joining",
        width: 170,
        editable: isEditMode,
        cellEditor: DatePickerCellEditor,
        cellEditorPopup: true,
        valueFormatter: (p) => formatDate(p.value),
        cellStyle: (params) => ({
          color: "#6b7280",
          display: "flex",
          alignItems: "center",
          backgroundColor: params.data?.edited_fields?.date_of_joining
            ? "#fef3c7"
            : undefined,
        }),
      },
      {
        field: "designation",
        headerName: "Designation",
        width: 220,
        editable: isEditMode,
        cellStyle: (params) => ({
          color: "#374151",
          display: "flex",
          alignItems: "center",
          backgroundColor: params.data?.edited_fields?.designation
            ? "#fef3c7"
            : undefined,
        }),
      },
      {
        field: "salary_per_month",
        headerName: "Salary / Month",
        width: 160,
        type: "numericColumn",
        editable: isEditMode,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0, precision: 0 },
        valueFormatter: (p) =>
          p.value ? `₹${Number(p.value).toLocaleString("en-IN")}` : "—",
        cellStyle: (params) => ({
          color: "#111827",
          fontWeight: "500",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          backgroundColor: params.data?.edited_fields?.salary_per_month
            ? "#fef3c7"
            : undefined,
        }),
      },
    ],
    [isEditMode],
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
      filter: true,
      editable: false,
    }),
    [],
  );

  const editedCount = records.filter((r) => r.is_edited).length;
  const backPath = ROUTES.EMPLOYMENT_REVIEW_CENTERS.replace(":uploadId", uploadId);

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Breadcrumb + Back button — matches ReviewStudentsPage */}
        <div className="flex items-center justify-between">
          <Breadcrumb items={breadcrumbItems} />
          <button
            onClick={() => navigate(backPath, { state: { upload } })}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            ← Back to Centers
          </button>
        </div>

        {/* Flat page header — matches ReviewStudentsPage */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {center?.center_name || "Employment Records"}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {upload?.partner_name && (
                <span className="font-medium text-gray-700">
                  {upload.partner_name}
                </span>
              )}
              {upload?.partner_name && records.length > 0 && (
                <span className="text-gray-300">•</span>
              )}
              {records.length > 0 && (
                <span>{records.length} employment records</span>
              )}
            </div>
          </div>

          {/* Approve / Reject — outline pill buttons */}
          {upload?.review_status === "pending_review" && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setShowApproveModal(true)}
                disabled={processing || isEditMode}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold border-2 border-green-500 text-green-600 bg-white hover:bg-green-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircleIcon className="h-4 w-4" />
                Approve Upload
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={processing || isEditMode}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold border-2 border-red-400 text-red-500 bg-white hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <XCircleIcon className="h-4 w-4" />
                Reject Upload
              </button>
            </div>
          )}
        </div>

        {/* Edit mode hint */}
        {isEditMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700 flex items-center gap-2">
            <PencilIcon className="h-4 w-4 shrink-0" />
            <span>
              <strong>Edit mode active</strong> — click any cell to edit. Edited cells are highlighted in amber.
            </span>
          </div>
        )}

        {/* Search bar + Edit controls row */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search data"
              value={searchText}
              onChange={onSearchChange}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
            />
          </div>

          {/* Edited badge */}
          {editedCount > 0 && (
            <span className="text-xs text-yellow-600 font-medium bg-yellow-50 border border-yellow-200 px-2.5 py-1.5 rounded-full shrink-0">
              {editedCount} edited
            </span>
          )}

          {/* Edit / Save / Discard */}
          {!isEditMode ? (
            <button
              onClick={handleEditClick}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shrink-0"
            >
              <PencilIcon className="h-4 w-4" />
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleSaveChanges}
                disabled={isSaving || !hasChanges}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <CheckIcon className="h-4 w-4" />
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={handleDiscardChanges}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 shrink-0"
              >
                <XMarkIcon className="h-4 w-4" />
                Discard
              </button>
            </>
          )}
        </div>

        {/* AG Grid */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
              <p className="text-gray-500 text-sm">
                Loading employment records...
              </p>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden border border-gray-200"
            style={{ height: "calc(100vh - 380px)", minHeight: "400px" }}
          >
            <AgGridReact
              ref={gridRef}
              theme={themeQuartz}
              rowData={records}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              pagination
              paginationPageSize={50}
              rowHeight={52}
              headerHeight={56}
              animateRows
              enableCellTextSelection={!isEditMode}
              stopEditingWhenCellsLoseFocus
              onCellValueChanged={onCellValueChanged}
              onCellContextMenu={handleCellContextMenu}
            />
          </div>
        )}

        {/* Approve modal */}
        <SuccessModal
          isOpen={showApproveModal}
          onClose={() => setShowApproveModal(false)}
          title="Approve Employment Upload"
          description={`Approve all employment records from ${upload?.partner_name}? Records will become visible in the Employment Data tab.`}
          onConfirm={handleApprove}
          isLoading={processing}
          buttonText="Approve Upload"
          showCancel
        />

        {/* Reject modal */}
        <RejectionModal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title="Reject Employment Upload"
          description={`Reject the employment upload from ${upload?.partner_name}? The partner will be notified with your reason.`}
          onSubmit={handleReject}
          isLoading={processing}
          reasonLabel="Reason for Rejection"
          remarksLabel="Additional Remarks (optional)"
          reasonPlaceholder="Explain why this upload is being rejected..."
        />

        {/* Context menu */}
        {contextMenu && (
          <div
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={handleCopyCell}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Copy cell
            </button>
            {isEditMode && contextMenu.editable && (
              <button
                onClick={handleClearCell}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Clear cell
              </button>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AdminEmploymentRecordsPage;
