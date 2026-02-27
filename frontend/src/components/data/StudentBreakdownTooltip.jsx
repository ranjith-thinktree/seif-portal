import React from "react";
import PropTypes from "prop-types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Student Breakdown Tooltip Component
 * Displays India/Greater India/NSI breakdown on hover
 */
const StudentBreakdownTooltip = ({ breakdown, children }) => {
  const { india = 0, greater_india = 0, nsi = 0, total = 0 } = breakdown || {};

  // Calculate percentages
  const indiaPercent = total > 0 ? ((india / total) * 100).toFixed(1) : 0;
  const greaterIndiaPercent =
    total > 0 ? ((greater_india / total) * 100).toFixed(1) : 0;
  const nsiPercent = total > 0 ? ((nsi / total) * 100).toFixed(1) : 0;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="cursor-help">{children}</div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="bg-white border border-gray-200 shadow-lg p-4 rounded-lg"
        >
          <div className="space-y-2 min-w-[200px]">
            <div className="text-sm font-semibold text-gray-900 border-b pb-2">
              Student Breakdown
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">India:</span>
              <span className="font-medium text-gray-900">
                {india.toLocaleString()} ({indiaPercent}%)
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Greater India:</span>
              <span className="font-medium text-gray-900">
                {greater_india.toLocaleString()} ({greaterIndiaPercent}%)
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">NSI:</span>
              <span className="font-medium text-gray-900">
                {nsi.toLocaleString()} ({nsiPercent}%)
              </span>
            </div>

            <div className="flex justify-between items-center text-sm pt-2 border-t font-semibold">
              <span className="text-gray-700">Total:</span>
              <span className="text-gray-900">{total.toLocaleString()}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

StudentBreakdownTooltip.propTypes = {
  breakdown: PropTypes.shape({
    india: PropTypes.number,
    greater_india: PropTypes.number,
    nsi: PropTypes.number,
    total: PropTypes.number,
  }).isRequired,
  children: PropTypes.node.isRequired,
};

export default StudentBreakdownTooltip;
