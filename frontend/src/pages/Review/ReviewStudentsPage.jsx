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
  ChatBubbleLeftIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
} from "ag-grid-community";
import { MainLayout } from "../../components/layout";
import reviewService from "../../services/review.service";
import commentService from "../../services/commentService";
import apiClient from "../../api/client";
import Breadcrumb from "../../components/common/Breadcrumb";
import CommentNoteModal from "../../components/CommentNoteModal";
import DatePickerCellEditor from "../../components/grid/DatePickerCellEditor";
import AdvancedSearchBar from "../../components/common/AdvancedSearchBar";
import SuccessModal from "../../components/common/SuccessModal";
import RejectionModal from "../../components/common/RejectionModal";
import { Badge } from "../../components/ui/badge";
import { showToast } from "../../utils/toast.util";
import { ROUTES } from "../../constants/routes";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * ReviewStudentsPage Component - Admin Excel-like editing experience
 * Shows students for a specific center with approve/reject buttons
 * Full Excel-like context menu with Cut, Copy, Paste, Insert, Delete operations
 */
const ReviewStudentsPage = () => {
  const { uploadId, centerId } = useParams();
  const navigate = useNavigate();
  const gridRef = useRef(null);

  const [center, setCenter] = useState(null);
  const [students, setStudents] = useState([]);
  const [originalStudents, setOriginalStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isReviewed, setIsReviewed] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    gender: "",
    city: "",
    state: "",
    course_name: "",
  });
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [uploadChanges, setUploadChanges] = useState([]);
  const [uploadVersion, setUploadVersion] = useState(1);
  const [contextMenu, setContextMenu] = useState(null);
  const [comments, setComments] = useState([]);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [currentCommentData, setCurrentCommentData] = useState(null);
  const GRID_ROW_HEIGHT = 52;
  const GRID_HEADER_HEIGHT = 56;
  const GRID_PAGINATION_HEIGHT = 56;
  const GRID_MIN_VISIBLE_ROWS = 3;
  const GRID_MAX_VISIBLE_ROWS = 8;

  // Breadcrumb items
  const breadcrumbItems = [
    { label: "Inbox", path: ROUTES.INBOX },
    {
      label: "Review Upload",
      path: ROUTES.REVIEW_UPLOAD.replace(":uploadId", uploadId),
    },
    { label: "Students", path: "#" },
  ];

  // Fetch students function
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await reviewService.getCenterStudents(
        uploadId,
        centerId,
        {
          search: searchTerm,
        },
      );

      console.log("📊 API Response Structure:", {
        fullResponse: response,
        responseData: response.data,
        hasData: !!response.data?.data,
        hasStudents: !!response.data?.students,
      });

      // Backend returns: { data: { students: [], center: {}, pagination: {} } }
      const responseData = response.data?.data || response.data;
      const centerData = responseData.center;
      const studentsArray = responseData.students || [];

      console.log("📊 Parsed Data:", {
        centerData,
        studentsCount: studentsArray.length,
        sampleStudent: studentsArray[0],
      });

      setCenter(centerData);
      const studentsData = studentsArray.map((s, idx) => ({
        ...s,
        id: s.id || s.student_id || `student-${idx}`,
        edited_fields: {},
      }));
      setStudents(studentsData);
      setOriginalStudents(JSON.parse(JSON.stringify(studentsData)));

      // Store upload version from center data
      if (centerData?.data_upload_version) {
        setUploadVersion(centerData.data_upload_version);
      }

      // Check if center is already reviewed
      if (centerData?.review_status !== "pending") {
        setIsReviewed(true);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      showToast.error("Failed to load students");
      navigate(ROUTES.REVIEW_UPLOAD.replace(":uploadId", uploadId));
    } finally {
      setLoading(false);
    }
  }, [uploadId, centerId, searchTerm, navigate]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Fetch upload changes if version > 1
  useEffect(() => {
    const fetchUploadChanges = async () => {
      if (uploadVersion <= 1) return;

      try {
        const response = await apiClient.get(
          `/partners/uploads/${uploadId}/changes`,
        );
        setUploadChanges(response.data.data || []);
      } catch (error) {
        console.error("Error fetching upload changes:", error);
      }
    };

    fetchUploadChanges();
  }, [uploadId, uploadVersion]);

  // Fetch comments for all students in center
  useEffect(() => {
    const fetchComments = async () => {
      if (!centerId) return;

      try {
        const response = await commentService.getCenterComments(centerId);
        setComments(response.data || []);
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };

    fetchComments();
  }, [centerId]);

  // Block default browser context menu globally
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  // Track changes
  useEffect(() => {
    const hasEdits = students.some((student) => {
      const original = originalStudents.find((s) => s.id === student.id);
      return original && JSON.stringify(student) !== JSON.stringify(original);
    });
    setHasChanges(hasEdits);
  }, [students, originalStudents]);

  // Handle back to centers
  const handleBack = () => {
    navigate(ROUTES.REVIEW_UPLOAD.replace(":uploadId", uploadId));
  };

  // Get edited student count
  const getEditedStudentCount = () => {
    if (!uploadChanges || uploadChanges.length === 0) return 0;
    const uniqueStudents = new Set(uploadChanges.map((c) => c.student_id));
    return uniqueStudents.size;
  };

  // ============================================
  // EXCEL-LIKE CONTEXT MENU HANDLERS
  // ============================================

  const handleCellContextMenu = useCallback((event) => {
    event.event?.preventDefault();

    const cellValue = event.value;
    const field = event.column?.getColDef().field;
    const editable = event.column?.getColDef().editable;

    setContextMenu({
      x: event.event?.clientX || 0,
      y: event.event?.clientY || 0,
      cellValue,
      field,
      editable,
      rowNode: event.node,
      rowIndex: event.rowIndex,
    });
  }, []);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu]);

  // Context menu actions
  const handleCut = useCallback(() => {
    if (!contextMenu || !isEditMode) return;

    navigator.clipboard.writeText(String(contextMenu.cellValue || ""));
    showToast.success("Cell cut to clipboard");

    const updatedStudents = [...students];
    const student = updatedStudents.find(
      (s) => s.id === contextMenu.rowNode.data.id,
    );
    if (student && contextMenu.field) {
      student[contextMenu.field] = "";
      student.edited_fields = student.edited_fields || {};
      student.edited_fields[contextMenu.field] = true;
    }
    setStudents(updatedStudents);
    gridRef.current?.api?.refreshCells();
    setContextMenu(null);
  }, [contextMenu, isEditMode, students]);

  const handleCopyCell = useCallback(() => {
    if (!contextMenu) return;

    navigator.clipboard.writeText(String(contextMenu.cellValue || ""));
    showToast.success("Cell copied to clipboard");
    setContextMenu(null);
  }, [contextMenu]);

  const handlePaste = useCallback(async () => {
    if (!contextMenu || !isEditMode) return;

    try {
      const text = await navigator.clipboard.readText();
      const updatedStudents = [...students];
      const student = updatedStudents.find(
        (s) => s.id === contextMenu.rowNode.data.id,
      );

      if (student && contextMenu.field) {
        student[contextMenu.field] = text;
        student.edited_fields = student.edited_fields || {};
        student.edited_fields[contextMenu.field] = true;
      }

      setStudents(updatedStudents);
      gridRef.current?.api?.refreshCells();
      showToast.success("Content pasted");
      setContextMenu(null);
    } catch {
      showToast.error("Failed to paste from clipboard");
    }
  }, [contextMenu, isEditMode, students]);

  const handleComment = useCallback(() => {
    if (!contextMenu) return;

    const studentData = contextMenu.rowNode?.data;
    if (!studentData) return;

    // Check if comment already exists for this cell
    const existingComment = comments.find(
      (c) =>
        c.student_id === studentData.id &&
        c.field_name === contextMenu.field &&
        c.type === "comment",
    );

    setCurrentCommentData({
      type: "comment",
      fieldName: contextMenu.field,
      studentId: studentData.id,
      studentName: studentData.student_name,
      existing: existingComment || null,
    });
    setShowCommentModal(true);
    setContextMenu(null);
  }, [contextMenu, comments]);

  const handleInsertNote = useCallback(() => {
    if (!contextMenu) return;

    const studentData = contextMenu.rowNode?.data;
    if (!studentData) return;

    // Check if note already exists for this cell
    const existingNote = comments.find(
      (c) =>
        c.student_id === studentData.id &&
        c.field_name === contextMenu.field &&
        c.type === "note",
    );

    setCurrentCommentData({
      type: "note",
      fieldName: contextMenu.field,
      studentId: studentData.id,
      studentName: studentData.student_name,
      existing: existingNote || null,
    });
    setShowCommentModal(true);
    setContextMenu(null);
  }, [contextMenu, comments]);

  // Save comment/note handler
  const handleSaveComment = useCallback(
    async (content) => {
      if (!currentCommentData) return;

      try {
        if (currentCommentData.existing) {
          // Update existing
          await commentService.updateComment(
            currentCommentData.existing.id,
            content,
          );
          showToast.success(
            `${
              currentCommentData.type === "comment" ? "Comment" : "Note"
            } updated`,
          );
        } else {
          // Create new
          await commentService.createComment({
            studentId: currentCommentData.studentId,
            fieldName: currentCommentData.fieldName,
            type: currentCommentData.type,
            content,
          });
          showToast.success(
            `${
              currentCommentData.type === "comment" ? "Comment" : "Note"
            } added`,
          );
        }

        // Refresh comments
        const response = await commentService.getCenterComments(centerId);
        setComments(response.data || []);

        // Refresh grid to show indicators
        gridRef.current?.api?.refreshCells();
      } catch (error) {
        console.error("Error saving comment:", error);
        showToast.error("Failed to save");
      }
    },
    [currentCommentData, centerId],
  );

  // Delete comment/note handler
  const handleDeleteComment = useCallback(
    async (commentId) => {
      try {
        await commentService.deleteComment(commentId);
        showToast.success(
          `${
            currentCommentData?.type === "comment" ? "Comment" : "Note"
          } deleted`,
        );

        // Refresh comments
        const response = await commentService.getCenterComments(centerId);
        setComments(response.data || []);

        // Refresh grid to show indicators
        gridRef.current?.api?.refreshCells();
      } catch (error) {
        console.error("Error deleting comment:", error);
        showToast.error("Failed to delete");
      }
    },
    [currentCommentData, centerId],
  );

  const handleInsertRowAbove = useCallback(() => {
    if (!contextMenu || !isEditMode) return;

    const newStudent = {
      id: `new-${Date.now()}`,
      student_id: "",
      student_name: "",
      date_of_birth: "",
      gender: "",
      mobile_number: "",
      email: "",
      address: "",
      city: "",
      state: "",
      course_name: "",
      course_duration_months: "",
      batch_number: "",
      enrollment_date: "",
      edited_fields: {},
    };

    const updatedStudents = [...students];
    updatedStudents.splice(contextMenu.rowIndex, 0, newStudent);
    setStudents(updatedStudents);
    showToast.success("Row inserted above");
    setContextMenu(null);
  }, [contextMenu, isEditMode, students]);

  const handleInsertRowBelow = useCallback(() => {
    if (!contextMenu || !isEditMode) return;

    const newStudent = {
      id: `new-${Date.now()}`,
      student_id: "",
      student_name: "",
      date_of_birth: "",
      gender: "",
      mobile_number: "",
      email: "",
      address: "",
      city: "",
      state: "",
      course_name: "",
      course_duration_months: "",
      batch_number: "",
      enrollment_date: "",
      edited_fields: {},
    };

    const updatedStudents = [...students];
    updatedStudents.splice(contextMenu.rowIndex + 1, 0, newStudent);
    setStudents(updatedStudents);
    showToast.success("Row inserted below");
    setContextMenu(null);
  }, [contextMenu, isEditMode, students]);

  const handleInsertColumnLeft = useCallback(() => {
    showToast.info("Insert column - Not supported");
    setContextMenu(null);
  }, []);

  const handleInsertColumnRight = useCallback(() => {
    showToast.info("Insert column - Not supported");
    setContextMenu(null);
  }, []);

  const handleDeleteRow = useCallback(() => {
    if (!contextMenu || !isEditMode) return;

    const updatedStudents = students.filter(
      (s) => s.id !== contextMenu.rowNode.data.id,
    );
    setStudents(updatedStudents);
    showToast.success("Row deleted");
    setContextMenu(null);
  }, [contextMenu, isEditMode, students]);

  const handleDeleteColumn = useCallback(() => {
    showToast.info("Delete column - Not supported");
    setContextMenu(null);
  }, []);

  const handleDeleteCell = useCallback(() => {
    if (!contextMenu || !isEditMode) return;

    const updatedStudents = [...students];
    const student = updatedStudents.find(
      (s) => s.id === contextMenu.rowNode.data.id,
    );

    if (student && contextMenu.field) {
      student[contextMenu.field] = "";
      student.edited_fields = student.edited_fields || {};
      student.edited_fields[contextMenu.field] = true;
    }

    setStudents(updatedStudents);
    gridRef.current?.api?.refreshCells();
    showToast.success("Cell cleared");
    setContextMenu(null);
  }, [contextMenu, isEditMode, students]);

  // ============================================
  // AG GRID COLUMN DEFINITIONS
  // ============================================

  // Helper function to get comments/notes for a cell
  const getCellComments = useCallback(
    (studentId, fieldName) => {
      return comments.filter(
        (c) => c.student_id === studentId && c.field_name === fieldName,
      );
    },
    [comments],
  );

  // Cell renderer with comment/note indicators
  const cellRendererWithIndicator = useCallback(
    (params) => {
      if (!params.data || !params.colDef.field)
        return params.valueFormatted || params.value || "-";

      const cellComments = getCellComments(params.data.id, params.colDef.field);
      const hasComment = cellComments.some((c) => c.type === "comment");
      const hasNote = cellComments.some((c) => c.type === "note");

      const value = params.valueFormatted || params.value || "-";

      // Build tooltip
      const tooltip =
        cellComments.length > 0
          ? cellComments
              .map(
                (c) =>
                  `${c.type === "comment" ? "💬 Comment" : "📝 Note"}: ${
                    c.content
                  }`,
              )
              .join("\n")
          : "";

      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            minWidth: 0,
            gap: "8px",
          }}
          title={tooltip}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </span>
          {(hasComment || hasNote) && (
            <div
              style={{
                display: "flex",
                gap: "4px",
                marginLeft: "8px",
                flexShrink: 0,
              }}
            >
              {hasComment && (
                <span
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    backgroundColor: "#ef4444",
                    borderRadius: "50%",
                  }}
                  title="Has comment"
                />
              )}
              {hasNote && (
                <span
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    backgroundColor: "#f97316",
                    borderRadius: "50%",
                  }}
                  title="Has note"
                />
              )}
            </div>
          )}
        </div>
      );
    },
    [getCellComments],
  );

  const columnDefs = useMemo(
    () => [
      {
        headerName: "S.NO",
        colId: "row_number",
        valueGetter: (params) => {
          return params.node.rowIndex + 1;
        },
        width: 100,
        editable: false,
        pinned: "left",
        cellClass: "text-sm text-gray-900 text-center",
      },
      {
        headerName: "Student ID",
        field: "student_id",
        width: 220,
        editable: false,
        pinned: "left",
        cellClass: "text-sm font-medium text-gray-900",
        valueFormatter: (params) => params.value || "Generated after approval",
        cellRenderer: cellRendererWithIndicator,
        cellStyle: () => ({
          backgroundColor: "#f3f4f6",
          color: "#6b7280",
        }),
      },
      {
        headerName: "Student Name",
        field: "student_name",
        width: 280,
        editable: isEditMode,
        cellClass: "text-sm text-gray-900",
        cellRenderer: cellRendererWithIndicator,
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.student_name
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Date of Birth",
        field: "date_of_birth",
        width: 170,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellEditor: DatePickerCellEditor,
        cellEditorPopup: true,
        valueFormatter: (params) => {
          if (!params.value) return "-";
          try {
            const date = new Date(params.value);
            if (isNaN(date.getTime())) return "-";
            return date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
          } catch {
            return "-";
          }
        },
        cellRenderer: cellRendererWithIndicator,
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.date_of_birth
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Gender",
        field: "gender",
        width: 120,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: ["Male", "Female", "Other"],
        },
        cellRenderer: cellRendererWithIndicator,
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.gender
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Mobile Number",
        field: "mobile_number",
        width: 180,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellRenderer: cellRendererWithIndicator,
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.mobile_number
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Email",
        field: "email",
        width: 280,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellRenderer: cellRendererWithIndicator,
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.email
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Address",
        field: "address",
        width: 350,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellRenderer: cellRendererWithIndicator,
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.address
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "City",
        field: "city",
        width: 160,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellRenderer: cellRendererWithIndicator,
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.city
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "State",
        field: "state",
        width: 160,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellRenderer: cellRendererWithIndicator,
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.state
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Course Name",
        field: "course_name",
        width: 250,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellRenderer: cellRendererWithIndicator,
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.course_name
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Course Duration (Months)",
        field: "course_duration_months",
        width: 240,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellEditor: "agNumberCellEditor",
        cellEditorParams: {
          min: 1,
          max: 60,
          precision: 0,
        },
        cellRenderer: cellRendererWithIndicator,
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.course_duration_months
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Batch Number",
        field: "batch_number",
        width: 170,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellRenderer: cellRendererWithIndicator,
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.batch_number
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Enrollment Date",
        field: "enrollment_date",
        width: 180,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellEditor: DatePickerCellEditor,
        cellEditorPopup: true,
        cellRenderer: cellRendererWithIndicator,
        valueFormatter: (params) => {
          if (!params.value) return "-";
          try {
            const date = new Date(params.value);
            return date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
          } catch {
            return params.value || "-";
          }
        },
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.enrollment_date
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
    ],
    [isEditMode, cellRendererWithIndicator, getCellComments],
  );

  const onCellValueChanged = useCallback(
    (event) => {
      const { data, colDef, newValue, oldValue } = event;

      if (newValue === oldValue) return;

      const updatedStudents = [...students];
      const student = updatedStudents.find((s) => s.id === data.id);

      if (student && colDef.field) {
        student[colDef.field] = newValue;
        student.edited_fields = student.edited_fields || {};
        student.edited_fields[colDef.field] = true;
      }

      setStudents(updatedStudents);
    },
    [students],
  );

  // ============================================
  // EDIT MODE HANDLERS
  // ============================================

  const handleEditClick = () => {
    if (isEditMode) {
      // Cancel edit mode
      setStudents(JSON.parse(JSON.stringify(originalStudents)));
      setIsEditMode(false);
      setHasChanges(false);
      showToast.info("Edit cancelled");
    } else {
      // Enter edit mode
      setIsEditMode(true);
      showToast.info("Edit mode enabled");
    }
  };

  const handleDiscardChanges = () => {
    setStudents(JSON.parse(JSON.stringify(originalStudents)));
    setIsEditMode(false);
    setHasChanges(false);
    showToast.info("Changes discarded");
  };

  const handleSaveChanges = async () => {
    if (!hasChanges) return;

    try {
      setIsSaving(true);

      // Prepare changes for backend
      const changes = students
        .filter((student) => {
          const original = originalStudents.find((s) => s.id === student.id);
          return (
            !original || JSON.stringify(student) !== JSON.stringify(original)
          );
        })
        .map((student) => {
          const original = originalStudents.find((s) => s.id === student.id);
          const editedFields = {};

          Object.keys(student).forEach((key) => {
            if (
              key !== "id" &&
              key !== "edited_fields" &&
              student[key] !== original?.[key]
            ) {
              editedFields[key] = {
                old: original?.[key],
                new: student[key],
              };
            }
          });

          return {
            student_id: student.student_id,
            changes: editedFields,
          };
        });

      // Save to backend
      await reviewService.saveAdminEdits(uploadId, centerId, {
        students: students,
        changes: changes,
      });

      showToast.success("Changes saved successfully");
      setIsEditMode(false);
      setHasChanges(false);

      // Refresh data
      await fetchStudents();
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
  // APPROVE/REJECT HANDLERS
  // ============================================

  const handleApproveClick = () => {
    setShowApproveModal(true);
  };

  const handleApproveConfirm = async () => {
    try {
      setIsApproving(true);
      setShowApproveModal(false);
      const response = await reviewService.approveCenter(uploadId, centerId);

      showToast.success(
        response?.data?.message ||
          response?.message ||
          "Center approved successfully",
      );

      const allReviewed =
        response?.data?.allReviewed || response?.allReviewed || false;

      if (allReviewed) {
        showToast.success("All centers reviewed! Returning to inbox.");
        setTimeout(() => {
          navigate(ROUTES.INBOX);
        }, 2000);
      } else {
        setTimeout(() => {
          navigate(ROUTES.REVIEW_UPLOAD.replace(":uploadId", uploadId));
        }, 1500);
      }
    } catch (error) {
      console.error("Error approving center:", error);
      showToast.error(
        error.response?.data?.message || "Failed to approve center",
      );
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectClick = () => {
    setShowRejectModal(true);
  };

  // ============================================
  // FILTER AND SEARCH HANDLERS
  // ============================================

  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setActiveFilters({
      gender: "",
      city: "",
      state: "",
      course_name: "",
    });
  };

  const handleSortChange = (sortByValue, sortOrderValue) => {
    setSortBy(sortByValue);
    setSortOrder(sortOrderValue);
  };

  // Compute filter options
  const filterOptions = useMemo(() => {
    const genders = [...new Set(students.map((s) => s.gender).filter(Boolean))];
    const cities = [...new Set(students.map((s) => s.city).filter(Boolean))];
    const states = [...new Set(students.map((s) => s.state).filter(Boolean))];
    const courses = [
      ...new Set(students.map((s) => s.course_name).filter(Boolean)),
    ];

    return {
      genders: genders.sort(),
      cities: cities.sort(),
      states: states.sort(),
      courses: courses.sort(),
    };
  }, [students]);

  // Apply search, filter, and sort
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = [...students];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.student_name?.toLowerCase().includes(term) ||
          s.student_id?.toLowerCase().includes(term) ||
          s.email?.toLowerCase().includes(term) ||
          s.mobile_number?.includes(term),
      );
    }

    // Filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter((s) => s[key] === value);
      }
    });

    // Sort
    if (sortBy) {
      filtered.sort((a, b) => {
        const aValue = a[sortBy] || "";
        const bValue = b[sortBy] || "";

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortOrder === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      });
    }

    return filtered;
  }, [students, searchTerm, activeFilters, sortBy, sortOrder]);

  const gridHeight = useMemo(() => {
    const visibleRows = Math.min(
      Math.max(filteredAndSortedStudents.length, GRID_MIN_VISIBLE_ROWS),
      GRID_MAX_VISIBLE_ROWS,
    );

    return GRID_HEADER_HEIGHT + GRID_PAGINATION_HEIGHT + visibleRows * GRID_ROW_HEIGHT + 2;
  }, [filteredAndSortedStudents.length]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading students...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <style>{`
        /* Context menu styling */
        .context-menu-container {
          position: fixed;
          max-height: 400px;
          overflow-y: auto;
          z-index: 9999;
        }
        
        .context-menu-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .context-menu-container::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .context-menu-container::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        
        .context-menu-container::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>

      <div className="space-y-5">
        {/* ── Breadcrumb + Back ── */}
        <div className="flex items-center justify-between">
          <Breadcrumb items={breadcrumbItems} />
          <button
            onClick={handleBack}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            ← Back to Centers
          </button>
        </div>

        {/* ── Page Header (Figma-style: flat, no card) ── */}
        <div className="flex items-start justify-between">
          {/* Left: title + meta */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {center?.center_name || "—"}
              </h1>
              {uploadVersion > 1 && (
                <Badge variant="secondary" className="text-sm">
                  Version {uploadVersion}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {center?.partner_name && (
                <span className="font-medium text-gray-700">
                  {center.partner_name}
                </span>
              )}
              {center?.partner_name && (center?.city || center?.state) && (
                <span className="text-gray-300">|</span>
              )}
              {(center?.city || center?.state) && (
                <span>
                  {[center.city, center.state].filter(Boolean).join(", ")}
                </span>
              )}
              {students.length > 0 && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{students.length} students</span>
                </>
              )}
            </div>
          </div>

          {/* Right: Approve / Reject — outlined pill buttons (Figma style) */}
          <div className="flex items-center gap-3 shrink-0">
            {isReviewed ? (
              <span
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border-2 ${
                  center?.review_status === "approved"
                    ? "border-green-400 text-green-700 bg-green-50"
                    : "border-red-400 text-red-700 bg-red-50"
                }`}
              >
                {center?.review_status === "approved" ? (
                  <CheckCircleIcon className="h-4 w-4" />
                ) : (
                  <XCircleIcon className="h-4 w-4" />
                )}
                {center?.review_status === "approved" ? "Approved" : "Rejected"}
              </span>
            ) : isEditMode ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-700 rounded-full text-sm font-medium">
                <PencilIcon className="h-4 w-4" />
                Editing mode
              </span>
            ) : (
              <>
                <button
                  onClick={handleApproveClick}
                  disabled={isApproving || isRejecting || hasChanges}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold border-2 border-green-500 text-green-600 bg-white hover:bg-green-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckIcon className="h-4 w-4" />
                  {isApproving ? "Approving..." : "Approve"}
                </button>
                <button
                  onClick={handleRejectClick}
                  disabled={isApproving || isRejecting || hasChanges}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semebold border-2 border-red-500 text-red-600 bg-white hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <XMarkIcon className="h-4 w-4" />
                  {isRejecting ? "Rejecting..." : "Reject"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Info Banners ── */}
        {uploadVersion > 1 && getEditedStudentCount() > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2">
            <span className="text-base shrink-0">📝</span>
            <span>
              This is a resubmission. <strong>{getEditedStudentCount()}</strong>{" "}
              {getEditedStudentCount() === 1 ? "student has" : "students have"}{" "}
              been edited by the partner. Edited rows are highlighted in yellow.
            </span>
          </div>
        )}

        {hasChanges && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-center gap-2">
            <span className="text-base shrink-0">⚠️</span>
            <span>
              You have unsaved changes. Click <strong>Save Changes</strong>{" "}
              before approving or rejecting.
            </span>
          </div>
        )}

        {/* ── Edit Mode Toolbar (only visible in edit mode) ── */}
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
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSaveChanges}
                disabled={!hasChanges || isSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckIcon className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={handleDiscardChanges}
                disabled={!hasChanges || isSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <XMarkIcon className="h-4 w-4" />
                Discard
              </button>
              <button
                onClick={handleEditClick}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
                Cancel Edit
              </button>
            </div>
          </div>
        )}

        {/* ── Search + Filters + Edit button row (Figma-style) ── */}
        <div className="flex items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search data"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Filters section */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-gray-500 font-medium">Filters:</span>
            <select
              value={
                activeFilters.gender ||
                activeFilters.city ||
                activeFilters.state ||
                activeFilters.course_name ||
                ""
              }
              onChange={(e) => {
                e.preventDefault();

                handleClearFilters();
              }}
              className="text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-2.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Data</option>
            </select>
            <button
              onClick={() => {
                // Toggle advanced filter visibility by setting a dummy search to trigger AdvancedSearchBar re-render
                // The AdvancedSearchBar below handles the actual filter panel
              }}
              className="p-2.5 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              title="Advanced filters"
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Edit / Cancel button */}
          {!isEditMode ? (
            <button
              onClick={handleEditClick}
              disabled={isReviewed || isSaving}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <PencilIcon className="h-4 w-4" />
              Edit
            </button>
          ) : (
            <button
              onClick={handleEditClick}
              disabled={isSaving}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 transition-colors shadow-sm"
            >
              <XMarkIcon className="h-4 w-4" />
              Cancel
            </button>
          )}
        </div>

        {/* Advanced filters (collapsed panel - keeps existing filter functionality) */}
        {(Object.values(activeFilters).some((v) => v) || sortBy) && (
          <AdvancedSearchBar
            value=""
            onChange={() => {}}
            placeholder=""
            filterGroups={[
              {
                label: "Gender",
                key: "gender",
                options: filterOptions.genders,
              },
              { label: "City", key: "city", options: filterOptions.cities },
              { label: "State", key: "state", options: filterOptions.states },
              {
                label: "Course",
                key: "course_name",
                options: filterOptions.courses,
              },
            ]}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            sortOptions={[
              { label: "Student Name", value: "student_name" },
              { label: "Student ID", value: "student_id" },
              { label: "Gender", value: "gender" },
              { label: "City", value: "city" },
              { label: "Course", value: "course_name" },
              { label: "Enrollment Date", value: "enrollment_date" },
            ]}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
          />
        )}

        {/* AG Grid */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {students.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">No students in this center</div>
            </div>
          ) : (
            <div style={{ height: gridHeight, width: "100%" }}>
              <AgGridReact
                ref={gridRef}
                theme={themeQuartz}
                rowData={filteredAndSortedStudents}
                columnDefs={columnDefs}
                getRowId={(params) => params.data.id}
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
                defaultColDef={{
                  sortable: false,
                  filter: false,
                  resizable: true,
                  suppressMovable: true,
                  wrapText: false,
                  autoHeight: false,
                  wrapHeaderText: false,
                  autoHeaderHeight: false,
                  cellEditor: "agTextCellEditor",
                  cellEditorParams: {
                    maxLength: 500,
                  },
                  suppressHeaderMenuButton: true,
                  cellStyle: {
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  },
                }}
                undoRedoCellEditing={true}
                undoRedoCellEditingLimit={20}
                onCellContextMenu={handleCellContextMenu}
                suppressContextMenu={false}
                navigateToNextCell={(params) => {
                  const suggestedNextCell = params.nextCellPosition;
                  const KEY_UP = "ArrowUp";
                  const KEY_DOWN = "ArrowDown";
                  const KEY_LEFT = "ArrowLeft";
                  const KEY_RIGHT = "ArrowRight";

                  if (
                    params.key === KEY_DOWN ||
                    params.key === KEY_UP ||
                    params.key === KEY_LEFT ||
                    params.key === KEY_RIGHT
                  ) {
                    return suggestedNextCell;
                  }
                  return suggestedNextCell;
                }}
                pagination={true}
                paginationPageSize={50}
                paginationPageSizeSelector={[20, 50, 100]}
                onCellValueChanged={onCellValueChanged}
                singleClickEdit={false}
                stopEditingWhenCellsLoseFocus={true}
                suppressClickEdit={!isEditMode}
                suppressRowTransform={true}
                rowHeight={GRID_ROW_HEIGHT}
                headerHeight={GRID_HEADER_HEIGHT}
                alwaysShowHorizontalScroll={true}
                suppressHorizontalScroll={false}
                domLayout="normal"
              />
            </div>
          )}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="context-menu-container bg-white border border-gray-200 rounded-xl shadow-2xl py-1.5 w-[220px]"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Group 1: Clipboard */}
            <button
              onClick={handleCut}
              disabled={!isEditMode || !contextMenu.editable}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5"
            >
              <ScissorsIcon className="h-4 w-4 text-gray-400" />
              Cut
            </button>
            <button
              onClick={handleCopyCell}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2.5"
            >
              <DocumentDuplicateIcon className="h-4 w-4 text-gray-400" />
              Copy
            </button>
            <button
              onClick={handlePaste}
              disabled={!isEditMode || !contextMenu.editable}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5"
            >
              <ClipboardDocumentIcon className="h-4 w-4 text-gray-400" />
              Paste
            </button>

            {/* Group 2: Annotations */}
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={handleComment}
              disabled={!isEditMode}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5"
            >
              <ChatBubbleLeftIcon className="h-4 w-4 text-gray-400" />
              Comment
            </button>
            <button
              onClick={handleInsertNote}
              disabled={!isEditMode}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5"
            >
              <PencilSquareIcon className="h-4 w-4 text-gray-400" />
              Insert note
            </button>

            {/* Group 3: Insert rows/columns */}
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={handleInsertRowAbove}
              disabled={!isEditMode}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5"
            >
              <PlusIcon className="h-4 w-4 text-gray-400" />
              Insert 1 row above
            </button>
            <button
              onClick={handleInsertRowBelow}
              disabled={!isEditMode}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5"
            >
              <PlusIcon className="h-4 w-4 text-gray-400" />
              Insert 1 row below
            </button>
            <button
              onClick={handleInsertColumnLeft}
              disabled={!isEditMode}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5"
            >
              <PlusIcon className="h-4 w-4 text-gray-400" />
              Insert 1 column left
            </button>
            <button
              onClick={handleInsertColumnRight}
              disabled={!isEditMode}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5"
            >
              <PlusIcon className="h-4 w-4 text-gray-400" />
              Insert 1 column Right
            </button>

            {/* Group 4: Delete */}
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={handleDeleteRow}
              disabled={!isEditMode}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5"
            >
              <TrashIcon className="h-4 w-4 text-red-400" />
              Delete row
            </button>
            <button
              onClick={handleDeleteColumn}
              disabled={!isEditMode}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5"
            >
              <TrashIcon className="h-4 w-4 text-red-400" />
              Delete column
            </button>
            <button
              onClick={handleDeleteCell}
              disabled={!isEditMode || !contextMenu.editable}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5"
            >
              <TrashIcon className="h-4 w-4 text-red-400" />
              Delete Cell
            </button>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      <SuccessModal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Center"
        description="This action will move all data from this center to the main system. Do you want to proceed?"
        partnerName={center?.partner_name || ""}
        centerName={center?.center_name || ""}
        onConfirm={handleApproveConfirm}
        isLoading={isApproving}
        showCancel={true}
        buttonText="Confirm Approval"
      />

      {/* Reject Modal */}
      <RejectionModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={`Reject Center: ${center?.center_name}`}
        description="Please provide a reason for rejecting this center. This will be sent to the partner for review."
        onSubmit={async (data) => {
          const { reason, remarks } = data;
          try {
            setIsRejecting(true);
            await reviewService.rejectCenter(
              uploadId,
              centerId,
              reason,
              remarks,
            );
            showToast.success("Center rejected successfully");
            setShowRejectModal(false);
            setTimeout(() => {
              navigate(ROUTES.REVIEW_UPLOAD.replace(":uploadId", uploadId));
            }, 1500);
          } catch (error) {
            console.error("Error rejecting center:", error);
            showToast.error(
              error.response?.data?.message || "Failed to reject center",
            );
          } finally {
            setIsRejecting(false);
          }
        }}
        isLoading={isRejecting}
        reasonLabel="Reason for Rejection"
        remarksLabel="Additional Remarks"
        reasonPlaceholder="Enter the reason for rejection (minimum 10 characters)"
        remarksPlaceholder="Enter any additional remarks or comments"
        minReasonLength={10}
      />

      {/* Comment/Note Modal */}
      <CommentNoteModal
        isOpen={showCommentModal}
        onClose={() => {
          setShowCommentModal(false);
          setCurrentCommentData(null);
        }}
        type={currentCommentData?.type || "comment"}
        fieldName={currentCommentData?.fieldName || ""}
        studentName={currentCommentData?.studentName || ""}
        existingData={currentCommentData?.existing}
        onSave={handleSaveComment}
        onDelete={handleDeleteComment}
        readOnly={false}
      />
    </MainLayout>
  );
};

export default ReviewStudentsPage;
