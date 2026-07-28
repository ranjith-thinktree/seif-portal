import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BLUE,
  CARD_CLASS,
  CHART_AXIS_COLOR,
  CHART_GRID_COLOR,
  GREEN,
  PINK,
} from "../reports.constants";
import { ChartTooltip, Skeleton, fmt } from "../reports.helpers";
import {
  buildCertificationPartnerChart,
  buildCertificationResultsMix,
  buildCertificationTrend,
  shouldShowCertificationTrend,
} from "../../../utils/certificationReportChartUtils";

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

const CertificationReportsCharts = ({
  loading = false,
  rows = [],
  kpis = {},
  mode = "month",
  periodLabel = "",
}) => {
  const resultsMix = useMemo(
    () => buildCertificationResultsMix(kpis, rows),
    [kpis, rows],
  );
  const partnerData = useMemo(
    () => buildCertificationPartnerChart(rows, 10),
    [rows],
  );
  const showTrend = shouldShowCertificationTrend(mode);
  const trend = useMemo(
    () =>
      showTrend
        ? buildCertificationTrend(rows, mode)
        : { data: [], granularity: "month" },
    [rows, mode, showTrend],
  );

  const resultsEmpty = !resultsMix.some((d) => d.value > 0);
  const partnerEmpty = partnerData.length === 0;
  const trendEmpty = trend.data.length === 0;
  const emptyHint = periodLabel
    ? `Try another assessment period (${periodLabel}).`
    : "Try another assessment period.";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartShell
          title="Trainee results"
          description="Registered, attended, passed and failed for the selected period"
          loading={loading}
          empty={resultsEmpty}
          emptyHint={emptyHint}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={resultsMix}
              margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
              barSize={36}
            >
              <CartesianGrid
                strokeDasharray="0"
                stroke={CHART_GRID_COLOR}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: CHART_AXIS_COLOR }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: CHART_AXIS_COLOR }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <RechartsTooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Trainees" radius={[6, 6, 0, 0]}>
                {resultsMix.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell
          title="Top partners by passed"
          description="Top 10 partners in the selected assessment period"
          loading={loading}
          empty={partnerEmpty}
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
                dataKey="passed"
                name="Passed"
                fill={GREEN}
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="registered"
                name="Registered"
                fill={BLUE}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>

      {showTrend && (
        <ChartShell
          title="Certification trend"
          description={
            trend.granularity === "day"
              ? "Requests and trainee results by assessment day"
              : "Requests and trainee results by assessment month"
          }
          loading={loading}
          empty={trendEmpty}
          emptyHint={emptyHint}
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={trend.data}
              margin={{ top: 8, right: 24, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="0"
                stroke={CHART_GRID_COLOR}
                vertical={false}
              />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: CHART_AXIS_COLOR }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <RechartsTooltip
                content={<ChartTooltip />}
                formatter={(value) => fmt(value)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="requests"
                name="Requests"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ fill: "#6366f1", r: 3, strokeWidth: 2, stroke: "white" }}
              />
              <Line
                type="monotone"
                dataKey="registered"
                name="Registered"
                stroke={BLUE}
                strokeWidth={2.5}
                dot={{ fill: BLUE, r: 3, strokeWidth: 2, stroke: "white" }}
              />
              <Line
                type="monotone"
                dataKey="passed"
                name="Passed"
                stroke={GREEN}
                strokeWidth={2.5}
                dot={{ fill: GREEN, r: 3, strokeWidth: 2, stroke: "white" }}
              />
              <Line
                type="monotone"
                dataKey="failed"
                name="Failed"
                stroke={PINK}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ fill: PINK, r: 3, strokeWidth: 2, stroke: "white" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartShell>
      )}
    </div>
  );
};

export default CertificationReportsCharts;
