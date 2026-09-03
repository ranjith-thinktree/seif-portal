import React, { useState, useEffect, useMemo } from "react";
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
import dashboardData from "../../../data/dashboardData.json";
import StudentBreakdownTooltip from "../../../components/data/StudentBreakdownTooltip";
import {
  buildDisplayMetrics,
  customStatsForDisplay,
  liveDbFromAnalytics,
  unwrapAnalyticsPayload,
} from "../../../utils/dashboardMetrics";

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
    searchQuery: "",
  });

  const isPartner = user?.role === "PARTNER";
  const isAdmin =
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN" ||
    user?.role === "ESSCI" ||
    user?.role === "SEIF_READONLY" ||
    user?.role === "SEIF_READONLY_DOWNLOAD";

  // Generate autocomplete suggestions
  const searchSuggestions = useMemo(() => {
    const suggestions = [];

    // Add partner suggestions
    filterOptions.partners.forEach((partner) => {
      if (partner.id !== "all") {
        suggestions.push({
          value: partner.name,
          label: partner.name,
          type: "partner",
        });
      }
    });

    // Add center suggestions
    filterOptions.centers.forEach((center) => {
      if (center.id !== "all") {
        suggestions.push({
          value: center.center_name,
          label: `${center.center_name} (${center.partner_name})`,
          type: "center",
        });
      }
    });

    // Add location suggestions (states and cities)
    const locations = new Set();
    filterOptions.centers.forEach((center) => {
      if (center.state) locations.add(center.state);
      if (center.city) locations.add(center.city);
    });
    locations.forEach((location) => {
      suggestions.push({
        value: location,
        label: location,
        type: "location",
      });
    });

    return suggestions;
  }, [filterOptions.partners, filterOptions.centers]);

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
    // Initial data load - WAIT FOR AUTH TO BE READY
    const initialize = async () => {
      console.log(
        "🔄 Initializing OverviewTab - waiting for authentication...",
      );

      // Simple check for auth token (no race condition with timeout)
      let attempts = 0;
      let token = null;
      const maxAttempts = 100; // 10 seconds (100ms * 100)

      while (attempts < maxAttempts) {
        token = localStorage.getItem("seif_access_token");
        if (token) {
          console.log(
            `🔐 ✅ Auth token detected after ${attempts * 100}ms, proceeding with data fetch...`,
          );
          break;
        }

        attempts++;
        if (attempts % 10 === 0) {
          // Log every second
          console.log(
            `🔄 Still waiting for auth token... (${attempts * 100}ms elapsed)`,
          );
        }

        // Wait 100ms before next check
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (!token) {
        // Auth timeout after 10 seconds
        console.error(
          "❌ Auth timeout after 10 seconds! Token not found in localStorage.",
        );
        console.error("   This usually means login did not complete properly.");
        setAnalyticsError(
          "Authentication not ready. Please try refreshing the page or logging in again.",
        );
        console.error("⚠️ Skipping data fetch due to authentication timeout");
        return; // Don't proceed without auth
      }

      console.log("✅ Authentication confirmed, fetching data...");
      await fetchStats();
      if (isAdmin) {
        console.log("👤 Admin user detected, fetching filter options...");
        await fetchFilterOptions();
        // Analytics are fetched by the filter-change useEffect on mount
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

  // Log matching results only once (in development) - prevents multiple console logs
  useEffect(() => {
    if (import.meta.env.MODE !== "development") return;

    // Wait for results to be available
    const results = window.__matchingResults;
    if (!results || results.totalCenters === 0) return;

    // Log DEBUG info first
    console.log("\n🗂️ DEBUG: Database has", results.dbCentersCount, "centers");

    // Log unmatched centers
    if (results.unmatchedCenters.length > 0) {
      console.group("🔍 Unmatched Centers from Historical Data");
      console.log(
        `Total unmatched: ${results.unmatchedCenters.length} centers`,
      );
      console.log(
        `Total students in unmatched: ${results.unmatchedCenters.reduce((sum, c) => sum + c.totalStudents, 0)}`,
      );
      console.table(
        results.unmatchedCenters.slice(0, 10).map((c) => ({
          "Center Name": c.centerName,
          City: c.extractedCity,
          Location: c.fullLocation,
          Students: c.totalStudents,
        })),
      );
      console.groupEnd();
    }

    // Log matched partners
    if (Object.keys(results.historicalPartnerMap).length > 0) {
      console.group("✅ Matched Historical Data");
      console.log(`Total matched: ${results.matchedCount} centers`);
      console.table(
        Object.values(results.historicalPartnerMap).map((p) => ({
          Partner: p.partner_name,
          Students: p.total_students,
        })),
      );
      console.groupEnd();
    }
  }, [analytics, filterOptions.centers.length, filters.financialYear]); // Only re-run when these change

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
      console.log("🔍 Fetching filter options from API...");
      const response = await getFilterOptions();
      console.log("✅ Filter options API response:", response);

      const optionsData = response.data || { partners: [], centers: [] };

      // Ensure we have arrays
      setFilterOptions({
        partners: Array.isArray(optionsData.partners)
          ? optionsData.partners
          : [],
        centers: Array.isArray(optionsData.centers) ? optionsData.centers : [],
      });

      console.log(
        `✅ Filter options loaded: ${optionsData.partners?.length || 0} partners, ${optionsData.centers?.length || 0} centers`,
      );
    } catch (err) {
      console.error("❌ Error fetching filter options:", err);
      console.error("   Error response:", err.response?.data);
      console.error("   Error status:", err.response?.status);
      console.error("   Error message:", err.message);

      // Show specific error message to user
      let errorMessage = "Failed to load filter options";
      if (err.response?.status === 401) {
        errorMessage = "Authentication failed. Please try logging in again.";
      } else if (err.response?.status === 403) {
        errorMessage = "You don't have permission to access this data.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setAnalyticsError(errorMessage);
      setFilterOptions({ partners: [], centers: [] });
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);

      const response = await getConsolidatedAnalytics(filters);
      const payload = unwrapAnalyticsPayload(response);
      if (payload && Object.keys(payload).length) {
        setAnalytics(payload);
      } else {
        console.error("Invalid analytics response:", response);
        setAnalyticsError("Invalid data format received from server");
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setAnalyticsError(
        err.response?.data?.message ||
          "Failed to load analytics data. Please try again.",
      );
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Helper function: Filter dashboard data based on financial year
  const getFilteredDashboardData = useMemo(() => {
    const year = filters.financialYear;

    // Map financial year to calendar year
    const yearMap = {
      "2023-24": "2023",
      "2024-25": "2024",
      "2025-26": "2025",
    };

    if (year === "all") {
      // Use the pre-computed "all" key (2023-2026, excludes 2022 per user requirement)
      return {
        total_students: dashboardData.all?.total_students || 0,
        india: dashboardData.all?.india || 0,
        greater_india: dashboardData.all?.greater_india || 0,
        nsi: dashboardData.all?.nsi || 0,
        alumni: dashboardData.all?.alumni || 0,
        male: dashboardData.all?.male || 0,
        female: dashboardData.all?.female || 0,
        tot: dashboardData.all?.tot || 0,
        employment: dashboardData.all?.employment || 0,
        edp: dashboardData.all?.edp || 0,
        monthly: null,
      };
    }

    const calendarYear = yearMap[year];
    const baseData = dashboardData[calendarYear] || {
      total_students: 0,
      india: 0,
      greater_india: 0,
      nsi: 0,
      alumni: 0,
      male: 0,
      female: 0,
      tot: 0,
      employment: 0,
      edp: 0,
      monthly: null,
    };

    // For FY 2025-26, also include Jan-Mar 2026 data stored under "2026" key
    if (calendarYear === "2025" && dashboardData["2026"]) {
      const y2026 = dashboardData["2026"];
      return {
        total_students: (baseData.total_students || 0) + (y2026.total_students || 0),
        india: (baseData.india || 0) + (y2026.india || 0),
        greater_india: (baseData.greater_india || 0) + (y2026.greater_india || 0),
        nsi: (baseData.nsi || 0) + (y2026.nsi || 0),
        alumni: (baseData.alumni || 0) + (y2026.alumni || 0),
        male: (baseData.male || 0) + (y2026.male || 0),
        female: (baseData.female || 0) + (y2026.female || 0),
        tot: (baseData.tot || 0) + (y2026.tot || 0),
        employment: (baseData.employment || 0) + (y2026.employment || 0),
        edp: (baseData.edp || 0) + (y2026.edp || 0),
        monthly: baseData.monthly,
      };
    }

    return baseData;
  }, [filters.financialYear]);

  const displayMetrics = useMemo(() => {
    const custom = customStatsForDisplay(
      analytics?.customStats,
      getFilteredDashboardData || {},
    );
    const metrics = buildDisplayMetrics({
      db: liveDbFromAnalytics(analytics),
      custom,
      kpiSettings: analytics?.kpiSettings || {},
    });
    return {
      students: metrics.students,
      male: metrics.male,
      female: metrics.female,
      partners: metrics.partners,
      centers: metrics.centers,
      tot: metrics.tot,
      employments: metrics.employments,
      india: metrics.india,
      greater_india: metrics.greaterIndia,
      nsi: metrics.nsi,
    };
  }, [analytics, getFilteredDashboardData]);

  // Log matching results ONCE (prevents console spam)
  useEffect(() => {
    if (import.meta.env.MODE !== "development") return;

    // Wait for results to be available
    const results = window.__matchingResults;
    if (!results || results.totalCenters === 0) return;

    // Only log once by tracking if we've logged for this count
    const key = `${results.matchedCount}-${results.unmatchedCenters.length}`;
    if (window.__lastLogKey === key) return;
    window.__lastLogKey = key;

    // Log DEBUG info first
    console.log("\n🗂️ DEBUG: Database has", results.dbCentersCount, "centers");

    // Log unmatched centers (limit to first 10 for readability)
    if (results.unmatchedCenters.length > 0) {
      console.group("🔍 Unmatched Centers from Historical Data");
      console.log(
        `Total unmatched: ${results.unmatchedCenters.length} centers`,
      );
      console.log(
        `Total students in unmatched: ${results.unmatchedCenters.reduce((sum, c) => sum + c.totalStudents, 0)}`,
      );
      console.table(
        results.unmatchedCenters.slice(0, 10).map((c) => ({
          "Center Name": c.centerName,
          City: c.extractedCity,
          Location: c.fullLocation,
          Students: c.totalStudents,
        })),
      );
      if (results.unmatchedCenters.length > 10) {
        console.log(
          `... and ${results.unmatchedCenters.length - 10} more unmatched centers`,
        );
      }
      console.groupEnd();
    }

    // Log matched partners
    if (Object.keys(results.historicalPartnerMap).length > 0) {
      console.group("✅ Matched Historical Data to Partners");
      console.log(`Total matched: ${results.matchedCount} centers`);
      console.log(
        `Total students matched: ${Object.values(results.historicalPartnerMap).reduce((sum, p) => sum + p.total_students, 0)}`,
      );
      console.table(
        Object.values(results.historicalPartnerMap)
          .slice(0, 10)
          .map((p) => ({
            "Partner Name": p.partner_name,
            Students: p.total_students,
          })),
      );
      console.groupEnd();
    }
  }, [analytics, filterOptions.centers.length, filters.financialYear]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      financialYear: "all",
      partnerId: "all",
      centerId: "all",
      gender: "all",
      searchQuery: "",
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
            {/* Filters with Search Bar */}
            <div className="mb-6">
              <AdvancedSearchBar
                value={filters.searchQuery}
                onChange={(value) => handleFilterChange("searchQuery", value)}
                placeholder="Search centers, partners, or locations..."
                suggestions={searchSuggestions}
                filterGroups={[
                  {
                    label: "Financial Year",
                    key: "financialYear",
                    options: [
                      { value: "all", label: "All Years" },
                      { value: "2023-24", label: "FY 2023-24" },
                      { value: "2024-25", label: "FY 2024-25" },
                      { value: "2025-26", label: "FY 2025-26" },
                      ...(Array.isArray(analytics?.availableYears)
                        ? analytics.availableYears
                            .filter(
                              (year) =>
                                !["2023-24", "2024-25", "2025-26"].includes(
                                  year,
                                ),
                            )
                            .map((year) => ({
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
                  <StudentBreakdownTooltip
                    breakdown={{
                      india: displayMetrics.india,
                      greater_india: displayMetrics.greater_india,
                      nsi: displayMetrics.nsi,
                      total: displayMetrics.students,
                    }}
                  >
                    <StatCard
                      title="Total Students"
                      value={displayMetrics.students}
                      trend="up"
                      graphData={
                        filters.financialYear === "2025-26" &&
                        dashboardData["2025"]?.monthly
                          ? Object.values(dashboardData["2025"].monthly).map(
                              (month) => ({
                                value: (month.male || 0) + (month.female || 0),
                              }),
                            )
                          : filters.financialYear === "all"
                            ? [
                                {
                                  value:
                                    dashboardData["2023"]?.total_students || 0,
                                },
                                {
                                  value:
                                    dashboardData["2024"]?.total_students || 0,
                                },
                                {
                                  value:
                                    (dashboardData["2025"]?.total_students || 0) + (dashboardData["2026"]?.total_students || 0),
                                },
                              ]
                            : Array.isArray(analytics.yearlyTrend) &&
                                analytics.yearlyTrend.length > 0
                              ? analytics.yearlyTrend.map((year) => ({
                                  value:
                                    parseInt(year.male_students || 0) +
                                    parseInt(year.female_students || 0),
                                }))
                              : dummyGraphData
                      }
                    />
                  </StudentBreakdownTooltip>
                  <StatCard
                    title="Male Students"
                    value={displayMetrics.male}
                    trend="up"
                    graphData={
                      filters.financialYear === "2025-26" &&
                      dashboardData["2025"]?.monthly
                        ? Object.values(dashboardData["2025"].monthly).map(
                            (month) => ({
                              value: month.male || 0,
                            }),
                          )
                        : filters.financialYear === "all"
                          ? [
                              { value: dashboardData["2023"]?.male || 0 },
                              { value: dashboardData["2024"]?.male || 0 },
                              { value: (dashboardData["2025"]?.male || 0) + (dashboardData["2026"]?.male || 0) },
                            ]
                          : Array.isArray(analytics.yearlyTrend) &&
                              analytics.yearlyTrend.length > 0
                            ? analytics.yearlyTrend.map((year) => ({
                                value: parseInt(year.male_students || 0),
                              }))
                            : dummyGraphData
                    }
                  />
                  <StatCard
                    title="Female Students"
                    value={displayMetrics.female}
                    trend="up"
                    graphData={
                      filters.financialYear === "2025-26" &&
                      dashboardData["2025"]?.monthly
                        ? Object.values(dashboardData["2025"].monthly).map(
                            (month) => ({
                              value: month.female || 0,
                            }),
                          )
                        : filters.financialYear === "all"
                          ? [
                              { value: dashboardData["2023"]?.female || 0 },
                              { value: dashboardData["2024"]?.female || 0 },
                              { value: (dashboardData["2025"]?.female || 0) + (dashboardData["2026"]?.female || 0) },
                            ]
                          : Array.isArray(analytics.yearlyTrend) &&
                              analytics.yearlyTrend.length > 0
                            ? analytics.yearlyTrend.map((year) => ({
                                value: parseInt(year.female_students || 0),
                              }))
                            : dummyGraphData
                    }
                  />
                  <StatCard
                    title="Total Partners"
                    value={displayMetrics.partners}
                    trend="up"
                    graphData={
                      filters.financialYear === "2025-26" &&
                      dashboardData["2025"]?.monthly
                        ? Object.values(dashboardData["2025"].monthly).map(
                            (month) => ({
                              value: (month.male || 0) + (month.female || 0),
                            }),
                          )
                        : filters.financialYear === "all"
                          ? [
                              {
                                value:
                                  dashboardData["2023"]?.total_students || 0,
                              },
                              {
                                value:
                                  dashboardData["2024"]?.total_students || 0,
                              },
                              {
                                value:
                                  (dashboardData["2025"]?.total_students || 0) + (dashboardData["2026"]?.total_students || 0),
                              },
                            ]
                          : Array.isArray(analytics.partnerBreakdown) &&
                              analytics.partnerBreakdown.length > 0
                            ? analytics.partnerBreakdown
                                .slice(0, 6)
                                .map((partner) => ({
                                  value: parseInt(partner.total_students || 0),
                                }))
                            : dummyGraphData
                    }
                  />
                  <StatCard
                    title="Total Centers"
                    value={displayMetrics.centers}
                    trend="up"
                    graphData={
                      filters.financialYear === "2025-26" &&
                      dashboardData["2025"]?.monthly
                        ? Object.values(dashboardData["2025"].monthly).map(
                            (month) => ({
                              value: (month.male || 0) + (month.female || 0),
                            }),
                          )
                        : filters.financialYear === "all"
                          ? [
                              {
                                value:
                                  dashboardData["2023"]?.total_students || 0,
                              },
                              {
                                value:
                                  dashboardData["2024"]?.total_students || 0,
                              },
                              {
                                value:
                                  (dashboardData["2025"]?.total_students || 0) + (dashboardData["2026"]?.total_students || 0),
                              },
                            ]
                          : Array.isArray(analytics.centerBreakdown) &&
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
                    title="Total Trainers (TOT)"
                    value={displayMetrics.tot}
                    trend="up"
                    graphData={
                      filters.financialYear === "2025-26" &&
                      dashboardData["2025"]?.monthly
                        ? Object.values(dashboardData["2025"].monthly).map(
                            (month) => ({
                              value: month.tot || 0,
                            }),
                          )
                        : filters.financialYear === "all"
                          ? [
                              { value: dashboardData["2023"]?.tot || 0 },
                              { value: dashboardData["2024"]?.tot || 0 },
                              { value: (dashboardData["2025"]?.tot || 0) + (dashboardData["2026"]?.tot || 0) },
                            ]
                          : dummyGraphData
                    }
                  />
                  <StatCard
                    title="Total Employments"
                    value={displayMetrics.employments}
                    trend="up"
                    graphData={
                      filters.financialYear === "2025-26" &&
                      dashboardData["2025"]?.monthly
                        ? Object.values(dashboardData["2025"].monthly).map(
                            (month) => ({
                              value: month.employment || 0,
                            }),
                          )
                        : filters.financialYear === "all"
                          ? [
                              { value: dashboardData["2023"]?.employment || 0 },
                              { value: dashboardData["2024"]?.employment || 0 },
                              { value: (dashboardData["2025"]?.employment || 0) + (dashboardData["2026"]?.employment || 0) },
                            ]
                          : dummyGraphData
                    }
                  />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  {/* Gender Distribution Donut Chart */}
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 overflow-hidden">
                    <h3 className="text-base font-semibold text-gray-800 mb-3">
                      Gender Distribution
                    </h3>
                    {(() => {
                      const combinedGenderData = [
                        {
                          gender: "Male",
                          count: displayMetrics.male,
                        },
                        {
                          gender: "Female",
                          count: displayMetrics.female,
                        },
                      ];
                      const formatCount = (n) =>
                        Number(n || 0).toLocaleString();

                      return combinedGenderData.some((g) => g.count > 0) ? (
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <div className="w-full sm:w-[46%] min-w-0 h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                                <Pie
                                  data={combinedGenderData}
                                  dataKey="count"
                                  nameKey="gender"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius="52%"
                                  outerRadius="78%"
                                  paddingAngle={2}
                                  label={false}
                                >
                                  {combinedGenderData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={
                                        entry.gender === "Female"
                                          ? "#017FC5"
                                          : "#FF7400"
                                      }
                                    />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value) => formatCount(value)}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="w-full sm:w-[54%] space-y-2">
                            <div className="rounded-lg p-3 border border-gray-100">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                  <UserIcon className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs text-gray-600 font-medium">
                                    Female students
                                  </p>
                                  <p className="text-lg font-bold text-gray-900 leading-tight">
                                    {formatCount(
                                      combinedGenderData.find(
                                        (g) => g.gender === "Female",
                                      )?.count,
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-lg p-3 border border-gray-100">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                  <UserIcon className="w-4 h-4 text-orange-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs text-gray-600 font-medium">
                                    Male students
                                  </p>
                                  <p className="text-lg font-bold text-gray-900 leading-tight">
                                    {formatCount(
                                      combinedGenderData.find(
                                        (g) => g.gender === "Male",
                                      )?.count,
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-lg p-3 border border-gray-100">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <UserGroupIcon className="w-4 h-4 text-gray-700" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs text-gray-600 font-medium">
                                    Total Students
                                  </p>
                                  <p className="text-lg font-bold text-gray-900 leading-tight">
                                    {formatCount(displayMetrics.students)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
                          No gender data available
                        </div>
                      );
                    })()}
                  </div>

                  {/* Yearly Trend Bar Chart */}
                  <Card className="shadow-sm overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base">Year-wise Trend</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                      {(() => {
                        // Combine API yearlyTrend + dashboardData.json yearly data
                        const apiYears = analytics.yearlyTrend || [];
                        const dashboardYears = ["2023", "2024", "2025", "2026"];

                        // Create a map of financial years from API data
                        const yearMap = {};
                        apiYears.forEach((year) => {
                          yearMap[year.financial_year] = {
                            financial_year: year.financial_year,
                            male_students: parseInt(year.male_students || 0),
                            female_students: parseInt(
                              year.female_students || 0,
                            ),
                          };
                        });

                        // Add/merge dashboardData.json data
                        // Note: "2026" key = Jan-Mar 2026 = still FY 2025-26, so merge into "2025-2026"
                        dashboardYears.forEach((year) => {
                          const dashYear = dashboardData[year];
                          if (dashYear) {
                            const financialYear = year === "2026"
                              ? "2025-2026"
                              : `${year}-${parseInt(year) + 1}`;
                            if (yearMap[financialYear]) {
                              // Merge with existing
                              yearMap[financialYear].male_students +=
                                dashYear.male || 0;
                              yearMap[financialYear].female_students +=
                                dashYear.female || 0;
                            } else {
                              // Add new year
                              yearMap[financialYear] = {
                                financial_year: financialYear,
                                male_students: dashYear.male || 0,
                                female_students: dashYear.female || 0,
                              };
                            }
                          }
                        });

                        const combinedYearlyData = Object.values(yearMap).sort(
                          (a, b) =>
                            a.financial_year.localeCompare(b.financial_year),
                        );

                        return combinedYearlyData.length > 0 ? (
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
                            className="aspect-auto h-[240px] w-full"
                          >
                            <BarChart
                              data={combinedYearlyData}
                              accessibilityLayer
                              margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
                            >
                              <CartesianGrid vertical={false} />
                              <XAxis
                                dataKey="financial_year"
                                tickLine={false}
                                tickMargin={8}
                                axisLine={false}
                                fontSize={11}
                              />
                              <YAxis
                                tickLine={false}
                                axisLine={false}
                                width={40}
                                fontSize={11}
                                allowDecimals={false}
                                tickFormatter={(value) =>
                                  value >= 1000
                                    ? `${Math.round(value / 1000)}k`
                                    : String(value)
                                }
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
                                maxBarSize={36}
                              />
                              <Bar
                                dataKey="male_students"
                                stackId="a"
                                fill="var(--color-male_students)"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={36}
                              />
                            </BarChart>
                          </ChartContainer>
                        ) : (
                          <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">
                            No yearly trend data available
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>

                {/* Partner-wise Breakdown Table */}
                <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Partner-wise Breakdown (Top 10)
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
                        {Array.isArray(analytics?.partnerBreakdown) &&
                        analytics.partnerBreakdown.length > 0 ? (
                          analytics.partnerBreakdown
                            .filter(
                              (partner) =>
                                !filters.searchQuery ||
                                partner.partner_name
                                  ?.toLowerCase()
                                  .includes(filters.searchQuery.toLowerCase()),
                            )
                            .slice(0, 10)
                            .map((partner) => (
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
                        {Array.isArray(analytics?.centerBreakdown) &&
                        analytics.centerBreakdown.length > 0 ? (
                          analytics.centerBreakdown
                            .filter(
                              (center) =>
                                !filters.searchQuery ||
                                center.center_name
                                  ?.toLowerCase()
                                  .includes(
                                    filters.searchQuery.toLowerCase(),
                                  ) ||
                                center.partner_name
                                  ?.toLowerCase()
                                  .includes(filters.searchQuery.toLowerCase()),
                            )
                            .map((center) => (
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
                              colSpan="5"
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
