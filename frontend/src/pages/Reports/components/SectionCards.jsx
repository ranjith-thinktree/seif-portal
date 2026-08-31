import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../components/common";
import IndiaTrainingCard from "../../../components/dashboard/IndiaTrainingCard";
import {
  BarChart,
  Bar,
  LabelList,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  GREEN,
  BLUE,
  PINK,
  GRAY,
  CARD_CLASS,
  TOOLTIP_STYLE,
  BAND_COLORS,
  CHART_COLORS,
  CHART_GRID_COLOR,
  CHART_AXIS_COLOR,
  CHART_LABEL_COLOR,
} from "../reports.constants";
import {
  fmt,
  fmtPct,
  Skeleton,
  PctBadge,
  DownloadBtn,
  ChartTooltip,
} from "../reports.helpers";

// ─── India Map ─────────────────────────────────────────────────────────────────
export function IndiaMapCard({ loading, year }) {
  return (
    <div className="w-full flex flex-col flex-1">
      <IndiaTrainingCard selectedYear={year} showOnlyCounts={false} />
    </div>
  );
}

// ─── Gender Breakdown ──────────────────────────────────────────────────────────
export function GenderPieCard({ loading, gender }) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">
            Gender Breakdown
          </CardTitle>
          <CardDescription>Male / Female / Other trainees</CardDescription>
        </div>
        <DownloadBtn
          rows={gender.map((g) => ({ Gender: g.name, Count: g.value }))}
          filename="gender_breakdown"
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton h="h-72" />
        ) : gender.length === 0 ? (
          <div className="h-72 flex items-center justify-center">
            <p className="text-sm text-gray-400">No data available</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={gender}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={96}
                  innerRadius={60}
                  paddingAngle={3}
                  strokeWidth={2}
                  stroke="white"
                >
                  {gender.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === "Male"
                          ? BLUE
                          : entry.name === "Female"
                            ? PINK
                            : GRAY
                      }
                    />
                  ))}
                </Pie>
                <RechartsTooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {gender.map((g) => (
                <div
                  key={g.name}
                  className="flex items-center gap-1.5 text-sm text-gray-700"
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{
                      background:
                        g.name === "Male"
                          ? BLUE
                          : g.name === "Female"
                            ? PINK
                            : GRAY,
                    }}
                  />
                  <span className="text-gray-500">{g.name}:</span>
                  <strong>{fmt(g.value)}</strong>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Year-over-Year Trends ─────────────────────────────────────────────────────
export function YoyCard({ loading, trend }) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">
            Year-over-Year Trends
          </CardTitle>
          <CardDescription>
            Enrollment, employment and female participation across all financial
            years
          </CardDescription>
        </div>
        <DownloadBtn
          rows={trend.map((r) => ({
            "Financial Year": r.fy,
            Enrolled: r.enrolled,
            Female: r.female,
            Employed: r.employed,
          }))}
          filename="yoy_trend"
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton h="h-64" />
        ) : trend.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-gray-400">No trend data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={trend}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="0"
                stroke={CHART_GRID_COLOR}
                vertical={false}
              />
              <XAxis
                dataKey="fy"
                tick={{ fontSize: 12, fill: CHART_AXIS_COLOR }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: CHART_AXIS_COLOR }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip content={<ChartTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="enrolled"
                name="Enrolled"
                stroke={BLUE}
                strokeWidth={2.5}
                dot={{ fill: BLUE, r: 4, strokeWidth: 2, stroke: "white" }}
                activeDot={{
                  r: 7,
                  strokeWidth: 2,
                  stroke: "white",
                  fill: BLUE,
                }}
              />
              <Line
                type="monotone"
                dataKey="employed"
                name="Employed"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ fill: "#10b981", r: 4, strokeWidth: 2, stroke: "white" }}
                activeDot={{
                  r: 7,
                  strokeWidth: 2,
                  stroke: "white",
                  fill: "#10b981",
                }}
              />
              <Line
                type="monotone"
                dataKey="female"
                name="Female Trainees"
                stroke={PINK}
                strokeWidth={2.5}
                dot={{ fill: PINK, r: 4, strokeWidth: 2, stroke: "white" }}
                activeDot={{
                  r: 7,
                  strokeWidth: 2,
                  stroke: "white",
                  fill: PINK,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Salary Distribution ───────────────────────────────────────────────────────
export function SalaryCard({ loading, performance }) {
  const total = performance.reduce((s, r) => s + (r.count || 0), 0);
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">
            Salary Distribution
          </CardTitle>
          <CardDescription>
            Employed graduates by monthly salary band
          </CardDescription>
        </div>
        <DownloadBtn
          rows={performance.map((r) => ({
            "Salary Band": r.band,
            Count: r.count,
            "Share %": total ? ((r.count / total) * 100).toFixed(1) : 0,
          }))}
          filename="salary_distribution"
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton h="h-56" />
        ) : performance.length === 0 ? (
          <div className="h-56 flex items-center justify-center">
            <p className="text-sm text-gray-400">No data available</p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Summary pill */}
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-gray-800">
                {fmt(total)}
              </span>
              <span className="text-sm text-gray-400 font-medium">
                total placed
              </span>
            </div>
            {/* Band rows */}
            {performance.map((r) => {
              const pct = total ? Math.round((r.count / total) * 100) : 0;
              const color = BAND_COLORS[r.band] || GRAY;
              return (
                <div key={r.band} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      {r.band}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold" style={{ color }}>
                        {fmt(r.count)}
                      </span>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: color + "22", color }}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Students by State ─────────────────────────────────────────────────────────
export function StateCard({ loading, states }) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">
            Students by State
          </CardTitle>
          <CardDescription>Top 15 states by enrollment</CardDescription>
        </div>
        <DownloadBtn
          rows={states.map((r) => ({ State: r.state, Students: r.students }))}
          filename="state_distribution"
        />
      </CardHeader>
      <CardContent className="px-5 pb-4 pt-1">
        {loading ? (
          <div className="space-y-2.5 pt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-5 bg-gray-100 rounded animate-pulse shrink-0" />
                <div
                  className="h-4 bg-gray-100 rounded animate-pulse"
                  style={{ width: `${55 + (i % 4) * 10}%` }}
                />
                <div className="ml-auto w-14 h-5 bg-gray-100 rounded animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        ) : states.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-gray-400">No data available</p>
          </div>
        ) : (
          (() => {
            const total = states.reduce((s, r) => s + Number(r.students), 0);
            const maxVal = Number(states[0]?.students) || 1;
            const RANK_COLORS = ["#F59E0B", "#94A3B8", "#CD7F32"];
            return (
              <div className="space-y-1.5 pt-1">
                {states.map((row, i) => {
                  const val = Number(row.students);
                  const pct =
                    total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
                  const barW = ((val / maxVal) * 100).toFixed(1);
                  const isTop3 = i < 3;
                  return (
                    <div
                      key={row.state}
                      className={`flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 ${i === 0 ? "bg-green-50/60" : ""}`}
                    >
                      <span
                        className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                        style={
                          isTop3
                            ? {
                                background: RANK_COLORS[i] + "22",
                                color: RANK_COLORS[i],
                              }
                            : { background: "#F3F4F6", color: "#9CA3AF" }
                        }
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-sm truncate block ${i === 0 ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}
                        >
                          {row.state}
                        </span>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${barW}%`,
                              background:
                                i === 0
                                  ? GREEN
                                  : i === 1
                                    ? "#34D399"
                                    : i === 2
                                      ? "#6EE7B7"
                                      : "#D1FAE5",
                            }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-right min-w-[80px]">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">
                          {fmt(val)}
                        </span>
                        <span className="text-xs text-gray-400 ml-1.5 tabular-nums">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-3 mt-1 border-t border-[#A5A5A5]/40">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Total
                  </span>
                  <span className="text-sm font-bold text-gray-900 tabular-nums">
                    {fmt(total)}
                  </span>
                </div>
              </div>
            );
          })()
        )}
      </CardContent>
    </Card>
  );
}

// ─── Course Performance (Table) ────────────────────────────────────────────────
export function CourseTableCard({ loading, courses }) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">
            Course Performance
          </CardTitle>
          <CardDescription>Top 10 courses by enrollment</CardDescription>
        </div>
        <DownloadBtn
          rows={courses.map((r) => ({
            Course: r.course_name,
            Enrolled: r.enrolled,
            Employed: r.employed,
            Entrepreneurs: r.entrepreneurs,
            "Placement %": r.completion_rate,
          }))}
          filename="course_performance"
        />
      </CardHeader>
      <CardContent className="p-0 pb-4">
        {loading ? (
          <div className="px-6 pt-4">
            <Skeleton h="h-48" />
          </div>
        ) : courses.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-gray-400">No data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#A5A5A5]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Enrolled
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Employed
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Entrep.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#A5A5A5]/40 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td
                      className="px-6 py-3 font-medium text-gray-900 max-w-[180px] truncate"
                      title={c.course_name}
                    >
                      {c.course_name}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {fmt(c.enrolled)}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600">
                      {fmt(c.employed)}
                    </td>
                    <td className="px-4 py-3 text-right text-purple-600">
                      {fmt(c.entrepreneurs)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PctBadge value={c.completion_rate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Enrolled vs Employed (Chart) ──────────────────────────────────────────────
export function CourseChartCard({ loading, courses }) {
  const totalEnrolled = courses.reduce((s, r) => s + (r.enrolled || 0), 0);
  const totalEmployed = courses.reduce((s, r) => s + (r.employed || 0), 0);
  const placementPct = totalEnrolled
    ? Math.round((totalEmployed / totalEnrolled) * 100)
    : 0;

  // Chart height: 60px per course, min 220px, max 500px
  const chartH = Math.max(220, Math.min(500, courses.length * 60 + 60));

  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">
            Enrolled vs Employed
          </CardTitle>
          <CardDescription>Per-course placement comparison</CardDescription>
        </div>
        <DownloadBtn
          rows={courses.map((r) => ({
            Course: r.course_name,
            Enrolled: r.enrolled,
            Employed: r.employed,
            "Placement %": r.completion_rate,
          }))}
          filename="enrolled_vs_employed"
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton h="h-64" />
        ) : courses.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-gray-400">No data available</p>
          </div>
        ) : (
          <>
            {/* Summary stats row */}
            <div className="flex items-center gap-6 mb-4 pb-4 border-b border-gray-100 shrink-0">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-gray-800">
                  {fmt(totalEnrolled)}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  Total Enrolled
                </span>
              </div>
              <div className="w-px h-10 bg-gray-200 shrink-0" />
              <div className="flex flex-col">
                <span
                  className="text-2xl font-bold"
                  style={{ color: "#10b981" }}
                >
                  {fmt(totalEmployed)}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  Total Employed
                </span>
              </div>
              <div className="w-px h-10 bg-gray-200 shrink-0" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold" style={{ color: GREEN }}>
                  {placementPct}%
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  Placement Rate
                </span>
              </div>
            </div>
            {/* Horizontal grouped bar chart */}
            <div style={{ height: chartH }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={courses}
                  layout="vertical"
                  margin={{ top: 4, right: 44, left: 90, bottom: 4 }}
                  barCategoryGap="35%"
                  barGap={4}
                  barSize={18}
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
                  />
                  <YAxis
                    type="category"
                    dataKey="course_name"
                    tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                    tickFormatter={(v) =>
                      v.length > 14 ? v.slice(0, 13) + "\u2026" : v
                    }
                  />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
                  <Bar
                    dataKey="enrolled"
                    name="Enrolled"
                    fill={BLUE}
                    radius={[0, 4, 4, 0]}
                  >
                    <LabelList
                      dataKey="enrolled"
                      position="right"
                      style={{
                        fontSize: 11,
                        fill: CHART_LABEL_COLOR,
                        fontWeight: 600,
                      }}
                      formatter={fmt}
                    />
                  </Bar>
                  <Bar
                    dataKey="employed"
                    name="Employed"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                  >
                    <LabelList
                      dataKey="employed"
                      position="right"
                      style={{ fontSize: 11, fill: "#10b981", fontWeight: 600 }}
                      formatter={fmt}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Partner Performance ───────────────────────────────────────────────────────
export function PartnerCard({ loading, partners }) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">
            Partner Performance
          </CardTitle>
          <CardDescription>
            Top 15 active partners ranked by students trained
          </CardDescription>
        </div>
        <DownloadBtn
          rows={partners.map((r) => ({
            Partner: r.partner_name,
            Centers: r.centers,
            "Students Trained": r.students_trained,
            Placed: r.placed,
            "Placement %": r.placement_pct,
            "Entrepreneur %": r.entrepreneurship_pct,
            Score: r.center_score ?? "",
          }))}
          filename="partner_performance"
        />
      </CardHeader>
      <CardContent className="p-0 pb-4">
        {loading ? (
          <div className="px-6 pt-4">
            <Skeleton h="h-48" />
          </div>
        ) : partners.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-gray-400">No data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#A5A5A5]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Partner
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Centers
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Placed
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Placement%
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Entrep%
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#A5A5A5]/40 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3 text-gray-400 font-medium">
                      {i + 1}
                    </td>
                    <td
                      className="px-4 py-3 font-semibold text-gray-900 max-w-[200px] truncate"
                      title={p.partner_name}
                    >
                      {p.partner_name}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {fmt(p.centers)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {fmt(p.students_trained)}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600">
                      {fmt(p.placed)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PctBadge value={p.placement_pct} />
                    </td>
                    <td className="px-4 py-3 text-right text-purple-600">
                      {fmtPct(p.entrepreneurship_pct)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="inline-flex items-center justify-center w-10 h-7 rounded font-bold text-xs"
                        style={{
                          background: "#F0FDF4",
                          color: GREEN,
                          border: `1px solid ${GREEN}33`,
                        }}
                      >
                        {p.center_score ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Centers by State ────────────────────────────────────────────────────────────
export function CenterStateCard({ loading, centersState }) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">
            Centers by State
          </CardTitle>
          <CardDescription>
            Top 15 states by active center count
          </CardDescription>
        </div>
        <DownloadBtn
          rows={centersState.map((r) => ({
            State: r.state,
            Centers: r.centers,
          }))}
          filename="centers_by_state"
        />
      </CardHeader>
      <CardContent className="px-5 pb-4 pt-1">
        {loading ? (
          <div className="space-y-2.5 pt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-5 bg-gray-100 rounded animate-pulse shrink-0" />
                <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse" />
                <div className="w-14 h-5 bg-gray-100 rounded animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        ) : centersState.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-gray-400">No data available</p>
          </div>
        ) : (
          (() => {
            const total = centersState.reduce(
              (s, r) => s + Number(r.centers),
              0,
            );
            const maxVal = Number(centersState[0]?.centers) || 1;
            const RANK_COLORS = ["#F59E0B", "#94A3B8", "#CD7F32"];
            return (
              <div className="space-y-1.5 pt-1">
                {centersState.map((row, i) => {
                  const val = Number(row.centers);
                  const pct =
                    total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
                  const barW = ((val / maxVal) * 100).toFixed(1);
                  const isTop3 = i < 3;
                  return (
                    <div
                      key={row.state}
                      className={`flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 ${i === 0 ? "bg-green-50/60" : ""}`}
                    >
                      <span
                        className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                        style={
                          isTop3
                            ? {
                                background: RANK_COLORS[i] + "22",
                                color: RANK_COLORS[i],
                              }
                            : { background: "#F3F4F6", color: "#9CA3AF" }
                        }
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-sm truncate block ${i === 0 ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}
                        >
                          {row.state}
                        </span>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${barW}%`,
                              background:
                                i === 0
                                  ? GREEN
                                  : i === 1
                                    ? "#34D399"
                                    : i === 2
                                      ? "#6EE7B7"
                                      : "#D1FAE5",
                            }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-right min-w-[80px]">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">
                          {fmt(val)}
                        </span>
                        <span className="text-xs text-gray-400 ml-1.5 tabular-nums">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-3 mt-1 border-t border-[#A5A5A5]/40">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Total
                  </span>
                  <span className="text-sm font-bold text-gray-900 tabular-nums">
                    {fmt(total)}
                  </span>
                </div>
              </div>
            );
          })()
        )}
      </CardContent>
    </Card>
  );
}

// ─── Centers Growth Trend ───────────────────────────────────────────────────────
export function CenterGrowthCard({ loading, centersGrowth }) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">
            Centers Growth
          </CardTitle>
          <CardDescription>
            Active centers with batches per financial year
          </CardDescription>
        </div>
        <DownloadBtn
          rows={centersGrowth.map((r) => ({
            "Financial Year": r.fy,
            Centers: r.centers,
          }))}
          filename="centers_growth"
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton h="h-64" />
        ) : centersGrowth.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-gray-400">No trend data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={centersGrowth}
              margin={{ top: 10, right: 24, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="0"
                stroke={CHART_GRID_COLOR}
                vertical={false}
              />
              <XAxis
                dataKey="fy"
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
              <Line
                type="monotone"
                dataKey="centers"
                name="Centers"
                stroke={GREEN}
                strokeWidth={2.5}
                dot={{ fill: GREEN, r: 5, strokeWidth: 2, stroke: "white" }}
                activeDot={{
                  r: 7,
                  strokeWidth: 2,
                  stroke: "white",
                  fill: GREEN,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Centers by Type ───────────────────────────────────────────────────────────────
export function CenterTypeCard({ loading, centersByType }) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">
            Centers by Type
          </CardTitle>
          <CardDescription>
            Distribution of active centers by center type
          </CardDescription>
        </div>
        <DownloadBtn
          rows={centersByType.map((r) => ({
            "Center Type": r.center_type,
            Centers: r.centers,
          }))}
          filename="centers_by_type"
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton h="h-56" />
        ) : centersByType.length === 0 ? (
          <div className="h-56 flex items-center justify-center">
            <p className="text-sm text-gray-400">No data available</p>
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={Math.max(220, centersByType.length * 44)}
          >
            <BarChart
              data={centersByType}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="0"
                stroke={CHART_GRID_COLOR}
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: CHART_AXIS_COLOR }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="center_type"
                tick={{ fontSize: 12, fill: CHART_AXIS_COLOR }}
                axisLine={false}
                tickLine={false}
                width={110}
                tickFormatter={(v) =>
                  v.length > 14 ? v.slice(0, 13) + "\u2026" : v
                }
              />
              <RechartsTooltip content={<ChartTooltip />} />
              <Bar dataKey="centers" name="Centers" radius={[0, 5, 5, 0]}>
                <LabelList
                  dataKey="centers"
                  position="right"
                  style={{
                    fontSize: 11,
                    fill: CHART_LABEL_COLOR,
                    fontWeight: 600,
                  }}
                />
                {centersByType.map((entry, i) => (
                  <Cell
                    key={entry.center_type}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Centers by Region ──────────────────────────────────────────────────────────────
export function CenterRegionCard({ loading, centersByRegion }) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">
            Centers by Region
          </CardTitle>
          <CardDescription>
            Active centers grouped by geographic region
          </CardDescription>
        </div>
        <DownloadBtn
          rows={centersByRegion.map((r) => ({
            Region: r.region,
            Centers: r.centers,
          }))}
          filename="centers_by_region"
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton h="h-52" />
        ) : centersByRegion.length === 0 ? (
          <div className="h-52 flex items-center justify-center">
            <p className="text-sm text-gray-400">No data available</p>
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={Math.max(200, centersByRegion.length * 48)}
          >
            <BarChart
              data={centersByRegion}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="0"
                stroke={CHART_GRID_COLOR}
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: CHART_AXIS_COLOR }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="region"
                tick={{ fontSize: 12, fill: CHART_AXIS_COLOR }}
                axisLine={false}
                tickLine={false}
                width={90}
                tickFormatter={(v) =>
                  v.length > 12 ? v.slice(0, 11) + "\u2026" : v
                }
              />
              <RechartsTooltip content={<ChartTooltip />} />
              <Bar dataKey="centers" name="Centers" radius={[0, 5, 5, 0]}>
                <LabelList
                  dataKey="centers"
                  position="right"
                  style={{
                    fontSize: 11,
                    fill: CHART_LABEL_COLOR,
                    fontWeight: 600,
                  }}
                />
                {centersByRegion.map((entry, i) => (
                  <Cell
                    key={entry.region}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Center Performance Table ───────────────────────────────────────────────────────
export function CenterPerformanceCard({ loading, centersPerformance }) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">
            Center Performance
          </CardTitle>
          <CardDescription>
            Centres ranked by yearly students trained and configured rating
          </CardDescription>
        </div>
        <DownloadBtn
          rows={centersPerformance.map((r) => ({
            Center: r.center_name,
            Partner: r.partner_name,
            State: r.state,
            "Students Trained": r.students_trained,
            "Rating Stars": r.rating_stars,
            Rating: r.performance_rating,
            Placed: r.placed,
            "Placement %": r.placement_pct,
          }))}
          filename="center_performance"
        />
      </CardHeader>
      <CardContent className="p-0 pb-4">
        {loading ? (
          <div className="px-6 pt-4">
            <Skeleton h="h-48" />
          </div>
        ) : centersPerformance.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-gray-400">No data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#A5A5A5]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Center
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Partner
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Placed
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Placement%
                  </th>
                </tr>
              </thead>
              <tbody>
                {centersPerformance.map((c, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#A5A5A5]/40 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3 text-gray-400 font-medium">
                      {i + 1}
                    </td>
                    <td
                      className="px-4 py-3 font-semibold text-gray-900 max-w-[180px] truncate"
                      title={c.center_name}
                    >
                      {c.center_name}
                    </td>
                    <td
                      className="px-4 py-3 text-gray-600 max-w-[140px] truncate"
                      title={c.partner_name}
                    >
                      {c.partner_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.state || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                      {fmt(c.students_trained)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {c.rating_stars ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                          title={`Rating ${c.performance_rating}`}
                        >
                          {"★".repeat(Number(c.rating_stars))}
                          <span className="text-amber-800">
                            ({c.performance_rating})
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600 tabular-nums">
                      {fmt(c.placed)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PctBadge value={c.placement_pct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section router ────────────────────────────────────────────────────────────────
// To add a new card: create the component above, add an export, then add a case here.
export default function SectionRenderer({ id, loading, data }) {
  const {
    gender,
    states,
    performance,
    courses,
    partners,
    trend,
    year,
    centersState,
    centersGrowth,
    centersByType,
    centersByRegion,
    centersPerformance,
  } = data;
  switch (id) {
    case "india_map":
      return <IndiaMapCard loading={loading} year={year} />;
    case "gender_pie":
      return <GenderPieCard loading={loading} gender={gender} />;
    case "yoy_trend":
      return <YoyCard loading={loading} trend={trend} />;
    case "salary_dist":
      return <SalaryCard loading={loading} performance={performance} />;
    case "state_dist":
      return <StateCard loading={loading} states={states} />;
    case "course_table":
      return <CourseTableCard loading={loading} courses={courses} />;
    case "course_chart":
      return <CourseChartCard loading={loading} courses={courses} />;
    case "partner_table":
      return <PartnerCard loading={loading} partners={partners} />;
    case "center_state_dist":
      return <CenterStateCard loading={loading} centersState={centersState} />;
    case "center_growth_trend":
      return (
        <CenterGrowthCard loading={loading} centersGrowth={centersGrowth} />
      );
    case "center_type_chart":
      return <CenterTypeCard loading={loading} centersByType={centersByType} />;
    case "center_region_chart":
      return (
        <CenterRegionCard loading={loading} centersByRegion={centersByRegion} />
      );
    case "center_performance":
      return (
        <CenterPerformanceCard
          loading={loading}
          centersPerformance={centersPerformance}
        />
      );
    default:
      return null;
  }
}
