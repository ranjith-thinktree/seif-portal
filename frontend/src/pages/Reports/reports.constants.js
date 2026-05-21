// ─── Brand colours ─────────────────────────────────────────────────────────────
export const GREEN = "#009530";
export const BLUE = "#3b82f6";
export const PINK = "#ec4899";
export const GRAY = "#6b7280";

// ─── Shared card style ─────────────────────────────────────────────────────────
export const CARD_CLASS =
  "bg-white rounded-xl shadow-sm border-[#A5A5A5] border flex-1";

// ─── Year filter options ───────────────────────────────────────────────────────
export const YEAR_OPTIONS = [
  { value: "all", label: "All Years" },
  { value: "2022-23", label: "2022-23" },
  { value: "2023-24", label: "2023-24" },
  { value: "2024-25", label: "2024-25" },
  { value: "2025-26", label: "2025-26" },
];

// ─── Chart theme ─────────────────────────────────────────────────────
// Categorical palette: green first, then blue, amber, indigo, rose, cyan, orange, teal
export const CHART_COLORS = [
  "#009530",
  "#3b82f6",
  "#f59e0b",
  "#6366f1",
  "#f43f5e",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
];
export const CHART_GRID_COLOR = "#f1f5f9";
export const CHART_AXIS_COLOR = "#94a3b8";
export const CHART_LABEL_COLOR = "#64748b";

// ─── Chart styles ─────────────────────────────────────────────────────
export const TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
  padding: "10px 14px",
  fontSize: "13px",
  lineHeight: "1.5",
};

export const BAND_COLORS = {
  "Below ₹12k": "#ef4444",
  "₹12k–15k": "#6b7280",
  "Above ₹15k": GREEN,
  "Not Reported": "#d1d5db",
};

// ─── Layout row width presets (flex out of 10) ─────────────────────────────────
export const RATIO_PRESETS = [
  { label: "30/70", a: 3, b: 7 },
  { label: "40/60", a: 4, b: 6 },
  { label: "50/50", a: 5, b: 5 },
  { label: "60/40", a: 6, b: 4 },
  { label: "70/30", a: 7, b: 3 },
];

// ─── Section IDs & metadata ────────────────────────────────────────────────────
export const DEFAULT_ORDER = [
  "india_map",
  "gender_pie",
  "yoy_trend",
  "salary_dist",
  "state_dist",
  "course_table",
  "course_chart",
  "partner_table",
  "center_state_dist",
  "center_growth_trend",
  "center_type_chart",
  "center_region_chart",
  "center_performance",
];

export const SECTION_META = {
  india_map: "India Training Map",
  gender_pie: "Gender Breakdown",
  yoy_trend: "Year-over-Year Trends",
  salary_dist: "Salary Distribution",
  state_dist: "Students by State",
  course_table: "Course Performance (Table)",
  course_chart: "Enrolled vs Employed (Chart)",
  partner_table: "Partner Performance",
  center_state_dist: "Centers by State",
  center_growth_trend: "Centers Growth Trend",
  center_type_chart: "Centers by Type",
  center_region_chart: "Centers by Region",
  center_performance: "Center Performance Table",
};

// ─── KPI keys & order ──────────────────────────────────────────────────────────
export const DEFAULT_KPI_ORDER = [
  "kpi_youth_trained",
  "kpi_youth_employed",
  "kpi_training_partners",
  "kpi_training_centers",
  "kpi_trainers_trained",
  "kpi_female_trainees",
  "kpi_edp",
  "kpi_states_uts",
  "kpi_greater_india",
  "kpi_nsi",
  "kpi_alumni",
];

export const KPI_ORDER_KEY = "seif_kpi_order";
export const LAYOUT_ROWS_KEY = "seif_layout_rows";
export const CONFIG_KEY = "seif_report_config";

// ─── KPI display labels ────────────────────────────────────────────────────────
export const KPI_LABELS = {
  kpi_youth_trained: "Youth Trained",
  kpi_youth_employed: "Youth Employed",
  kpi_training_partners: "Training Partners",
  kpi_training_centers: "Training Centers",
  kpi_trainers_trained: "Trainers Trained (TOT)",
  kpi_female_trainees: "Female Trainees",
  kpi_edp: "EDP",
  kpi_states_uts: "States & UTs",
  kpi_greater_india: "Greater India",
  kpi_nsi: "NSI",
  kpi_alumni: "Alumni",
};

export const SECTION_LABELS = {
  sec_india_map: "India Training Map",
  sec_gender_pie: "Gender Breakdown (Pie Chart)",
  sec_yoy_trend: "Year-over-Year Trend (Line Chart)",
  sec_salary_dist: "Salary Distribution (Bar Chart)",
  sec_state_dist: "Students by State",
  sec_course_table: "Course Performance (Table)",
  sec_course_chart: "Course Enrolled vs Employed (Chart)",
  sec_partner_table: "Partner Performance (Table)",
  sec_center_state_dist: "Centers by State (Ranked List)",
  sec_center_growth_trend: "Centers Growth Trend (Line Chart)",
  sec_center_type_chart: "Centers by Type (Bar Chart)",
  sec_center_region_chart: "Centers by Region (Bar Chart)",
  sec_center_performance: "Center Performance (Table)",
};

// ─── Default visibility config ─────────────────────────────────────────────────
export const DEFAULT_CONFIG = {
  kpi_youth_trained: true,
  kpi_youth_employed: true,
  kpi_training_partners: true,
  kpi_training_centers: true,
  kpi_trainers_trained: true,
  kpi_female_trainees: true,
  kpi_edp: true,
  kpi_states_uts: true,
  kpi_greater_india: true,
  kpi_nsi: true,
  kpi_alumni: true,
  sec_india_map: true,
  sec_gender_pie: true,
  sec_yoy_trend: true,
  sec_salary_dist: true,
  sec_state_dist: true,
  sec_course_table: true,
  sec_course_chart: true,
  sec_partner_table: true,
  sec_center_state_dist: true,
  sec_center_growth_trend: true,
  sec_center_type_chart: true,
  sec_center_region_chart: true,
  sec_center_performance: true,
};
