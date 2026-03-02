import React, { useState, useEffect, useCallback } from "react";
import { MainLayout } from "../../components/layout";
import { toast } from "react-toastify";
import axios from "axios";
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

/**
 * EmploymentManagementPage
 * Admin view of all partner employment uploads with stats and status filtering.
 * Allows admin to verify individual employment records.
 */
const EmploymentManagementPage = () => {
  const [uploads, setUploads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
  });

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get("/api/v1/employment/admin/statistics", {
        headers: getAuthHeaders(),
      });
      if (res.data.success) setStats(res.data.data);
    } catch {
      // non-critical
    }
  }, []);

  const fetchUploads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;

      const res = await axios.get("/api/v1/employment/admin/uploads", {
        params,
        headers: getAuthHeaders(),
      });

      if (res.data.success) {
        setUploads(res.data.data || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (error) {
      console.error("Error fetching uploads:", error);
      toast.error("Failed to load employment uploads");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const getStatusBadge = (status) => {
    const map = {
      completed: { color: "#28a745", bg: "#d4edda", label: "Completed" },
      processing: { color: "#fd7e14", bg: "#fff3cd", label: "Processing" },
      failed: { color: "#dc3545", bg: "#f8d7da", label: "Failed" },
      pending: { color: "#6c757d", bg: "#e2e3e5", label: "Pending" },
    };
    const s = map[status?.toLowerCase()] || map.pending;
    return (
      <span
        style={{
          background: s.bg,
          color: s.color,
          padding: "2px 10px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: 600,
        }}
      >
        {s.label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <MainLayout>
      <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>
              Employment Management
            </h1>
            <p style={{ color: "#6c757d", marginTop: "4px", marginBottom: 0 }}>
              Review and verify partner employment data uploads
            </p>
          </div>
          <button
            onClick={() => {
              fetchStats();
              fetchUploads();
            }}
            title="Refresh"
            style={{
              background: "none",
              border: "1px solid #dee2e6",
              borderRadius: "6px",
              padding: "8px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <ArrowPathIcon style={{ width: 16, height: 16 }} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            {[
              {
                label: "Total Employments",
                value: stats.total_employments ?? "—",
                icon: <ClockIcon style={{ width: 20, height: 20 }} />,
                color: "#0d6efd",
                bg: "#cfe2ff",
              },
              {
                label: "Verified",
                value: stats.verified_employments ?? "—",
                icon: <CheckCircleIcon style={{ width: 20, height: 20 }} />,
                color: "#198754",
                bg: "#d1e7dd",
              },
              {
                label: "Unverified",
                value: stats.unverified_employments ?? "—",
                icon: <XCircleIcon style={{ width: 20, height: 20 }} />,
                color: "#dc3545",
                bg: "#f8d7da",
              },
              {
                label: "Partners Uploading",
                value: stats.partners_with_employment ?? "—",
                icon: <MagnifyingGlassIcon style={{ width: 20, height: 20 }} />,
                color: "#6f42c1",
                bg: "#e2d9f3",
              },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  background: "#fff",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    background: card.bg,
                    color: card.color,
                    borderRadius: "8px",
                    padding: "8px",
                  }}
                >
                  {card.icon}
                </div>
                <div>
                  <div style={{ fontSize: "22px", fontWeight: 700 }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6c757d" }}>
                    {card.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
            alignItems: "center",
          }}
        >
          <label style={{ fontWeight: 600, fontSize: "14px" }}>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              border: "1px solid #dee2e6",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "14px",
            }}
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>

          <span
            style={{ color: "#6c757d", fontSize: "14px", marginLeft: "auto" }}
          >
            {pagination.total} upload{pagination.total !== 1 ? "s" : ""} found
          </span>
        </div>

        {/* Table */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div
              style={{ padding: "40px", textAlign: "center", color: "#6c757d" }}
            >
              Loading uploads…
            </div>
          ) : uploads.length === 0 ? (
            <div
              style={{ padding: "40px", textAlign: "center", color: "#6c757d" }}
            >
              No employment uploads found.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8f9fa" }}>
                <tr>
                  {[
                    "Partner",
                    "File Name",
                    "Status",
                    "Records",
                    "Processed",
                    "Failed",
                    "Uploaded By",
                    "Date",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 600,
                        fontSize: "13px",
                        color: "#495057",
                        borderBottom: "2px solid #dee2e6",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploads.map((u, idx) => (
                  <tr
                    key={u.id}
                    style={{
                      background: idx % 2 === 0 ? "#fff" : "#f8f9fa",
                      borderBottom: "1px solid #dee2e6",
                    }}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                      {u.partner_name || "—"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        maxWidth: "200px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={u.file_name}
                    >
                      {u.file_name || "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {getStatusBadge(u.status)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {u.total_records ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        color: "#198754",
                        fontWeight: 600,
                      }}
                    >
                      {u.processed_records ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        color:
                          (u.failed_records ?? 0) > 0 ? "#dc3545" : "#6c757d",
                        fontWeight: (u.failed_records ?? 0) > 0 ? 600 : 400,
                      }}
                    >
                      {u.failed_records ?? "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {u.uploaded_by_name || "—"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#6c757d",
                        fontSize: "13px",
                      }}
                    >
                      {formatDate(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "12px",
              marginTop: "16px",
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                background: "none",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                padding: "6px 10px",
                cursor: page === 1 ? "not-allowed" : "pointer",
                opacity: page === 1 ? 0.5 : 1,
              }}
            >
              <ChevronLeftIcon style={{ width: 16, height: 16 }} />
            </button>

            <span style={{ fontSize: "14px", color: "#6c757d" }}>
              Page {page} of {pagination.totalPages}
            </span>

            <button
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={page === pagination.totalPages}
              style={{
                background: "none",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                padding: "6px 10px",
                cursor:
                  page === pagination.totalPages ? "not-allowed" : "pointer",
                opacity: page === pagination.totalPages ? 0.5 : 1,
              }}
            >
              <ChevronRightIcon style={{ width: 16, height: 16 }} />
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default EmploymentManagementPage;
