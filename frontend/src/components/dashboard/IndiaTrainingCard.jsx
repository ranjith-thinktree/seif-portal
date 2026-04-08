import React, { useState, useEffect } from "react";
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  AcademicCapIcon,
  UsersIcon,
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import IndiaMap from "./IndiaMap";
import * as dataService from "../../services/data.service";

/**
 * State code mapping for @react-map/india package
 * This package uses 2-letter state codes
 */
const STATE_CODE_MAP = {
  JK: "Jammu & Kashmir",
  HP: "Himachal Pradesh",
  PB: "Punjab",
  CH: "Chandigarh",
  UK: "Uttarakhand",
  HR: "Haryana",
  DL: "Delhi",
  RJ: "Rajasthan",
  UP: "Uttar Pradesh",
  BR: "Bihar",
  SK: "Sikkim",
  AR: "Arunachal Pradesh",
  NL: "Nagaland",
  MN: "Manipur",
  MZ: "Mizoram",
  TR: "Tripura",
  ML: "Meghalaya",
  AS: "Assam",
  WB: "West Bengal",
  JH: "Jharkhand",
  OD: "Odisha",
  CG: "Chhattisgarh",
  MP: "Madhya Pradesh",
  GJ: "Gujarat",
  MH: "Maharashtra",
  AP: "Andhra Pradesh",
  KA: "Karnataka",
  GA: "Goa",
  KL: "Kerala",
  TN: "Tamil Nadu",
  TG: "Telangana",
  AN: "Andaman & Nicobar",
  PY: "Puducherry",
  LD: "Lakshadweep",
  DN: "Dadra & Nagar Haveli and Daman & Diu",
  LA: "Ladakh",
};

/**
 * India Map Wrapper Component
 */
const IndiaMapComponent = ({
  stateStats,
  selectedStateCode,
  onStateHover,
  onStateClick,
}) => {
  const [hoveredState, setHoveredState] = React.useState(null);

  // Calculate colors for each state — green gradient by center count
  const stateColors = React.useMemo(() => {
    const colors = {};

    // Find max center count to normalise the gradient
    const maxCenters = Math.max(
      1,
      ...Object.values(stateStats).map((s) => s?.centers || 0),
    );

    /**
     * Interpolate between light green (#C8EFC1) and dark green (#1A6B2C).
     * ratio: 0–1 (1 = most centers = darkest green)
     * darken: apply a 15% darkening for hover states
     */
    const greenShade = (centers, darken = false) => {
      const rawRatio = centers / maxCenters;
      // Ensure a visible minimum shade for any state with data
      const ratio = rawRatio < 0.1 ? 0.1 : rawRatio;
      const factor = darken ? 0.82 : 1;

      const r = Math.round((200 - ratio * 174) * factor);
      const g = Math.round((239 - ratio * 132) * factor);
      const b = Math.round((193 - ratio * 149) * factor);
      return `rgb(${r}, ${g}, ${b})`;
    };

    Object.keys(STATE_CODE_MAP).forEach((code) => {
      const isHovered = hoveredState === code;
      const isSelected = selectedStateCode === code;
      const centers = stateStats[code]?.centers || 0;
      const hasData = centers > 0;

      if (isSelected) {
        colors[code] = isHovered ? "#CC7100" : "#E47F00"; // Orange for selected
      } else if (hasData) {
        colors[code] = greenShade(centers, isHovered);
      } else {
        colors[code] = isHovered ? "#D0D0D0" : "#E7E7E7"; // Grey for no data
      }
    });

    return colors;
  }, [hoveredState, selectedStateCode, stateStats]);

  const handleStateHover = (stateCode) => {
    setHoveredState(stateCode);
    // Only update selected state if it has data
    if (onStateHover && stateStats[stateCode]?.hasData) {
      onStateHover(stateCode);
    }
  };

  const handleStateLeave = () => {
    setHoveredState(null);
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <IndiaMap
        stateColors={stateColors}
        onStateHover={handleStateHover}
        onStateLeave={handleStateLeave}
        onStateClick={onStateClick}
      />
    </div>
  );
};

/**
 * Stat Item Component
 */
