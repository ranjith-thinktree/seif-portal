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
import historicalCenterData from "../../../data/historicalCenterData.json";

/**
 * Merge historical center data from JSON with live API data
 * @param {Array} historicalData - Historical centers from JSON (77 centers)
 * @param {Array} apiData - Live data from API (current year)
 * @param {string} selectedYear - Selected financial year (e.g., "2024-25")
 * @returns {Array} Merged center data sorted by total students
 */
function mergeCenterData(historicalData, apiData, selectedYear) {
  const merged = new Map();
  
  // Add all 77 historical centers
  historicalData.forEach(h => {
    const key = h.centerName;
    merged.set(key, {
      center_id: h.id,
      center_name: h.centerName,
      partner_name: h.centerName.split(' ')[0] + (h.centerName.split(' ')[1] ? ' ' + h.centerName.split(' ')[1] : ''),
      city: h.city || h.location,
      state: h.state,
      students_2022_23: h.students_2022_23 || 0,
      students_2023_24: h.students_2023_24 || 0,
      students_2024_25: h.students_2024_25 || 0,
      currentTotal: 0,
      currentMale: 0,
      currentFemale: 0,
      source: 'historical'
    });
  });
  
  // Merge API data (current year)
  if (Array.isArray(apiData)) {
    apiData.forEach(api => {
      const key = api.center_name;
      if (merged.has(key)) {
        // Update existing historical center with API data
        const existing = merged.get(key);
        existing.currentTotal = api.total_students;
        existing.currentMale = api.male_students;
        existing.currentFemale = api.female_students;
        existing.partner_name = api.partner_name; // Use API partner name
        existing.source = 'both';
      } else {
        // Add new center from API (not in historical)
        merged.set(key, {
          center_id: api.center_id,
          center_name: api.center_name,
          partner_name: api.partner_name,
          city: api.city,
          state: api.state,
          students_2022_23: 0,
          students_2023_24: 0,
          students_2024_25: 0,
          currentTotal: api.total_students,
          currentMale: api.male_students,
          currentFemale: api.female_students,
          source: 'api'
        });
      }
    });
  }
  
  // Calculate display values based on selected year
  return Array.from(merged.values())
    .map(c => ({
      ...c,
      total_students: selectedYear === '2022-23' ? c.students_2022_23 :
                     selectedYear === '2023-24' ? c.students_2023_24 :
                     selectedYear === '2024-25' ? c.students_2024_25 :
                     c.currentTotal, // Current year or "all"
      male_students: selectedYear.startsWith('20') && selectedYear !== '2025-26' ? 'N/A' : c.currentMale,
      female_students: selectedYear.startsWith('20') && selectedYear !== '2025-26' ? 'N/A' : c.currentFemale
    }))
    .filter(c => c.total_students > 0) // Only show centers with students
    .sort((a, b) => b.total_students - a.total_students) // Sort descending
    .slice(0, 20); // Top 20 only
}

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
        // Fetch analytics immediately after filter options
        console.log("📊 Fetching analytics...");
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

  // Log matching results only once (in development) - prevents multiple console logs
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

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
          "Failed to load analytics data. Please try again.",
      );
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Helper function: Filter historical data based on current filters
  const getFilteredHistoricalData = useMemo(() => {
    let filtered = historicalCenterData;

    // State filter (filter by state if we have partner/center filters)
    if (filters.partnerId !== "all" || filters.centerId !== "all") {
      // Get state from selected center or partner
      const selectedCenter = filterOptions.centers.find(
        (c) => c.id === filters.centerId,
      );
      if (selectedCenter && selectedCenter.state) {
        filtered = filtered.filter(
          (center) => center.state === selectedCenter.state,
        );
      }

      // If center is selected, try to match by name
      if (filters.centerId !== "all" && selectedCenter) {
        filtered = filtered.filter((center) =>
          center.centerName
            .toLowerCase()
            .includes(selectedCenter.name?.toLowerCase() || ""),
        );
      }
    }

    return filtered;
  }, [filters.partnerId, filters.centerId, filterOptions.centers]);

  // Helper function: Aggregate historical data by financial year
  const aggregateHistoricalStudents = useMemo(() => {
    let total = 0;

    getFilteredHistoricalData.forEach((center) => {
      if (filters.financialYear === "all") {
        total +=
          (center.students_2022_23 || 0) +
          (center.students_2023_24 || 0) +
          (center.students_2024_25 || 0);
      } else if (filters.financialYear === "2022-23") {
        total += center.students_2022_23 || 0;
      } else if (filters.financialYear === "2023-24") {
        total += center.students_2023_24 || 0;
      } else if (filters.financialYear === "2024-25") {
        total += center.students_2024_25 || 0;
      }
    });

    return total;
  }, [getFilteredHistoricalData, filters.financialYear]);

  // Helper function: Get state distribution from historical data
  const getHistoricalStateDistribution = useMemo(() => {
    const stateMap = {};

    getFilteredHistoricalData.forEach((center) => {
      const state = center.state;
      if (!stateMap[state]) {
        stateMap[state] = 0;
      }

      if (filters.financialYear === "all") {
        stateMap[state] +=
          (center.students_2022_23 || 0) +
          (center.students_2023_24 || 0) +
          (center.students_2024_25 || 0);
      } else if (filters.financialYear === "2022-23") {
        stateMap[state] += center.students_2022_23 || 0;
      } else if (filters.financialYear === "2023-24") {
        stateMap[state] += center.students_2023_24 || 0;
      } else if (filters.financialYear === "2024-25") {
        stateMap[state] += center.students_2024_25 || 0;
      }
    });

    return Object.entries(stateMap).map(([state, count]) => ({
      state,
      count,
    }));
  }, [getFilteredHistoricalData, filters.financialYear]);

  // Helper function: Get top centers from historical data
  const getHistoricalTopCenters = useMemo(() => {
    const centerData = getFilteredHistoricalData.map((center) => {
      let studentCount = 0;

      if (filters.financialYear === "all") {
        studentCount =
          (center.students_2022_23 || 0) +
          (center.students_2023_24 || 0) +
          (center.students_2024_25 || 0);
      } else if (filters.financialYear === "2022-23") {
        studentCount = center.students_2022_23 || 0;
      } else if (filters.financialYear === "2023-24") {
        studentCount = center.students_2023_24 || 0;
      } else if (filters.financialYear === "2024-25") {
        studentCount = center.students_2024_25 || 0;
      }

      return {
        centerName: center.centerName,
        studentCount,
      };
    });

    return centerData
      .filter((c) => c.studentCount > 0)
      .sort((a, b) => b.studentCount - a.studentCount)
      .slice(0, 20);
  }, [getFilteredHistoricalData, filters.financialYear]);

  // Merged stats (API + Historical)
  // eslint-disable-next-line no-unused-vars
  const mergedStats = useMemo(() => {
    if (!stats) return null;

    return {
      ...stats,
      total_students: (stats.total_students || 0) + aggregateHistoricalStudents,
    };
  }, [stats, aggregateHistoricalStudents]);

  // Merged analytics (API + Historical)
  const mergedAnalytics = useMemo(() => {
    if (!analytics) return null;

    // Merge state distribution
    const mergedStateData = [...(analytics.studentsByState || [])];
    getHistoricalStateDistribution.forEach((historicalState) => {
      const existingState = mergedStateData.find(
        (s) => s.state === historicalState.state,
      );
      if (existingState) {
        existingState.count += historicalState.count;
      } else {
        mergedStateData.push(historicalState);
      }
    });

    // Merge top centers
    const mergedCenterData = [...(analytics.topCenters || [])];
    getHistoricalTopCenters.forEach((historicalCenter) => {
      const existingCenter = mergedCenterData.find(
        (c) => c.centerName === historicalCenter.centerName,
      );
      if (existingCenter) {
        existingCenter.studentCount += historicalCenter.studentCount;
      } else {
        mergedCenterData.push(historicalCenter);
      }
    });

    // Sort and limit top centers to 20
    mergedCenterData.sort((a, b) => b.studentCount - a.studentCount);
    const topMergedCenters = mergedCenterData.slice(0, 20);

    // Merge partner breakdown (match JSON centers to database partners)
    const mergedPartnerData = [...(analytics.partnerBreakdown || [])];

    // Create center-to-partner mapping from filterOptions
    const centerToPartnerMap = {};
    filterOptions.centers.forEach((center) => {
      if (center.id && center.partner_id && center.center_name) {
        centerToPartnerMap[center.id] = {
          partner_id: center.partner_id,
          partner_name: center.partner_name,
          center_name: center.center_name.toLowerCase().trim(),
        };
      }
    });

    // DEBUG: Log database centers (run once to see what we're matching against)
    if (
      filterOptions.centers.length > 0 &&
      Object.keys(centerToPartnerMap).length > 0
    ) {
      console.log(
        "🗂️ DEBUG: Database has",
        Object.keys(centerToPartnerMap).length,
        "centers",
      );
      console.log(
        "Sample DB center names:",
        Object.values(centerToPartnerMap)
          .slice(0, 10)
          .map((c) => c.center_name),
      );
    }

    // Aggregate historical students by partner
    const historicalPartnerMap = {};
    const unmatchedCenters = []; // Track unmatched centers for admin review

    getFilteredHistoricalData.forEach((jsonCenter) => {
      // Try to match JSON center to database center
      const jsonName = jsonCenter.centerName.toLowerCase().trim();
      const jsonLocation = (jsonCenter.location || "").toLowerCase().trim();

      let matchedPartner = null;
      let bestMatchScore = 0;

      // Enhanced city-based matching algorithm
      // Extract city name from location (first part before comma)
      const locationParts = jsonLocation
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      const cityName = locationParts[0] || ""; // First part is usually the city

      for (const [centerId, centerInfo] of Object.entries(centerToPartnerMap)) {
        const dbName = centerInfo.center_name;
        let matchScore = 0;

        // Priority 1: Exact match (center name + city)
        if (jsonName === dbName) {
          matchScore = 100;
        }
        // Priority 2: Center name matches AND city appears in DB name
        // Example: "Dalmia Bharat Foundation" + "Rajgangpur" → "Dalmia Bharat Foundation Rajgangpur"
        else if (cityName && dbName.includes(cityName)) {
          // Filter out common words for better matching
          const commonWords = [
            "foundation",
            "university",
            "college",
            "institute",
            "school",
            "centre",
            "center",
            "training",
          ];
          const centerNameWords = jsonName
            .split(/\s+/)
            .filter(
              (w) => w.length > 3 && !commonWords.includes(w.toLowerCase()),
            );
          const dbNameLower = dbName.toLowerCase();
          const matchingWords = centerNameWords.filter((w) =>
            dbNameLower.includes(w),
          );

          if (matchingWords.length >= 2) {
            // Both center name and city match - high confidence
            matchScore = 95;
          } else if (matchingWords.length >= 1) {
            // City + at least one word from center name
            matchScore = 85;
          } else {
            // Just city name matches
            matchScore = 70; // Lowered from 75 for more lenient matching
          }
        }
        // Priority 3: Bidirectional contains (center name)
        else if (jsonName.includes(dbName) || dbName.includes(jsonName)) {
          matchScore = 75; // Lowered from 80
        }
        // Priority 4: Check for alternate city names and partial word matches
        else if (locationParts.length > 0) {
          const locationWords = locationParts.flatMap((part) =>
            part.split(/\s+/).filter((w) => w.length > 3),
          );
          const dbNameLower = dbName.toLowerCase();
          const matchingLocationWords = locationWords.filter((w) =>
            dbNameLower.includes(w),
          );

          if (matchingLocationWords.length > 0) {
            // Filter common words from center name
            const commonWords = [
              "foundation",
              "university",
              "college",
              "institute",
              "school",
              "centre",
              "center",
              "training",
            ];
            const centerNameWords = jsonName
              .split(/\s+/)
              .filter(
                (w) => w.length > 3 && !commonWords.includes(w.toLowerCase()),
              );
            const matchingCenterWords = centerNameWords.filter((w) =>
              dbNameLower.includes(w),
            );

            if (matchingCenterWords.length >= 1) {
              // Location word + center name word match
              matchScore = 65; // Lowered from 70
            } else {
              // Just location word matches
              matchScore = 55; // Lowered from 60
            }
          }
        }

        // Keep best match (threshold lowered from 60 to 50 for more lenient matching)
        if (matchScore >= 50 && matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          matchedPartner = {
            partner_id: centerInfo.partner_id,
            partner_name: centerInfo.partner_name,
            match_score: matchScore,
            matched_city: cityName, // Store for debugging
          };
        }
      }

      // If matched, aggregate students by partner
      if (matchedPartner) {
        const partnerId = matchedPartner.partner_id;
        if (!historicalPartnerMap[partnerId]) {
          historicalPartnerMap[partnerId] = {
            partner_id: partnerId,
            partner_name: matchedPartner.partner_name,
            total_students: 0,
          };
        }

        // Add students based on financial year filter
        if (filters.financialYear === "all") {
          historicalPartnerMap[partnerId].total_students +=
            (jsonCenter.students_2022_23 || 0) +
            (jsonCenter.students_2023_24 || 0) +
            (jsonCenter.students_2024_25 || 0);
        } else if (filters.financialYear === "2022-23") {
          historicalPartnerMap[partnerId].total_students +=
            jsonCenter.students_2022_23 || 0;
        } else if (filters.financialYear === "2023-24") {
          historicalPartnerMap[partnerId].total_students +=
            jsonCenter.students_2023_24 || 0;
        } else if (filters.financialYear === "2024-25") {
          historicalPartnerMap[partnerId].total_students +=
            jsonCenter.students_2024_25 || 0;
        }
      } else {
        // Track unmatched centers for admin review
        const totalStudents =
          (jsonCenter.students_2022_23 || 0) +
          (jsonCenter.students_2023_24 || 0) +
          (jsonCenter.students_2024_25 || 0);

        if (totalStudents > 0) {
          // Extract city for debugging
          const locationParts = jsonLocation
            .split(",")
            .map((p) => p.trim())
            .filter((p) => p.length > 0);
          const cityName = locationParts[0] || "Unknown";

          unmatchedCenters.push({
            centerName: jsonCenter.centerName,
            extractedCity: cityName,
            fullLocation: jsonCenter.location,
            state: jsonCenter.state,
            totalStudents: totalStudents,
            suggestion: `${jsonCenter.centerName} ${cityName}`, // Suggested DB center name
          });
        }
      }
    });

    // Return matching results for useEffect logging
    window.__matchingResults = {
      unmatchedCenters,
      historicalPartnerMap,
      totalCenters: getFilteredHistoricalData.length,
      matchedCount: getFilteredHistoricalData.length - unmatchedCenters.length,
      dbCentersCount: Object.keys(centerToPartnerMap).length,
    };

    // Merge historical partner data with API partner data (ADDITION)
    Object.values(historicalPartnerMap).forEach((historicalPartner) => {
      const existingPartner = mergedPartnerData.find(
        (p) => p.partner_id === historicalPartner.partner_id,
      );
      if (existingPartner) {
        // Add JSON students to API students (ADDITION formula)
        existingPartner.total_students =
          (parseInt(existingPartner.total_students) || 0) +
          (historicalPartner.total_students || 0);
      } else {
        // Add as new partner with only historical data (no gender breakdown)
        mergedPartnerData.push({
          partner_id: historicalPartner.partner_id,
          partner_name: historicalPartner.partner_name,
          total_students: historicalPartner.total_students,
          male_students: 0, // JSON has no gender data
          female_students: 0, // JSON has no gender data
          centers_count: 0, // Can't determine from JSON
        });
      }
    });

    // Sort partners by total students and limit to top 10
    mergedPartnerData.sort(
      (a, b) =>
        (parseInt(b.total_students) || 0) - (parseInt(a.total_students) || 0),
    );
    const topMergedPartners = mergedPartnerData.slice(0, 10);

    // Merge center breakdown with historical data
    const mergedCenterBreakdown = mergeCenterData(
      historicalCenterData,
      analytics.centerBreakdown || [],
      filters.financialYear
    );

    return {
      ...analytics,
      studentsByState: mergedStateData,
      topCenters: topMergedCenters,
      partnerBreakdown: topMergedPartners,
      centerBreakdown: mergedCenterBreakdown,
    };
  }, [
    analytics,
    getHistoricalStateDistribution,
    getHistoricalTopCenters,
    getFilteredHistoricalData,
    filterOptions.centers,
    filters.financialYear,
  ]);

  // Log matching results ONCE (prevents console spam)
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

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
                value=""
                onChange={undefined}
                placeholder=""
                filterGroups={[
                  {
                    label: "Financial Year",
                    key: "financialYear",
                    options: [
                      { value: "all", label: "All Years" },
                      { value: "2022-23", label: "FY 2022-23" },
                      { value: "2023-24", label: "FY 2023-24" },
                      { value: "2024-25", label: "FY 2024-25" },
                      ...(Array.isArray(analytics?.availableYears)
                        ? analytics.availableYears
                            .filter(
                              (year) =>
                                !["2022-23", "2023-24", "2024-25"].includes(
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
                  <StatCard
                    title="Total Students"
                    value={mergedStats?.total_students || 0}
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
                                  ),
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
                                    (g) => g.gender === "Female",
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
                                    (g) => g.gender === "Male",
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
                        {Array.isArray(mergedAnalytics?.partnerBreakdown) &&
                        mergedAnalytics.partnerBreakdown.length > 0 ? (
                          mergedAnalytics.partnerBreakdown.map((partner) => (
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
                    Center-wise Breakdown (Top 20)
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
                        {Array.isArray(mergedAnalytics?.centerBreakdown) &&
                        mergedAnalytics.centerBreakdown.length > 0 ? (
                          mergedAnalytics.centerBreakdown.map((center) => (
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
