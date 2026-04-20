import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../hooks";
import { useNotifications } from "../../hooks/useNotifications";
import { ROLES, ROLE_LABELS, ROUTES } from "../../constants";
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
  ChevronDownIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import * as Tooltip from "@radix-ui/react-tooltip";
import IndiaTrainingCard from "../../components/dashboard/IndiaTrainingCard";
import { useNavigate } from "react-router-dom";
import dataService from "../../services/data.service";
import { essciGetData } from "../../services/certification.service";
import {
  KPI_CARD_DEFINITIONS,
  resolveKpiCardTitle,
} from "../../services/kpi.service";
import dashboardData from "../../data/dashboardData.json";

/**
 * Course Breakdown Tooltip Component
 * Shows distribution of centers by courses
 */
const CourseBreakdownTooltip = ({ courses, children }) => {
  if (!courses || courses.length === 0) {
    return <>{children}</>;
  }

  const totalCenters = courses.reduce(
    (sum, c) => sum + (c.center_count || 0),
    0,
  );

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className="cursor-help">{children}</div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs z-50"
            sideOffset={5}
          >
            <div className="space-y-2">
              <div className="font-semibold text-gray-900 mb-3 pb-2 border-b">
                Centers by Course Type
              </div>
              {courses.map((course, index) => {
                const percentage =
                  totalCenters > 0
                    ? ((course.center_count / totalCenters) * 100).toFixed(1)
                    : 0;
                return (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-gray-700 mr-4">
                      {course.course_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {course.center_count}
                      </span>
                      <span className="text-gray-500">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 mt-2 border-t flex justify-between items-center font-semibold">
                <span>Total</span>
                <span>{totalCenters}</span>
              </div>
            </div>
            <Tooltip.Arrow className="fill-white" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

/**
 * Gender Breakdown Tooltip Component
 * Shows male/female distribution with percentages
 */
const GenderBreakdownTooltip = ({ male, female, children }) => {
  const total = (male || 0) + (female || 0);
  const malePercentage = total > 0 ? ((male / total) * 100).toFixed(1) : 0;
  const femalePercentage = total > 0 ? ((female / total) * 100).toFixed(1) : 0;

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className="cursor-help">{children}</div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs z-50"
            sideOffset={5}
          >
            <div className="space-y-2">
              <div className="font-semibold text-gray-900 mb-3 pb-2 border-b">
                Gender Distribution
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">Male</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {male?.toLocaleString() || 0}
                  </span>
                  <span className="text-gray-500">({malePercentage}%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">Female</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {female?.toLocaleString() || 0}
                  </span>
                  <span className="text-gray-500">({femalePercentage}%)</span>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t flex justify-between items-center font-semibold">
                <span>Total</span>
                <span>{total.toLocaleString()}</span>
              </div>
            </div>
            <Tooltip.Arrow className="fill-white" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

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

const StatesUTsCard = ({ states, uts, utNames = [], graphData = [] }) => {
  const [showUTList, setShowUTList] = useState(false);
  return (
    <div className="relative bg-white rounded-[16px] border border-[#A5A5A5] p-3 transition-shadow duration-300 min-h-[150px] flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-base md:text-sm text-[#1F2937] leading-relaxed">
          States & UTs
        </h3>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex flex-col min-w-0">
          <span className="text-xl md:text-xl font-bold text-[#111827] leading-none">
            {states}
          </span>
          <span className="text-xs text-gray-500 mt-1">States</span>
        </div>

        <div className="h-8 w-px bg-gray-300" />

        <div className="flex flex-col min-w-0">
          <span className="text-xl md:text-xl font-bold text-[#111827] leading-none">
            {uts}
          </span>
          <span className="text-xs text-gray-500 mt-1">UTs</span>
        </div>

        <div className="ml-auto flex items-center justify-center h-6 w-6 rounded-full bg-[#D1FAE5] mt-1">
          <ArrowTrendingUpIcon className="h-4 w-4 text-[#10B981]" />
        </div>
      </div>

      {utNames.length > 0 && (
        <div className="mb-1">
          <button
            onClick={() => setShowUTList((v) => !v)}
            className="text-[10px] text-[#009530] hover:underline focus:outline-none flex items-center gap-0.5"
          >
            {showUTList ? "Hide" : "Show"} UT names
            <svg
              className={`w-2.5 h-2.5 transition-transform ${showUTList ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showUTList && (
            <ul className="mt-1 space-y-0.5">
              {utNames.map((name) => (
                <li
                  key={name}
                  className="text-[10px] text-gray-600 flex items-center gap-1"
                >
                  <span className="w-1 h-1 rounded-full bg-[#009530] flex-shrink-0" />
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        className="mt-auto h-[40px] md:h-[40px] w-full"
        style={{ minHeight: "40px" }}
      >
        {graphData && graphData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={40}>
            <AreaChart data={graphData}>
              <defs>
                <linearGradient
                  id="gradient-green-states-uts"
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
              </defs>

              <Area
                type="natural"
                dataKey="value"
                stroke="#3DCD58"
                strokeWidth={1}
                strokeDasharray="10"
                fill="url(#gradient-green-states-uts)"
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

  // Year filter state
  const [selectedYear, setSelectedYear] = useState("all");
  const [analytics, setAnalytics] = useState(null);
  const [courseBreakdown, setCourseBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to transform dashboardData.json structure
  const transformDashboardData = (jsonData, year) => {
    if (!jsonData) return null;

    const yearKey = year === "all" ? "all" : year.split("-")[0]; // "2024-25" -> "2024"
    const yearData = jsonData[yearKey] || jsonData.all;

    if (!yearData) return null;

    return {
      totalStudents: yearData.total_students || 0,
      maleStudents: yearData.male || 0,
      femaleStudents: yearData.female || 0,
      totalEmployments: yearData.employment || 0,
      totalCenters: yearData.tot || 0, // tot = total centers in JSON
      totalStates: 28, // India has 28 states (fallback)
      monthlyBreakdown: yearData.monthly
        ? Object.keys(yearData.monthly).map((month) => ({
            month:
              month.charAt(0).toUpperCase() + month.slice(1) + " " + yearKey,
            centers: yearData.monthly[month].tot || 0,
            students: yearData.monthly[month].total || 0,
          }))
        : null,
    };
  };

  // Fetch data when year changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch consolidated analytics with year filter
        const response = await dataService.getConsolidatedAnalytics(
          selectedYear === "all" ? null : selectedYear,
        );

        // Extract data from wrapped API response
        // Backend wraps: { success, message, data, timestamp }
        // We need the 'data' property which contains the actual analytics
        const analyticsData = response?.data || response;

        // Fetch centers by establishment year (service method already unwraps)
        const establishmentData = await dataService.getCentersByEstablishment(
          selectedYear === "all" ? null : selectedYear,
        );

        console.log("📊 Raw Establishment Response:", establishmentData);
        console.log("📊 Establishment Data Type:", typeof establishmentData);
        console.log(
          "📊 Establishment Data Keys:",
          Object.keys(establishmentData || {}),
        );

        // Add establishment data to analytics
        analyticsData.establishmentYears = establishmentData;

        setAnalytics(analyticsData);

        console.log("✅ Analytics Data:", analyticsData);
        console.log(
          "✅ Establishment Years:",
          analyticsData.establishmentYears,
        );

        // Fetch course breakdown
        if (analyticsData?.courseBreakdown) {
          setCourseBreakdown(analyticsData.courseBreakdown);
        }
      } catch (err) {
        console.error("❌ Error fetching dashboard data:", err);
        console.error("❌ Error details:", err.message);
        console.error("❌ Error stack:", err.stack);
        setError(err.message);

        // If API fails, use dashboardData.json as fallback
        const fallbackData = transformDashboardData(
          dashboardData,
          selectedYear,
        );
        if (fallbackData) {
          console.log("⚠️ Using fallback data from dashboardData.json");
          setAnalytics(fallbackData);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]);

  // Get filtered dashboard data based on year (transformed from JSON)
  const getFilteredDashboardData = useMemo(() => {
    return transformDashboardData(dashboardData, selectedYear);
  }, [selectedYear]);

  // Helper function to get graph data for StatCards
  const getGraphData = (dataArray) => {
    if (!dataArray || dataArray.length === 0) return [];
    return dataArray.map((item) => ({ value: item }));
  };

  // Prepare line chart data based on selected year
  const centersGrowthData = useMemo(() => {
    if (!analytics) return [];

    if (selectedYear === "all") {
      // Use year of establishment data from new endpoint
      const establishmentData = analytics.establishmentYears || {};

      // Get all years and sort them
      const years = Object.keys(establishmentData).sort();

      // Calculate cumulative totals
      let cumulative = 0;
      const cumulativeData = years.map((year) => {
        cumulative += establishmentData[year] || 0;
        return {
          name: `${year}-${String(parseInt(year) + 1).slice(2)}`, // Format as "2022-23"
          centers: cumulative,
        };
      });

      console.log("📊 Raw Establishment Data:", establishmentData);
      console.log("📊 Cumulative Centers Growth:", cumulativeData);

      return cumulativeData;
    } else {
      // Monthly data for specific year - also cumulative
      const monthlyData = analytics.monthlyBreakdown || [];
      let cumulative = 0;

      return monthlyData.map((month) => {
        cumulative += month.centers || 0;
        return {
          name: month.month,
          centers: cumulative,
        };
      });
    }
  }, [analytics, selectedYear]);

  const studentsTrendData = useMemo(() => {
    if (selectedYear === "all") {
      // Use year-wise totals from dashboardData.json (accurate yearly data)
      // Calculate cumulative totals
      const yearlyData = [
        {
          year: "2022",
          name: "2022-23",
          students: dashboardData["2022"]?.total_students || 0,
        },
        {
          year: "2023",
          name: "2023-24",
          students: dashboardData["2023"]?.total_students || 0,
        },
        {
          year: "2024",
          name: "2024-25",
          students: dashboardData["2024"]?.total_students || 0,
        },
        {
          year: "2025",
          name: "2025-26",
          students: dashboardData["2025"]?.total_students || 0,
        },
      ];

      let cumulative = 0;
      const cumulativeData = yearlyData.map((item) => {
        cumulative += item.students;
        return {
          name: item.name,
          students: cumulative,
        };
      });

      console.log("📊 Cumulative Students Trend:", cumulativeData);

      return cumulativeData;
    } else {
      // For specific year, use monthly data from dashboardData.json - also cumulative
      const yearData = dashboardData[selectedYear];
      if (!yearData?.monthly) return [];

      // Convert monthly object to array format for chart with cumulative totals
      let cumulative = 0;
      return Object.entries(yearData.monthly).map(([monthName, monthData]) => {
        cumulative += monthData.total || 0;
        return {
          name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          students: cumulative,
        };
      });
    }
  }, [selectedYear]);

  // Combine API data with dashboardData.json (API takes priority, JSON is fallback)
  const combinedValues = useMemo(() => {
    const jsonData = getFilteredDashboardData;
    const apiData = analytics || {};
    const kpiSettings = apiData.kpiSettings || {};

    // Helper: dbValue + custom value from admin settings
    const combined = (dbVal, kpiKey) => {
      const custom = kpiSettings[kpiKey]?.customValue || 0;
      return (dbVal || 0) + custom;
    };

    // Merge: API data first, then JSON fallback, then 0
    const merged = {
      partners: combined(apiData.totalPartners || 0, "partners"),
      centers: combined(
        apiData.totalCenters || jsonData?.totalCenters || 0,
        "centers",
      ),
      students: combined(
        apiData.totalStudents || jsonData?.totalStudents || 0,
        "youth_trained",
      ),
      employments: combined(
        apiData.totalEmployments || jsonData?.totalEmployments || 0,
        "youth_employed",
      ),
      states: combined(
        apiData.totalStates || jsonData?.totalStates || 28,
        "states_uts",
      ),
      uts: apiData.totalUTs || 0,
      utNames: apiData.utNames || [],
      maleStudents: apiData.maleStudents || jsonData?.maleStudents || 0,
      femaleStudents: apiData.femaleStudents || jsonData?.femaleStudents || 0,
      edpCount: combined(apiData.edpCount || 0, "edp"),
      trainersCount: combined(0, "trainers_trained"),
      greaterIndia: combined(0, "greater_india"),
      nsi: combined(0, "nsi"),
      alumni: combined(0, "alumni"),
    };

    // Attach visibility flags from kpiSettings (default all visible)
    merged.visibility = {};
    KPI_CARD_DEFINITIONS.forEach(({ key }) => {
      merged.visibility[key] = kpiSettings[key]?.isVisible !== false;
    });

    console.log("Total Partners:", merged.partners);

    return merged;
  }, [analytics, getFilteredDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  // Show error banner if API failed but we have fallback data
  const showErrorBanner = error && combinedValues.students > 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section with Year Filter */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>

        {/* Year Filter Dropdown */}
        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            <option value="all">All Years</option>
            <option value="2022-23">2022-23</option>
            <option value="2023-24">2023-24</option>
            <option value="2024-25">2024-25</option>
            <option value="2025-26">2025-26</option>
          </select>
          <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Error Banner (if API failed but showing fallback data) */}
      {showErrorBanner && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <span className="font-medium">API Connection Issue:</span>{" "}
                {error}. Showing cached data from local storage.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overview Text */}
      <p className="text-muted-foreground">
        An overview of your program's performance
        {selectedYear !== "all" ? ` for ${selectedYear}` : ""}.
      </p>

      {/* Stats Grid - KPI Cards (order driven by admin settings) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {(() => {
          const kpiSettings = (analytics || {}).kpiSettings || {};
          const titleFor = (key) => {
            const definition = KPI_CARD_DEFINITIONS.find(
              (item) => item.key === key,
            );

            if (!definition) {
              return key;
            }

            return resolveKpiCardTitle(definition, kpiSettings[key] || {});
          };

          const kpiCardData = [
            {
              key: "youth_trained",
              title: titleFor("youth_trained"),
              value: combinedValues.students,
              graphData: getGraphData([
                800,
                950,
                1100,
                1200,
                1180,
                1220,
                combinedValues.students,
              ]),
              wrapper: "gender",
            },
            {
              key: "trainers_trained",
              title: titleFor("trainers_trained"),
              value: combinedValues.trainersCount,
              graphData: getGraphData([
                0,
                0,
                0,
                0,
                0,
                0,
                combinedValues.trainersCount,
              ]),
              wrapper: null,
            },
            {
              key: "edp",
              title: titleFor("edp"),
              value: combinedValues.edpCount,
              graphData: getGraphData([
                0,
                0,
                0,
                0,
                0,
                0,
                combinedValues.edpCount,
              ]),
              wrapper: null,
            },
            {
              key: "youth_employed",
              title: titleFor("youth_employed"),
              value: combinedValues.employments,
              graphData: getGraphData([
                600,
                700,
                800,
                900,
                950,
                980,
                combinedValues.employments,
              ]),
              wrapper: null,
            },
            {
              key: "partners",
              title: titleFor("partners"),
              value: combinedValues.partners,
              graphData: getGraphData([
                42,
                44,
                46,
                48,
                49,
                50,
                combinedValues.partners,
              ]),
              wrapper: null,
            },
            {
              key: "centers",
              title: titleFor("centers"),
              value: combinedValues.centers,
              graphData: getGraphData([
                78,
                79,
                81,
                82,
                84,
                85,
                combinedValues.centers,
              ]),
              wrapper: "course",
            },
            {
              key: "states_uts",
              title: titleFor("states_uts"),
              value: combinedValues.states,
              graphData: getGraphData([
                12,
                14,
                16,
                18,
                20,
                22,
                combinedValues.states,
              ]),
              wrapper: "states_uts",
            },
            {
              key: "greater_india",
              title: titleFor("greater_india"),
              value: combinedValues.greaterIndia,
              graphData: getGraphData([
                0,
                0,
                0,
                0,
                0,
                0,
                combinedValues.greaterIndia,
              ]),
              wrapper: null,
            },
            {
              key: "nsi",
              title: titleFor("nsi"),
              value: combinedValues.nsi,
              graphData: getGraphData([0, 0, 0, 0, 0, 0, combinedValues.nsi]),
              wrapper: null,
            },
            {
              key: "alumni",
              title: titleFor("alumni"),
              value: combinedValues.alumni,
              graphData: getGraphData([
                0,
                0,
                0,
                0,
                0,
                0,
                combinedValues.alumni,
              ]),
              wrapper: null,
            },
          ];

          const sorted = [...kpiCardData].sort((a, b) => {
            const orderA = kpiSettings[a.key]?.sortOrder ?? 99;
            const orderB = kpiSettings[b.key]?.sortOrder ?? 99;
            return orderA - orderB;
          });

          return sorted
            .filter((card) => combinedValues.visibility?.[card.key] !== false)
            .map((card) => {
              const statCard = (
                <StatCard
                  key={card.key}
                  title={card.title}
                  value={card.value.toLocaleString()}
                  trend="up"
                  graphData={card.graphData}
                />
              );
              if (card.wrapper === "gender") {
                return (
                  <GenderBreakdownTooltip
                    key={card.key}
                    male={combinedValues.maleStudents}
                    female={combinedValues.femaleStudents}
                  >
                    {statCard}
                  </GenderBreakdownTooltip>
                );
              }
              if (card.wrapper === "course") {
                return (
                  <CourseBreakdownTooltip
                    key={card.key}
                    courses={courseBreakdown}
                  >
                    {statCard}
                  </CourseBreakdownTooltip>
                );
              }
              if (card.wrapper === "states_uts") {
                return (
                  <StatesUTsCard
                    key={card.key}
                    states={combinedValues.states.toLocaleString()}
                    uts={combinedValues.uts.toLocaleString()}
                    utNames={combinedValues.utNames}
                    graphData={card.graphData}
                  />
                );
              }
              return statCard;
            });
        })()}
      </div>

      {/* Two Line Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Centers Growth Chart */}
        <Card className="bg-white rounded-xl shadow-sm border-gray-200 border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Centers Growth
            </CardTitle>
            <CardDescription>
              {selectedYear === "all" ? "Year-wise" : "Month-wise"} centers
              count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={centersGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#888" />
                <YAxis tick={{ fontSize: 12 }} stroke="#888" />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="centers"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Students Trend Chart */}
        <Card className="bg-white rounded-xl shadow-sm border-gray-200 border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Students Trend
            </CardTitle>
            <CardDescription>
              {selectedYear === "all" ? "Year-wise" : "Month-wise"} students
              trained
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={studentsTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#888" />
                <YAxis tick={{ fontSize: 12 }} stroke="#888" />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="students"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Three Column Layout - India Map (2 cols) & Notifications (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* India Training Overview - Takes 2 columns */}
        <div className="lg:col-span-2">
          <IndiaTrainingCard
            selectedYear={selectedYear}
            showOnlyCounts={true}
          />
        </div>

        {/* Notifications - Takes 1 column */}
        <Card className="relative bg-white rounded-xl shadow-sm border-[#A5A5A5] border">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-y-auto">
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
  const [selectedYear, setSelectedYear] = useState("all");

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {userName}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your centers, data uploads, and requests.
          </p>
        </div>

        {/* Year Filter Dropdown */}
        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            <option value="all">All Years</option>
            <option value="2022-23">2022-23</option>
            <option value="2023-24">2023-24</option>
            <option value="2024-25">2024-25</option>
            <option value="2025-26">2025-26</option>
          </select>
          <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
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
  const [selectedYear, setSelectedYear] = useState("all");

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {userName}!
          </h1>
          <p className="text-muted-foreground mt-2">
            View analytics and reports across all partners and centers.
          </p>
        </div>

        {/* Year Filter Dropdown */}
        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            <option value="all">All Years</option>
            <option value="2022-23">2022-23</option>
            <option value="2023-24">2023-24</option>
            <option value="2024-25">2024-25</option>
            <option value="2025-26">2025-26</option>
          </select>
          <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
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
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState("all");
  const [certStats, setCertStats] = useState({
    total: 0,
    done: 0,
    underReview: 0,
    ongoing: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const yearParam = selectedYear !== "all" ? { year: selectedYear } : {};
        const [allRes, doneRes, reviewRes, ongoingRes] = await Promise.all([
          essciGetData({ page: 1, limit: 1, ...yearParam }),
          essciGetData({ page: 1, limit: 1, status: "Done", ...yearParam }),
          essciGetData({
            page: 1,
            limit: 1,
            status: "Under review",
            ...yearParam,
          }),
          essciGetData({ page: 1, limit: 1, status: "Ongoing", ...yearParam }),
        ]);
        setCertStats({
          total: allRes?.data?.total ?? allRes?.total ?? 0,
          done: doneRes?.data?.total ?? doneRes?.total ?? 0,
          underReview: reviewRes?.data?.total ?? reviewRes?.total ?? 0,
          ongoing: ongoingRes?.data?.total ?? ongoingRes?.total ?? 0,
        });
      } catch {
        // stats stay at 0 on error
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [selectedYear]);

  const statCards = [
    {
      label: "Total Uploads",
      value: certStats.total,
      icon: ClipboardDocumentListIcon,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Done",
      value: certStats.done,
      icon: CheckCircleIcon,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Under Review",
      value: certStats.underReview,
      icon: ClockIcon,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Ongoing",
      value: certStats.ongoing,
      icon: ArrowPathIcon,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  const quickActions = [
    {
      label: "View Certification Data",
      description: "Browse and filter all certification uploads",
      icon: ClipboardDocumentListIcon,
      action: () => navigate(ROUTES.ESSCI_DATA),
      variant: "primary",
    },
    {
      label: "Upload Certificate PDF",
      description: "Submit a new certificate PDF for a batch",
      icon: ArrowDownTrayIcon,
      action: () => navigate(ROUTES.ESSCI_UPLOAD),
      variant: "primary",
    },
    {
      label: "Download Partner Data",
      description: "Export complete partner database as CSV",
      icon: DocumentTextIcon,
      action: () => dataService.downloadPartnersCSV?.(),
      variant: "secondary",
    },
    {
      label: "Download Student Records",
      description: "Export all student data as CSV",
      icon: DocumentTextIcon,
      action: () => dataService.downloadStudentsCSV?.(),
      variant: "secondary",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {userName}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage certifications and export data for analysis.
          </p>
        </div>

        {/* Year Filter Dropdown */}
        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            <option value="all">All Years</option>
            <option value="2022-23">2022-23</option>
            <option value="2023-24">2023-24</option>
            <option value="2024-25">2024-25</option>
            <option value="2025-26">2025-26</option>
          </select>
          <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Certification Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
          >
            <div className={`${bg} p-3 rounded-lg`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? "—" : value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Navigate to key certification workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map(
              ({ label, description, icon: Icon, action, variant }) => (
                <button
                  key={label}
                  onClick={action}
                  className={`p-4 border rounded-lg text-left transition-colors ${
                    variant === "primary"
                      ? "border-blue-200 hover:border-blue-400 hover:bg-blue-50"
                      : "border-gray-200 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <Icon
                    className={`h-8 w-8 mb-2 ${
                      variant === "primary" ? "text-blue-600" : "text-gray-500"
                    }`}
                  />
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {description}
                  </p>
                </button>
              ),
            )}
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
      case ROLES.SEIF_READONLY_DOWNLOAD:
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
