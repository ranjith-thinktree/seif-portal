export const YEAR_TOTAL_FIELDS = [
  { key: "total_students", label: "Total Students" },
  { key: "india", label: "India" },
  { key: "greater_india", label: "Greater India" },
  { key: "nsi", label: "NSI" },
  { key: "female", label: "Female" },
  { key: "male", label: "Male" },
  { key: "tot", label: "TOT" },
  { key: "employment", label: "Employment" },
  { key: "alumni", label: "Alumni" },
  { key: "edp", label: "EDP" },
];

export const MONTH_FIELDS = [
  { key: "total", label: "Total", annualKey: "total_students" },
  { key: "india", label: "India", annualKey: "india" },
  { key: "greater_india", label: "Gr. India", annualKey: "greater_india" },
  { key: "nsi", label: "NSI", annualKey: "nsi" },
  { key: "female", label: "Female", annualKey: "female" },
  { key: "male", label: "Male", annualKey: "male" },
  { key: "tot", label: "TOT", annualKey: "tot" },
  { key: "employment", label: "Employment", annualKey: "employment" },
  { key: "alumni", label: "Alumni", annualKey: "alumni" },
  { key: "edp", label: "EDP", annualKey: "edp" },
];

export const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export const KPI_TO_CUSTOM_FIELD = {
  youth_trained: "total_students",
  trainers_trained: "tot",
  youth_employed: "employment",
  greater_india: "greater_india",
  nsi: "nsi",
  alumni: "alumni",
  edp: "edp",
};

export const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const emptyMonthly = () => {
  const monthly = {};
  MONTHS.forEach((month) => {
    monthly[month] = MONTH_FIELDS.reduce((acc, field) => {
      acc[field.key] = 0;
      return acc;
    }, {});
  });
  return monthly;
};

export const emptyYearData = () => ({
  ...YEAR_TOTAL_FIELDS.reduce((acc, field) => {
    acc[field.key] = 0;
    return acc;
  }, {}),
  monthly: emptyMonthly(),
});

export const sumMonthlyField = (yearData, monthField) =>
  MONTHS.reduce(
    (sum, month) => sum + toNumber(yearData?.monthly?.[month]?.[monthField]),
    0,
  );

/** Youth trained / total students = India + Greater India + NSI. */
export const syncDerivedStudentTotals = (yearData) => {
  if (!yearData) return yearData;
  yearData.total_students =
    toNumber(yearData.india) +
    toNumber(yearData.greater_india) +
    toNumber(yearData.nsi);
  if (yearData.monthly) {
    MONTHS.forEach((month) => {
      const row = yearData.monthly[month];
      if (!row) return;
      row.total =
        toNumber(row.india) + toNumber(row.greater_india) + toNumber(row.nsi);
    });
  }
  return yearData;
};

export const recomputeAllYears = (data) => {
  const next = { ...data };
  Object.entries(next).forEach(([year, yearData]) => {
    if (year === "all" || !/^\d{4}$/.test(year)) return;
    syncDerivedStudentTotals(yearData);
  });
  const totals = emptyYearData();
  delete totals.monthly;
  Object.entries(next).forEach(([year, yearData]) => {
    if (year === "all" || !/^\d{4}$/.test(year)) return;
    YEAR_TOTAL_FIELDS.forEach(({ key }) => {
      totals[key] += toNumber(yearData?.[key]);
    });
  });
  next.all = totals;
  return next;
};

export const applyMonthlyChange = (data, year, month, monthField, value) => {
  const annualKey =
    MONTH_FIELDS.find((field) => field.key === monthField)?.annualKey ||
    monthField;
  const nextYear = {
    ...emptyYearData(),
    ...data[year],
    monthly: {
      ...emptyMonthly(),
      ...(data[year]?.monthly || {}),
    },
  };
  nextYear.monthly[month] = {
    ...nextYear.monthly[month],
    [monthField]: toNumber(value),
  };
  nextYear[annualKey] = sumMonthlyField(nextYear, monthField);
  syncDerivedStudentTotals(nextYear);
  return recomputeAllYears({ ...data, [year]: nextYear });
};

export const applyAnnualChange = (data, year, annualField, value) => {
  if (year === "all") {
    return {
      ...data,
      all: {
        ...(data.all || emptyYearData()),
        [annualField]: toNumber(value),
      },
    };
  }
  const monthField =
    MONTH_FIELDS.find((field) => field.annualKey === annualField)?.key ||
    annualField;
  const nextYear = {
    ...emptyYearData(),
    ...data[year],
    [annualField]: toNumber(value),
    monthly: {
      ...emptyMonthly(),
      ...(data[year]?.monthly || {}),
    },
  };
  MONTHS.forEach((monthName) => {
    nextYear.monthly[monthName] = {
      ...nextYear.monthly[monthName],
      [monthField]: 0,
    };
  });
  syncDerivedStudentTotals(nextYear);
  return recomputeAllYears({ ...data, [year]: nextYear });
};

export const combineMetric = (dbValue, customValue, kpiCustom = 0) =>
  toNumber(dbValue) + toNumber(customValue) + toNumber(kpiCustom);

