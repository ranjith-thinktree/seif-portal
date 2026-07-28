import { describe, expect, it } from "vitest";
import {
  buildCertificationPartnerChart,
  buildCertificationResultsMix,
  buildCertificationTrend,
  resolveCertificationTrendGranularity,
  shouldShowCertificationTrend,
} from "../../utils/certificationReportChartUtils";

const sampleRows = [
  {
    partner_name: "Alpha",
    assessment_date: "2026-07-01",
    registered: 10,
    attended: 8,
    passed: 7,
    failed: 1,
  },
  {
    partner_name: "Beta",
    assessment_date: "2026-07-15",
    registered: 5,
    attended: 5,
    passed: 4,
    failed: 1,
  },
  {
    partner_name: "Alpha",
    assessment_date: "2026-08-02",
    registered: 3,
    attended: 2,
    passed: 2,
    failed: 0,
  },
];

describe("certificationReportChartUtils", () => {
  it("shows trend only for range / CY / FY", () => {
    expect(shouldShowCertificationTrend("month")).toBe(false);
    expect(shouldShowCertificationTrend("day")).toBe(false);
    expect(shouldShowCertificationTrend("range")).toBe(true);
    expect(shouldShowCertificationTrend("calendar_year")).toBe(true);
    expect(shouldShowCertificationTrend("financial_year")).toBe(true);
  });

  it("builds results mix from KPIs and failed from rows", () => {
    const mix = buildCertificationResultsMix(
      { registered: 20, attended: 15, passed: 12 },
      sampleRows,
    );
    expect(mix.find((d) => d.name === "Registered").value).toBe(20);
    expect(mix.find((d) => d.name === "Passed").value).toBe(12);
    expect(mix.find((d) => d.name === "Failed").value).toBe(2);
  });

  it("ranks partners by passed", () => {
    const partners = buildCertificationPartnerChart(sampleRows, 10);
    expect(partners[0].partner).toBe("Alpha");
    expect(partners[0].passed).toBe(9);
    expect(partners[1].partner).toBe("Beta");
  });

  it("uses day granularity for short ranges and month for CY", () => {
    expect(resolveCertificationTrendGranularity("range", sampleRows)).toBe(
      "day",
    );
    expect(
      resolveCertificationTrendGranularity("calendar_year", sampleRows),
    ).toBe("month");
  });

  it("builds monthly trend buckets for calendar year", () => {
    const { data, granularity } = buildCertificationTrend(
      sampleRows,
      "calendar_year",
    );
    expect(granularity).toBe("month");
    expect(data.map((d) => d.period)).toEqual(["2026-07", "2026-08"]);
    expect(data[0].requests).toBe(2);
    expect(data[0].passed).toBe(11);
  });
});
