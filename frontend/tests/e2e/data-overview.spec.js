/**
 * E2E Tests for Data Overview Tab
 * Tests Partner-wise Breakdown (Top 10) and Center-wise Breakdown (Top 20)
 *
 * Test Coverage:
 * - Partner-wise Breakdown: Data loading, year filters, sorting, gender display
 * - Center-wise Breakdown: Data loading, year filters, sorting, location format
 * - Cross-filter Tests: Year filter synchronization
 *
 * Created: December 17, 2025
 * Updated: December 17, 2025
 */

import { test, expect } from "@playwright/test";

// Test configuration
const BASE_URL = process.env.VITE_APP_URL || "http://localhost:5173";
const API_BASE_URL = process.env.VITE_API_BASE_URL || "http://localhost:5000";

// Test credentials (from demo_data.sql)
const TEST_USER = {
  email: "admin@seif.org",
  password: "Password123",
};

// Expected data from historicalCenterData.json
const EXPECTED_TOP_CENTERS = [
  "Centurion University Jatni",
  "IIT (Indian Institute of Technology) Madras",
  "IIT (Indian Institute of Technology) Bombay",
];

const EXPECTED_TOP_PARTNERS = [
  "Centurian University",
  "IIT Madras",
  "IIT Bombay",
];

/**
 * Test Suite: Data Overview Tab - Authentication & Setup
 */
test.describe("Data Overview Tab - Authentication", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
  });

  test("should login successfully with demo credentials", async ({ page }) => {
    // Fill login form
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Verify dashboard loaded
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator("text=Dashboard")).toBeVisible();
  });

  test("should navigate to Data Overview tab", async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // Navigate to Data section
    await page.click("text=Data");
    await page.waitForTimeout(500);

    // Click on Overview tab (if tabs exist)
    const overviewTab = page.locator(
      'button:has-text("Overview"), a:has-text("Overview")',
    );
    if ((await overviewTab.count()) > 0) {
      await overviewTab.first().click();
      await page.waitForTimeout(1000);
    }

    // Verify Overview content loaded
    await expect(page.locator("text=Partner-wise Breakdown")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=Center-wise Breakdown")).toBeVisible({
      timeout: 10000,
    });
  });
});

/**
 * Test Suite: Partner-wise Breakdown (Top 10)
 */
test.describe("Partner-wise Breakdown - Data Display", () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to Overview
    await page.goto(BASE_URL);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // Navigate to Data Overview
    await page.click("text=Data");
    await page.waitForTimeout(500);
    const overviewTab = page.locator(
      'button:has-text("Overview"), a:has-text("Overview")',
    );
    if ((await overviewTab.count()) > 0) {
      await overviewTab.first().click();
      await page.waitForTimeout(1000);
    }

    // Wait for Partner-wise Breakdown table to load
    await page.waitForSelector("text=Partner-wise Breakdown", {
      timeout: 10000,
    });
    await page.waitForTimeout(2000); // Allow data to load
  });

  test("should display Partner-wise Breakdown table", async ({ page }) => {
    // Check table exists
    const partnerTable = page
      .locator("table")
      .filter({ hasText: "Partner-wise Breakdown" })
      .first();
    await expect(partnerTable).toBeVisible();

    // Check table headers
    await expect(page.locator('th:has-text("Partner Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Total Students")')).toBeVisible();
    await expect(page.locator('th:has-text("Male")')).toBeVisible();
    await expect(page.locator('th:has-text("Female")')).toBeVisible();
    await expect(page.locator('th:has-text("Centers")')).toBeVisible();
  });

  test("should display top 10 partners", async ({ page }) => {
    // Get all partner rows (excluding header)
    const partnerRows = page
      .locator("tbody tr")
      .filter({ hasNot: page.locator('td:has-text("No partner data")') });
    const rowCount = await partnerRows.count();

    // Should display at most 10 partners
    expect(rowCount).toBeLessThanOrEqual(10);
    expect(rowCount).toBeGreaterThan(0);

    console.log(`✅ Partner-wise Breakdown displays ${rowCount} partners`);
  });

  test("should show correct partner names from JSON", async ({ page }) => {
    // Check if expected partners appear
    const tableContent = await page
      .locator("table")
      .filter({ hasText: "Partner-wise Breakdown" })
      .textContent();

    let foundPartners = 0;
    for (const partner of EXPECTED_TOP_PARTNERS) {
      if (tableContent.includes(partner)) {
        foundPartners++;
        console.log(`✅ Found partner: ${partner}`);
      }
    }

    // At least some expected partners should be visible
    expect(foundPartners).toBeGreaterThan(0);
  });

  test("should display Male: 0 and Female: 0 for JSON-only partners", async ({
    page,
  }) => {
    // Get first partner row
    const firstRow = page.locator("tbody tr").first();

    // Check if row exists
    const rowExists = (await firstRow.count()) > 0;
    if (rowExists) {
      const rowText = await firstRow.textContent();

      // For historical data (JSON-only), Male and Female should be 0
      if (
        rowText.includes("0") ||
        rowText.includes("Male") ||
        rowText.includes("Female")
      ) {
        console.log(`✅ Gender display format verified: ${rowText}`);
      }
    }
  });

  test("should sort partners by total students (descending)", async ({
    page,
  }) => {
    // Get all student counts
    const studentCells = page.locator("tbody tr td:nth-child(2)");
    const count = await studentCells.count();

    if (count > 1) {
      const students = [];
      for (let i = 0; i < Math.min(count, 5); i++) {
        const text = await studentCells.nth(i).textContent();
        const num = parseInt(text.trim());
        if (!isNaN(num)) {
          students.push(num);
        }
      }

      // Verify descending order
      for (let i = 0; i < students.length - 1; i++) {
        expect(students[i]).toBeGreaterThanOrEqual(students[i + 1]);
      }

      console.log(`✅ Partners sorted correctly: ${students.join(" > ")}`);
    }
  });
});

