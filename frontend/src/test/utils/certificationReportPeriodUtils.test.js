import { describe, expect, it } from "vitest";
import { buildCertificationArchiveApiParams } from "../../utils/certificationArchiveUtils";
import {
  buildCertificationReportFilters,
  buildFyOptions,
  certificationReportExportFilename,
  describeCertificationReportPeriod,
  describeCertificationReportPeriodFull,
  formatFyLabel,
  formatReadableIsoDate,
  getCurrentFyStartYear,
  toIsoDate,
} from "../../utils/certificationReportPeriodUtils";

describe("certificationReportPeriodUtils", () => {
  it("formats FY Apr–Mar labels", () => {
    expect(formatFyLabel(2025)).toBe("2025-26");
    expect(getCurrentFyStartYear(new Date(2026, 6, 14))).toBe(2026); // July
    expect(getCurrentFyStartYear(new Date(2026, 2, 14))).toBe(2025); // March
  });

  it("builds month filters for month mode", () => {
    expect(
      buildCertificationReportFilters({
        mode: "month",
        month: "7",
        year: "2026",
      }),
    ).toEqual({
      dateTypes: ["assessment"],
      months: ["7"],
      years: ["2026"],
      traineeMetrics: [],
    });
  });

  it("builds day and range date bounds", () => {
    expect(
      buildCertificationReportFilters({ mode: "day", day: "2026-07-14" }),
    ).toEqual({
      dateTypes: ["assessment"],
      fromDate: "2026-07-14",
      toDate: "2026-07-14",
      traineeMetrics: [],
    });
    expect(
      buildCertificationReportFilters({
        mode: "range",
        fromDate: "2026-07-20",
        toDate: "2026-07-10",
      }),
    ).toEqual({
      dateTypes: ["assessment"],
      fromDate: "2026-07-10",
      toDate: "2026-07-20",
      traineeMetrics: [],
    });
  });

  it("builds calendar year and financial year filters", () => {
    const cy = buildCertificationReportFilters({
      mode: "calendar_year",
      year: "2026",
    });
    expect(cy.years).toEqual(["2026"]);
    expect(cy.months).toHaveLength(12);

    expect(
      buildCertificationReportFilters({
        mode: "financial_year",
        fyStartYear: "2025",
      }),
    ).toEqual({
      dateTypes: ["assessment"],
      fromDate: "2025-04-01",
      toDate: "2026-03-31",
      traineeMetrics: [],
    });
  });

  it("maps filters into archive API params for range", () => {
    const params = buildCertificationArchiveApiParams(
      buildCertificationReportFilters({
        mode: "range",
        fromDate: "2026-01-01",
        toDate: "2026-01-31",
      }),
    );
    expect(params).toMatchObject({
      dateTypes: "assessment",
      fromDate: "2026-01-01",
      toDate: "2026-01-31",
    });
    expect(params.months).toBeUndefined();
  });

  it("keeps month API params unchanged for Files compatibility", () => {
    const params = buildCertificationArchiveApiParams(
      buildCertificationReportFilters({
        mode: "month",
        month: "6",
        year: "2026",
      }),
    );
    expect(params).toMatchObject({
      dateTypes: "assessment",
      months: "6",
      years: "2026",
    });
    expect(params.fromDate).toBeUndefined();
  });

  it("describes periods and builds FY options", () => {
    expect(
      describeCertificationReportPeriod({
        mode: "financial_year",
        fyStartYear: "2025",
      }),
    ).toBe("2025-26");
    expect(buildFyOptions(2).length).toBe(3);
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("formats readable labels and export filenames", () => {
    expect(formatReadableIsoDate("2026-07-14")).toBe("14 Jul 2026");
    expect(
      describeCertificationReportPeriodFull({
        mode: "month",
        month: "7",
        year: "2026",
      }),
    ).toBe("Month · July 2026");
    expect(
      certificationReportExportFilename({
        mode: "month",
        month: "7",
        year: "2026",
      }),
    ).toBe("SEIF_Certification_July_2026.xlsx");
    expect(
      certificationReportExportFilename({
        mode: "financial_year",
        fyStartYear: "2025",
      }),
    ).toBe("SEIF_Certification_FY_2025-26.xlsx");
  });
});
