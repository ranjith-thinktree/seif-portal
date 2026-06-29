import { describe, it, expect } from "vitest";

/**
 * Mirrors AdvancedSearchBar multi-select handling after isMulti/multi fix.
 */
const isGroupMulti = (group) => Boolean(group?.multi ?? group?.isMulti);

const handleFilterSelect = (activeFilters, key, value, isMulti) => {
  if (isMulti) {
    const currentValues = activeFilters[key] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    return { ...activeFilters, [key]: newValues };
  }

  if (activeFilters[key] === value) {
    return { ...activeFilters, [key]: "" };
  }
  return { ...activeFilters, [key]: value };
};

describe("AdvancedSearchBar filter selection", () => {
  it("supports isMulti prop for multi-select groups", () => {
    const group = { key: "partner", isMulti: true };
    let filters = { partner: [] };

    filters = handleFilterSelect(
      filters,
      group.key,
      "Partner A",
      isGroupMulti(group),
    );
    filters = handleFilterSelect(
      filters,
      group.key,
      "Partner B",
      isGroupMulti(group),
    );

    expect(filters.partner).toEqual(["Partner A", "Partner B"]);
  });

  it("supports multi prop for multi-select groups", () => {
    const group = { key: "partner", multi: true };
    let filters = { partner: [] };

    filters = handleFilterSelect(
      filters,
      group.key,
      "Partner A",
      isGroupMulti(group),
    );
    expect(filters.partner).toEqual(["Partner A"]);
  });

  it("supports isMulti false for single-select year filter", () => {
    const group = { key: "year", isMulti: false };
    let filters = { year: "" };

    filters = handleFilterSelect(filters, group.key, "2026", isGroupMulti(group));
    expect(filters.year).toBe("2026");

    filters = handleFilterSelect(filters, group.key, "2026", isGroupMulti(group));
    expect(filters.year).toBe("");
  });
});
