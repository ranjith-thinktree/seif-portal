import React from "react";
import { useAuth } from "../../hooks";
import { useNotifications } from "../../hooks/useNotifications";
import { ROLES, ROLE_LABELS } from "../../constants";
import { MainLayout } from "../../components/layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/common";
import {
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import IndiaTrainingCard from "../../components/dashboard/IndiaTrainingCard";
import { useNavigate } from "react-router-dom";

/**
 * Helper function to calculate trend automatically from data
 * FUTURE USE: Uncomment this when you want automatic trend calculation
 */
// const calculateTrend = (data) => {
//   if (!data || data.length < 2) return "up";
//   const firstValue = data[0].value;
//   const lastValue = data[data.length - 1].value;
//   return lastValue >= firstValue ? "up" : "down";
// };

/**
 * Enhanced Stat Card Component
 * @param {string} title - Card title (e.g., "Training Partners")
 * @param {string|number} value - Main metric value (e.g., "51")
 * @param {string} trend - "up" or "down" (manual control for now)
 * @param {array} graphData - Array of data points for chart: [{ value: 42 }, { value: 44 }, ...]
 */
const StatCard = ({ title, value, trend = "up", graphData = [] }) => {
  // ✅ Clean the title to create a valid SVG ID (no spaces)
  const cleanId = title.replace(/\s+/g, "-").toLowerCase();

  const isUpTrend = trend === "up";
  const TrendIcon = isUpTrend ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

  return (
    <div className="relative bg-white rounded-[16px] border border-[#A5A5A5] p-3 transition-shadow duration-300 min-h-[150px] flex flex-col">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-base md:text-sm text-[#1F2937] leading-relaxed">
          {title}
        </h3>
      </div>

      {/* Metric Section */}
      <div className="flex items-start gap-3 mb-2">
        <span className="text-xl md:text-xl font-bold text-[#111827] leading-none">
          {value}
        </span>

        <div
          className={`flex items-center justify-center h-6 w-6 rounded-full mt-1 ${
            isUpTrend ? "bg-[#D1FAE5]" : "bg-red-100"
          }`}
        >
          <TrendIcon
            className={`h-4 w-4 ${
              isUpTrend ? "text-[#10B981]" : "text-red-500"
            }`}
          />
        </div>
      </div>

      {/* Graph Section */}
      <div
        className="mt-auto h-[40px] md:h-[40px] w-full"
        style={{ minHeight: "40px" }}
      >
        {graphData && graphData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={40}>
            <AreaChart data={graphData}>
              <defs>
                {/* Green gradient for uptrend */}
                <linearGradient
                  id={`gradient-green-${cleanId}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#3DCD58" stopOpacity={0.4} />
                  <stop offset="60%" stopColor="#3DCD58" stopOpacity={0.25} />
                  <stop offset="85%" stopColor="#3DCD58" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
                </linearGradient>

                {/* Red gradient for downtrend */}
                <linearGradient
                  id={`gradient-red-${cleanId}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                  <stop offset="60%" stopColor="#EF4444" stopOpacity={0.25} />
                  <stop offset="85%" stopColor="#EF4444" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
                </linearGradient>
              </defs>

              <Area
                type="natural"
                dataKey="value"
                stroke={isUpTrend ? "#3DCD58" : "#EF4444"}
                strokeWidth={1}
                strokeDasharray="10"
                fill={
                  isUpTrend
                    ? `url(#gradient-green-${cleanId})`
                    : `url(#gradient-red-${cleanId})`
                }
                dot={false}
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-400">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Super Admin & Admin Dashboard
 */
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { notifications } = useNotifications();

  // Sample graph data for demonstration
  const sampleGraphData = [
    { value: 42 },
    { value: 44 },
    { value: 43 },
    { value: 46 },
    { value: 48 },
    { value: 49 },
    { value: 51 },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="">
        <div className="">
          <p className="text-muted-foreground mb-4">
            An overview of your program's performance.
          </p>
          <div className=""></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard
            title="Training Partners"
            value="51"
            trend="up"
            graphData={sampleGraphData}
            fill=""
          />
          <StatCard
            title="Training Centers"
            value="86"
            trend="up"
            graphData={[
              { value: 78 },
              { value: 79 },
              { value: 81 },
              { value: 82 },
              { value: 84 },
              { value: 85 },
              { value: 86 },
            ]}
          />
          <StatCard
            title="Youth Trained"
            value="1,248"
            trend="up"
            graphData={[
              { value: 800 },
              { value: 950 },
              { value: 1160 },
              { value: 1280 },
              { value: 1100 },
              { value: 920 },
              { value: 1248 },
            ]}
          />
          <StatCard
            title="Female Trainees"
            value="342"
            trend="up"
            graphData={[
              { value: 300 },
              { value: 310 },
              { value: 315 },
              { value: 320 },
              { value: 328 },
              { value: 335 },
              { value: 342 },
            ]}
          />
          <StatCard
            title="Youth Entrepreneurs"
            value="23"
            trend="down"
            graphData={[
              { value: 30 },
              { value: 28 },
              { value: 27 },
              { value: 26 },
              { value: 25 },
              { value: 24 },
              { value: 23 },
            ]}
          />
          <StatCard
            title="Trainers Trained"
            value="128"
            trend="up"
            graphData={[
              { value: 110 },
              { value: 115 },
              { value: 118 },
              { value: 120 },
              { value: 123 },
              { value: 126 },
              { value: 128 },
            ]}
          />
        </div>
      </div>

      {/* Two Column Layout - India Training Overview & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* India Training Overview */}
        <IndiaTrainingCard />

        {/* Notifications */}
        <Card className="relative bg-white rounded-xl shadow-sm border-[#A5A5A5] border">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div
              className="overflow-y-auto"
              style={{ maxHeight: "450px", minHeight: "450px" }}
            >
              {notifications && notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-4 px-6 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate("/inbox")}
                  >
                    {/* Avatar with New Badge */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        {/* Placeholder avatar */}
                      </div>
                      {!notification.is_read && (
                        <span className="absolute -top-1 -left-1 bg-[#FF4B4A] text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                          New
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#111827] text-base mb-1">
                        {notification.total_centers !== undefined
                          ? `New Data uploaded: ${
                              notification.total_centers
                            } center${
                              notification.total_centers !== 1 ? "s" : ""
                            }`
                          : notification.title}
                      </h3>
                      <p className="text-sm text-[#6B7280] leading-relaxed">
                        {notification.message}
                      </p>
                    </div>

                    {/* View Button */}
                    <button className="flex-shrink-0 px-6 py-2 border border-gray-300 rounded-3xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      View
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>No notifications</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/**
 * Partner Dashboard
 */
const PartnerDashboard = ({ userName }) => {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {userName}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your centers, data uploads, and requests.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="My Centers"
          value="12"
          trend="up"
          graphData={[
            { value: 10 },
            { value: 10 },
            { value: 11 },
            { value: 11 },
            { value: 11 },
            { value: 12 },
            { value: 12 },
          ]}
        />
        <StatCard
          title="Total Students"
          value="1,456"
          trend="up"
          graphData={[
            { value: 1300 },
            { value: 1350 },
            { value: 1380 },
            { value: 1400 },
            { value: 1420 },
            { value: 1440 },
            { value: 1456 },
          ]}
        />
        <StatCard
          title="Pending Uploads"
          value="3"
          trend="down"
          graphData={[
            { value: 8 },
            { value: 7 },
            { value: 6 },
            { value: 5 },
            { value: 4 },
            { value: 3 },
            { value: 3 },
          ]}
        />
        <StatCard
          title="Active Requests"
          value="5"
          trend="up"
          graphData={[
            { value: 2 },
            { value: 3 },
            { value: 3 },
            { value: 4 },
            { value: 4 },
            { value: 5 },
            { value: 5 },
          ]}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get you started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border border-border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
              <DocumentTextIcon className="h-8 w-8 text-primary-500 mb-2" />
              <p className="font-medium">Upload Student Data</p>
              <p className="text-sm text-muted-foreground">
                Upload CSV files with student information
              </p>
            </button>
            <button className="p-4 border border-border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
              <ClipboardDocumentListIcon className="h-8 w-8 text-primary-500 mb-2" />
              <p className="font-medium">Create Request</p>
              <p className="text-sm text-muted-foreground">
                Submit refurbishment or support request
              </p>
            </button>
            <button className="p-4 border border-border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
              <ChartBarIcon className="h-8 w-8 text-primary-500 mb-2" />
              <p className="font-medium">View Reports</p>
              <p className="text-sm text-muted-foreground">
                Check your center performance reports
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications/Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts & Notifications</CardTitle>
          <CardDescription>Important updates for you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-lg">
              <p className="font-medium text-secondary-800">
                Data Upload Reminder
              </p>
              <p className="text-sm text-secondary-600 mt-1">
                Your quarterly student data upload is due in 5 days.
              </p>
            </div>
            <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <p className="font-medium text-primary-800">
                Refurbishment Approved
              </p>
              <p className="text-sm text-primary-600 mt-1">
                Your refurbishment request for Center ABC has been approved.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * SEIF Read-Only Dashboard
 */
const SeifReadOnlyDashboard = ({ userName }) => {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {userName}!
        </h1>
        <p className="text-muted-foreground mt-2">
          View analytics and reports across all partners and centers.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Partners"
          value="86"
          trend="up"
          graphData={[
            { value: 78 },
            { value: 80 },
            { value: 81 },
            { value: 83 },
            { value: 84 },
            { value: 85 },
            { value: 86 },
          ]}
        />
        <StatCard
          title="Total Centers"
          value="342"
          trend="up"
          graphData={[
            { value: 310 },
            { value: 318 },
            { value: 324 },
            { value: 330 },
            { value: 334 },
            { value: 338 },
            { value: 342 },
          ]}
        />
        <StatCard
          title="Total Students"
          value="28,456"
          trend="up"
          graphData={[
            { value: 25000 },
            { value: 26000 },
            { value: 26500 },
            { value: 27000 },
            { value: 27500 },
            { value: 28000 },
            { value: 28456 },
          ]}
        />
        <StatCard
          title="Reports Generated"
          value="156"
          trend="up"
          graphData={[
            { value: 130 },
            { value: 138 },
            { value: 142 },
            { value: 146 },
            { value: 150 },
            { value: 153 },
            { value: 156 },
          ]}
        />
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>Centers by state</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
              <p className="text-muted-foreground">
                Map visualization will appear here
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student Enrollment Trends</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
              <p className="text-muted-foreground">
                Chart visualization will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/**
 * ESSCI Dashboard
 */
const EssciDashboard = ({ userName }) => {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {userName}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Download and export data for analysis.
        </p>
      </div>

      {/* Quick Downloads */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Downloads</CardTitle>
          <CardDescription>Export data in various formats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="p-4 border border-border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
              <DocumentTextIcon className="h-8 w-8 text-primary-500 mb-2" />
              <p className="font-medium">All Partners Data</p>
              <p className="text-sm text-muted-foreground">
                Export complete partner database
              </p>
            </button>
            <button className="p-4 border border-border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
              <DocumentTextIcon className="h-8 w-8 text-primary-500 mb-2" />
              <p className="font-medium">Student Records</p>
              <p className="text-sm text-muted-foreground">
                Export all student data
              </p>
            </button>
            <button className="p-4 border border-border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
              <ChartBarIcon className="h-8 w-8 text-primary-500 mb-2" />
              <p className="font-medium">Analytics Report</p>
              <p className="text-sm text-muted-foreground">
                Generate comprehensive analytics
              </p>
            </button>
            <button className="p-4 border border-border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
              <ClipboardDocumentListIcon className="h-8 w-8 text-primary-500 mb-2" />
              <p className="font-medium">Request History</p>
              <p className="text-sm text-muted-foreground">
                Export all request records
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Downloads */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Downloads</CardTitle>
          <CardDescription>Your download history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div>
                  <p className="font-medium">Partner Data Export</p>
                  <p className="text-sm text-muted-foreground">
                    Downloaded 2 days ago - 2.4 MB
                  </p>
                </div>
                <button className="text-primary-500 hover:text-primary-600 font-medium text-sm">
                  Download Again
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Main Dashboard Page
 */
const DashboardPage = () => {
  const { role, userName } = useAuth();

  /**
   * Render dashboard based on role
   */
  const renderDashboard = () => {
    switch (role) {
      case ROLES.SUPER_ADMIN:
      case ROLES.ADMIN:
        return <AdminDashboard />;
      case ROLES.PARTNER:
        return <PartnerDashboard userName={userName} />;
      case ROLES.SEIF_READONLY:
        return <SeifReadOnlyDashboard userName={userName} />;
      case ROLES.ESSCI:
        return <EssciDashboard userName={userName} />;
      default:
        return (
          <Card>
            <CardContent className="p-6">
              <p>Dashboard not configured for role: {ROLE_LABELS[role]}</p>
            </CardContent>
          </Card>
        );
    }
  };

  return <MainLayout>{renderDashboard()}</MainLayout>;
};

export default DashboardPage;
