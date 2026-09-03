import { describe, it, expect } from "vitest";
import {
  applyAnnualChange,
  applyMonthlyChange,
  buildDisplayMetrics,
  combineMetric,
  customStatsForDisplay,
  liveDbFromAnalytics,
  recomputeAllYears,
  emptyYearData,
} from "./dashboardMetrics";

describe("dashboardMetrics", () => {
  it("sums monthly values into the annual field", () => {
    let data = { 2026: emptyYearData() };
    data = applyMonthlyChange(data, "2026", "january", "nsi", 100);
    data = applyMonthlyChange(data, "2026", "february", "nsi", 50);
    expect(data["2026"].nsi).toBe(150);
    expect(data.all.nsi).toBe(150);
  });

  it("derives total students as India + Greater India + NSI", () => {
    let data = { 2026: emptyYearData() };
    data = applyAnnualChange(data, "2026", "india", 100);
    data = applyAnnualChange(data, "2026", "greater_india", 20);
    data = applyAnnualChange(data, "2026", "nsi", 5);
    expect(data["2026"].total_students).toBe(125);
    expect(data["2026"].monthly.january.total).toBe(0);
    expect(data.all.total_students).toBe(125);
  });

  it("clears monthly values when an annual total is edited", () => {
    let data = { 2026: emptyYearData() };
    data = applyMonthlyChange(data, "2026", "january", "nsi", 40);
    data = applyAnnualChange(data, "2026", "nsi", 900);
    expect(data["2026"].nsi).toBe(900);
    expect(data["2026"].monthly.january.nsi).toBe(0);
    expect(data["2026"].total_students).toBe(900);
  });

  it("adds db + custom + kpi", () => {
    expect(combineMetric("10", "5", "2")).toBe(17);
  });

  it("rebuilds all-years from calendar years", () => {
    const data = recomputeAllYears({
      2023: { india: 10, greater_india: 0, nsi: 1 },
      2024: { india: 20, greater_india: 0, nsi: 2 },
    });
    expect(data.all.india).toBe(30);
    expect(data.all.nsi).toBe(3);
    expect(data.all.total_students).toBe(33);
  });

  it("builds matching Home/Data metrics without DB for GI/NSI/Alumni/EDP", () => {
    const metrics = buildDisplayMetrics({
      db: {
        students: 10,
        male: 8,
        female: 2,
        partners: 3,
        centers: 4,
        employments: 5,
      },
      custom: {
        india: 100,
        greater_india: 20,
        nsi: 7,
        male: 80,
        female: 20,
        employment: 15,
        alumni: 9,
        edp: 11,
        tot: 6,
      },
      kpiSettings: {
        youth_trained: { customValue: 3 },
        greater_india: { customValue: 1 },
        nsi: { customValue: 2 },
        youth_employed: { customValue: 4 },
        alumni: { customValue: 1 },
        edp: { customValue: 2 },
      },
    });

    expect(metrics.india).toBe(113);
    expect(metrics.greaterIndia).toBe(21);
    expect(metrics.nsi).toBe(9);
    expect(metrics.students).toBe(143);
    expect(metrics.male + metrics.female).toBe(143);
    expect(metrics.employments).toBe(24);
    expect(metrics.alumni).toBe(10);
    expect(metrics.edp).toBe(13);
    expect(metrics.tot).toBe(6);
  });

  it("ignores bundled JSON for Greater India, NSI, Alumni, and EDP", () => {
    const custom = customStatsForDisplay(undefined, {
      india: 10,
      greater_india: 11477,
      nsi: 24846,
      alumni: 91,
      edp: 2403,
      tot: 1112,
      employment: 1203,
    });
    expect(custom.india).toBe(10);
    expect(custom.greater_india).toBe(0);
    expect(custom.nsi).toBe(0);
    expect(custom.alumni).toBe(0);
    expect(custom.edp).toBe(0);
    expect(custom.tot).toBe(0);
    expect(custom.employment).toBe(0);
  });

  it("does not use bundled JSON employment when Settings custom is 0", () => {
    const custom = customStatsForDisplay(
      { employment: 0, tot: 0 },
      { employment: 1203, totalEmployments: 1203, tot: 1112 },
    );
    expect(custom.employment).toBe(0);
    expect(custom.tot).toBe(0);
  });

  it("uses Settings/API values for Greater India, NSI, Alumni, and EDP", () => {
    const custom = customStatsForDisplay(
      { greater_india: 5, nsi: 7, alumni: 1, edp: 2, india: 10 },
      { greater_india: 11477, nsi: 24846 },
    );
    expect(custom.greater_india).toBe(5);
    expect(custom.nsi).toBe(7);
    expect(custom.alumni).toBe(1);
    expect(custom.edp).toBe(2);
    expect(custom.india).toBe(10);
  });

  it("does not throw when analytics has not loaded yet", () => {
    expect(liveDbFromAnalytics(null).students).toBe(0);
    expect(liveDbFromAnalytics(undefined).partners).toBe(0);
  });
});
