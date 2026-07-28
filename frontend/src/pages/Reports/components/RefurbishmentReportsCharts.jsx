import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BLUE,
  CARD_CLASS,
  CHART_AXIS_COLOR,
  CHART_COLORS,
  CHART_GRID_COLOR,
  GREEN,
} from "../reports.constants";
import { ChartTooltip, Skeleton } from "../reports.helpers";
import {
  buildRefurbishmentPartnerChart,
  buildRefurbishmentStatusMix,
} from "../../../utils/refurbishmentReportUtils";

const ChartShell = ({ title, description, children, loading, empty, emptyHint }) => (
  <div className={`${CARD_CLASS} overflow-hidden`}>
    <div className="px-4 pt-4 pb-2">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      {description ? (
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      ) : null}
    </div>
    <div className="px-2 pb-4">
      {loading ? (
        <div className="h-64 px-2">
          <Skeleton h="h-full" />
        </div>
      ) : empty ? (
        <div className="h-64 flex flex-col items-center justify-center gap-1 px-4 text-center">
          <p className="text-sm font-medium text-gray-500">No data for this period</p>
          {emptyHint ? (
            <p className="text-xs text-gray-400 max-w-xs">{emptyHint}</p>
          ) : null}
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);

const RefurbishmentReportsCharts = ({
  loading = false,
  rows = [],
  yearLabel = "",
}) => {
  const statusMix = useMemo(() => buildRefurbishmentStatusMix(rows), [rows]);
  const partnerData = useMemo(
    () => buildRefurbishmentPartnerChart(rows, 10),
    [rows],
  );
  const emptyHint = yearLabel
    ? `Try another period (${yearLabel}).`
    : "Try another period.";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartShell
        title="Request status mix"
        description="Past requests in the selected calendar year"
        loading={loading}
        empty={statusMix.length === 0}
        emptyHint={emptyHint}
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={statusMix}
            margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
            barSize={28}
          >
            <CartesianGrid
              strokeDasharray="0"
              stroke={CHART_GRID_COLOR}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={56}
            />
            <YAxis
              tick={{ fontSize: 12, fill: CHART_AXIS_COLOR }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <RechartsTooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Requests" radius={[6, 6, 0, 0]}>
              {statusMix.map((entry, idx) => (
                <Cell
                  key={entry.key}
                  fill={CHART_COLORS[idx % CHART_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell
        title="Top partners by requests"
        description="Top 10 partners by request volume in the selected year"
        loading={loading}
        empty={partnerData.length === 0}
        emptyHint={emptyHint}
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={partnerData}
            layout="vertical"
            margin={{ top: 4, right: 28, left: 8, bottom: 4 }}
            barCategoryGap="28%"
            barSize={14}
          >
            <CartesianGrid
              strokeDasharray="0"
              stroke={CHART_GRID_COLOR}
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="partner"
              width={100}
              tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                String(v).length > 14 ? `${String(v).slice(0, 13)}…` : v
              }
            />
            <RechartsTooltip content={<ChartTooltip />} />
            <Bar
              dataKey="requests"
              name="Requests"
              fill={BLUE}
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="completed"
              name="Completed"
              fill={GREEN}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
};

export default RefurbishmentReportsCharts;