// eslint-disable-next-line no-unused-vars
const StatItem = ({ icon: IconComponent, label, value }) => {
  return (
    <div className="flex items-start gap-3">
      {/* Icon Container */}
      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mt-1">
        <IconComponent className="w-5 h-5 text-gray-700" />
      </div>

      {/* Label and Value */}
      <div className="flex-1">
        <p className="text-sm text-gray-600 mb-1">{label}</p>
        <p className="text-sm font-bold text-gray-900">
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
};

/**
 * India Training Overview Card
 * @param {string} selectedYear - The currently selected year ('all' or year number)
 * @param {boolean} showOnlyCounts - If true, show only count statistics
 */
const IndiaTrainingCard = ({
  selectedYear = "all",
  showOnlyCounts = false,
}) => {
  const [hoveredStateCode, setHoveredStateCode] = useState("KA"); // Active state on hover, default Karnataka
  const [stateStats, setStateStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // B13: State click detail panel
  const [clickedStateCode, setClickedStateCode] = useState(null);
  const [stateDetail, setStateDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /**
   * Fetch state statistics from API
   */
  useEffect(() => {
    const fetchStateStats = async () => {
      setIsLoading(true);
      try {
        // Fetch real data from backend API
        const response = await dataService.getStateStats(selectedYear);
        const data = response?.data || response;

        console.log("🗺️ Raw State Stats Response:", response);
        console.log("🗺️ Processed State Stats:", data);
        console.log("🗺️ State Stats Type:", typeof data);
        console.log("🗺️ Number of States:", Object.keys(data || {}).length);

        // Set state statistics from API
        setStateStats(data);

        console.log("✅ State Stats Set Successfully");

        /* DEPRECATED: Mock data replaced with real API
        const mockData = {
          OD: {
            name: "Odisha",
            centers: 12,
            trainers: 45,
            trainees: 1248,
            femaleTrainees: 342,
            hasData: true,
          },
          KA: {
            name: "Karnataka",
            centers: 8,
            trainers: 32,
            trainees: 856,
            femaleTrainees: 223,
            hasData: true,
          },
          MH: {
            name: "Maharashtra",
            centers: 15,
            trainers: 58,
            trainees: 1567,
            femaleTrainees: 445,
            hasData: true,
          },
          TN: {
            name: "Tamil Nadu",
            centers: 10,
            trainers: 38,
            trainees: 1024,
            femaleTrainees: 298,
            hasData: true,
          },
          UP: {
            name: "Uttar Pradesh",
            centers: 18,
            trainers: 67,
            trainees: 1892,
            femaleTrainees: 512,
            hasData: true,
          },
          WB: {
            name: "West Bengal",
            centers: 7,
            trainers: 28,
            trainees: 734,
            femaleTrainees: 201,
            hasData: true,
          },
          // Other states with no data
          JK: {
            name: "Jammu & Kashmir",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          HP: {
            name: "Himachal Pradesh",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          PB: {
            name: "Punjab",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          HR: {
            name: "Haryana",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          DL: {
            name: "Delhi",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          RJ: {
            name: "Rajasthan",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          UK: {
            name: "Uttarakhand",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          MP: {
            name: "Madhya Pradesh",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          GJ: {
            name: "Gujarat",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          CG: {
            name: "Chhattisgarh",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          JH: {
            name: "Jharkhand",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          BR: {
            name: "Bihar",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          AS: {
            name: "Assam",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          ML: {
            name: "Meghalaya",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          MN: {
            name: "Manipur",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          NL: {
            name: "Nagaland",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          TR: {
            name: "Tripura",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          SK: {
            name: "Sikkim",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          AP: {
            name: "Andhra Pradesh",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          TG: {
            name: "Telangana",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          KL: {
            name: "Kerala",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
          GA: {
            name: "Goa",
            centers: 0,
            trainers: 0,
            trainees: 0,
            femaleTrainees: 0,
            hasData: false,
          },
        };
        setStateStats(mockData);
        */

        // Set first state with data as active if current hover state has no data
        if (data && !data[hoveredStateCode]?.hasData) {
          const firstStateWithData = Object.keys(data).find(
            (code) => data[code].hasData,
          );
          if (firstStateWithData) {
            setHoveredStateCode(firstStateWithData);
            console.log("🗺️ First state with data:", firstStateWithData);
          }
        }
      } catch (error) {
        console.error("❌ Error fetching state stats:", error);
        console.error("❌ Error details:", error.message);
        setStateStats({}); // Set empty object on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchStateStats();
  }, [selectedYear]);

  /**
   * TODO: Real-time updates via WebSocket/SSE
   * Uncomment and configure when backend is ready
   */
  // useEffect(() => {
  //   const ws = new WebSocket('/api/dashboard/state-stats/stream');
  //
  //   ws.onmessage = (event) => {
  //     const data = JSON.parse(event.data);
  //     const { stateCode, centers, trainers, trainees, femaleTrainees } = data;
  //
  //     setStateStats((prev) => ({
  //       ...prev,
  //       [stateCode]: {
  //         ...prev[stateCode],
  //         centers,
  //         trainers,
  //         trainees,
  //         femaleTrainees,
  //         hasData: true,
  //       },
  //     }));
  //   };
  //
  //   return () => ws.close();
  // }, []);

  const handleStateHover = React.useCallback((stateCode) => {
    setHoveredStateCode(stateCode);
  }, []);

  const handleStateClick = React.useCallback(
    async (stateCode) => {
      const stateName =
        stateStats[stateCode]?.name || STATE_CODE_MAP[stateCode];
      if (!stateName) return;

      setClickedStateCode(stateCode);
      setStateDetail(null);
      setDetailLoading(true);
      try {
        const detail = await dataService.getStateDetail(
          stateName,
          selectedYear,
        );
        setStateDetail(detail);
      } catch (err) {
        console.error("Error fetching state detail:", err);
      } finally {
        setDetailLoading(false);
      }
    },
    [stateStats, selectedYear],
  );

  // Memoize selected state to prevent flickering
  const selectedState = React.useMemo(() => {
    return (
      stateStats[hoveredStateCode] || {
        name: STATE_CODE_MAP[hoveredStateCode] || "Select a state",
        centers: 0,
        trainers: 0,
        trainees: 0,
        femaleTrainees: 0,
        hasData: false,
      }
    );
  }, [hoveredStateCode, stateStats]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-xl shadow-sm p-6 border-[#A5A5A5] border">
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 items-end ">
        {/* Map Area (Left - 2/3) */}
        <div className="lg:col-span-2">
          <div className="rounded-lg h-full min-h-[450px] flex items-center justify-center">
            <IndiaMapComponent
              stateStats={stateStats}
              selectedStateCode={hoveredStateCode}
              onStateHover={handleStateHover}
              onStateClick={handleStateClick}
            />
          </div>
        </div>
        {/* Stats Panel (Right - 1/3) */}
        <div className="lg:col-span-1 h-fit">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* State Name */}
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {selectedState.name}
            </h3>

            {!selectedState.hasData && (
              <p className="text-sm text-gray-500 mb-4">
                No training data available
              </p>
            )}

            {/* Stats List */}
            {showOnlyCounts ? (
              /* Simplified view — only centers count */
              <div className="space-y-5">
                <StatItem
                  icon={BuildingOfficeIcon}
                  label="No. of centers"
                  value={selectedState.centers}
                />
              </div>
            ) : (
              /* Full view - show all stats including female trainees */
              <div className="space-y-5">
                <StatItem
                  icon={BuildingOfficeIcon}
                  label="No. of centers"
                  value={selectedState.centers}
                />
                <StatItem
                  icon={AcademicCapIcon}
                  label="Trainers"
                  value={selectedState.trainers}
                />
                <StatItem
                  icon={UserGroupIcon}
                  label="Trainees"
                  value={selectedState.trainees}
                />
                <StatItem
                  icon={UsersIcon}
                  label="Female Trainees"
                  value={selectedState.femaleTrainees}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* B13: State Detail Panel — slide-in from right */}
      {clickedStateCode && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          onClick={() => setClickedStateCode(null)}
        >
          <div
            className="w-full max-w-md bg-white shadow-2xl border-l border-gray-200 flex flex-col h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {stateStats[clickedStateCode]?.name ||
                    STATE_CODE_MAP[clickedStateCode] ||
                    clickedStateCode}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Course (Lab) Breakdown
                </p>
              </div>
              <button
                onClick={() => setClickedStateCode(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 px-6 py-5">
              {detailLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-[#009530] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : stateDetail ? (
                <>
                  {/* Summary counts */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <BuildingOfficeIcon className="w-6 h-6 text-[#009530] mx-auto mb-1" />
                      <p className="text-2xl font-bold text-gray-900">
                        {stateDetail.centerCount}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Centers</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <UserGroupIcon className="w-6 h-6 text-[#009530] mx-auto mb-1" />
                      <p className="text-2xl font-bold text-gray-900">
                        {stateDetail.totalStudents}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Students</p>
                    </div>
                  </div>

                  {/* Course breakdown */}
                  {stateDetail.courseBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Courses
                      </h3>
                      {stateDetail.courseBreakdown.map((course, idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className="text-sm text-gray-700 truncate max-w-[70%]"
                              title={course.courseName}
                            >
                              {course.courseName}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 ml-2 flex-shrink-0">
                              {course.studentCount}{" "}
                              <span className="text-xs font-normal text-gray-500">
                                ({course.percentage}%)
                              </span>
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-[#009530] h-2 rounded-full transition-all duration-500"
                              style={{ width: `${course.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AcademicCapIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">
                        No course data available for this state
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">
                    Could not load state details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndiaTrainingCard;
