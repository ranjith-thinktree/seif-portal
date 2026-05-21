import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import { Badge } from "../../components/ui/badge";
import {
  PencilIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
} from "ag-grid-community";
import "../../styles/ag-grid-custom.css";
import DatePickerCellEditor from "../../components/grid/DatePickerCellEditor";
import apiClient from "../../api/client";
import { toast } from "react-toastify";
import Breadcrumb from "../../components/common/Breadcrumb";
import { ROUTES } from "../../constants/routes";

ModuleRegistry.registerModules([AllCommunityModule]);

const VALID_EMPLOYMENT_STATUSES = [
  "Employed",
  "Self-Employed",
  "Entrepreneur",
  "Higher Study",
  "Further Education",
  "NA",
];
/**
 * PartnerReviewEmploymentPage
 * AG Grid-based editor for reviewing and editing rejected employment records.
 * Mirrors PartnerReviewStudentsPage pattern.
 */
const PartnerReviewEmploymentPage = () => {
  const { uploadId, centerId } = useParams();
  const navigate = useNavigate();
  const gridRef = useRef(null);

  const [upload, setUpload] = useState(null);
  const [centerName, setCenterName] = useState("");
  const [records, setRecords] = useState([]);
  const [originalRecords, setOriginalRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasSavedChanges, setHasSavedChanges] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const breadcrumbItems = [
    { label: "Inbox", path: ROUTES.INBOX },
    {
      label: "Rejected Employment",
      path: ROUTES.PARTNER_REJECTED_EMPLOYMENT_UPLOADS,
    },
    {
      label: "Centers",
      path: ROUTES.PARTNER_REJECTED_EMPLOYMENT_CENTERS.replace(
        ":uploadId",
        uploadId,
      ),
    },
    { label: "Records", path: "#" },
  ];

  // ── Fetch records ──────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(
        `/employment/partner/uploads/${uploadId}/centers/${centerId}/records`,
      );
      const {
        upload: uploadData,
        centerName: cn,
        records: recs,
      } = response.data.data;
      setUpload(uploadData);
      setCenterName(cn || "");

      const enriched = (recs || []).map((r) => ({
        ...r,
        edited_fields: {},
      }));
      setRecords(enriched);
      setOriginalRecords(JSON.parse(JSON.stringify(enriched)));
      // If any records were previously edited (from a prior save), enable Resubmit
      if (enriched.some((r) => r.is_edited)) {
        setHasSavedChanges(true);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load employment records",
      );
      navigate(
        ROUTES.PARTNER_REJECTED_EMPLOYMENT_CENTERS.replace(
          ":uploadId",
          uploadId,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [uploadId, centerId, navigate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Block browser context menu
  useEffect(() => {
    const handler = (e) => e.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  // Track changes
  useEffect(() => {
    const hasEdits = records.some((r) => {
      const orig = originalRecords.find((o) => o.id === r.id);
      if (!orig) return true;
      return JSON.stringify(r) !== JSON.stringify(orig);
    });
    setHasChanges(hasEdits);
  }, [records, originalRecords]);

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
    if (
      contextMenu?.cellValue !== undefined &&
      contextMenu?.cellValue !== null
    ) {
      navigator.clipboard
        .writeText(String(contextMenu.cellValue))
        .then(() => toast.success("Copied to clipboard!"))
        .catch(() => toast.error("Copy failed"));
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

  // ── onCellValueChanged ────────────────────────────────────────────────────
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

  // ── Column defs ───────────────────────────────────────────────────────────
  const columnDefs = useMemo(
    () => [
      {
        headerName: "#",
        field: "row_number",
        width: 70,
        pinned: "left",
        editable: false,
        cellClass: "text-xs text-gray-400",
      },
      {
        headerName: "Student ID",
        field: "partner_student_id",
        width: 130,
        pinned: "left",
        editable: false,
        cellClass: "font-mono text-xs text-gray-500",
      },
      {
        headerName: "Student Name",
        field: "student_name",
        width: 180,
        pinned: "left",
        editable: false,
        cellClass: "text-sm font-medium text-gray-800",
      },
      {
        headerName: "Employment Status",
        field: "employment_status",
        width: 180,
        editable: isEditMode,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: VALID_EMPLOYMENT_STATUSES },
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.employment_status
            ? "#fef3c7"
            : "#ffffff",
        }),
        cellRenderer: (params) => {
          const s = params.value;
          if (!s) return "—";
          const colorMap = {
            Employed: "bg-green-100 text-green-700",
            "Self-Employed": "bg-blue-100 text-blue-700",
            Entrepreneur: "bg-purple-100 text-purple-700",
            "Higher Study": "bg-indigo-100 text-indigo-700",
            "Further Education": "bg-cyan-100 text-cyan-700",
            NA: "bg-gray-100 text-gray-500",
          };
          const cls = colorMap[s] || "bg-gray-100 text-gray-600";
          return (
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
            >
              {s}
            </span>
          );
        },
      },
      {
        headerName: "Company Name",
        field: "company_name",
        width: 200,
        editable: isEditMode,
        cellClass: "text-sm text-gray-700",
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.company_name
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Company Location",
        field: "company_location",
        width: 180,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.company_location
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Designation",
        field: "designation",
        width: 170,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.designation
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Date of Joining",
        field: "date_of_joining",
        width: 155,
        editable: isEditMode,
        cellEditor: DatePickerCellEditor,
        cellEditorPopup: true,
        valueFormatter: (params) => {
          if (!params.value) return "—";
          try {
            return new Date(params.value).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
          } catch {
            return params.value;
          }
        },
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.date_of_joining
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Salary (₹/mo)",
        field: "salary_per_month",
        width: 140,
        editable: isEditMode,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0, precision: 0 },
        cellClass: "text-sm text-gray-700 text-right",
        valueFormatter: (params) =>
          params.value
            ? `₹${Number(params.value).toLocaleString("en-IN")}`
            : "—",
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.salary_per_month
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
    ],
    [isEditMode],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEditClick = () => {
    if (isEditMode && hasChanges) {
      toast.warning("Please save or discard changes first");
      return;
    }
    setIsEditMode(!isEditMode);
  };

  const handleDiscardChanges = () => {
    setRecords(JSON.parse(JSON.stringify(originalRecords)));
    setIsEditMode(false);
    setHasChanges(false);
    toast.info("Changes discarded");
  };

  const handleSaveChanges = async () => {
    if (!hasChanges) {
      toast.info("No changes to save");
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
        `/employment/partner/uploads/${uploadId}/centers/${centerId}/save-edits`,
        { records: editedRecords },
      );

      toast.success("Changes saved successfully. You can now resubmit.");
      setHasSavedChanges(true);
      setHasChanges(false);
      setIsEditMode(false);

      // Refresh from server
      const response = await apiClient.get(
        `/employment/partner/uploads/${uploadId}/centers/${centerId}/records`,
      );
      const enriched = (response.data.data.records || []).map((r) => ({
        ...r,
        edited_fields: {},
      }));
      setRecords(enriched);
      setOriginalRecords(JSON.parse(JSON.stringify(enriched)));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResubmit = () => {
    if (isEditMode) {
      toast.error("Please save your changes before resubmitting");
      return;
    }
    if (!hasSavedChanges) {
      toast.error("Please save at least one change before resubmitting");
      return;
    }
    setShowResubmitModal(true);
  };

  const confirmResubmit = async () => {
    setIsResubmitting(true);
    setShowResubmitModal(false);
    try {
      const response = await apiClient.post(
        `/employment/partner/uploads/${uploadId}/resubmit`,
      );
      toast.success(response.data.data.message);
      setHasSavedChanges(false);
      setHasChanges(false);
      setTimeout(
        () => navigate(ROUTES.PARTNER_REJECTED_EMPLOYMENT_UPLOADS),
        2000,
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resubmit upload");
    } finally {
      setIsResubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64 text-gray-500">
          Loading employment records...
        </div>
      </MainLayout>
    );
  }

  const editedCount = records.filter((r) => r.is_edited).length;

  return (
    <MainLayout>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex-shrink-0 px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Breadcrumb items={breadcrumbItems} />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {editedCount > 0 && (
              <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200">
                {editedCount} edited
              </Badge>
            )}

            {/* Edit toggle */}
            {!isEditMode ? (
              <button
                onClick={handleEditClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <PencilIcon className="h-4 w-4" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving || !hasChanges}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <CheckIcon className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={handleDiscardChanges}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Discard
                </button>
              </div>
            )}

            {/* Resubmit */}
            <button
              onClick={handleResubmit}
              disabled={isResubmitting || !hasSavedChanges || isEditMode}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              {isResubmitting ? "Resubmitting..." : "Resubmit"}
            </button>
          </div>
        </div>

        {/* Sub-header: upload info */}
        <div className="flex-shrink-0 px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span>
              <span className="font-medium">Upload:</span> {upload?.file_name}
            </span>
            <span>
              <span className="font-medium">Center:</span> {centerName}
            </span>
            <span>
              <span className="font-medium">Records:</span> {records.length}
            </span>
            <span>
              <span className="font-medium">Version:</span>{" "}
              <Badge variant={upload?.version > 1 ? "secondary" : "outline"}>
                V{upload?.version || 1}
              </Badge>
            </span>
          </div>
          {upload?.rejection_reason && (
            <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <span>
                <span className="font-medium">Rejection Reason:</span>{" "}
                {upload.rejection_reason}
              </span>
            </div>
          )}
        </div>

        {/* Edit mode banner */}
        {isEditMode && (
          <div className="flex-shrink-0 bg-blue-50 border-b border-blue-200 px-6 py-2 text-sm text-blue-700 flex items-center gap-2">
            <PencilIcon className="h-4 w-4" />
            <span>
              Edit Mode — click any cell to edit. Right-click for options.
              Yellow cells have been modified.
            </span>
          </div>
        )}

        {/* Instructions banner */}
        {!isEditMode && !hasSavedChanges && (
          <div className="flex-shrink-0 bg-yellow-50 border-b border-yellow-200 px-6 py-2 text-sm text-yellow-700">
            ℹ️ Click <strong>Edit</strong> to modify records. After saving your
            changes, use <strong>Resubmit</strong> to send for admin review.
          </div>
        )}
        {hasSavedChanges && !isEditMode && (
          <div className="flex-shrink-0 bg-green-50 border-b border-green-200 px-6 py-2 text-sm text-green-700 flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4" />
            <span>
              Changes saved. Click <strong>Resubmit</strong> to send this upload
              back to admin for review.
            </span>
          </div>
        )}

        {/* AG Grid */}
        <div className="flex-1 overflow-hidden">
          <AgGridReact
            ref={gridRef}
            rowData={records}
            columnDefs={columnDefs}
            theme={themeQuartz}
            rowHeight={44}
            headerHeight={44}
            defaultColDef={{
              sortable: true,
              resizable: true,
              filter: false,
            }}
            onCellValueChanged={onCellValueChanged}
            onCellContextMenu={handleCellContextMenu}
            stopEditingWhenCellsLoseFocus={true}
            suppressContextMenu={true}
            animateRows={true}
            getRowStyle={(params) => ({
              backgroundColor: params.data?.is_edited ? "#fffbeb" : undefined,
            })}
          />
        </div>

        {/* Custom context menu */}
        {contextMenu && (
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCopyCell}
              disabled={
                contextMenu.cellValue === null ||
                contextMenu.cellValue === undefined
              }
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:text-gray-300"
            >
              📋 Copy Cell
            </button>
            {isEditMode && contextMenu.editable && (
              <button
                onClick={handleClearCell}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                🗑️ Clear Cell
              </button>
            )}
          </div>
        )}

        {/* Resubmit Confirmation Modal */}
        {showResubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirm Resubmission
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                This will create a new version of the upload and notify admin
                for review. Are you sure you want to resubmit?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowResubmitModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmResubmit}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                >
                  Yes, Resubmit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PartnerReviewEmploymentPage;