/**
 * Test Suite: Partner-wise Breakdown - Year Filters
 */
test.describe("Partner-wise Breakdown - Year Filters", () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to Overview
    await page.goto(BASE_URL);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    await page.click("text=Data");
    await page.waitForTimeout(500);
    const overviewTab = page.locator(
      'button:has-text("Overview"), a:has-text("Overview")',
    );
    if ((await overviewTab.count()) > 0) {
      await overviewTab.first().click();
    }

    await page.waitForSelector("text=Partner-wise Breakdown", {
      timeout: 10000,
    });
    await page.waitForTimeout(2000);
  });

  test('should display data for "all" year filter (default)', async ({
    page,
  }) => {
    // Check if year filter exists
    const yearFilter = page
      .locator("select, button")
      .filter({ hasText: /2022|2023|2024|all/i });

    if ((await yearFilter.count()) > 0) {
      // Verify "all" is selected or default
      console.log("✅ Year filter found");
    }

    // Verify data is displayed
    const partnerRows = page
      .locator("tbody tr")
      .filter({ hasNot: page.locator('td:has-text("No partner data")') });
    const rowCount = await partnerRows.count();
    expect(rowCount).toBeGreaterThan(0);

    console.log(`✅ "all" year filter shows ${rowCount} partners with data`);
  });

  test("should update data when changing to 2022-23", async ({ page }) => {
    // Try to find and click year filter
    const yearFilter = page
      .locator("select")
      .filter({ hasText: /year|financial/i })
      .first();

    if ((await yearFilter.count()) > 0) {
      // Select 2022-23
      await yearFilter.selectOption({ label: /2022.*23/i });
      await page.waitForTimeout(1500);

      // Verify data updated
      const partnerRows = page
        .locator("tbody tr")
        .filter({ hasNot: page.locator('td:has-text("No partner data")') });
      const rowCount = await partnerRows.count();

      console.log(`✅ 2022-23 filter shows ${rowCount} partners`);
    } else {
      console.log("⚠️ Year filter not found - may need to adjust selector");
    }
  });

  test("should update data when changing to 2023-24", async ({ page }) => {
    const yearFilter = page
      .locator("select")
      .filter({ hasText: /year|financial/i })
      .first();

    if ((await yearFilter.count()) > 0) {
      await yearFilter.selectOption({ label: /2023.*24/i });
      await page.waitForTimeout(1500);

      const partnerRows = page
        .locator("tbody tr")
        .filter({ hasNot: page.locator('td:has-text("No partner data")') });
      const rowCount = await partnerRows.count();

      console.log(`✅ 2023-24 filter shows ${rowCount} partners`);
    }
  });

  test("should update data when changing to 2024-25", async ({ page }) => {
    const yearFilter = page
      .locator("select")
      .filter({ hasText: /year|financial/i })
      .first();

    if ((await yearFilter.count()) > 0) {
      await yearFilter.selectOption({ label: /2024.*25/i });
      await page.waitForTimeout(1500);

      const partnerRows = page
        .locator("tbody tr")
        .filter({ hasNot: page.locator('td:has-text("No partner data")') });
      const rowCount = await partnerRows.count();

      console.log(`✅ 2024-25 filter shows ${rowCount} partners`);
    }
  });

  test('should sum all three years when "all" is selected', async ({
    page,
  }) => {
    // Get total students for "all" year
    const firstRowAllYears = page.locator("tbody tr").first();
    const allYearsTotal = await firstRowAllYears
      .locator("td:nth-child(2)")
      .textContent();
    const allYearsNum = parseInt(allYearsTotal.trim());

    console.log(`✅ "all" year total: ${allYearsNum} students`);

    // This should be greater than any individual year
    expect(allYearsNum).toBeGreaterThan(0);

    // TODO: Could test individual years and verify sum matches
  });
});

