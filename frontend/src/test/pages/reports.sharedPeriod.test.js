import { describe, expect, it } from "vitest";
import {
  buildSharedPeriodSync,
  defaultReportPeriodState,
  describeReportPeriod,
  fyStartYearToImpactValue,
  normalizeReportPeriod,
} from "../../pages/Reports/reports.sharedPeriod";

describe("reports.sharedPeriod / report period", () => {
  it("defaults to financial year with day/range fields", () => {
    const draft = defaultReportPeriodState(new Date(2026, 6, 14));
    expect(draft.mode).toBe("financial_year");
    expect(draft.fyStartYear).toBe("2026");
    expect(draft.day).toBe("2026-07-14");
    expect(draft.fromDate).toBe("2026-07-01");
    expect(draft.toDate).toBe("2026-07-14");
  });

  it("maps FY start year to Impact value", () => {
    expect(fyStartYearToImpactValue(2025)).toBe("2025-26");
  });

  it("describes month period", () => {
    const label = describeReportPeriod({
      mode: "month",
      month: "7",
      year: "2026",
    });
    expect(label).toContain("July");
    expect(label).toMatch(/^Month ·/);
  });

  it("describes day and range; swaps inverted range", () => {
    expect(
      describeReportPeriod({ mode: "day", day: "2026-07-14" }),
    ).toMatch(/^Day ·/);

    const normalized = normalizeReportPeriod({
      mode: "range",
      fromDate: "2026-07-20",
      toDate: "2026-07-01",
    });
    expect(normalized.fromDate).toBe("2026-07-01");
    expect(normalized.toDate).toBe("2026-07-20");
    expect(describeReportPeriod(normalized)).toMatch(/^Range ·/);
  });

  it("legacy sync helper still builds cert+refurb payloads", () => {
    const sync = buildSharedPeriodSync(
      { mode: "financial_year", fyStartYear: "2025" },
      2,
    );
    expect(sync.certification.mode).toBe("financial_year");
    expect(sync.refurbishment.fyStartYear).toBe("2025");
    expect(sync.impactYear).toBe("2025-26");
  });

  it("calendar year has no Impact year in legacy sync", () => {
    const sync = buildSharedPeriodSync(
      { mode: "calendar_year", year: "2024" },
      3,
    );
    expect(sync.certification.year).toBe("2024");
    expect(sync.impactYear).toBeNull();
  });
});
