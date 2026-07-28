import { describe, expect, it } from "vitest";
import {
  buildCertificationArchiveApiParams,
  collectArchiveFilesFromRows,
  countActiveCertificationArchiveFilters,
  describeCertificationArchiveFilters,
  getCertificationFilterActionMode,
  groupCertificationRowsByMonth,
  hasActiveCertificationArchiveFilters,
  partitionSelectedArchiveFiles,
} from "../../utils/certificationArchiveUtils";

describe("certificationArchiveUtils", () => {
  it("counts active date and trainee filters with multi years", () => {
    const count = countActiveCertificationArchiveFilters({
      dateTypes: ["assessment", "batchEnd"],
      months: ["6", "7"],
      years: ["2025", "2026"],
      traineeMetrics: ["failed"],
    });
    expect(count).toBe(2);
    expect(
      hasActiveCertificationArchiveFilters({
        dateTypes: [],
        months: [],
        years: [],
        traineeMetrics: [],
      }),
    ).toBe(false);
  });

  it("describes applied filters for display chips", () => {
    const labels = describeCertificationArchiveFilters({
      dateTypes: ["assessment"],
      months: ["6"],
      years: ["2026"],
      traineeMetrics: ["passed", "failed"],
    });
    expect(labels[0]).toContain("Assessment date");
    expect(labels[0]).toContain("June");
    expect(labels[0]).toContain("2026");
    expect(labels).toContain("Passed > 0");
    expect(labels).toContain("Failed > 0");
  });

  it("builds API params with years multi-select", () => {
    const params = buildCertificationArchiveApiParams({
      dateTypes: ["assessment"],
      months: ["6", "7"],
      years: ["2025", "2026"],
      traineeMetrics: ["registered"],
    });
    expect(params).toEqual({
      page: 1,
      limit: 200,
      dateTypes: "assessment",
      months: "6,7",
      years: "2025,2026",
      traineeMetrics: "registered",
    });
  });

  it("switches Apply/Reset action mode", () => {
    const draft = {
      dateTypes: ["assessment"],
      months: ["6"],
      years: ["2026"],
      traineeMetrics: [],
    };
    expect(getCertificationFilterActionMode(draft, emptyLike())).toBe("apply");
    expect(getCertificationFilterActionMode(draft, draft)).toBe("reset");
  });

  it("partitions selected files by type", () => {
    const files = collectArchiveFilesFromRows([
      {
        upload_id: "u1",
        partner_name: "P1",
        files: [
          { id: "c1", fileType: "certificate", fileName: "a.pdf" },
          { id: "r1", fileType: "result_sheet", fileName: "b.xlsx" },
        ],
      },
    ]);
    const partitioned = partitionSelectedArchiveFiles(files, ["c1", "r1"]);
    expect(partitioned.certificates).toHaveLength(1);
    expect(partitioned.resultSheets).toHaveLength(1);
  });

  it("groups rows by storage month", () => {
    const grouped = groupCertificationRowsByMonth([
      { storage_month: "2026-06", partner_name: "B" },
      { storage_month: "2026-07", partner_name: "A" },
      { storage_month: "2026-06", partner_name: "A" },
    ]);
    expect(grouped.map((item) => item.month)).toEqual(["2026-07", "2026-06"]);
    expect(grouped[1].rows.map((row) => row.partner_name)).toEqual(["A", "B"]);
  });
});

function emptyLike() {
  return {
    dateTypes: [],
    months: [],
    years: [],
    traineeMetrics: [],
  };
}