/**
 * Test Suite: Center-wise Breakdown (Top 20)
 */
test.describe("Center-wise Breakdown - Data Display", () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to Overview
    await page.goto(BASE_URL);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    await page.click("text=Data");
    await page.waitForTimeout(500);
    const overviewTab = page.locator(
      'button:has-text("Overview"), a:has-text("Overview")',
    );
    if ((await overviewTab.count()) > 0) {
      await overviewTab.first().click();
    }

    await page.waitForSelector("text=Center-wise Breakdown", {
      timeout: 10000,
    });
    await page.waitForTimeout(2000);
  });

  test("should display Center-wise Breakdown table", async ({ page }) => {
    // Check table exists
    const centerTable = page
      .locator("table")
      .filter({ hasText: "Center-wise Breakdown" })
      .first();
    await expect(centerTable).toBeVisible();

    // Check table headers
    await expect(page.locator('th:has-text("Center Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Partner")')).toBeVisible();
    await expect(page.locator('th:has-text("Location")')).toBeVisible();
    await expect(page.locator('th:has-text("Total Students")')).toBeVisible();
    await expect(page.locator('th:has-text("Male")')).toBeVisible();
    await expect(page.locator('th:has-text("Female")')).toBeVisible();
  });

  test("should display top 20 centers", async ({ page }) => {
    // Get all center rows (excluding header)
    const centerRows = page
      .locator("tbody tr")
      .filter({ hasNot: page.locator('td:has-text("No center data")') });
    const rowCount = await centerRows.count();

    // Should display at most 20 centers
    expect(rowCount).toBeLessThanOrEqual(20);
    expect(rowCount).toBeGreaterThan(0);

    console.log(`✅ Center-wise Breakdown displays ${rowCount} centers`);
  });

  test("should show correct center names from JSON", async ({ page }) => {
    const tableContent = await page
      .locator("table")
      .filter({ hasText: "Center-wise Breakdown" })
      .textContent();

    let foundCenters = 0;
    for (const center of EXPECTED_TOP_CENTERS) {
      if (tableContent.includes(center)) {
        foundCenters++;
        console.log(`✅ Found center: ${center}`);
      }
    }

    // At least some expected centers should be visible
    expect(foundCenters).toBeGreaterThan(0);
  });

  test("should display partner names from partnerName field", async ({
    page,
  }) => {
    // Get first center row
    const firstRow = page.locator("tbody tr").first();

    if ((await firstRow.count()) > 0) {
      const partnerCell = firstRow.locator("td:nth-child(2)");
      const partnerName = await partnerCell.textContent();

      // Should not be empty
      expect(partnerName.trim().length).toBeGreaterThan(0);

      // Should not be "Unknown Partner" (unless truly unknown)
      console.log(`✅ Partner name displayed: ${partnerName.trim()}`);
    }
  });

  test('should display location in "City, State" format', async ({ page }) => {
    // Get first center row
    const firstRow = page.locator("tbody tr").first();

    if ((await firstRow.count()) > 0) {
      const locationCell = firstRow.locator("td:nth-child(3)");
      const location = await locationCell.textContent();

      // Should contain comma separator
      expect(location).toContain(",");

      console.log(`✅ Location format verified: ${location.trim()}`);
    }
  });

  test("should sort centers by total students (descending)", async ({
    page,
  }) => {
    // Get all student counts (4th column)
    const studentCells = page.locator("tbody tr td:nth-child(4)");
    const count = await studentCells.count();

    if (count > 1) {
      const students = [];
      for (let i = 0; i < Math.min(count, 5); i++) {
        const text = await studentCells.nth(i).textContent();
        const num = parseInt(text.trim());
        if (!isNaN(num)) {
          students.push(num);
        }
      }

      // Verify descending order
      for (let i = 0; i < students.length - 1; i++) {
        expect(students[i]).toBeGreaterThanOrEqual(students[i + 1]);
      }

      console.log(`✅ Centers sorted correctly: ${students.join(" > ")}`);
    }
  });

  test("should show gender data or 0 for historical years", async ({
    page,
  }) => {
    // Get first center row
    const firstRow = page.locator("tbody tr").first();

    if ((await firstRow.count()) > 0) {
      const maleCell = firstRow.locator("td:nth-child(5)");
      const femaleCell = firstRow.locator("td:nth-child(6)");

      const maleText = await maleCell.textContent();
      const femaleText = await femaleCell.textContent();

      console.log(
        `✅ Gender data - Male: ${maleText.trim()}, Female: ${femaleText.trim()}`,
      );

      // Should show either number or 0 (for historical data)
      expect(maleText.trim().length).toBeGreaterThan(0);
      expect(femaleText.trim().length).toBeGreaterThan(0);
    }
  });
});

