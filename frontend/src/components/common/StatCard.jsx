import React from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";

/**
 * Reusable StatCard Component for Dashboard & Data Management
 * @param {string} title - Card title (e.g., "Total Partners")
 * @param {string|number} value - Main metric value (e.g., "51")
 * @param {string} trend - "up" or "down" (manual control for now)
 * @param {array} graphData - Array of data points for chart: [{ value: 42 }, { value: 44 }, ...]
 */
const StatCard = ({ title, value, trend = "up", graphData = [] }) => {
  // Clean the title to create a valid SVG ID (no spaces)
  const cleanId = title.replace(/\s+/g, "-").toLowerCase();

  const isUpTrend = trend === "up";
  const TrendIcon = isUpTrend ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

  return (
    <div className="relative bg-white rounded-[16px] border border-[#A5A5A5] p-3 transition-shadow duration-300 min-h-[120px] flex flex-col">
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

export default StatCard;
