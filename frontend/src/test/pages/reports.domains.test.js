import { describe, it, expect } from "vitest";
import {
  DEFAULT_REPORT_DOMAINS,
  kpiVisibleForDomains,
  sectionVisibleForDomains,
  hasAnyImpactDomain,
  isDomainSelected,
  resolveReportControlsPlacement,
} from "../../pages/Reports/reports.domains";

describe("reports.domains", () => {
  it("defaults include all domains", () => {
    expect(DEFAULT_REPORT_DOMAINS).toContain("students");
    expect(DEFAULT_REPORT_DOMAINS).toContain("certification");
    expect(DEFAULT_REPORT_DOMAINS).toContain("refurbishment");
    expect(DEFAULT_REPORT_DOMAINS).toContain("employment");
  });

  it("shows student KPIs only when students domain selected", () => {
    expect(kpiVisibleForDomains("kpi_youth_trained", ["students"])).toBe(true);
    expect(kpiVisibleForDomains("kpi_youth_trained", ["certification"])).toBe(
      false,
    );
    expect(kpiVisibleForDomains("kpi_youth_employed", ["employment"])).toBe(
      true,
    );
  });

  it("maps sections to domains", () => {
    expect(sectionVisibleForDomains("salary_dist", ["employment"])).toBe(true);
    expect(sectionVisibleForDomains("partner_table", ["partners"])).toBe(true);
    expect(sectionVisibleForDomains("india_map", ["centers"])).toBe(false);
  });

  it("detects impact domains for FY control", () => {
    expect(hasAnyImpactDomain(["certification", "refurbishment"])).toBe(false);
    expect(hasAnyImpactDomain(["students"])).toBe(true);
    expect(isDomainSelected(["certification"], "certification")).toBe(true);
  });

  it("places period+export beside single domain section", () => {
    expect(resolveReportControlsPlacement(["certification"])).toEqual({
      at: "certification",
      shared: false,
    });
    expect(resolveReportControlsPlacement(["refurbishment"])).toEqual({
      at: "refurbishment",
      shared: false,
    });
    expect(resolveReportControlsPlacement(["students"])).toEqual({
      at: "impact",
      shared: false,
    });
  });

  it("shares one period+export for multiple domains", () => {
    expect(
      resolveReportControlsPlacement(["students", "certification"]),
    ).toEqual({ at: "impact", shared: true });
    expect(
      resolveReportControlsPlacement(["certification", "refurbishment"]),
    ).toEqual({ at: "certification", shared: true });
  });
});