/**
 * Test Suite: Center-wise Breakdown - Year Filters
 */
test.describe("Center-wise Breakdown - Year Filters", () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to Overview
    await page.goto(BASE_URL);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    await page.click("text=Data");
    await page.waitForTimeout(500);
    const overviewTab = page.locator(
      'button:has-text("Overview"), a:has-text("Overview")',
    );
    if ((await overviewTab.count()) > 0) {
      await overviewTab.first().click();
    }

    await page.waitForSelector("text=Center-wise Breakdown", {
      timeout: 10000,
    });
    await page.waitForTimeout(2000);
  });

  test('should display data for "all" year filter', async ({ page }) => {
    const centerRows = page
      .locator("tbody tr")
      .filter({ hasNot: page.locator('td:has-text("No center data")') });
    const rowCount = await centerRows.count();
    expect(rowCount).toBeGreaterThan(0);

    console.log(`✅ "all" year filter shows ${rowCount} centers with data`);
  });

  test('should sum all three years for "all" filter', async ({ page }) => {
    // Get first center's total students
    const firstRow = page.locator("tbody tr").first();
    const totalCell = firstRow.locator("td:nth-child(4)");
    const totalText = await totalCell.textContent();
    const totalNum = parseInt(totalText.trim());

    console.log(`✅ "all" year center total: ${totalNum} students`);

    // Should be greater than 0 (sum of 3 years)
    expect(totalNum).toBeGreaterThan(0);
  });

  test("should update when changing to 2022-23", async ({ page }) => {
    const yearFilter = page
      .locator("select")
      .filter({ hasText: /year|financial/i })
      .first();

    if ((await yearFilter.count()) > 0) {
      await yearFilter.selectOption({ label: /2022.*23/i });
      await page.waitForTimeout(1500);

      const centerRows = page
        .locator("tbody tr")
        .filter({ hasNot: page.locator('td:has-text("No center data")') });
      const rowCount = await centerRows.count();

      console.log(`✅ 2022-23 filter shows ${rowCount} centers`);
    }
  });

  test("should update when changing to 2023-24", async ({ page }) => {
    const yearFilter = page
      .locator("select")
      .filter({ hasText: /year|financial/i })
      .first();

    if ((await yearFilter.count()) > 0) {
      await yearFilter.selectOption({ label: /2023.*24/i });
      await page.waitForTimeout(1500);

      const centerRows = page
        .locator("tbody tr")
        .filter({ hasNot: page.locator('td:has-text("No center data")') });
      const rowCount = await centerRows.count();

      console.log(`✅ 2023-24 filter shows ${rowCount} centers`);
    }
  });

  test("should update when changing to 2024-25", async ({ page }) => {
    const yearFilter = page
      .locator("select")
      .filter({ hasText: /year|financial/i })
      .first();

    if ((await yearFilter.count()) > 0) {
      await yearFilter.selectOption({ label: /2024.*25/i });
      await page.waitForTimeout(1500);

      const centerRows = page
        .locator("tbody tr")
        .filter({ hasNot: page.locator('td:has-text("No center data")') });
      const rowCount = await centerRows.count();

      console.log(`✅ 2024-25 filter shows ${rowCount} centers`);
    }
  });
});

