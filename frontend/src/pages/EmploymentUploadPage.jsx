import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { MainLayout } from "../components/layout";

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

  // Fetch upload history
  const fetchUploadHistory = useCallback(async () => {
    try {
      const response = await axios.get("/api/v1/employment/uploads", {
        params: { page: currentPage, limit: 10 },
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
  }, [currentPage]);

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

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get("/api/v1/employment/template", {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Employment_Template_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Template downloaded");
    } catch (error) {
      console.error("Template download error:", error);
      toast.error("Failed to download template");
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

  return (
    <MainLayout>
      <div style={{ padding: "24px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h2>Employment Data Upload</h2>
          <p style={{ color: "#6c757d" }}>
            Upload employment status for approved students
          </p>
        </div>

        {/* Tab Navigation */}
        <div
          style={{ borderBottom: "2px solid #dee2e6", marginBottom: "24px" }}
        >
          <div style={{ display: "flex", gap: "16px" }}>
            <button
              onClick={() => setActiveTab("upload")}
              style={{
                padding: "12px 24px",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === "upload" ? "3px solid #007bff" : "none",
                color: activeTab === "upload" ? "#007bff" : "#6c757d",
                fontWeight: activeTab === "upload" ? "bold" : "normal",
                cursor: "pointer",
              }}
            >
              📤 Upload Data
            </button>
            <button
              onClick={() => setActiveTab("history")}
              style={{
                padding: "12px 24px",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === "history" ? "3px solid #007bff" : "none",
                color: activeTab === "history" ? "#007bff" : "#6c757d",
                fontWeight: activeTab === "history" ? "bold" : "normal",
                cursor: "pointer",
              }}
            >
              📋 Upload History
            </button>
          </div>
        </div>

        {/* Upload Tab */}
        {activeTab === "upload" && (
          <div>
            {/* Download Template */}
            <div
              style={{
                padding: "16px",
                background: "#e7f3ff",
                border: "1px solid #b3d7ff",
                borderRadius: "8px",
                marginBottom: "24px",
              }}
            >
              <h5 style={{ marginBottom: "8px" }}>
                📥 Step 1: Download Template
              </h5>
              <p style={{ marginBottom: "12px", fontSize: "14px" }}>
                Download the Excel template with required columns and sample
                data
              </p>
              <button
                onClick={handleDownloadTemplate}
                className="btn btn-primary"
              >
                Download Employment Template
              </button>
            </div>

            {/* Upload Area */}
            <div
              style={{
                padding: "16px",
                background: "#fff",
                border: "1px solid #dee2e6",
                borderRadius: "8px",
              }}
            >
              <h5 style={{ marginBottom: "16px" }}>
                📤 Step 2: Upload Filled Template
              </h5>

              {/* Drag & Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragActive ? "#007bff" : "#dee2e6"}`,
                  borderRadius: "8px",
                  padding: "48px",
                  textAlign: "center",
                  background: dragActive ? "#f0f8ff" : "#f8f9fa",
                  marginBottom: "16px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onClick={() => document.getElementById("fileInput").click()}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📁</div>
                <h5 style={{ marginBottom: "8px" }}>
                  {selectedFile
                    ? selectedFile.name
                    : "Drop your file here or click to browse"}
                </h5>
                <p style={{ color: "#6c757d", fontSize: "14px" }}>
                  Supported formats: CSV, XLS, XLSX (Max 10MB)
                </p>
                <input
                  id="fileInput"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </div>

              {/* File Info */}
              {selectedFile && (
                <div
                  style={{
                    padding: "12px",
                    background: "#d4edda",
                    border: "1px solid #c3e6cb",
                    borderRadius: "4px",
                    marginBottom: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>{selectedFile.name}</strong>
                    <span style={{ marginLeft: "12px", color: "#6c757d" }}>
                      ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#dc3545",
                      cursor: "pointer",
                      fontSize: "18px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="btn btn-success btn-lg"
                style={{ width: "100%" }}
              >
                {uploading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      style={{ marginRight: "8px" }}
                    />
                    Uploading...
                  </>
                ) : (
                  "🚀 Upload Employment Data"
                )}
              </button>
            </div>

            {/* Instructions */}
            <div
              style={{
                padding: "16px",
                background: "#fff3cd",
                border: "1px solid #ffc107",
                borderRadius: "8px",
                marginTop: "24px",
              }}
            >
              <h6 style={{ marginBottom: "12px" }}>📝 Important Notes:</h6>
              <ul
                style={{
                  marginBottom: 0,
                  paddingLeft: "20px",
                  fontSize: "14px",
                }}
              >
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
                  Employment Status options: Employed, Self-Employed,
                  Entrepreneur, Unemployed, Further Education
                </li>
                <li>Date format: YYYY-MM-DD (e.g., 2024-01-15)</li>
              </ul>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div>
            {/* History Table */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #dee2e6",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8f9fa" }}>
                  <tr>
                    <th style={tableHeaderStyle}>Upload Date</th>
                    <th style={tableHeaderStyle}>File Name</th>
                    <th style={tableHeaderStyle}>Total Records</th>
                    <th style={tableHeaderStyle}>Processed</th>
                    <th style={tableHeaderStyle}>Failed</th>
                    <th style={tableHeaderStyle}>Status</th>
                    <th style={tableHeaderStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadHistory.length > 0 ? (
                    uploadHistory.map((upload) => (
                      <tr
                        key={upload.id}
                        style={{ borderBottom: "1px solid #dee2e6" }}
                      >
                        <td style={tableCellStyle}>
                          {new Date(upload.created_at).toLocaleDateString()}
                          <br />
                          <small style={{ color: "#6c757d" }}>
                            {new Date(upload.created_at).toLocaleTimeString()}
                          </small>
                        </td>
                        <td style={tableCellStyle}>{upload.file_name}</td>
                        <td style={tableCellStyle}>{upload.total_records}</td>
                        <td
                          style={{
                            ...tableCellStyle,
                            color: "#28a745",
                            fontWeight: "bold",
                          }}
                        >
                          {upload.records_processed}
                        </td>
                        <td
                          style={{
                            ...tableCellStyle,
                            color: "#dc3545",
                            fontWeight: "bold",
                          }}
                        >
                          {upload.records_failed}
                        </td>
                        <td style={tableCellStyle}>
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "bold",
                              background:
                                upload.status === "completed"
                                  ? "#d4edda"
                                  : upload.status === "failed"
                                    ? "#f8d7da"
                                    : "#fff3cd",
                              color:
                                upload.status === "completed"
                                  ? "#155724"
                                  : upload.status === "failed"
                                    ? "#721c24"
                                    : "#856404",
                            }}
                          >
                            {upload.status}
                          </span>
                        </td>
                        <td style={tableCellStyle}>
                          {upload.records_failed > 0 && (
                            <button
                              onClick={() => handleViewDetails(upload)}
                              className="btn btn-sm btn-outline-danger"
                            >
                              View Errors
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        style={{
                          ...tableCellStyle,
                          textAlign: "center",
                          padding: "48px",
                        }}
                      >
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                          📭
                        </div>
                        <h5>No upload history yet</h5>
                        <p style={{ color: "#6c757d" }}>
                          Upload your first employment data file to see it here
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "24px",
                  gap: "8px",
                }}
              >
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="btn btn-outline-primary"
                >
                  Previous
                </button>
                <span style={{ padding: "8px 16px", alignSelf: "center" }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="btn btn-outline-primary"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error Details Modal */}
        {showErrorModal && selectedUpload && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setShowErrorModal(false)}
          >
            <div
              style={{
                background: "white",
                padding: "24px",
                borderRadius: "8px",
                maxWidth: "800px",
                maxHeight: "80vh",
                overflow: "auto",
                width: "90%",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginBottom: "16px" }}>
                Upload Errors - {selectedUpload.file_name}
              </h3>

              <div style={{ marginBottom: "16px" }}>
                <strong>Summary:</strong>
                <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                  <li>Total Records: {selectedUpload.total_records}</li>
                  <li style={{ color: "#28a745" }}>
                    Processed: {selectedUpload.records_processed}
                  </li>
                  <li style={{ color: "#dc3545" }}>
                    Failed: {selectedUpload.records_failed}
                  </li>
                </ul>
              </div>

              <h5 style={{ marginTop: "24px", marginBottom: "12px" }}>
                Error Log:
              </h5>

              {selectedUpload.error_log &&
              selectedUpload.error_log.length > 0 ? (
                <div style={{ maxHeight: "400px", overflow: "auto" }}>
                  <table style={{ width: "100%", fontSize: "14px" }}>
                    <thead
                      style={{
                        background: "#f8f9fa",
                        position: "sticky",
                        top: 0,
                      }}
                    >
                      <tr>
                        <th style={{ ...tableHeaderStyle, padding: "8px" }}>
                          Row
                        </th>
                        <th style={{ ...tableHeaderStyle, padding: "8px" }}>
                          Student ID
                        </th>
                        <th style={{ ...tableHeaderStyle, padding: "8px" }}>
                          Error
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUpload.error_log.map((error, idx) => (
                        <tr
                          key={idx}
                          style={{ borderBottom: "1px solid #dee2e6" }}
                        >
                          <td style={{ padding: "8px" }}>{error.row}</td>
                          <td style={{ padding: "8px" }}>{error.student_id}</td>
                          <td style={{ padding: "8px", color: "#dc3545" }}>
                            {error.error}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No errors found.</p>
              )}

              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="btn btn-secondary"
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

// Table styles
const tableHeaderStyle = {
  padding: "12px",
  textAlign: "left",
  fontWeight: "bold",
  borderBottom: "2px solid #dee2e6",
};

const tableCellStyle = {
  padding: "12px",
};

export default EmploymentUploadPage;
