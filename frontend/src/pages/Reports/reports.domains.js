import { DEFAULT_ORDER } from "./reports.constants";

/** Multi-select report domains — show/hide KPI + section groups */
export const REPORT_DOMAIN_OPTIONS = [
  { id: "students", label: "Students" },
  { id: "employment", label: "Employment" },
  { id: "courses", label: "Courses" },
  { id: "partners", label: "Partners" },
  { id: "centers", label: "Centers" },
  { id: "certification", label: "Certification" },
  { id: "refurbishment", label: "Refurbishment" },
];

export const REPORT_DOMAINS_KEY = "seif_report_domains";

export const DEFAULT_REPORT_DOMAINS = REPORT_DOMAIN_OPTIONS.map((d) => d.id);

/** KPI keys owned by each domain */
export const DOMAIN_KPI_MAP = {
  students: [
    "kpi_youth_trained",
    "kpi_female_trainees",
    "kpi_trainers_trained",
    "kpi_edp",
    "kpi_states_uts",
    "kpi_greater_india",
    "kpi_nsi",
    "kpi_alumni",
  ],
  employment: ["kpi_youth_employed"],
  courses: [],
  partners: ["kpi_training_partners"],
  centers: ["kpi_training_centers"],
  certification: [],
  refurbishment: [],
};

/** Section IDs owned by each domain */
export const DOMAIN_SECTION_MAP = {
  students: ["india_map", "gender_pie", "yoy_trend", "state_dist"],
  employment: ["salary_dist"],
  courses: ["course_table", "course_chart"],
  partners: ["partner_table"],
  centers: [
    "center_state_dist",
    "center_growth_trend",
    "center_type_chart",
    "center_region_chart",
    "center_performance",
  ],
  certification: [],
  refurbishment: [],
};

export function loadReportDomains() {
  try {
    const raw = localStorage.getItem(REPORT_DOMAINS_KEY);
    if (!raw) return [...DEFAULT_REPORT_DOMAINS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return [...DEFAULT_REPORT_DOMAINS];
    const allowed = new Set(REPORT_DOMAIN_OPTIONS.map((d) => d.id));
    const filtered = parsed.filter((id) => allowed.has(id));
    return filtered.length ? filtered : [...DEFAULT_REPORT_DOMAINS];
  } catch {
    return [...DEFAULT_REPORT_DOMAINS];
  }
}

export function saveReportDomains(domains) {
  try {
    localStorage.setItem(REPORT_DOMAINS_KEY, JSON.stringify(domains));
  } catch {
    /* ignore */
  }
}

export function isDomainSelected(domains, domainId) {
  return (domains || []).includes(domainId);
}

export function kpiVisibleForDomains(kpiKey, domains) {
  return Object.entries(DOMAIN_KPI_MAP).some(
    ([domainId, keys]) =>
      keys.includes(kpiKey) && isDomainSelected(domains, domainId),
  );
}

export function sectionVisibleForDomains(sectionId, domains) {
  return Object.entries(DOMAIN_SECTION_MAP).some(
    ([domainId, ids]) =>
      ids.includes(sectionId) && isDomainSelected(domains, domainId),
  );
}

/** Impact domains that use the existing FY dropdown */
export const IMPACT_DOMAINS = [
  "students",
  "employment",
  "courses",
  "partners",
  "centers",
];

export function hasAnyImpactDomain(domains) {
  return IMPACT_DOMAINS.some((id) => isDomainSelected(domains, id));
}

export function allImpactSections() {
  return [...DEFAULT_ORDER];
}

/**
 * Where to render the inline Report period + Export cluster.
 * - One selected domain → beside that domain's section title
 * - Multiple domains → one shared cluster on the first visible section
 *   (Impact → Certification → Refurbishment)
 */
export function resolveReportControlsPlacement(domains = []) {
  const list = Array.isArray(domains) ? domains : [];
  const impact = hasAnyImpactDomain(list);
  const certification = isDomainSelected(list, "certification");
  const refurbishment = isDomainSelected(list, "refurbishment");

  if (!impact && !certification && !refurbishment) {
    return { at: null, shared: false };
  }

  if (list.length === 1) {
    if (certification) return { at: "certification", shared: false };
    if (refurbishment) return { at: "refurbishment", shared: false };
    return { at: "impact", shared: false };
  }

  if (impact) return { at: "impact", shared: true };
  if (certification) return { at: "certification", shared: true };
  return { at: "refurbishment", shared: true };
}

