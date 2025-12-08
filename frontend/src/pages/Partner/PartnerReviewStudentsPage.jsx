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
} from "@heroicons/react/24/outline";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";
import "../../styles/ag-grid-custom.css";
import apiClient from "../../api/client";
import { toast } from "react-toastify";
import Breadcrumb from "../../components/common/Breadcrumb";
import AdvancedSearchBar from "../../components/common/AdvancedSearchBar";
import SuccessModal from "../../components/common/SuccessModal";
import Papa from "papaparse";
import { ROUTES } from "../../constants/routes";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * PartnerReviewStudentsPage with ag-Grid styled to match admin table
 * Excel features + Admin UI design
 */
const PartnerReviewStudentsPage = () => {
  const { uploadId, centerId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const gridRef = useRef(null);

  const [center, setCenter] = useState(null);
  const [students, setStudents] = useState([]);
  const [originalStudents, setOriginalStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasSavedChanges, setHasSavedChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    gender: "",
    city: "",
    state: "",
    course_name: "",
    training_status: "",
  });
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [contextMenu, setContextMenu] = useState(null);

  const breadcrumbItems = [
    { label: "Inbox", path: ROUTES.INBOX },
    {
      label: "Centers",
      path: ROUTES.PARTNER_REJECTED_CENTERS.replace(":uploadId", uploadId),
    },
    { label: "Students", path: "#" },
  ];

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(
        `/partners/uploads/${uploadId}/centers/${centerId}/students`
      );
      const centerData = response.data.data.center;
      setCenter(centerData);

      // Check if center is rejected - only rejected centers can be edited
      if (centerData.review_status !== "rejected") {
        toast.error(
          `This center is currently ${centerData.review_status}. Only rejected centers can be edited.`
        );
        navigate(
          ROUTES.PARTNER_REJECTED_CENTERS.replace(":uploadId", uploadId)
        );
        return;
      }

      const studentsData = response.data.data.students || [];

      console.log("📊 Fetched students data:", {
        count: studentsData.length,
        sampleStudent: studentsData[0],
        allFields: studentsData[0] ? Object.keys(studentsData[0]) : [],
      });

      setStudents(studentsData);
      setOriginalStudents(JSON.parse(JSON.stringify(studentsData)));
    } catch (error) {
      console.error("Error fetching students:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to load students";
      toast.error(errorMessage);
      navigate(ROUTES.PARTNER_REJECTED_CENTERS.replace(":uploadId", uploadId));
    } finally {
      setIsLoading(false);
    }
  }, [uploadId, centerId, navigate]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Block default browser context menu globally
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  // Handle back to centers
  const handleBackToCenters = () => {
    navigate(ROUTES.PARTNER_REJECTED_CENTERS.replace(":uploadId", uploadId));
  };

  useEffect(() => {
    const hasEdits = students.some((student) => {
      const original = originalStudents.find((o) => o.id === student.id);
      if (!original) return true; // New row
      return JSON.stringify(student) !== JSON.stringify(original);
    });
    setHasChanges(hasEdits);
  }, [students, originalStudents]);

  // ============================================
  // CUSTOM CONTEXT MENU (Community Edition)
  // ============================================
  // AG Grid's getContextMenuItems requires Enterprise license
  // This custom implementation works with Community Edition
  // Features: Copy cell, Clear cell (edit mode), Visual feedback
  // ============================================

  const handleCellContextMenu = useCallback(
    (event) => {
      console.log("🖱️ Right-click detected:", {
        target: event.target,
        cellValue: event.value,
        column: event.column?.getColId(),
        rowIndex: event.rowIndex,
        isEditMode: isEditMode,
        editable: event.column?.getColDef().editable,
      });

      // Prevent default browser context menu
      event.event?.preventDefault();

      const cellValue = event.value;
      const field = event.column?.getColDef().field;
      const editable = event.column?.getColDef().editable;

      // Show custom context menu
      setContextMenu({
        x: event.event?.clientX || 0,
        y: event.event?.clientY || 0,
        cellValue,
        field,
        editable,
        rowNode: event.node,
        rowIndex: event.rowIndex,
      });

      console.log("✅ Context menu should appear at:", {
        x: event.event?.clientX,
        y: event.event?.clientY,
        editable,
        cellValue,
      });
    },
    [isEditMode]
  );

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        console.log("🚫 Closing context menu");
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
    if (contextMenu?.cellValue && contextMenu?.editable) {
      navigator.clipboard.writeText(String(contextMenu.cellValue)).then(() => {
        if (contextMenu?.rowNode && contextMenu?.field) {
          const rowId = contextMenu.rowNode.data.id;
          const field = contextMenu.field;

          // Update state
          setStudents((prevStudents) => {
            const updatedStudents = prevStudents.map((student) => {
              if (student.id === rowId) {
                return {
                  ...student,
                  [field]: null,
                  is_edited: true,
                  edited_fields: {
                    ...(student.edited_fields || {}),
                    [field]: true,
                  },
                };
              }
              return student;
            });

            if (gridRef.current?.api) {
              setTimeout(() => {
                gridRef.current.api.setRowData(updatedStudents);
              }, 0);
            }

            return updatedStudents;
          });

          setHasChanges(true);
          toast.success("Cell cut to clipboard!");
        }
      });
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleCopyCell = useCallback(() => {
    if (
      contextMenu?.cellValue !== undefined &&
      contextMenu?.cellValue !== null
    ) {
      const copyValue = String(contextMenu.cellValue);
      navigator.clipboard
        .writeText(copyValue)
        .then(() => {
          toast.success("Cell copied to clipboard!");
          console.log("📋 Copied:", copyValue);
        })
        .catch((err) => {
          console.error("Copy failed:", err);
          toast.error("Failed to copy to clipboard");
        });
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (contextMenu?.rowNode && contextMenu?.field && contextMenu?.editable) {
        const rowId = contextMenu.rowNode.data.id;
        const field = contextMenu.field;

        // Update state
        setStudents((prevStudents) => {
          const updatedStudents = prevStudents.map((student) => {
            if (student.id === rowId) {
              return {
                ...student,
                [field]: text,
                is_edited: true,
                edited_fields: {
                  ...(student.edited_fields || {}),
                  [field]: true,
                },
              };
            }
            return student;
          });

          if (gridRef.current?.api) {
            setTimeout(() => {
              gridRef.current.api.setRowData(updatedStudents);
            }, 0);
          }

          return updatedStudents;
        });

        setHasChanges(true);
        toast.success("Pasted from clipboard!");
      }
    } catch (err) {
      console.error("Paste failed:", err);
      toast.error("Failed to paste from clipboard");
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleComment = useCallback(() => {
    if (contextMenu?.rowNode && contextMenu?.field) {
      const comment = prompt("Enter your comment:");
      if (comment) {
        const rowData = contextMenu.rowNode.data;
        if (!rowData.comments) rowData.comments = {};
        rowData.comments[contextMenu.field] = comment;
        toast.success("Comment added!");
      }
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleInsertNote = useCallback(() => {
    if (contextMenu?.rowNode && contextMenu?.field) {
      const note = prompt("Enter your note:");
      if (note) {
        const rowData = contextMenu.rowNode.data;
        if (!rowData.notes) rowData.notes = {};
        rowData.notes[contextMenu.field] = note;
        toast.success("Note added!");
      }
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleInsertRowAbove = useCallback(() => {
    if (contextMenu?.rowNode && gridRef.current) {
      const newRow = {
        id: `new_${Date.now()}`,
        student_id: `NEW_${Date.now()}`,
        student_name: "",
        date_of_birth: null,
        gender: "",
        mobile_number: "",
        email: "",
        address: "",
        city: "",
        state: "",
        course_name: "",
        course_duration_months: null,
        batch_number: "",
        enrollment_date: null,
        training_status: "",
        is_edited: true,
      };

      setStudents((prev) => {
        const newStudents = [...prev];
        const insertIndex = contextMenu.rowNode.rowIndex;
        newStudents.splice(insertIndex, 0, newRow);
        return newStudents;
      });

      setHasChanges(true);
      toast.success("Row inserted above!");
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleInsertRowBelow = useCallback(() => {
    if (contextMenu?.rowNode && gridRef.current) {
      const newRow = {
        id: `new_${Date.now()}`,
        student_id: `NEW_${Date.now()}`,
        student_name: "",
        date_of_birth: null,
        gender: "",
        mobile_number: "",
        email: "",
        address: "",
        city: "",
        state: "",
        course_name: "",
        course_duration_months: null,
        batch_number: "",
        enrollment_date: null,
        training_status: "",
        is_edited: true,
      };

      setStudents((prev) => {
        const newStudents = [...prev];
        const insertIndex = contextMenu.rowNode.rowIndex + 1;
        newStudents.splice(insertIndex, 0, newRow);
        return newStudents;
      });

      setHasChanges(true);
      toast.success("Row inserted below!");
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleInsertColumnLeft = useCallback(() => {
    toast.info(
      "Column insertion requires schema update - contact administrator"
    );
    setContextMenu(null);
  }, []);

  const handleInsertColumnRight = useCallback(() => {
    toast.info(
      "Column insertion requires schema update - contact administrator"
    );
    setContextMenu(null);
  }, []);

  const handleDeleteRow = useCallback(() => {
    if (contextMenu?.rowNode && gridRef.current) {
      const rowIndex = contextMenu.rowNode.rowIndex;
      const studentName = contextMenu.rowNode.data.student_name;

      if (
        window.confirm(
          `Are you sure you want to delete the row for "${studentName}"?`
        )
      ) {
        setStudents((prev) => {
          const newStudents = [...prev];
          newStudents.splice(rowIndex, 1);
          return newStudents;
        });

        setHasChanges(true);
        toast.success("Row deleted!");
      }
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleDeleteColumn = useCallback(() => {
    toast.info(
      "Column deletion requires schema update - contact administrator"
    );
    setContextMenu(null);
  }, []);

  const handleDeleteCell = useCallback(() => {
    if (contextMenu?.editable && contextMenu?.rowNode && contextMenu?.field) {
      const rowId = contextMenu.rowNode.data.id;
      const field = contextMenu.field;

      // Update state
      setStudents((prevStudents) => {
        const updatedStudents = prevStudents.map((student) => {
          if (student.id === rowId) {
            return {
              ...student,
              [field]: null,
              is_edited: true,
              edited_fields: {
                ...(student.edited_fields || {}),
                [field]: true,
              },
            };
          }
          return student;
        });

        if (gridRef.current?.api) {
          setTimeout(() => {
            gridRef.current.api.setRowData(updatedStudents);
          }, 0);
        }

        return updatedStudents;
      });

      setHasChanges(true);
      toast.info("Cell deleted");
    }
    setContextMenu(null);
  }, [contextMenu]);

  // ag-Grid column definitions styled to match admin table
  // Display all uploaded fields except partner_name, center_name, center_id, center_type
  const columnDefs = useMemo(
    () => [
      {
        headerName: "S.NO",
        colId: "row_number",
        valueGetter: (params) => {
          // Get the actual row index from the displayed rows (after filtering/sorting)
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
        width: 160,
        editable: false,
        pinned: "left",
        cellClass: "text-sm font-medium text-gray-900",
        valueFormatter: (params) => params.value || "-",
      },
      {
        headerName: "Student Name",
        field: "student_name",
        width: 200,
        editable: isEditMode,
        cellClass: "text-sm text-gray-900",
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.student_name
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Date of Birth",
        field: "date_of_birth",
        width: 150,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellEditor: "agTextCellEditor",
        valueFormatter: (params) => {
          if (!params.value) return "-";
          return new Date(params.value).toLocaleDateString("en-IN");
        },
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
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.gender
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Mobile Number",
        field: "mobile_number",
        width: 160,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.mobile_number
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Email",
        field: "email",
        width: 220,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.email
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Address",
        field: "address",
        width: 250,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.address
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "City",
        field: "city",
        width: 140,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.city
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "State",
        field: "state",
        width: 140,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.state
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Course Name",
        field: "course_name",
        width: 180,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.course_name
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Course Duration (Months)",
        field: "course_duration_months",
        width: 220,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellEditor: "agNumberCellEditor",
        cellEditorParams: {
          min: 1,
          max: 60,
          precision: 0,
        },
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.course_duration_months
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Batch Number",
        field: "batch_number",
        width: 160,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.batch_number
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Enrollment Date",
        field: "enrollment_date",
        width: 160,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        valueFormatter: (params) => {
          if (!params.value) return "-";
          return new Date(params.value).toLocaleDateString("en-IN");
        },
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.enrollment_date
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
      {
        headerName: "Training Status",
        field: "training_status",
        width: 160,
        editable: isEditMode,
        cellClass: "text-sm text-gray-600",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: ["enrolled", "in_progress", "completed", "dropped"],
        },
        cellRenderer: (params) => {
          const status = params.value || "enrolled";
          const statusColors = {
            enrolled: "bg-blue-100 text-blue-800",
            in_progress: "bg-yellow-100 text-yellow-800",
            completed: "bg-green-100 text-green-800",
            dropped: "bg-red-100 text-red-800",
          };
          const colorClass =
            statusColors[status] || "bg-gray-100 text-gray-800";

          return (
            <span
              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}
            >
              {status}
            </span>
          );
        },
        cellStyle: (params) => ({
          backgroundColor: params.data.edited_fields?.training_status
            ? "#fef3c7"
            : "#ffffff",
        }),
      },
    ],
    [isEditMode]
  );

  const onCellValueChanged = useCallback((event) => {
    const field = event.colDef.field;
    const newValue = event.newValue;
    const oldValue = event.oldValue;
    const rowId = event.data.id;

    console.log("📝 Cell changed:", field, "from", oldValue, "to", newValue);

    // Update students state - this is the source of truth
    setStudents((prevStudents) => {
      const updatedStudents = prevStudents.map((student) => {
        if (student.id === rowId) {
          const updatedStudent = {
            ...student,
            [field]: newValue,
            is_edited: true,
            edited_fields: {
              ...(student.edited_fields || {}),
              [field]: true,
            },
          };
          return updatedStudent;
        }
        return student;
      });

      // Update the grid immediately with new data
      if (gridRef.current?.api) {
        setTimeout(() => {
          gridRef.current.api.setRowData(updatedStudents);
        }, 0);
      }

      return updatedStudents;
    });

    setHasChanges(true);
  }, []);

  const handleEditClick = () => {
    if (isEditMode) {
      if (hasChanges) {
        // Use toast instead of window.confirm
        toast.warning("Please save or discard changes first");
        return;
      }
    }
    setIsEditMode(!isEditMode);
  };

  const handleDiscardChanges = () => {
    setStudents(JSON.parse(JSON.stringify(originalStudents)));
    setIsEditMode(false);
    setHasChanges(false);
    toast.info("Changes discarded");
    // If there were saved changes, restore them
    if (gridRef.current?.api) {
      setTimeout(() => {
        gridRef.current.api.setRowData(
          JSON.parse(JSON.stringify(originalStudents))
        );
      }, 0);
    }
  };

  const handleSaveChanges = async () => {
    if (!hasChanges) {
      toast.info("No changes to save");
      return;
    }

    setIsSaving(true);
    try {
      const editedStudents = students
        .filter((s) => s.is_edited)
        .map((s) => ({
          id: s.id,
          student_id: s.student_id,
          student_name: s.student_name,
          date_of_birth: s.date_of_birth,
          gender: s.gender,
          mobile_number: s.mobile_number,
          email: s.email,
          address: s.address,
          city: s.city,
          state: s.state,
          enrollment_date: s.enrollment_date,
          training_status: s.training_status,
          course_name: s.course_name,
          course_duration_months: s.course_duration_months,
          batch_number: s.batch_number,
        }));

      await apiClient.post(
        `/partners/uploads/${uploadId}/centers/${centerId}/save-edits`,
        { students: editedStudents }
      );

      toast.success("Changes saved successfully. You can now resubmit.");

      // Mark changes as saved but don't reset originalStudents
      // This keeps the Resubmit button enabled
      setHasSavedChanges(true);
      setHasChanges(false); // Clear unsaved changes
      setIsEditMode(false);

      // Reload to get fresh data from server but keep originalStudents
      const response = await apiClient.get(
        `/partners/uploads/${uploadId}/centers/${centerId}/students`
      );
      const studentsData = response.data.data.students || [];
      setStudents(studentsData);
      setCenter(response.data.data.center);
    } catch (error) {
      console.error("Error saving changes:", error);
      console.error("Error details:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadCsv = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          console.log("📄 Parsed CSV data:", results.data);

          const response = await apiClient.post(
            `/partners/uploads/${uploadId}/centers/${centerId}/upload-csv`,
            { students: results.data }
          );

          toast.success(response.data.message || "CSV uploaded successfully");
          await fetchStudents();
        } catch (error) {
          console.error("Error uploading CSV:", error);
          toast.error(error.response?.data?.message || "Failed to upload CSV");
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      },
      error: (error) => {
        console.error("CSV parse error:", error);
        toast.error("Failed to parse CSV file");
        setIsUploading(false);
      },
    });
  };

  const handleResubmit = async () => {
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
        `/partners/uploads/${uploadId}/resubmit`
      );
      toast.success(response.data.data.message);

      // Reset all states after successful resubmit
      setHasSavedChanges(false);
      setHasChanges(false);

      setTimeout(() => {
        navigate(
          ROUTES.PARTNER_REJECTED_CENTERS.replace(":uploadId", uploadId)
        );
      }, 2000);
    } catch (error) {
      console.error("Error resubmitting:", error);
      toast.error(error.response?.data?.message || "Failed to resubmit upload");
    } finally {
      setIsResubmitting(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleClearFilters = () => {
    setActiveFilters({
      gender: "",
      city: "",
      state: "",
      course_name: "",
      training_status: "",
    });
  };

  const handleSortChange = (sortByValue, sortOrderValue) => {
    setSortBy(sortByValue);
    setSortOrder(sortOrderValue);
  };

  // Compute filter options from students data
  const filterOptions = useMemo(() => {
    const genders = [...new Set(students.map((s) => s.gender).filter(Boolean))];
    const cities = [...new Set(students.map((s) => s.city).filter(Boolean))];
    const states = [...new Set(students.map((s) => s.state).filter(Boolean))];
    const courses = [
      ...new Set(students.map((s) => s.course_name).filter(Boolean)),
    ];
    const statuses = [
      ...new Set(students.map((s) => s.training_status).filter(Boolean)),
    ];

    return {
      genders: genders.map((g) => ({ label: g, value: g })),
      cities: cities.map((c) => ({ label: c, value: c })),
      states: states.map((s) => ({ label: s, value: s })),
      courses: courses.map((c) => ({ label: c, value: c })),
      statuses: statuses.map((s) => ({ label: s, value: s })),
    };
  }, [students]);

  // Apply search, filter, and sort
  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students];

    // Apply search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.student_name?.toLowerCase().includes(search) ||
          s.student_id?.toLowerCase().includes(search) ||
          s.email?.toLowerCase().includes(search) ||
          s.mobile_number?.toLowerCase().includes(search) ||
          s.city?.toLowerCase().includes(search) ||
          s.state?.toLowerCase().includes(search)
      );
    }

    // Apply filters
    if (activeFilters.gender) {
      result = result.filter((s) => s.gender === activeFilters.gender);
    }
    if (activeFilters.city) {
      result = result.filter((s) => s.city === activeFilters.city);
    }
    if (activeFilters.state) {
      result = result.filter((s) => s.state === activeFilters.state);
    }
    if (activeFilters.course_name) {
      result = result.filter(
        (s) => s.course_name === activeFilters.course_name
      );
    }
    if (activeFilters.training_status) {
      result = result.filter(
        (s) => s.training_status === activeFilters.training_status
      );
    }

    // Apply sort
    if (sortBy) {
      result.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];

        if (aVal == null) return 1;
        if (bVal == null) return -1;

        if (typeof aVal === "string") {
          const comparison = aVal.localeCompare(bVal);
          return sortOrder === "asc" ? comparison : -comparison;
        }

        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    return result;
  }, [students, searchTerm, activeFilters, sortBy, sortOrder]);

  if (isLoading) {
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
        /* Vertical center alignment for cells */
        .ag-theme-quartz .ag-cell {
          display: flex;
          align-items: center;
        }
        
        /* Column dividers */
        .ag-theme-quartz .ag-cell {
          border-right: 1px solid #e5e7eb;
        }
        
        .ag-theme-quartz .ag-header-cell {
          border-right: 1px solid #e5e7eb;
        }
        
        /* Remove filter icons */
        .ag-theme-quartz .ag-header-cell-menu-button {
          display: none;
        }
        
        .ag-theme-quartz .ag-icon-menu {
          display: none;
        }
        
        /* Context menu styling */
        .context-menu-container {
          position: fixed;
          max-height: 400px;
          overflow-y: auto;
          z-index: 9999;
        }
        
        /* Custom scrollbar */
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

      <div className="space-y-6">
        {/* Breadcrumb and Back Button */}
        <div className="flex items-center justify-between">
          <Breadcrumb items={breadcrumbItems} />
          <button
            onClick={handleBackToCenters}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Back to Centers
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {center?.center_name}
              </h1>
              <div className="flex gap-6 text-sm text-gray-600">
                <div>
                  <span className="font-medium">City:</span> {center?.city}
                </div>
                <div>
                  <span className="font-medium">State:</span> {center?.state}
                </div>
                <div>
                  <span className="font-medium">Total Students:</span>{" "}
                  {students.length}
                </div>
              </div>
            </div>
            {center?.rejection_reason &&
              center?.review_status === "rejected" && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm max-w-lg">
                  <div className="flex-1">
                    <p className="font-semibold">Rejection Reason:</p>
                    <p className="mt-1">{center.rejection_reason}</p>
                  </div>
                  <Badge className="text-sm px-3 py-1 bg-red-100 text-red-800 whitespace-nowrap self-start">
                    Rejected
                  </Badge>
                </div>
              )}

            {(!center?.rejection_reason ||
              center?.review_status !== "rejected") && (
              <Badge
                className={`text-base px-4 py-2 ${
                  center?.review_status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {center?.review_status === "pending" ? "Pending" : "Rejected"}
              </Badge>
            )}
          </div>
        </div>

        {hasChanges && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            ℹ️ You have unsaved changes. Click "Save Changes" to persist edits,
            then "Resubmit" to send for review.
          </div>
        )}

        {hasSavedChanges && !isEditMode && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            ✅ Changes saved successfully! Click "Resubmit" to send for admin
            review.
          </div>
        )}

        <div className="flex items-start gap-4 mb-4">
          <div className="flex-1">
            <AdvancedSearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search students by name, ID, email, mobile..."
              filterGroups={[
                {
                  label: "Gender",
                  key: "gender",
                  options: filterOptions.genders,
                },
                {
                  label: "City",
                  key: "city",
                  options: filterOptions.cities,
                },
                {
                  label: "State",
                  key: "state",
                  options: filterOptions.states,
                },
                {
                  label: "Course",
                  key: "course_name",
                  options: filterOptions.courses,
                },
                {
                  label: "Training Status",
                  key: "training_status",
                  options: filterOptions.statuses,
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
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleUploadCsv}
              disabled={isEditMode || isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowUpTrayIcon className="h-5 w-5" />
              {isUploading ? "Uploading..." : "Upload CSV"}
            </button>
            <button
              onClick={handleEditClick}
              disabled={isUploading}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                isEditMode
                  ? "text-red-700 bg-red-50 border border-red-300 hover:bg-red-100"
                  : "text-white bg-blue-600 hover:bg-blue-700"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isEditMode ? (
                <>
                  <XMarkIcon className="h-5 w-5" />
                  Cancel Edit
                </>
              ) : (
                <>
                  <PencilIcon className="h-5 w-5" />
                  Edit
                </>
              )}
            </button>
            {isEditMode ? (
              <>
                <button
                  onClick={handleSaveChanges}
                  disabled={!hasChanges || isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CheckIcon className="h-5 w-5" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={handleDiscardChanges}
                  disabled={!hasChanges || isSaving}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <XMarkIcon className="h-5 w-5" />
                  Discard
                </button>
              </>
            ) : (
              <button
                onClick={handleResubmit}
                disabled={!hasSavedChanges || isResubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircleIcon className="h-5 w-5" />
                {isResubmitting ? "Resubmitting..." : "Resubmit"}
              </button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* ag-Grid with Admin Table Styling */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {students.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">No students in this center</div>
            </div>
          ) : (
            <div
              className="ag-theme-quartz"
              style={{ height: 600, width: "100%" }}
            >
              <AgGridReact
                ref={gridRef}
                rowData={filteredAndSortedStudents}
                columnDefs={columnDefs}
                getRowId={(params) => params.data.id}
                defaultColDef={{
                  sortable: false,
                  filter: false,
                  resizable: true,
                  suppressMovable: true,
                  wrapText: false,
                  autoHeight: false,
                  wrapHeaderText: true,
                  autoHeaderHeight: true,
                  cellEditor: "agTextCellEditor",
                  cellEditorParams: {
                    maxLength: 500,
                  },
                  suppressMenu: true,
                }}
                // Basic Features
                undoRedoCellEditing={true}
                undoRedoCellEditingLimit={20}
                // Custom Right-Click Handler (Community Edition)
                onCellContextMenu={handleCellContextMenu}
                suppressContextMenu={false}
                // Keyboard Navigation
                navigateToNextCell={(params) => {
                  const suggestedNextCell = params.nextCellPosition;
                  if (!suggestedNextCell) return null;
                  if (isEditMode && (params.key === 9 || params.key === 13)) {
                    setTimeout(() => {
                      gridRef.current?.api.startEditingCell({
                        rowIndex: suggestedNextCell.rowIndex,
                        colKey: suggestedNextCell.column.colId,
                      });
                    }, 0);
                  }
                  return suggestedNextCell;
                }}
                // Pagination
                pagination={true}
                paginationPageSize={50}
                paginationPageSizeSelector={[20, 50, 100]}
                // Callbacks
                onGridReady={() => {
                  // Grid ready
                }}
                onCellValueChanged={onCellValueChanged}
                // Edit Settings
                singleClickEdit={false}
                stopEditingWhenCellsLoseFocus={true}
                suppressClickEdit={!isEditMode}
                // Prevent row duplication
                suppressRowTransform={true}
                // Styling
                rowHeight={52}
                headerHeight={60}
                suppressHorizontalScroll={false}
                domLayout="normal"
              />
            </div>
          )}
        </div>

        {/* Custom Context Menu (Community Edition Compatible) */}
        {contextMenu && (
          <div
            className="context-menu-container bg-white border border-gray-200 rounded-lg shadow-xl py-1 w-[200px]"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCut}
              disabled={!isEditMode || !contextMenu.editable}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cut
            </button>
            <button
              onClick={handleCopyCell}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              Copy
            </button>
            <button
              onClick={handlePaste}
              disabled={!isEditMode || !contextMenu.editable}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Paste
            </button>
            <button
              onClick={handleComment}
              disabled={!isEditMode}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Comment
            </button>
            <button
              onClick={handleInsertNote}
              disabled={!isEditMode}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Insert note
            </button>
            <div className="border-t border-gray-200 my-1"></div>
            <button
              onClick={handleInsertRowAbove}
              disabled={!isEditMode}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Insert 1 row above
            </button>
            <button
              onClick={handleInsertRowBelow}
              disabled={!isEditMode}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Insert 1 row below
            </button>
            <button
              onClick={handleInsertColumnLeft}
              disabled={!isEditMode}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Insert 1 column left
            </button>
            <button
              onClick={handleInsertColumnRight}
              disabled={!isEditMode}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Insert 1 column Right
            </button>
            <div className="border-t border-gray-200 my-1"></div>
            <button
              onClick={handleDeleteRow}
              disabled={!isEditMode}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete row
            </button>
            <button
              onClick={handleDeleteColumn}
              disabled={!isEditMode}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete column
            </button>
            <button
              onClick={handleDeleteCell}
              disabled={!isEditMode || !contextMenu.editable}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Cell
            </button>
          </div>
        )}
      </div>

      {/* Resubmit Confirmation Modal */}
      <SuccessModal
        isOpen={showResubmitModal}
        onClose={() => setShowResubmitModal(false)}
        title="Resubmit Upload"
        description="Are you sure you want to resubmit this upload? This will send it to admin for review."
        partnerName={center?.partner_name || ""}
        centerName={center?.center_name || ""}
        onConfirm={confirmResubmit}
        isLoading={isResubmitting}
        showCancel={true}
        buttonText="Confirm Resubmit"
      />
    </MainLayout>
  );
};

export default PartnerReviewStudentsPage;