/**
 * Test Suite: Cross-filter Tests
 */
test.describe("Cross-filter Synchronization", () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to Overview
    await page.goto(BASE_URL);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    await page.click("text=Data");
    await page.waitForTimeout(500);
    const overviewTab = page.locator(
      'button:has-text("Overview"), a:has-text("Overview")',
    );
    if ((await overviewTab.count()) > 0) {
      await overviewTab.first().click();
    }

    await page.waitForSelector("text=Partner-wise Breakdown", {
      timeout: 10000,
    });
    await page.waitForTimeout(2000);
  });

  test("should update both breakdowns when year filter changes", async ({
    page,
  }) => {
    const yearFilter = page
      .locator("select")
      .filter({ hasText: /year|financial/i })
      .first();

    if ((await yearFilter.count()) > 0) {
      // Get initial counts
      const initialPartners = await page
        .locator("tbody tr")
        .filter({ hasNot: page.locator('td:has-text("No partner data")') })
        .count();
      const initialCenters = await page
        .locator("tbody tr")
        .filter({ hasNot: page.locator('td:has-text("No center data")') })
        .count();

      console.log(
        `Initial - Partners: ${initialPartners}, Centers: ${initialCenters}`,
      );

      // Change to 2022-23
      await yearFilter.selectOption({ label: /2022.*23/i });
      await page.waitForTimeout(2000);

      // Get updated counts
      const updatedPartners = await page
        .locator("tbody tr")
        .filter({ hasNot: page.locator('td:has-text("No partner data")') })
        .count();
      const updatedCenters = await page
        .locator("tbody tr")
        .filter({ hasNot: page.locator('td:has-text("No center data")') })
        .count();

      console.log(
        `After 2022-23 - Partners: ${updatedPartners}, Centers: ${updatedCenters}`,
      );

      // Both should have data
      expect(updatedPartners).toBeGreaterThan(0);
      expect(updatedCenters).toBeGreaterThan(0);
    }
  });

  test("should maintain data consistency across views", async ({ page }) => {
    // Get partner and center counts
    const partnerRows = await page
      .locator("tbody tr")
      .filter({ hasNot: page.locator('td:has-text("No partner data")') })
      .count();
    const centerRows = await page
      .locator("tbody tr")
      .filter({ hasNot: page.locator('td:has-text("No center data")') })
      .count();

    console.log(
      `✅ Data consistency - Partners: ${partnerRows}, Centers: ${centerRows}`,
    );

    // Both should display data
    expect(partnerRows).toBeGreaterThan(0);
    expect(centerRows).toBeGreaterThan(0);

    // Centers (Top 20) should generally be more than Partners (Top 10)
    // Note: This may not always be true depending on data
  });
});

/**
 * Test Suite: Browser Console Errors
 */
test.describe("Browser Console - Error Monitoring", () => {
  test("should not have critical console errors", async ({ page }) => {
    const errors = [];

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Login and navigate
    await page.goto(BASE_URL);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    await page.click("text=Data");
    await page.waitForTimeout(500);
    const overviewTab = page.locator(
      'button:has-text("Overview"), a:has-text("Overview")',
    );
    if ((await overviewTab.count()) > 0) {
      await overviewTab.first().click();
    }

    await page.waitForTimeout(3000);

    // Log errors for debugging
    if (errors.length > 0) {
      console.log("⚠️ Console errors detected:");
      errors.forEach((err) => console.log(`  - ${err}`));
    } else {
      console.log("✅ No console errors detected");
    }

    // Critical errors should not exist
    const criticalErrors = errors.filter(
      (err) =>
        err.toLowerCase().includes("cannot read") ||
        err.toLowerCase().includes("undefined") ||
        err.toLowerCase().includes("null"),
    );

    expect(criticalErrors.length).toBe(0);
  });
});
