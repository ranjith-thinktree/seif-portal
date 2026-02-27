/**
 * E2E Tests for Overview Dashboard Enhancements
 * Tests: TOT card, Student breakdown tooltip, Male/Female counts, Year filters
 *
 * Features tested:
 * 1. TOT card displays with correct value
 * 2. TOT card updates when year filter changes
 * 3. Student breakdown tooltip appears on hover
 * 4. Tooltip shows correct percentages
 * 5. Male/Female counts match dashboard data
 * 6. 2025-26 year filter is available and functional
 * 7. All year filter shows aggregated totals
 */

import { test, expect } from "@playwright/test";

const PARTNER_USER = {
  email: "demo.partner@seif.org",
  password: "Password123",
};

const EXPECTED_DATA = {
  all: {
    total_students: 162826,
    male: 138420,
    female: 24406,
    tot: 1301,
    india: 150146,
    greater_india: 12680,
    nsi: 0,
  },
  "2022-23": {
    total_students: 28817,
    male: 27407,
    female: 1410,
    tot: 290,
    india: 26514,
    greater_india: 2303,
  },
  "2023-24": {
    total_students: 37499,
    male: 33158,
    female: 4341,
    tot: 312,
    india: 34465,
    greater_india: 3034,
  },
  "2024-25": {
    total_students: 47354,
    male: 38144,
    female: 9210,
    tot: 445,
    india: 43521,
    greater_india: 3833,
  },
  "2025-26": {
    total_students: 49156,
    male: 39711,
    female: 9445,
    tot: 254,
    india: 45646,
    greater_india: 3510,
  },
};