/** Unwrap { success, data } from axios or the service layer. */
export const unwrapAnalyticsPayload = (response) => {
  if (!response || typeof response !== "object") return {};
  if (
    response.summary != null ||
    response.customStats != null ||
    response.totalStudents != null ||
    response.totalPartners != null ||
    response.partnerBreakdown != null
  ) {
    return response;
  }
  const nested = response.data;
  if (nested && typeof nested === "object") {
    return unwrapAnalyticsPayload(nested);
  }
  return {};
};

/** Live DB counts from Home or Data analytics payloads. */
export const liveDbFromAnalytics = (payload = {}) => {
  const source = payload && typeof payload === "object" ? payload : {};
  const summary = source.summary || {};
  return {
    students: toNumber(source.totalStudents ?? summary.total_students),
    male: toNumber(source.maleStudents ?? summary.male_students),
    female: toNumber(source.femaleStudents ?? summary.female_students),
    partners: toNumber(source.totalPartners ?? summary.total_partners),
    centers: toNumber(source.totalCenters ?? summary.total_centers),
    states: toNumber(source.totalStates),
    uts: toNumber(source.totalUTs),
    employments: toNumber(source.totalEmployments ?? summary.total_employments),
    tot: toNumber(source.totalTrainers ?? summary.total_trainers),
  };
};

const jsonField = (json, ...keys) => {
  for (const key of keys) {
    if (json?.[key] != null && json[key] !== "") return toNumber(json[key]);
  }
  return 0;
};

/**
 * Greater India / NSI / Alumni / EDP come only from Settings (API file + KPI).
 * Bundled frontend JSON is never used for those four fields.
 */
export const customStatsForDisplay = (apiCustom, jsonFallback = {}) => {
  const api = apiCustom && typeof apiCustom === "object" ? apiCustom : {};
  const json = jsonFallback || {};
  const fromApiOrJson = (apiKey, ...jsonKeys) => {
    if (Object.prototype.hasOwnProperty.call(api, apiKey)) {
      return toNumber(api[apiKey]);
    }
    return jsonField(json, apiKey, ...jsonKeys);
  };

  return {
    india: fromApiOrJson("india"),
    male: fromApiOrJson("male", "maleStudents"),
    female: fromApiOrJson("female", "femaleStudents"),
    tot: toNumber(api.tot),
    employment: toNumber(api.employment),
    greater_india: toNumber(api.greater_india),
    nsi: toNumber(api.nsi),
    alumni: toNumber(api.alumni),
    edp: toNumber(api.edp),
  };
};

const kpiAmount = (kpiSettings, key) =>
  toNumber(kpiSettings?.[key]?.customValue);

const splitGenderToTotal = (male, female, total) => {
  const m = toNumber(male);
  const f = toNumber(female);
  const t = toNumber(total);
  const sum = m + f;
  if (t <= 0) return { male: 0, female: 0 };
  if (sum <= 0) return { male: t, female: 0 };
  const nextMale = Math.round((m / sum) * t);
  return { male: nextMale, female: t - nextMale };
};

/**
 * Single formula for Home and Data cards.
 * Greater India, NSI, Alumni, EDP are settings-only (never DB).
 * Youth trained / total students = India + Greater India + NSI.
 */
export const buildDisplayMetrics = ({
  db = {},
  custom = {},
  kpiSettings = {},
} = {}) => {
  const kpi = (key) => kpiAmount(kpiSettings, key);
  const india = combineMetric(db.students, custom.india, kpi("youth_trained"));
  const greaterIndia = combineMetric(
    0,
    custom.greater_india,
    kpi("greater_india"),
  );
  const nsi = combineMetric(0, custom.nsi, kpi("nsi"));
  const students = india + greaterIndia + nsi;
  const gender = splitGenderToTotal(
    combineMetric(db.male, custom.male),
    combineMetric(db.female, custom.female),
    students,
  );

  return {
    india,
    greaterIndia,
    nsi,
    students,
    male: gender.male,
    female: gender.female,
    partners: combineMetric(db.partners, 0, kpi("partners")),
    centers: combineMetric(db.centers, 0, kpi("centers")),
    states: combineMetric(db.states, 0, kpi("states_uts")),
    uts: toNumber(db.uts),
    tot: combineMetric(db.tot, custom.tot, kpi("trainers_trained")),
    employments: combineMetric(
      db.employments,
      custom.employment,
      kpi("youth_employed"),
    ),
    alumni: combineMetric(0, custom.alumni, kpi("alumni")),
    edp: combineMetric(0, custom.edp, kpi("edp")),
  };
};

export const customStatsForYear = (data, financialYear = "all") => {
  const normalized = recomputeAllYears(data || {});
  if (!financialYear || financialYear === "all") {
    return normalized.all || emptyYearData();
  }
  const start = String(financialYear).split("-")[0];
  const years = start === "2025" ? ["2025", "2026"] : [start];
  const totals = emptyYearData();
  delete totals.monthly;
  years.forEach((year) => {
    YEAR_TOTAL_FIELDS.forEach(({ key }) => {
      totals[key] += toNumber(normalized[year]?.[key]);
    });
  });
  syncDerivedStudentTotals(totals);
  return totals;
};
