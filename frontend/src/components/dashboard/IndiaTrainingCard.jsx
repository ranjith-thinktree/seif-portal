import React, { useState, useEffect } from "react";
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  AcademicCapIcon,
  UsersIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import IndiaMap from "./IndiaMap";

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
const IndiaMapComponent = ({ stateStats, selectedStateCode, onStateHover }) => {
  const [hoveredState, setHoveredState] = React.useState(null);

  const statesWithData = React.useMemo(
    () => Object.keys(stateStats).filter((code) => stateStats[code]?.hasData),
    [stateStats]
  );

  // Calculate colors for each state
  const stateColors = React.useMemo(() => {
    const colors = {};
    Object.keys(STATE_CODE_MAP).forEach((code) => {
      const isHovered = hoveredState === code;
      const isSelected = selectedStateCode === code;
      const hasData = statesWithData.includes(code);

      if (isHovered) {
        if (isSelected) colors[code] = "#CC7100"; // Darker orange
        else if (hasData) colors[code] = "#E5C560"; // Darker gold
        else colors[code] = "#D0D0D0"; // Darker grey
      } else {
        if (isSelected) colors[code] = "#E47F00"; // Orange
        else if (hasData) colors[code] = "#FFD978"; // Gold
        else colors[code] = "#E7E7E7"; // Grey
      }
    });
    return colors;
  }, [hoveredState, selectedStateCode, statesWithData]);

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
 */
const IndiaTrainingCard = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [hoveredStateCode, setHoveredStateCode] = useState("KA"); // Active state on hover, default Karnataka
  const [stateStats, setStateStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Generate year options (last 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  /**
   * Fetch state statistics from API
   */
  useEffect(() => {
    const fetchStateStats = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual API endpoint
        // const response = await fetch(`/api/dashboard/state-stats?year=${selectedYear}`);
        // const data = await response.json();
        // setStateStats(data.stateStats);

        // Mock data for demonstration
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

        // Set first state with data as active if current hover state has no data
        if (!mockData[hoveredStateCode]?.hasData) {
          const firstStateWithData = Object.keys(mockData).find(
            (code) => mockData[code].hasData
          );
          if (firstStateWithData) {
            setHoveredStateCode(firstStateWithData);
          }
        }
      } catch (error) {
        console.error("Error fetching state stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStateStats();
  }, [selectedYear, hoveredStateCode]);

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
            />
          </div>
        </div>
        {/* Stats Panel (Right - 1/3) */}
        <div className="lg:col-span-1 h-fit">
          {/* Year Dropdown - Top Right */}
          <div className="absolute top-6 right-6 z-10">
            <div className="relative inline-block min-w-[220px]">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="appearance-none w-full bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors cursor-pointer"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    Calendar Year (CY) {year}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500" />
            </div>
          </div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndiaTrainingCard;
