import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import { toast } from "react-toastify";
import apiClient from "../../api/client";
import { ROUTES } from "../../constants/routes";
import {
  BuildingOffice2Icon,
  UserGroupIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  WrenchScrewdriverIcon,
  AcademicCapIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const UPLOAD_STATUS_CONFIG = {
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800",
    Icon: ClockIcon,
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-800",
    Icon: CheckCircleIcon,
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800",
    Icon: XCircleIcon,
  },
};

const StatCard = ({ title, value, icon: Icon, color, loading }) => (
  <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {title}
      </p>
      {loading ? (
        <div className="h-7 w-16 bg-muted rounded animate-pulse mt-1" />
      ) : (
        <p className="text-2xl font-bold text-foreground mt-0.5">{value ?? "—"}</p>
      )}
    </div>
  </div>
);

const QuickLinkCard = ({ title, description, path, icon: Icon, color }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      className="bg-card border border-border rounded-xl p-4 text-left hover:shadow-md hover:border-primary/30 transition-all group flex items-center gap-4"
    >
      <div className={`p-2.5 rounded-lg ${color} flex-shrink-0`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <ChevronRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
    </button>
  );
};

/**
 * MyDataPage
 * Consolidated overview for partners — stats, quick links, and recent uploads.
 */
const MyDataPage = () => {
  const [stats, setStats] = useState(null);
  const [recentUploads, setRecentUploads] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/dashboard/partner");
      if (res.data?.success) {
        setStats(res.data.data?.statistics || null);
        setRecentUploads(res.data.data?.recentUploads || []);
      }
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const statCards = [
    {
      title: "My Centers",
      value: stats?.totalCenters,
      icon: BuildingOffice2Icon,
      color: "bg-blue-500",
    },
    {
      title: "Total Students",
      value: stats?.totalStudents,
      icon: UserGroupIcon,
      color: "bg-emerald-500",
    },
    {
      title: "Total Batches",
      value: stats?.totalBatches,
      icon: DocumentTextIcon,
      color: "bg-violet-500",
    },
    {
      title: "Pending Uploads",
      value: stats?.pendingUploads,
      icon: ClockIcon,
      color: "bg-yellow-500",
    },
    {
      title: "Approved Uploads",
      value: stats?.approvedUploads,
      icon: CheckCircleIcon,
      color: "bg-green-500",
    },
    {
      title: "Eligible for Refurbishment",
      value: stats?.refurbishmentEligibleCenters,
      icon: WrenchScrewdriverIcon,
      color: "bg-orange-500",
    },
  ];

  const quickLinks = [
    {
      title: "My Centers",
      description: "View and manage your training centers",
      path: ROUTES.MY_CENTERS,
      icon: BuildingOffice2Icon,
      color: "bg-blue-500",
    },
    {
      title: "Upload Data",
      description: "Upload centers, batches and student CSV files",
      path: ROUTES.UPLOAD_DATA,
      icon: ArrowUpTrayIcon,
      color: "bg-indigo-500",
    },
    {
      title: "Upload History",
      description: "Review past uploads and their approval status",
      path: ROUTES.UPLOAD_HISTORY,
      icon: DocumentTextIcon,
      color: "bg-slate-500",
    },
    {
      title: "Employment Upload",
      description: "Submit employment outcome data for your students",
      path: ROUTES.EMPLOYMENT_UPLOAD,
      icon: AcademicCapIcon,
      color: "bg-teal-500",
    },
    {
      title: "My Requests",
      description: "Track refurbishment requests and their status",
      path: ROUTES.MY_REQUESTS,
      icon: WrenchScrewdriverIcon,
      color: "bg-orange-500",
    },
    {
      title: "Rejected Uploads",
      description: "Review and correct rejected upload submissions",
      path: ROUTES.PARTNER_REJECTED_UPLOADS,
      icon: XCircleIcon,
      color: "bg-red-500",
    },
  ];

  return (
    <MainLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Data</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Overview of your centers, students, and uploads.
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 hover:bg-muted rounded-md transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon
              className={`h-5 w-5 text-muted-foreground ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {statCards.map((card) => (
            <StatCard key={card.title} {...card} loading={loading} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h2 className="text-base font-semibold text-foreground mb-3">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickLinks.map((link) => (
                <QuickLinkCard key={link.path} {...link} />
              ))}
            </div>
          </div>

          {/* Recent Uploads */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-foreground">
                Recent Uploads
              </h2>
              <Link
                to={ROUTES.UPLOAD_HISTORY}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                View all <ArrowRightIcon className="h-3 w-3" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 bg-muted rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : recentUploads.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <DocumentTextIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No uploads yet.
                </p>
                <Link
                  to={ROUTES.UPLOAD_DATA}
                  className="text-xs text-primary hover:underline mt-1 inline-block"
                >
                  Upload your first file →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentUploads.map((upload) => {
                  const sc = UPLOAD_STATUS_CONFIG[upload.status] || {
                    label: upload.status,
                    className: "bg-gray-100 text-gray-700",
                  };
                  return (
                    <div
                      key={upload.id}
                      className="bg-card border border-border rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-xs font-medium text-foreground truncate"
                          title={upload.file_name}
                        >
                          {upload.file_name || "Upload"}
                        </p>
                        <span
                          className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sc.className}`}
                        >
                          {sc.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(upload.created_at)}
                        </p>
                        {upload.total_records != null && (
                          <p className="text-xs text-muted-foreground">
                            {upload.total_records} records
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MyDataPage;