test.describe("Overview Dashboard Enhancements", () => {
  test.beforeEach(async ({ page }) => {
    // Login with proper waits
    await page.goto("http://localhost:5173/login");

    // Wait for login form to be visible and fill credentials
    await page.waitForSelector('input[name="email"]', {
      state: "visible",
      timeout: 15000,
    });
    await page.fill('input[name="email"]', PARTNER_USER.email);
    await page.fill('input[name="password"]', PARTNER_USER.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard with longer timeout
    await page.waitForURL("**/dashboard", { timeout: 20000 });

    // Wait a bit for dashboard to load
    await page.waitForTimeout(2000);

    // Navigate to Data Management -> Overview Tab
    await page.click("text=Data Management");
    await page.waitForSelector("text=Overview", { timeout: 10000 });
  });

  test("TOT card is visible and displays correct value for All Years", async ({
    page,
  }) => {
    // Wait for analytics to load
    await page.waitForSelector("text=Training of Trainers (TOT)", {
      timeout: 10000,
    });

    // Find TOT card
    const totCard = page
      .locator("text=Training of Trainers (TOT)")
      .locator("..");
    await expect(totCard).toBeVisible();

    // Check value (should be sum of all years: 1301)
    const valueText = await totCard.locator(".text-2xl").textContent();
    const value = parseInt(valueText.replace(/,/g, ""));
    expect(value).toBe(EXPECTED_DATA.all.tot);
  });

  test("TOT card updates when changing year filter", async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector("text=Training of Trainers (TOT)", {
      timeout: 10000,
    });

    // Change to FY 2024-25
    await page.click("text=Financial Year");
    await page.click("text=FY 2024-25");
    await page.waitForTimeout(1000); // Wait for filter to apply

    // Check TOT value (should be 445 for 2024)
    const totCard = page
      .locator("text=Training of Trainers (TOT)")
      .locator("..");
    const valueText = await totCard.locator(".text-2xl").textContent();
    const value = parseInt(valueText.replace(/,/g, ""));
    expect(value).toBe(EXPECTED_DATA["2024-25"].tot);
  });

  test("Student breakdown tooltip appears on hover", async ({ page }) => {
    // Wait for Total Students card
    await page.waitForSelector("text=Total Students", { timeout: 10000 });

    // Find Total Students card
    const totalStudentsCard = page.locator("text=Total Students").locator("..");

    // Hover over the card
    await totalStudentsCard.hover();

    // Wait for tooltip to appear
    await page.waitForSelector('[role="tooltip"]', { timeout: 3000 });

    // Check tooltip is visible
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toBeVisible();

    // Check tooltip contains breakdown
    await expect(tooltip).toContainText("India");
    await expect(tooltip).toContainText("Greater India");
    await expect(tooltip).toContainText("NSI");
  });

  test("Tooltip shows correct percentages for All Years", async ({ page }) => {
    // Wait for Total Students card
    await page.waitForSelector("text=Total Students", { timeout: 10000 });

    // Hover over Total Students card
    const totalStudentsCard = page.locator("text=Total Students").locator("..");
    await totalStudentsCard.hover();

    // Wait for tooltip
    await page.waitForSelector('[role="tooltip"]', { timeout: 3000 });
    const tooltip = page.locator('[role="tooltip"]');

    // Calculate expected percentages
    const total = EXPECTED_DATA.all.total_students;
    const indiaPercent = ((EXPECTED_DATA.all.india / total) * 100).toFixed(1);
    const greaterIndiaPercent = (
      (EXPECTED_DATA.all.greater_india / total) *
      100
    ).toFixed(1);
    const nsiPercent = ((EXPECTED_DATA.all.nsi / total) * 100).toFixed(1);

    // Check percentages in tooltip
    const tooltipText = await tooltip.textContent();
    expect(tooltipText).toContain(`${indiaPercent}%`);
    expect(tooltipText).toContain(`${greaterIndiaPercent}%`);
    expect(tooltipText).toContain(`${nsiPercent}%`);
  });

  test("Male Students card displays correct count for All Years", async ({
    page,
  }) => {
    // Wait for Male Students card
    await page.waitForSelector("text=Male Students", { timeout: 10000 });

    // Find Male Students card
    const maleCard = page.locator("text=Male Students").locator("..");

    // Get value
    const valueText = await maleCard.locator(".text-2xl").textContent();
    const value = parseInt(valueText.replace(/,/g, ""));

    // Check it matches expected (138,420)
    expect(value).toBe(EXPECTED_DATA.all.male);
  });

  test("Female Students card displays correct count for All Years", async ({
    page,
  }) => {
    // Wait for Female Students card
    await page.waitForSelector("text=Female Students", { timeout: 10000 });

    // Find Female Students card
    const femaleCard = page.locator("text=Female Students").locator("..");

    // Get value
    const valueText = await femaleCard.locator(".text-2xl").textContent();
    const value = parseInt(valueText.replace(/,/g, ""));

    // Check it matches expected (24,406)
    expect(value).toBe(EXPECTED_DATA.all.female);
  });

  test("2025-26 year filter is available", async ({ page }) => {
    // Wait for filter
    await page.waitForSelector("text=Financial Year", { timeout: 10000 });

    // Click to open dropdown
    await page.click("text=Financial Year");

    // Check 2025-26 option exists
    const option = page.locator("text=FY 2025-26");
    await expect(option).toBeVisible();
  });

  test("Changing to 2025-26 updates all dashboard values", async ({ page }) => {
    // Wait for page load
    await page.waitForSelector("text=Total Students", { timeout: 10000 });

    // Change to FY 2025-26
    await page.click("text=Financial Year");
    await page.click("text=FY 2025-26");
    await page.waitForTimeout(1000);

    // Check Male Students (should be 39,711)
    const maleCard = page.locator("text=Male Students").locator("..");
    const maleValue = parseInt(
      (await maleCard.locator(".text-2xl").textContent()).replace(/,/g, ""),
    );
    expect(maleValue).toBe(EXPECTED_DATA["2025-26"].male);

    // Check Female Students (should be 9,445)
    const femaleCard = page.locator("text=Female Students").locator("..");
    const femaleValue = parseInt(
      (await femaleCard.locator(".text-2xl").textContent()).replace(/,/g, ""),
    );
    expect(femaleValue).toBe(EXPECTED_DATA["2025-26"].female);

    // Check TOT (should be 254)
    const totCard = page
      .locator("text=Training of Trainers (TOT)")
      .locator("..");
    const totValue = parseInt(
      (await totCard.locator(".text-2xl").textContent()).replace(/,/g, ""),
    );
    expect(totValue).toBe(EXPECTED_DATA["2025-26"].tot);
  });

  test("All year filter shows aggregated totals", async ({ page }) => {
    // Wait for page load
    await page.waitForSelector("text=Total Students", { timeout: 10000 });

    // Select "All Years" (default, but let's be explicit)
    await page.click("text=Financial Year");
    await page.click("text=All Years");
    await page.waitForTimeout(1000);

    // Check Male Students (should be 138,420 - sum of all years)
    const maleCard = page.locator("text=Male Students").locator("..");
    const maleValue = parseInt(
      (await maleCard.locator(".text-2xl").textContent()).replace(/,/g, ""),
    );
    expect(maleValue).toBe(EXPECTED_DATA.all.male);

    // Check Female Students (should be 24,406 - sum of all years)
    const femaleCard = page.locator("text=Female Students").locator("..");
    const femaleValue = parseInt(
      (await femaleCard.locator(".text-2xl").textContent()).replace(/,/g, ""),
    );
    expect(femaleValue).toBe(EXPECTED_DATA.all.female);

    // Check TOT (should be 1,301 - sum of all years)
    const totCard = page
      .locator("text=Training of Trainers (TOT)")
      .locator("..");
    const totValue = parseInt(
      (await totCard.locator(".text-2xl").textContent()).replace(/,/g, ""),
    );
    expect(totValue).toBe(EXPECTED_DATA.all.tot);
  });

  test("Tooltip updates when year filter changes", async ({ page }) => {
    // Wait for page load
    await page.waitForSelector("text=Total Students", { timeout: 10000 });

    // Change to FY 2024-25
    await page.click("text=Financial Year");
    await page.click("text=FY 2024-25");
    await page.waitForTimeout(1000);

    // Hover over Total Students card
    const totalStudentsCard = page.locator("text=Total Students").locator("..");
    await totalStudentsCard.hover();

    // Wait for tooltip
    await page.waitForSelector('[role="tooltip"]', { timeout: 3000 });
    const tooltip = page.locator('[role="tooltip"]');

    // Calculate expected percentages for 2024-25
    const total = EXPECTED_DATA["2024-25"].total_students;
    const indiaPercent = (
      (EXPECTED_DATA["2024-25"].india / total) *
      100
    ).toFixed(1);

    // Check India percentage in tooltip
    const tooltipText = await tooltip.textContent();
    expect(tooltipText).toContain(`${indiaPercent}%`);
  });
});
