import React, { useState, useEffect, useCallback } from "react";
import { MainLayout } from "../../components/layout";
import { toast } from "react-toastify";
import {
  getConsolidatedAnalytics,
  getFilterOptions,
} from "../../services/analytics.service";
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
  LineChart,
  Line,
} from "recharts";
import {
  UserGroupIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ArrowPathIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

const COLORS = {
  male: "#3b82f6",
  female: "#ec4899",
  total: "#6366f1",
  employment: "#10b981",
  pie: ["#6366f1", "#ec4899", "#94a3b8"],
};

const StatCard = ({ title, value, icon: Icon, color, loading }) => (
  <div className="bg-card border border-border rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </p>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
    </div>
    {loading ? (
      <div className="h-8 w-24 bg-muted rounded animate-pulse" />
    ) : (
      <p className="text-3xl font-bold text-foreground">
        {value != null ? Number(value).toLocaleString("en-IN") : "—"}
      </p>
    )}
  </div>
);

const ChartCard = ({ title, children, className = "" }) => (
  <div className={`bg-card border border-border rounded-xl p-5 ${className}`}>
    <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {Number(entry.value).toLocaleString("en-IN")}
        </p>
      ))}
    </div>
  );
};

/**
 * AnalyticsPage
 * Admin-only comprehensive analytics view with filter controls and charts.
 */
