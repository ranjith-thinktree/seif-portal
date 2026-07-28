import { describe, expect, it } from "vitest";
import {
  buildRefurbishmentPartnerChart,
  buildRefurbishmentStatusMix,
  summarizeRefurbishmentRequests,
} from "../../utils/refurbishmentReportUtils";
import { refurbishmentReportExportFilename } from "../../utils/refurbishmentReportPeriodUtils";

const sampleRows = [
  {
    organization_name: "Partner A",
    status: "completed",
    display_status: "completed",
    display_status_label: "Completed",
  },
  {
    organization_name: "Partner A",
    status: "approved",
    display_status: "approved",
    display_status_label: "Approved",
  },
  {
    partner_name: "Partner B",
    status: "rejected",
    display_status: "rejected",
    display_status_label: "Rejected",
  },
];

describe("refurbishmentReportUtils", () => {
  it("summarizes request statuses", () => {
    expect(summarizeRefurbishmentRequests(sampleRows)).toEqual({
      requests: 3,
      completed: 1,
      rejected: 1,
      inProgress: 1,
    });
  });

  it("builds status mix and partner chart", () => {
    const mix = buildRefurbishmentStatusMix(sampleRows);
    expect(mix.find((d) => d.key === "completed")?.value).toBe(1);
    const partners = buildRefurbishmentPartnerChart(sampleRows, 5);
    expect(partners[0].partner).toBe("Partner A");
    expect(partners[0].requests).toBe(2);
    expect(partners[0].completed).toBe(1);
  });

  it("builds export filename", () => {
    expect(
      refurbishmentReportExportFilename({
        mode: "calendar_year",
        year: "2026",
      }),
    ).toContain("SEIF_Refurbishment_calendar_year");
  });
});
