import React, { useState, useEffect, useCallback } from "react";
import { MainLayout } from "../../components/layout";
import { toast } from "react-toastify";
import refurbishmentService from "../../services/refurbishment.service";
import {
  WrenchScrewdriverIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

/**
 * Status configuration for refurbishment request badges
 */
const STATUS_CONFIG = {
  submitted: {
    label: "Submitted",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  under_review: {
    label: "Under Review",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  approved: {
    label: "Approved",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  in_progress: {
    label: "In Progress",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  completed: {
    label: "Completed",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  },
};

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || {
    label: status,
    className: "bg-gray-100 text-gray-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const RequestCard = ({ request }) => (
  <div className="bg-card border border-border rounded-lg p-5 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <p className="text-xs font-mono text-muted-foreground truncate">
          {request.requestId}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <BuildingOffice2Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <h3 className="text-sm font-semibold text-foreground truncate">
            {request.center_name}
          </h3>
        </div>
        {request.center_address && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {request.center_address}
          </p>
        )}
      </div>
      <StatusBadge status={request.status} />
    </div>

    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
      <div className="flex items-center gap-1.5">
        <CalendarDaysIcon className="h-3.5 w-3.5" />
        <span>Submitted: {formatDate(request.created_at)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <ClockIcon className="h-3.5 w-3.5" />
        <span>Updated: {formatDate(request.updated_at)}</span>
      </div>
      {request.type && (
        <div className="col-span-2">
          <span className="font-medium text-foreground">Type:</span>{" "}
          <span className="capitalize">{request.type?.replace(/_/g, " ")}</span>
        </div>
      )}
    </div>

    {request.admin_remarks && (
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs font-medium text-foreground mb-1">
          Admin Remarks:
        </p>
        <p className="text-xs text-muted-foreground">{request.admin_remarks}</p>
      </div>
    )}
    {request.rejection_reason && (
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs font-medium text-red-600 mb-1">
          Rejection Reason:
        </p>
        <p className="text-xs text-red-500">{request.rejection_reason}</p>
      </div>
    )}
  </div>
);

const EmptyState = ({ message }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
    <WrenchScrewdriverIcon className="h-12 w-12 text-muted-foreground/40 mb-3" />
    <p className="text-muted-foreground">{message}</p>
  </div>
);

const TABS = [
  { id: "active", label: "Active Requests", icon: ClockIcon },
  { id: "past", label: "Past Requests", icon: CheckCircleIcon },
];

const LIMIT = 12;

/**
 * MyRequestsPage
 * Shows partner's refurbishment requests — active (submitted / under_review / in_progress)
 * and past (approved / rejected / completed).
 */
const MyRequestsPage = () => {
  const [activeTab, setActiveTab] = useState("active");
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchRequests = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const offset = (page - 1) * LIMIT;
        const fetchFn =
          activeTab === "active"
            ? refurbishmentService.getPartnerRequests
            : refurbishmentService.getPartnerPastRequests;

        const params = { limit: LIMIT, offset };
        if (activeTab === "active" && statusFilter)
          params.status = statusFilter;

        const res = await fetchFn(params);

        if (res?.success && res.data) {
          setRequests(res.data.requests || []);
          setPagination({
            page: res.data.page || page,
            total: res.data.total || 0,
            totalPages: res.data.totalPages || 1,
          });
        } else {
          setRequests([]);
          setPagination({ page: 1, total: 0, totalPages: 1 });
        }
      } catch {
        toast.error("Failed to load requests");
        setRequests([]);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, statusFilter]
  );

  useEffect(() => {
    fetchRequests(1);
    setPagination((p) => ({ ...p, page: 1 }));
  }, [activeTab, statusFilter, fetchRequests]);

  const handlePageChange = (newPage) => {
    setPagination((p) => ({ ...p, page: newPage }));
    fetchRequests(newPage);
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <WrenchScrewdriverIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">My Requests</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-9">
            Track your refurbishment requests and their current status.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit mb-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setStatusFilter("");
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : `${pagination.total} request(s) found`}
          </p>
          <div className="flex items-center gap-3">
            {activeTab === "active" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground"
              >
                <option value="">All statuses</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="in_progress">In Progress</option>
              </select>
            )}
            <button
              onClick={() => fetchRequests(pagination.page)}
              disabled={loading}
              className="p-1.5 hover:bg-muted rounded-md transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon
                className={`h-4 w-4 text-muted-foreground ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Request Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 min-h-[200px]">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-lg p-5 animate-pulse"
              >
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2 mb-4" />
                <div className="h-3 bg-muted rounded w-full" />
              </div>
            ))
          ) : requests.length === 0 ? (
            <EmptyState
              message={
                activeTab === "active"
                  ? "No active requests found."
                  : "No past requests found."
              }
            />
          ) : (
            requests.map((req) => (
              <RequestCard key={req.request_id} request={req} />
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-40 transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium px-2">
                {pagination.page}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-40 transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MyRequestsPage;
