import { describe, it, expect } from "vitest";
import {
  getCalendarYear,
  getYearFilterOptions,
  matchesCalendarYearFilter,
  matchesEstablishmentYearFilter,
  wasCenterEligibleDuringYear,
  matchesAllCentersYearFilter,
  filterOverviewLastRefurbishedCenters,
  filterOverviewEligibleCenters,
  filterOverviewAllCenters,
} from "../../utils/refurbishmentUtils";

const mockRefurbishedCenters = [
  {
    id: "1",
    center_name: "Bosco Udyogashala",
    partner_name: "Don Bosco Tech Society",
    state: "Maharashtra",
    region: "West",
    city: "Sindhurg",
    last_refurbishment_date: "2026-06-11T09:46:53.000Z",
    latest_request_id: "req-1",
  },
  {
    id: "2",
    center_name: "Gram Vikas Society",
    partner_name: "Gram Vikas Society",
    state: "Karnataka",
    region: "South",
    city: "Dharwad",
    last_refurbishment_date: "2026-06-02T11:23:09.000Z",
    latest_request_id: "req-2",
  },
];

describe("refurbishment overview year filters", () => {
  it("includes the current calendar year in year options", () => {
    const currentYear = String(new Date().getFullYear());
    const options = getYearFilterOptions();
    expect(options.some((opt) => opt.value === currentYear)).toBe(true);
  });

  it("matches refurbished date calendar years correctly", () => {
    expect(getCalendarYear("2026-06-11T09:46:53.000Z")).toBe(2026);
    expect(matchesCalendarYearFilter("2026-06-11T09:46:53.000Z", "2026")).toBe(
      true,
    );
    expect(matchesCalendarYearFilter("2026-06-11T09:46:53.000Z", "2025")).toBe(
      false,
    );
  });

  it("matches establishment year correctly", () => {
    expect(matchesEstablishmentYearFilter(2015, "2015")).toBe(true);
    expect(matchesEstablishmentYearFilter(2015, "2026")).toBe(false);
  });

  it("returns all refurbished centers when no year filter is set", () => {
    const result = filterOverviewLastRefurbishedCenters(mockRefurbishedCenters, {
      year: "",
    });
    expect(result).toHaveLength(2);
  });

  it("filters refurbished centers by year 2026", () => {
    const result = filterOverviewLastRefurbishedCenters(mockRefurbishedCenters, {
      year: "2026",
    });
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.center_name)).toEqual([
      "Bosco Udyogashala",
      "Gram Vikas Society",
    ]);
  });

  it("returns zero refurbished centers for year 2025", () => {
    const result = filterOverviewLastRefurbishedCenters(mockRefurbishedCenters, {
      year: "2025",
    });
    expect(result).toHaveLength(0);
  });

  it("filters refurbished centers by partner (multi-select)", () => {
    const result = filterOverviewLastRefurbishedCenters(mockRefurbishedCenters, {
      partner: ["Gram Vikas Society"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].center_name).toBe("Gram Vikas Society");
  });

  it("filters refurbished centers by state and region together", () => {
    const result = filterOverviewLastRefurbishedCenters(mockRefurbishedCenters, {
      state: ["Maharashtra"],
      region: ["West"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].center_name).toBe("Bosco Udyogashala");
  });

  it("combines year filter with partner filter", () => {
    const result = filterOverviewLastRefurbishedCenters(mockRefurbishedCenters, {
      year: "2026",
      partner: ["Don Bosco Tech Society"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].center_name).toBe("Bosco Udyogashala");
  });
});

const mockEligibleCenters = [
  {
    id: "e1",
    center_name: "Currently Eligible",
    partner_name: "Partner A",
    state: "Karnataka",
    region: "South",
    year_of_establishment: 2015,
    is_eligible: 1,
    last_notified_at: "2026-03-15T10:00:00.000Z",
  },
  {
    id: "e2",
    center_name: "Also Eligible",
    partner_name: "Partner B",
    state: "Maharashtra",
    region: "West",
    year_of_establishment: 2010,
    is_eligible: 1,
  },
  {
    id: "e3",
    center_name: "Not Currently Eligible",
    partner_name: "Partner C",
    state: "Tamil Nadu",
    region: "South",
    year_of_establishment: 2022,
    is_eligible: 0,
  },
];

const mockAllCenters = [
  {
    id: "a1",
    center_name: "Established 2026",
    organization_name: "Partner X",
    state: "Kerala",
    region: "South",
    year_of_establishment: 2026,
    is_eligible: 0,
  },
  {
    id: "a2",
    center_name: "Refurbished 2026",
    organization_name: "Partner Y",
    state: "Karnataka",
    region: "South",
    year_of_establishment: 2010,
    last_refurbishment_date: "2026-06-02T11:23:09.000Z",
    is_eligible: 0,
  },
  {
    id: "a3",
    center_name: "Older Center",
    organization_name: "Partner Z",
    state: "Goa",
    region: "West",
    year_of_establishment: 2012,
    is_eligible: 1,
  },
];

describe("eligible centers overview year filters", () => {
  it("uses establishment + repeat cycle for past-year eligibility", () => {
    expect(
      wasCenterEligibleDuringYear(
        { year_of_establishment: 2015 },
        "2025",
      ),
    ).toBe(true);
    expect(
      wasCenterEligibleDuringYear(
        { year_of_establishment: 2022 },
        "2025",
      ),
    ).toBe(false);
    expect(
      wasCenterEligibleDuringYear(
        {
          year_of_establishment: 2010,
          last_refurbishment_date: "2022-06-01T00:00:00.000Z",
        },
        "2025",
        { firstCycleYears: 5, repeatCycleYears: 3 },
      ),
    ).toBe(true);
  });

  it("shows currently eligible centers for the current calendar year", () => {
    const currentYear = String(new Date().getFullYear());
    const result = filterOverviewEligibleCenters(mockEligibleCenters, {
      year: currentYear,
    });
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.is_eligible === 1)).toBe(true);
  });

  it("filters eligible centers for a past year using the refurbishment cycle", () => {
    const result = filterOverviewEligibleCenters(
      [
        {
          id: "h1",
          center_name: "Eligible In 2025",
          year_of_establishment: 2015,
          is_eligible: 0,
        },
        {
          id: "h2",
          center_name: "Too New In 2025",
          year_of_establishment: 2022,
          is_eligible: 0,
        },
      ],
      { year: "2025" },
    );
    expect(result).toHaveLength(1);
    expect(result[0].center_name).toBe("Eligible In 2025");
  });

  it("returns currently eligible centers when year filter is cleared", () => {
    const result = filterOverviewEligibleCenters(mockEligibleCenters, {
      year: "",
    });
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.is_eligible === 1)).toBe(true);
  });
});

describe("all centers overview year filters", () => {
  it("matches by establishment year or refurbishment year", () => {
    expect(matchesAllCentersYearFilter(mockAllCenters[0], "2026")).toBe(true);
    expect(matchesAllCentersYearFilter(mockAllCenters[1], "2026")).toBe(true);
    expect(matchesAllCentersYearFilter(mockAllCenters[2], "2026")).toBe(false);
  });

  it("filters all centers for year 2026", () => {
    const result = filterOverviewAllCenters(mockAllCenters, { year: "2026" });
    expect(result).toHaveLength(2);
  });

  it("filters all centers by eligibility status", () => {
    const result = filterOverviewAllCenters(mockAllCenters, {
      status: ["Eligible"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].center_name).toBe("Older Center");
  });
});
