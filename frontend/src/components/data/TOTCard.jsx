import React from "react";
import PropTypes from "prop-types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * TOT Card Component - Training of Trainers Statistics
 * Displays TOT count with trend indicator and mini graph
 */
const TOTCard = ({ value, trend = "up", graphData = [] }) => {
  const trendIcon = trend === "up" ? TrendingUp : TrendingDown;
  const TrendIcon = trendIcon;
  const trendColor = trend === "up" ? "text-green-600" : "text-red-600";

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          Training of Trainers (TOT)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl font-bold text-gray-900">
            {value?.toLocaleString() || 0}
          </div>
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              {trend === "up" ? "↑" : "↓"}
            </span>
          </div>
        </div>

        {/* Mini Graph */}
        {graphData && graphData.length > 0 && (
          <div className="flex items-end gap-1 h-12">
            {graphData.map((point, index) => {
              const maxValue = Math.max(...graphData.map((p) => p.value || 0));
              const height = ((point.value || 0) / maxValue) * 100;

              return (
                <div
                  key={index}
                  className="flex-1 bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                  style={{ height: `${height}%` }}
                  title={`${point.value || 0}`}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

TOTCard.propTypes = {
  value: PropTypes.number.isRequired,
  trend: PropTypes.oneOf(["up", "down"]),
  graphData: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.number,
    }),
  ),
};

export default TOTCard;
