import { describe, expect, it } from "vitest";
import {
  buildRefurbishmentPastRequestParams,
  defaultRefurbishmentPeriodState,
  describeRefurbishmentReportPeriodFull,
  resolveRefurbishmentPeriodBounds,
} from "../../utils/refurbishmentReportPeriodUtils";

describe("refurbishmentReportPeriodUtils", () => {
  it("defaults to calendar year", () => {
    const state = defaultRefurbishmentPeriodState(new Date(2026, 6, 14));
    expect(state.mode).toBe("calendar_year");
    expect(state.year).toBe("2026");
  });

  it("resolves month and FY bounds", () => {
    expect(
      resolveRefurbishmentPeriodBounds({
        mode: "month",
        month: "2",
        year: "2024",
      }),
    ).toEqual({
      fromDate: "2024-02-01",
      toDate: "2024-02-29",
      year: null,
    });
    expect(
      resolveRefurbishmentPeriodBounds({
        mode: "financial_year",
        fyStartYear: "2025",
      }),
    ).toEqual({
      fromDate: "2025-04-01",
      toDate: "2026-03-31",
      year: null,
    });
  });

  it("builds past-request params for CY vs range", () => {
    expect(
      buildRefurbishmentPastRequestParams({
        mode: "calendar_year",
        year: "2026",
      }),
    ).toMatchObject({ year: 2026, limit: 200 });
    expect(
      buildRefurbishmentPastRequestParams({
        mode: "range",
        fromDate: "2026-01-01",
        toDate: "2026-01-31",
      }),
    ).toMatchObject({
      fromDate: "2026-01-01",
      toDate: "2026-01-31",
      limit: 200,
    });
  });

  it("describes full period label", () => {
    expect(
      describeRefurbishmentReportPeriodFull({
        mode: "calendar_year",
        year: "2026",
      }),
    ).toBe("Calendar Year · 2026");
  });
});