const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    partners: [],
    centers: [],
  });
  const [filters, setFilters] = useState({
    financialYear: "all",
    partnerId: "all",
    centerId: "all",
    gender: "all",
  });
  const [loading, setLoading] = useState(false);

  // Fetch filter options once on mount
  useEffect(() => {
    getFilterOptions()
      .then((res) => {
        if (res?.success) {
          setFilterOptions(res.data || { partners: [], centers: [] });
        }
      })
      .catch(() => {});
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getConsolidatedAnalytics(filters);
      if (res?.success) {
        setData(res.data);
      }
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const updated = { ...prev, [key]: value };
      // Reset center filter if partner changes
      if (key === "partnerId") updated.centerId = "all";
      return updated;
    });
  };

  // Prepare chart data
  const trendData =
    data?.yearlyTrend
      ?.map((y) => ({
        year: y.financial_year,
        Total: Number(y.total_students) || 0,
        Male: Number(y.male_students) || 0,
        Female: Number(y.female_students) || 0,
        Employed: Number(y.total_employments) || 0,
      }))
      .reverse() || [];

  const partnerData =
    data?.partnerBreakdown?.slice(0, 10).map((p) => ({
      name:
        p.partner_name?.length > 20
          ? p.partner_name.slice(0, 20) + "…"
          : p.partner_name || "Unknown",
      Male: Number(p.male_students) || 0,
      Female: Number(p.female_students) || 0,
      Total: Number(p.total_students) || 0,
    })) || [];

  const genderData =
    data?.genderDistribution?.map((g) => ({
      name: g.gender || "Other",
      value: Number(g.count) || 0,
    })) || [];

  // Build available years from data or use static range
  const availableYears = data?.availableYears || [];

  // Centers filtered by selected partner
  const filteredCenters =
    filters.partnerId === "all"
      ? filterOptions.centers
      : filterOptions.centers.filter((c) => {
          const matched = filterOptions.partners.find(
            (p) => p.id === filters.partnerId
          );
          return matched ? c.partner_name === matched.name : true;
        });

  const summary = data?.summary;

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <ChartBarIcon className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Consolidated student, partner, and employment insights.
              </p>
            </div>
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-1.5 hover:bg-muted rounded-md transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon
              className={`h-5 w-5 text-muted-foreground ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FunnelIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filters</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Financial Year */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Financial Year
              </label>
              <select
                value={filters.financialYear}
                onChange={(e) =>
                  handleFilterChange("financialYear", e.target.value)
                }
                className="w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-background text-foreground"
              >
                <option value="all">All Years</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Partner */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Partner
              </label>
              <select
                value={filters.partnerId}
                onChange={(e) =>
                  handleFilterChange("partnerId", e.target.value)
                }
                className="w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-background text-foreground"
              >
                <option value="all">All Partners</option>
                {filterOptions.partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Center */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Center
              </label>
              <select
                value={filters.centerId}
                onChange={(e) =>
                  handleFilterChange("centerId", e.target.value)
                }
                disabled={filteredCenters.length === 0}
                className="w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-background text-foreground disabled:opacity-50"
              >
                <option value="all">All Centers</option>
                {filteredCenters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.center_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Gender
              </label>
              <select
                value={filters.gender}
                onChange={(e) => handleFilterChange("gender", e.target.value)}
                className="w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-background text-foreground"
              >
                <option value="all">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <StatCard
            title="Total Students"
            value={summary?.total_students}
            icon={UserGroupIcon}
            color="bg-indigo-500"
            loading={loading}
          />
          <StatCard
            title="Male Students"
            value={summary?.male_students}
            icon={UserGroupIcon}
            color="bg-blue-500"
            loading={loading}
          />
          <StatCard
            title="Female Students"
            value={summary?.female_students}
            icon={UserGroupIcon}
            color="bg-pink-500"
            loading={loading}
          />
          <StatCard
            title="Partners"
            value={summary?.total_partners}
            icon={BuildingStorefrontIcon}
            color="bg-violet-500"
            loading={loading}
          />
          <StatCard
            title="Centers"
            value={summary?.total_centers}
            icon={BuildingOffice2Icon}
            color="bg-emerald-500"
            loading={loading}
          />
          <StatCard
            title="Employed"
            value={summary?.total_employments}
            icon={BriefcaseIcon}
            color="bg-green-500"
            loading={loading}
          />
        </div>

        {/* Charts Row 1: Yearly Trend */}
        {trendData.length > 0 && (
          <ChartCard title="Year-wise Student Enrolment Trend" className="mb-6">
            {loading ? (
              <div className="h-64 bg-muted animate-pulse rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={trendData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Total"
                    stroke={COLORS.total}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Male"
                    stroke={COLORS.male}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Female"
                    stroke={COLORS.female}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Employed"
                    stroke={COLORS.employment}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        )}

        {/* Charts Row 2: Partner Breakdown + Gender Pie */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Partner Breakdown Bar */}
          <ChartCard
            title="Top Partners by Students (Top 10)"
            className="xl:col-span-2"
          >
            {loading ? (
              <div className="h-64 bg-muted animate-pulse rounded" />
            ) : partnerData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No partner data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={partnerData}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                    horizontal={false}
                  />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={120}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Male" stackId="a" fill={COLORS.male} />
                  <Bar
                    dataKey="Female"
                    stackId="a"
                    fill={COLORS.female}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Gender Distribution Pie */}
          <ChartCard title="Gender Distribution">
            {loading ? (
              <div className="h-64 bg-muted animate-pulse rounded" />
            ) : genderData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No data available
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {genderData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            [COLORS.male, COLORS.female, COLORS.pie[2]][index]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) =>
                        Number(value).toLocaleString("en-IN")
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  {genderData.map((g, i) => (
                    <div key={g.name} className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          background: [
                            COLORS.male,
                            COLORS.female,
                            COLORS.pie[2],
                          ][i],
                        }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {g.name}:{" "}
                        <strong className="text-foreground">
                          {Number(g.value).toLocaleString("en-IN")}
                        </strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Center Breakdown Table (if under a specific partner) */}
        {data?.centerBreakdown?.length > 0 && (
          <ChartCard title="Center-wise Breakdown (Top 20)" className="mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">
                      Center
                    </th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">
                      Partner
                    </th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">
                      City
                    </th>
                    <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground">
                      Total
                    </th>
                    <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground">
                      Male
                    </th>
                    <th className="text-right py-2 text-xs font-medium text-muted-foreground">
                      Female
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.centerBreakdown.map((c, i) => (
                    <tr
                      key={c.center_id || i}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="py-2 pr-4 text-foreground font-medium">
                        {c.center_name}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {c.partner_name}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {c.city}
                      </td>
                      <td className="py-2 pr-4 text-right font-semibold">
                        {Number(c.total_students).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 pr-4 text-right text-blue-600">
                        {Number(c.male_students).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 text-right text-pink-600">
                        {Number(c.female_students).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        )}
      </div>
    </MainLayout>
  );
};

export default AnalyticsPage;
