import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import StatCard from "../../../components/common/StatCard";
import AdvancedSearchBar from "../../../components/common/AdvancedSearchBar";
import { getOverviewStats } from "../../../services/data.service";
import {
  getConsolidatedAnalytics,
  getFilterOptions,
} from "../../../services/analytics.service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "../../../components/ui/chart";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { UserGroupIcon, UserIcon } from "@heroicons/react/24/outline";

/**
 * Overview Tab for Data Management
 * Displays key statistics with trend indicators and consolidated student analytics
 */
const OverviewTab = () => {
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    partners: [],
    centers: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    financialYear: "all",
    partnerId: "all",
    centerId: "all",
    gender: "all",
  });

  const isPartner = user?.role === "PARTNER";
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  // Debug logging (disabled in production)
  // console.log("OverviewTab - User info:", { role: user?.role, isAdmin, isPartner });

  // Chart colors
  const COLORS = ["#3DCD58", "#FF6B6B", "#4ECDC4", "#FFD93D"];

  // Dummy trend data for presentation (static)
  const dummyGraphData = [
    { value: 40 },
    { value: 45 },
    { value: 42 },
    { value: 48 },
    { value: 50 },
    { value: 52 },
  ];

  useEffect(() => {
    // Initial data load
    const initialize = async () => {
      await fetchStats();
      if (isAdmin) {
        await fetchFilterOptions();
        // Fetch analytics immediately after filter options
        await fetchAnalytics();
      }
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Fetch analytics when filters change (only for admin)
    if (isAdmin) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.financialYear,
    filters.partnerId,
    filters.centerId,
    filters.gender,
  ]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getOverviewStats();
      setStats(response.data);
    } catch (err) {
      console.error("Error fetching overview stats:", err);
      setError(err.response?.data?.message || "Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await getFilterOptions();
      const optionsData = response.data || { partners: [], centers: [] };

      // Ensure we have arrays
      setFilterOptions({
        partners: Array.isArray(optionsData.partners)
          ? optionsData.partners
          : [],
        centers: Array.isArray(optionsData.centers) ? optionsData.centers : [],
      });
    } catch (err) {
      console.error("Error fetching filter options:", err.message);
      setAnalyticsError("Failed to load filter options");
      setFilterOptions({ partners: [], centers: [] });
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);

      const response = await getConsolidatedAnalytics(filters);

      // Backend returns {success, message, data} wrapped by successResponse
      // apiClient returns response.data, so we get {success, message, data}
      // We need to access the nested 'data' property
      if (response && response.data) {
        console.log("📊 Analytics received:", response.data);
        setAnalytics(response.data);
      } else if (response) {
        // Fallback if response is already the data object
        console.log("📊 Analytics received (direct):", response);
        setAnalytics(response);
      } else {
        console.error("❌ Invalid analytics response:", response);
        setAnalyticsError("Invalid data format received from server");
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setAnalyticsError(
        err.response?.data?.message ||
          "Failed to load analytics data. Please try again."
      );
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      financialYear: "all",
      partnerId: "all",
      centerId: "all",
      gender: "all",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">No statistics available</div>
      </div>
    );
  }

  // Admin/ESSCI/SEIF_READONLY view
  if (!isPartner) {
    return (
      <div className="space-y-6">
        {/* Consolidated Student Analytics Section (Admin Only) */}
        {isAdmin && (
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Consolidated Analytics
              </h2>
              <p className="text-sm text-gray-600">
                Financial year-wise filtering with partner and center breakdowns
              </p>
            </div>
            {/* Filters Only (No Search Bar) */}
            <div className="mb-6">
              <AdvancedSearchBar
                value={null}
                onChange={null}
                placeholder=""
                filterGroups={[
                  {
                    label: "Financial Year",
                    key: "financialYear",
                    options: [
                      { value: "all", label: "All Years" },
                      ...(Array.isArray(analytics?.availableYears)
                        ? analytics.availableYears.map((year) => ({
                            value: year,
                            label: year,
                          }))
                        : []),
                    ],
                    multi: false,
                  },
                  {
                    label: "Partner",
                    key: "partnerId",
                    options: [
                      { value: "all", label: "All Partners" },
                      ...(Array.isArray(filterOptions.partners)
                        ? filterOptions.partners.map((partner) => ({
                            value: partner.id,
                            label: partner.name,
                          }))
                        : []),
                    ],
                    multi: false,
                  },
                  {
                    label: "Center",
                    key: "centerId",
                    options: [
                      { value: "all", label: "All Centers" },
                      ...(Array.isArray(filterOptions.centers)
                        ? filterOptions.centers.map((center) => ({
                            value: center.id,
                            label: `${center.center_name} (${center.partner_name})`,
                          }))
                        : []),
                    ],
                    multi: false,
                  },
                  {
                    label: "Gender",
                    key: "gender",
                    options: [
                      { value: "all", label: "All Genders" },
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                    ],
                    multi: false,
                  },
                ]}
                activeFilters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
              />
            </div>
            {/* Loading State */}
            {analyticsLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading analytics data...</p>
                </div>
              </div>
            )}
            {/* Error State */}
            {analyticsError && !analyticsLoading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-600 mb-2">⚠️ {analyticsError}</p>
                <Button
                  onClick={fetchAnalytics}
                  variant="outline"
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            )}
            {/* Summary Cards */}
            {analytics && !analyticsLoading && !analyticsError && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <StatCard
                    title="Total Students"
                    value={analytics.summary?.total_students || 0}
                    trend="up"
                    graphData={
                      Array.isArray(analytics.yearlyTrend) &&
                      analytics.yearlyTrend.length > 0
                        ? analytics.yearlyTrend.map((year) => ({
                            value:
                              parseInt(year.male_students || 0) +
                              parseInt(year.female_students || 0),
                          }))
                        : dummyGraphData
                    }
                  />
                  <StatCard
                    title="Male Students"
                    value={analytics.summary?.male_students || 0}
                    trend="up"
                    graphData={
                      Array.isArray(analytics.yearlyTrend) &&
                      analytics.yearlyTrend.length > 0
                        ? analytics.yearlyTrend.map((year) => ({
                            value: parseInt(year.male_students || 0),
                          }))
                        : dummyGraphData
                    }
                  />
                  <StatCard
                    title="Female Students"
                    value={analytics.summary?.female_students || 0}
                    trend="up"
                    graphData={
                      Array.isArray(analytics.yearlyTrend) &&
                      analytics.yearlyTrend.length > 0
                        ? analytics.yearlyTrend.map((year) => ({
                            value: parseInt(year.female_students || 0),
                          }))
                        : dummyGraphData
                    }
                  />
                  <StatCard
                    title="Total Partners"
                    value={analytics.summary?.total_partners || 0}
                    trend="up"
                    graphData={
                      Array.isArray(analytics.partnerBreakdown) &&
                      analytics.partnerBreakdown.length > 0
                        ? analytics.partnerBreakdown.map((partner) => ({
                            value: parseInt(partner.total_students || 0),
                          }))
                        : dummyGraphData
                    }
                  />
                  <StatCard
                    title="Total Centers"
                    value={analytics.summary?.total_centers || 0}
                    trend="up"
                    graphData={
                      Array.isArray(analytics.centerBreakdown) &&
                      analytics.centerBreakdown.length > 0
                        ? analytics.centerBreakdown
                            .slice(0, 6)
                            .map((center) => ({
                              value: parseInt(center.total_students || 0),
                            }))
                        : dummyGraphData
                    }
                  />
                  <StatCard
                    title="Total Employments"
                    value={analytics.summary?.total_employments || 0}
                    trend="up"
                    graphData={
                      Array.isArray(analytics.yearlyTrend) &&
                      analytics.yearlyTrend.length > 0
                        ? analytics.yearlyTrend.map((year) => ({
                            value: parseInt(year.total_employments || 0),
                          }))
                        : dummyGraphData
                    }
                  />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Gender Distribution Donut Chart */}
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Gender Distribution
                    </h3>
                    {Array.isArray(analytics.genderDistribution) &&
                    analytics.genderDistribution.length > 0 ? (
                      <div className="flex items-center gap-8">
                        {/* Donut Chart */}
                        <div className="flex-1">
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={analytics.genderDistribution}
                                dataKey="count"
                                nameKey="gender"
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={2}
                                label={({ percent }) =>
                                  `${(percent * 100).toFixed(0)}%`
                                }
                                labelLine={false}
                              >
                                {analytics.genderDistribution.map(
                                  (entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={
                                        entry.gender === "Female"
                                          ? "#017FC5"
                                          : "#FF7400"
                                      }
                                    />
                                  )
                                )}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Stats Panel */}
                        <div className="flex-shrink-0 w-64 space-y-4">
                          <div className="bg-white rounded-xl p-4 border border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <UserIcon className="w-6 h-6 text-blue-500" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 font-medium">
                                  Female students
                                </p>
                                <p className="text-2xl font-bold text-gray-900">
                                  {analytics.genderDistribution.find(
                                    (g) => g.gender === "Female"
                                  )?.count || 0}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-4 border border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                                <UserIcon className="w-6 h-6 text-red-500" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 font-medium">
                                  Male students
                                </p>
                                <p className="text-2xl font-bold text-gray-900">
                                  {analytics.genderDistribution.find(
                                    (g) => g.gender === "Male"
                                  )?.count || 0}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-4 border border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <UserGroupIcon className="w-6 h-6 text-gray-700" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 font-medium">
                                  Total Students
                                </p>
                                <p className="text-2xl font-bold text-gray-900">
                                  {analytics.summary?.total_students || 0}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-gray-400">
                        No gender data available
                      </div>
                    )}
                  </div>

                  {/* Yearly Trend Bar Chart */}
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Year-wise Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(analytics.yearlyTrend) &&
                      analytics.yearlyTrend.length > 0 ? (
                        <ChartContainer
                          config={{
                            male_students: {
                              label: "Male",
                              color: "#FF7400",
                            },
                            female_students: {
                              label: "Female",
                              color: "#017FC5",
                            },
                          }}
                          className="h-[300px] w-full"
                        >
                          <BarChart
                            data={analytics.yearlyTrend}
                            accessibilityLayer
                          >
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="financial_year"
                              tickLine={false}
                              tickMargin={10}
                              axisLine={false}
                            />
                            <ChartTooltip
                              content={<ChartTooltipContent hideLabel />}
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Bar
                              dataKey="female_students"
                              stackId="a"
                              fill="var(--color-female_students)"
                              radius={[0, 0, 4, 4]}
                            />
                            <Bar
                              dataKey="male_students"
                              stackId="a"
                              fill="var(--color-male_students)"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ChartContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-400">
                          No yearly trend data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Partner-wise Breakdown Table */}
                <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Partner-wise Breakdown
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Partner Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Students
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Male
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Female
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Centers
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Array.isArray(analytics.partnerBreakdown) &&
                        analytics.partnerBreakdown.length > 0 ? (
                          analytics.partnerBreakdown.map((partner) => (
                            <tr
                              key={partner.partner_id}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {partner.partner_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {partner.total_students}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {partner.male_students}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {partner.female_students}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {partner.centers_count}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="5"
                              className="px-6 py-8 text-center text-gray-400"
                            >
                              No partner data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Center-wise Breakdown Table */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Center-wise Breakdown
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Center Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Partner
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Students
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Male
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Female
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Array.isArray(analytics.centerBreakdown) &&
                        analytics.centerBreakdown.length > 0 ? (
                          analytics.centerBreakdown.map((center) => (
                            <tr
                              key={center.center_id}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {center.center_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {center.partner_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {center.city}, {center.state}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {center.total_students}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {center.male_students}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {center.female_students}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="6"
                              className="px-6 py-8 text-center text-gray-400"
                            >
                              No center data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
            {/* Empty State */}
            {!analytics && !analyticsLoading && !analyticsError && (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <div className="text-gray-400 text-5xl mb-4">📊</div>
                <p className="text-gray-600 text-lg font-medium mb-2">
                  No student data available yet
                </p>
                <p className="text-gray-500 text-sm">
                  Student analytics will appear here once partners upload data
                  and admins approve it
                </p>
              </div>
            )}
          </div>
        )}

        {/* Divider for visual separation */}
        {isAdmin && <div className="border-t border-gray-200 my-6"></div>}

        {/* System-wide Statistics Cards */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Partner Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Partners"
              value={stats.total_partners || 0}
              trend="up"
              graphData={dummyGraphData}
            />
            <StatCard
              title="Pending Partner Approvals"
              value={stats.pending_partner_approvals || 0}
              trend={stats.pending_partner_approvals > 0 ? "down" : "up"}
              graphData={dummyGraphData}
            />
          </div>
        </div>

        {/* Center Statistics */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Center Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Centers"
              value={stats.total_centers || 0}
              trend="up"
              graphData={dummyGraphData}
            />
            <StatCard
              title="Pending Center Approvals"
              value={stats.pending_center_approvals || 0}
              trend={stats.pending_center_approvals > 0 ? "down" : "up"}
              graphData={dummyGraphData}
            />
          </div>
        </div>

        {/* Batch & Student Statistics */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Batch & Student Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Batches"
              value={stats.total_batches || 0}
              trend="up"
              graphData={dummyGraphData}
            />
            <StatCard
              title="Total Students"
              value={stats.total_students || 0}
              trend="up"
              graphData={dummyGraphData}
            />
            <StatCard
              title="Total Female Students"
              value={stats.total_female_students || 0}
              trend="up"
              graphData={dummyGraphData}
            />
            <StatCard
              title="Total Male Students"
              value={stats.total_male_students || 0}
              trend="up"
              graphData={dummyGraphData}
            />
          </div>
        </div>

        {/* Upload & Other Statistics */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Upload & Other Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Pending Uploads"
              value={stats.pending_uploads || 0}
              trend={stats.pending_uploads > 0 ? "down" : "up"}
              graphData={dummyGraphData}
            />
            <StatCard
              title="Upload Success Rate"
              value={`${stats.upload_success_rate || 0}%`}
              trend="up"
              graphData={dummyGraphData}
            />
            <StatCard
              title="Youth Entrepreneurs"
              value={stats.youth_entrepreneurs || 0}
              trend="up"
              graphData={dummyGraphData}
            />
            <StatCard
              title="Trainers Trained"
              value={stats.trainers_trained || 0}
              trend="up"
              graphData={dummyGraphData}
            />
          </div>
        </div>
      </div>
    );
  }

  // Partner view - 7 cards
  return (
    <div className="space-y-6">
      {/* Center Statistics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          My Center Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="My Centers"
            value={stats.total_centers || 0}
            trend="up"
            graphData={dummyGraphData}
          />
          <StatCard
            title="Pending Center Approvals"
            value={stats.pending_center_approvals || 0}
            trend={stats.pending_center_approvals > 0 ? "down" : "up"}
            graphData={dummyGraphData}
          />
        </div>
      </div>

      {/* Batch & Student Statistics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          My Batch & Student Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="My Batches"
            value={stats.total_batches || 0}
            trend="up"
            graphData={dummyGraphData}
          />
          <StatCard
            title="My Students"
            value={stats.total_students || 0}
            trend="up"
            graphData={dummyGraphData}
          />
          <StatCard
            title="Female Students"
            value={stats.total_female_students || 0}
            trend="up"
            graphData={dummyGraphData}
          />
          <StatCard
            title="Male Students"
            value={stats.total_male_students || 0}
            trend="up"
            graphData={dummyGraphData}
          />
        </div>
      </div>

      {/* Upload Statistics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Upload Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Pending Uploads"
            value={stats.pending_uploads || 0}
            trend={stats.pending_uploads > 0 ? "down" : "up"}
            graphData={dummyGraphData}
          />
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
