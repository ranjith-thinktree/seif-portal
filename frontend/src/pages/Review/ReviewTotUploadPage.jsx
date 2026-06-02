import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  ScissorsIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
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
import { Badge } from "../../components/ui/badge";
import { showToast } from "../../utils/toast.util";
import { ROUTES } from "../../constants/routes";
import {
  getTotUploadDetails,
  approveTotUpload,
  rejectTotUpload,
  saveTotAdminEdits,
} from "../../services/tot.service";

ModuleRegistry.registerModules([AllCommunityModule]);

const GRID_ROW_HEIGHT = 52;
const GRID_HEADER_HEIGHT = 56;
const GRID_PAGINATION_HEIGHT = 56;
const GRID_MIN_VISIBLE_ROWS = 3;
const GRID_MAX_VISIBLE_ROWS = 10;

const ReviewTotUploadPage = () => {
  const { uploadId } = useParams();
  const navigate = useNavigate();
  const gridRef = useRef(null);

  const [upload, setUpload] = useState(null);
  const [rows, setRows] = useState([]);
  const [originalRows, setOriginalRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const breadcrumbItems = [
    { label: "Inbox", path: ROUTES.INBOX },
    { label: "TOT Uploads", path: ROUTES.INBOX },
    { label: upload?.file_name || "Review", path: "#" },
  ];

  const fetchUpload = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getTotUploadDetails(uploadId);
      const data = response.data || response;
      setUpload(data.upload || data);
      const uploadRows = (data.rows || []).map((r, idx) => ({
        ...r,
        _rowId: r.id || `row-${idx}`,
        edited_fields: {},
      }));
      setRows(uploadRows);
      setOriginalRows(JSON.parse(JSON.stringify(uploadRows)));
    } catch (error) {
      console.error("Error fetching TOT upload:", error);
      showToast.error("Failed to load upload details");
      navigate(ROUTES.INBOX);
    } finally {
      setLoading(false);
    }
  }, [uploadId, navigate]);

  useEffect(() => {
    fetchUpload();
  }, [fetchUpload]);

  // Block default browser context menu
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // Track changes: edits, new rows, or deleted rows all count
  useEffect(() => {
    const changed =
      rows.length !== originalRows.length ||
      rows.some((row) => {
        const original = originalRows.find((r) => r._rowId === row._rowId);
        return !original || JSON.stringify(row) !== JSON.stringify(original);
      });
    setHasChanges(changed);
  }, [rows, originalRows]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) setContextMenu(null);
    };
    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu]);

  // ============================================
  // CONTEXT MENU HANDLERS
  // ============================================

  const handleCellContextMenu = useCallback((event) => {
    event.event?.preventDefault();
    setContextMenu({
      x: event.event?.clientX || 0,
      y: event.event?.clientY || 0,
      cellValue: event.value,
      field: event.column?.getColDef().field,
      editable: event.column?.getColDef().editable,
      rowNode: event.node,
      rowIndex: event.rowIndex,
    });
  }, []);

  const handleCut = useCallback(() => {
    if (!contextMenu || !isEditMode) return;
    navigator.clipboard.writeText(String(contextMenu.cellValue || ""));
    const updated = [...rows];
    const row = updated.find(
      (r) => r._rowId === contextMenu.rowNode.data._rowId,
    );
    if (row && contextMenu.field) {
      row[contextMenu.field] = "";
      row.edited_fields = row.edited_fields || {};
      row.edited_fields[contextMenu.field] = true;
    }
    setRows(updated);
    gridRef.current?.api?.refreshCells();
    showToast.success("Cell cut to clipboard");
    setContextMenu(null);
  }, [contextMenu, isEditMode, rows]);

  const handleCopyCell = useCallback(() => {
    if (!contextMenu) return;
    navigator.clipboard.writeText(String(contextMenu.cellValue || ""));
    showToast.success("Cell copied");
    setContextMenu(null);
  }, [contextMenu]);

  const handlePaste = useCallback(async () => {
    if (!contextMenu || !isEditMode) return;
    try {
      const text = await navigator.clipboard.readText();
      const updated = [...rows];
      const row = updated.find(
        (r) => r._rowId === contextMenu.rowNode.data._rowId,
      );
      if (row && contextMenu.field) {
        row[contextMenu.field] = text;
        row.edited_fields = row.edited_fields || {};
        row.edited_fields[contextMenu.field] = true;
      }
      setRows(updated);
      gridRef.current?.api?.refreshCells();
      showToast.success("Pasted");
      setContextMenu(null);
    } catch {
      showToast.error("Failed to paste");
    }
  }, [contextMenu, isEditMode, rows]);

  const handleInsertRowAbove = useCallback(() => {
    if (!contextMenu || !isEditMode) return;
    const newRow = { _rowId: `new-${Date.now()}`, edited_fields: {} };
    const updated = [...rows];
    updated.splice(contextMenu.rowIndex, 0, newRow);
    setRows(updated);
    showToast.success("Row inserted above");
    setContextMenu(null);
  }, [contextMenu, isEditMode, rows]);

  const handleInsertRowBelow = useCallback(() => {
    if (!contextMenu || !isEditMode) return;
    const newRow = { _rowId: `new-${Date.now() + 1}`, edited_fields: {} };
    const updated = [...rows];
    updated.splice(contextMenu.rowIndex + 1, 0, newRow);
    setRows(updated);
    showToast.success("Row inserted below");
    setContextMenu(null);
  }, [contextMenu, isEditMode, rows]);

  const handleDeleteRow = useCallback(() => {
    if (!contextMenu || !isEditMode) return;
    const updated = rows.filter(
      (r) => r._rowId !== contextMenu.rowNode.data._rowId,
    );
    setRows(updated);
    showToast.success("Row deleted");
    setContextMenu(null);
  }, [contextMenu, isEditMode, rows]);

  // ============================================
  // COLUMN DEFINITIONS
  // ============================================

  const makeCol = (headerName, field, width = 180) => ({
    headerName,
    field,
    width,
    editable: isEditMode,
    cellClass: "text-sm text-gray-900",
    valueFormatter: (params) => params.value ?? "-",
    cellStyle: (params) => ({
      backgroundColor: params.data?.edited_fields?.[field]
        ? "#fef3c7"
        : "#ffffff",
    }),
  });

  const columnDefs = useMemo(
    () => [
      {
        headerName: "S.NO",
        colId: "row_number",
        valueGetter: (params) => params.node.rowIndex + 1,
        width: 80,
        editable: false,
        pinned: "left",
        cellClass: "text-sm text-gray-600 text-center",
      },
      { ...makeCol("TOT Center", "tot_center", 200), pinned: "left" },
      makeCol("Center Type", "center_type", 150),
      {
        headerName: "Is SEIF Center",
        field: "is_seif_center",
        width: 140,
        editable: isEditMode,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: ["Yes", "No", "1", "0"] },
        valueFormatter: (params) => {
          if (
            params.value === 1 ||
            params.value === "1" ||
            params.value === "Yes"
          )
            return "Yes";
          if (
            params.value === 0 ||
            params.value === "0" ||
            params.value === "No"
          )
            return "No";
          return params.value ?? "-";
        },
        cellClass: "text-sm text-gray-600",
        cellStyle: (params) => ({
          backgroundColor: params.data?.edited_fields?.is_seif_center
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      makeCol("SEIF Center ID", "seif_center_id", 160),
      makeCol("Partner Name", "trainer_partner_name", 220),
      makeCol("Trainer Center Name", "trainer_center_name", 220),
      makeCol("Batch No.", "trainer_batch_no", 140),
      {
        headerName: "Batch Start Date",
        field: "trainer_batch_start_date",
        width: 170,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        valueFormatter: (params) => {
          if (!params.value) return "-";
          try {
            return new Date(params.value).toLocaleDateString("en-IN");
          } catch {
            return params.value;
          }
        },
        cellStyle: (params) => ({
          backgroundColor: params.data?.edited_fields?.trainer_batch_start_date
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Batch End Date",
        field: "trainer_batch_end_date",
        width: 170,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        valueFormatter: (params) => {
          if (!params.value) return "-";
          try {
            return new Date(params.value).toLocaleDateString("en-IN");
          } catch {
            return params.value;
          }
        },
        cellStyle: (params) => ({
          backgroundColor: params.data?.edited_fields?.trainer_batch_end_date
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      makeCol("Module Trained", "trainer_module_trained", 200),
      makeCol("First Name", "first_name", 160),
      makeCol("Last Name", "last_name", 160),
      {
        headerName: "Date of Birth",
        field: "dob",
        width: 150,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        valueFormatter: (params) => {
          if (!params.value) return "-";
          try {
            return new Date(params.value).toLocaleDateString("en-IN");
          } catch {
            return params.value;
          }
        },
        cellStyle: (params) => ({
          backgroundColor: params.data?.edited_fields?.dob
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Gender",
        field: "gender",
        width: 120,
        editable: isEditMode,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: ["Male", "Female", "Other"] },
        cellClass: "text-sm text-gray-600",
        valueFormatter: (params) => params.value ?? "-",
        cellStyle: (params) => ({
          backgroundColor: params.data?.edited_fields?.gender
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      makeCol("Contact Number", "contact_number", 160),
      makeCol("Email ID", "email_id", 240),
      makeCol("Qualification", "qualification", 200),
      makeCol("Languages Known", "language_knows", 180),
      makeCol("Contact Address", "contact_address", 260),
      makeCol("City", "city", 140),
      makeCol("State", "state", 160),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEditMode],
  );

  const onCellValueChanged = useCallback(
    (event) => {
      const { data, colDef, newValue, oldValue } = event;
      if (newValue === oldValue) return;
      const updated = [...rows];
      const row = updated.find((r) => r._rowId === data._rowId);
      if (row && colDef.field) {
        row[colDef.field] = newValue;
        row.edited_fields = row.edited_fields || {};
        row.edited_fields[colDef.field] = true;
      }
      setRows(updated);
    },
    [rows],
  );

  // ============================================
  // EDIT MODE / SAVE
  // ============================================

  const handleEditClick = () => {
    if (isEditMode) {
      setRows(JSON.parse(JSON.stringify(originalRows)));
      setIsEditMode(false);
      setHasChanges(false);
      showToast.info("Edit cancelled");
    } else {
      setIsEditMode(true);
      showToast.info("Edit mode enabled");
    }
  };

  const handleSaveChanges = async () => {
    if (!hasChanges) return;
    try {
      setIsSaving(true);
      const changes = rows
        .filter((row) => {
          const original = originalRows.find((r) => r._rowId === row._rowId);
          return !original || JSON.stringify(row) !== JSON.stringify(original);
        })
        .map((row) => {
          const original = originalRows.find((r) => r._rowId === row._rowId);
          const editedFields = {};
          Object.keys(row).forEach((key) => {
            if (
              key !== "_rowId" &&
              key !== "edited_fields" &&
              row[key] !== original?.[key]
            ) {
              editedFields[key] = { old: original?.[key], new: row[key] };
            }
          });
          return { row_id: row.id, changes: editedFields };
        });

      await saveTotAdminEdits(uploadId, rows, changes);
      showToast.success("Changes saved successfully");
      setIsEditMode(false);
      setHasChanges(false);
      await fetchUpload();
    } catch (error) {
      console.error("Error saving changes:", error);
      showToast.error(
        error.response?.data?.message || "Failed to save changes",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // APPROVE / REJECT
  // ============================================

  const handleApproveConfirm = async () => {
    try {
      setIsApproving(true);
      setShowApproveModal(false);
      await approveTotUpload(uploadId, "");
      showToast.success("TOT upload approved successfully");
      setTimeout(() => navigate(ROUTES.INBOX), 1500);
    } catch (error) {
      console.error("Error approving:", error);
      showToast.error(
        error.response?.data?.message || "Failed to approve upload",
      );
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectConfirm = async (data) => {
    try {
      setIsRejecting(true);
      setShowRejectModal(false);
      await rejectTotUpload(uploadId, data.remarks || data.reason);
      showToast.success("TOT upload rejected");
      setTimeout(() => navigate(ROUTES.INBOX), 1500);
    } catch (error) {
      console.error("Error rejecting:", error);
      showToast.error(
        error.response?.data?.message || "Failed to reject upload",
      );
    } finally {
      setIsRejecting(false);
    }
  };

  // ============================================
  // GRID HEIGHT
  // ============================================

  const gridHeight = useMemo(() => {
    const visibleRows = Math.min(
      Math.max(rows.length, GRID_MIN_VISIBLE_ROWS),
      GRID_MAX_VISIBLE_ROWS,
    );
    return (
      GRID_HEADER_HEIGHT +
      GRID_PAGINATION_HEIGHT +
      visibleRows * GRID_ROW_HEIGHT +
      2
    );
  }, [rows.length]);

  const isReviewed = upload && upload.status !== "pending";

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading TOT upload...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <style>{`
        .context-menu-container {
          position: fixed;
          max-height: 400px;
          overflow-y: auto;
          z-index: 9999;
        }
      `}</style>

      <div className="space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <Breadcrumb items={breadcrumbItems} />
          <button
            onClick={() => navigate(ROUTES.INBOX)}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            ← Back to Inbox
          </button>
        </div>

        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {upload?.file_name || "TOT Upload Review"}
              </h1>
              {isReviewed && (
                <Badge
                  variant={
                    upload.status === "approved" ? "success" : "destructive"
                  }
                >
                  {upload.status}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {upload?.partner_name && (
                <span className="font-medium text-gray-700">
                  {upload.partner_name}
                </span>
              )}
              {rows.length > 0 && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{rows.length} trainer records</span>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 shrink-0">
            {isReviewed ? (
              <span
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border-2 ${
                  upload.status === "approved"
                    ? "border-green-400 text-green-700 bg-green-50"
                    : "border-red-400 text-red-700 bg-red-50"
                }`}
              >
                {upload.status === "approved" ? (
                  <CheckCircleIcon className="h-4 w-4" />
                ) : (
                  <XCircleIcon className="h-4 w-4" />
                )}
                {upload.status === "approved" ? "Approved" : "Rejected"}
              </span>
            ) : isEditMode ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-700 rounded-full text-sm font-medium">
                <PencilIcon className="h-4 w-4" />
                Editing mode
              </span>
            ) : (
              <>
                <button
                  onClick={() => setShowApproveModal(true)}
                  disabled={isApproving || isRejecting || hasChanges}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold border-2 border-green-500 text-green-600 bg-white hover:bg-green-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckIcon className="h-4 w-4" />
                  {isApproving ? "Approving..." : "Approve"}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={isApproving || isRejecting || hasChanges}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold border-2 border-red-500 text-red-600 bg-white hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <XMarkIcon className="h-4 w-4" />
                  {isRejecting ? "Rejecting..." : "Reject"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Unsaved changes banner */}
        {hasChanges && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-center gap-2">
            <span className="text-base shrink-0">⚠️</span>
            <span>
              You have unsaved changes. Click <strong>Save Changes</strong>{" "}
              before approving or rejecting.
            </span>
          </div>
        )}

        {/* Edit Mode Toolbar */}
        {isEditMode && (
          <div className="bg-white border border-amber-300 rounded-xl px-4 py-3 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100">
                <PencilIcon className="h-3.5 w-3.5 text-amber-700" />
              </span>
              <span className="text-sm font-medium text-gray-700">
                Edit mode active
              </span>
              <span className="text-xs text-gray-400">
                — double-click a cell to edit
              </span>
              {hasChanges && (
                <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  Unsaved changes
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveChanges}
                disabled={!hasChanges || isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <CheckIcon className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={handleEditClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Edit toggle (when not in edit mode) */}
        {!isEditMode && !isReviewed && (
          <div className="flex justify-end">
            <button
              onClick={handleEditClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <PencilIcon className="h-4 w-4" />
              Edit Data
            </button>
          </div>
        )}

        {/* AG Grid */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div style={{ height: `${gridHeight}px`, width: "100%" }}>
            <AgGridReact
              ref={gridRef}
              rowData={rows}
              columnDefs={columnDefs}
              theme={themeQuartz}
              rowSelection={
                isEditMode
                  ? {
                      mode: "multiRow",
                      checkboxes: true,
                      headerCheckbox: true,
                      enableClickSelection: false,
                    }
                  : undefined
              }
              rowHeight={GRID_ROW_HEIGHT}
              headerHeight={GRID_HEADER_HEIGHT}
              pagination={true}
              paginationPageSize={100}
              paginationPageSizeSelector={[25, 50, 100]}
              onCellValueChanged={onCellValueChanged}
              onCellContextMenu={handleCellContextMenu}
              stopEditingWhenCellsLoseFocus={true}
              enableCellTextSelection={!isEditMode}
              getRowId={(params) => params.data._rowId}
              defaultColDef={{
                resizable: true,
                sortable: true,
                filter: true,
                suppressHeaderMenuButton: false,
              }}
            />
          </div>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="context-menu-container bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[200px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 mb-1">
              Cell Actions
            </div>
            {isEditMode && (
              <>
                <button
                  onClick={handleCut}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ScissorsIcon className="h-4 w-4 text-gray-400" />
                  Cut
                </button>
              </>
            )}
            <button
              onClick={handleCopyCell}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <DocumentDuplicateIcon className="h-4 w-4 text-gray-400" />
              Copy Cell
            </button>
            {isEditMode && (
              <button
                onClick={handlePaste}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ClipboardDocumentIcon className="h-4 w-4 text-gray-400" />
                Paste
              </button>
            )}
            {isEditMode && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Row Actions
                </div>
                <button
                  onClick={handleInsertRowAbove}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 text-gray-400" />
                  Insert Row Above
                </button>
                <button
                  onClick={handleInsertRowBelow}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 text-gray-400" />
                  Insert Row Below
                </button>
                <button
                  onClick={handleDeleteRow}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <TrashIcon className="h-4 w-4 text-red-400" />
                  Delete Row
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <SuccessModal
          isOpen={showApproveModal}
          onClose={() => setShowApproveModal(false)}
          onConfirm={handleApproveConfirm}
          title="Approve TOT Upload"
          description={`Are you sure you want to approve this TOT upload? This will add ${rows.length} trainer record(s) to the system.`}
          buttonText="Approve"
          showCancel={true}
        />
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <RejectionModal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          onSubmit={handleRejectConfirm}
          title="Reject TOT Upload"
          description="Please provide a reason for rejecting this TOT upload."
        />
      )}
    </MainLayout>
  );
};

export default ReviewTotUploadPage;
