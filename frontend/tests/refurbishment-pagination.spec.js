import { test, expect } from "@playwright/test";

/**
 * Refurbishment Pagination Tests
 * Tests pagination functionality across all refurbishment tabs
 */

test.describe("Refurbishment Tabs - Pagination Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("http://localhost:5173/login");
    await page.fill('input[type="email"]', "demo.partner@seif.org");
    await page.fill('input[type="password"]', "Password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // Navigate to refurbishment
    await page.goto("http://localhost:5173/admin/refurbishment");
    await page.waitForLoadState("networkidle");
  });

  test("Eligibility Tab - Pagination Visible and Functional", async ({
    page,
  }) => {
    // Click Eligibility tab
    await page.click('button:has-text("Eligibility")');
    await page.waitForTimeout(1000);

    // Check pagination footer exists
    const paginationFooter = page.locator(
      "div.flex.items-center.justify-between",
      { hasText: "Showing" },
    );
    await expect(paginationFooter).toBeVisible();

    // Check shows correct format
    await expect(paginationFooter).toContainText(
      /Showing \d+ to \d+ of \d+ results/,
    );

    // Check serial numbers start at 1
    const firstRow = page.locator("table tbody tr").first();
    const firstSerialNo = await firstRow.locator("td").first().textContent();
    expect(firstSerialNo?.trim()).toBe("1");

    // Click Next button (if more than 10 items)
    const nextButton = page.locator('button:has-text("Next")');
    const isNextEnabled = await nextButton.isEnabled();

    if (isNextEnabled) {
      await nextButton.click();
      await page.waitForTimeout(500);

      // Check page 2 shows items 11-20
      await expect(paginationFooter).toContainText(/Showing 11 to/);

      // Check serial number starts at 11
      const firstRowPage2 = page.locator("table tbody tr").first();
      const firstSerialNoPage2 = await firstRowPage2
        .locator("td")
        .first()
        .textContent();
      expect(firstSerialNoPage2?.trim()).toBe("11");

      // Go back to page 1
      const prevButton = page.locator('button:has-text("Previous")');
      await prevButton.click();
      await page.waitForTimeout(500);
      await expect(paginationFooter).toContainText(/Showing 1 to/);
    }
  });

  test("Alerts Tab - Pagination Works", async ({ page }) => {
    // Click Alerts tab
    await page.click('button:has-text("Alerts")');
    await page.waitForTimeout(1000);

    // Check pagination footer
    const paginationFooter = page.locator(
      "div.flex.items-center.justify-between",
      { hasText: "Showing" },
    );
    await expect(paginationFooter).toBeVisible();

    // Check data loaded
    const table = page.locator("table");
    await expect(table).toBeVisible();
  });

  test("Active Requests Tab - Pagination Works", async ({ page }) => {
    // Navigate to Requests tab
    await page.click('button:has-text("Requests")');
    await page.waitForTimeout(500);

    // Click Active Requests sub-tab
    await page.click('button:has-text("Active Requests")');
    await page.waitForTimeout(1000);

    // Check pagination footer
    const paginationFooter = page.locator(
      "div.flex.items-center.justify-between",
      { hasText: "Showing" },
    );
    await expect(paginationFooter).toBeVisible();
  });

  test("Past Requests Tab - Pagination Works", async ({ page }) => {
    // Navigate to Requests tab
    await page.click('button:has-text("Requests")');
    await page.waitForTimeout(500);

    // Click Past Requests sub-tab
    await page.click('button:has-text("Past Requests")');
    await page.waitForTimeout(1000);

    // Check pagination footer
    const paginationFooter = page.locator(
      "div.flex.items-center.justify-between",
      { hasText: "Showing" },
    );
    await expect(paginationFooter).toBeVisible();
  });

  test("Filter Reset - Pagination Resets to Page 1", async ({ page }) => {
    // Go to Eligibility tab
    await page.click('button:has-text("Eligibility")');
    await page.waitForTimeout(1000);

    const paginationFooter = page.locator(
      "div.flex.items-center.justify-between",
      { hasText: "Showing" },
    );

    // Go to page 2 (if possible)
    const nextButton = page.locator('button:has-text("Next")');
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForTimeout(500);
      await expect(paginationFooter).toContainText(/Showing 11 to/);

      // Apply a filter
      await page.click('button:has-text("Filters")');
      await page.waitForTimeout(500);

      // Select a filter (example: select a region)
      const filterDropdown = page
        .locator('select, div[role="combobox"]')
        .first();
      if (await filterDropdown.isVisible()) {
        await filterDropdown.click();
        await page.waitForTimeout(300);
        // Select first option
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(500);

        // Verify pagination reset to page 1
        await expect(paginationFooter).toContainText(/Showing 1 to/);
      }
    }
  });

  test("Search Reset - Pagination Resets to Page 1", async ({ page }) => {
    // Go to Eligibility tab
    await page.click('button:has-text("Eligibility")');
    await page.waitForTimeout(1000);

    const paginationFooter = page.locator(
      "div.flex.items-center.justify-between",
      { hasText: "Showing" },
    );

    // Go to page 2 (if possible)
    const nextButton = page.locator('button:has-text("Next")');
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForTimeout(500);
      await expect(paginationFooter).toContainText(/Showing 11 to/);

      // Use search
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill("test");
      await page.waitForTimeout(800); // Debounce time

      // Verify pagination reset to page 1
      await expect(paginationFooter).toContainText(/Showing 1 to/);
    }
  });

  test("Compare with Overview - All Centers Card", async ({ page }) => {
    // Go to Overview tab
    await page.click('button:has-text("Overview")');
    await page.waitForTimeout(1000);

    // Check All Centers card has pagination
    const allCentersCard = page
      .locator("div.space-y-4")
      .filter({ hasText: "All Centers" })
      .first();
    const paginationInCard = allCentersCard.locator(
      "div.flex.items-center.justify-between",
      { hasText: "Showing" },
    );

    await expect(paginationInCard).toBeVisible();
    await expect(paginationInCard).toContainText(
      /Showing \d+ to \d+ of \d+ results/,
    );
  });

  test("Serial Numbers - Continuous Across Pages", async ({ page }) => {
    // Go to Eligibility tab
    await page.click('button:has-text("Eligibility")');
    await page.waitForTimeout(1000);

    // Get first row serial number on page 1
    let firstRow = page.locator("table tbody tr").first();
    let serialNo1 = await firstRow.locator("td").first().textContent();
    expect(serialNo1?.trim()).toBe("1");

    // Click Next (if available)
    const nextButton = page.locator('button:has-text("Next")');
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForTimeout(500);

      // Get first row serial number on page 2
      firstRow = page.locator("table tbody tr").first();
      let serialNo11 = await firstRow.locator("td").first().textContent();
      expect(serialNo11?.trim()).toBe("11");

      // Get 10th row serial number on page 2 (should be 20)
      const tenthRow = page.locator("table tbody tr").nth(9);
      if (await tenthRow.isVisible()) {
        let serialNo20 = await tenthRow.locator("td").first().textContent();
        expect(serialNo20?.trim()).toBe("20");
      }
    }
  });

  test("No Console Errors During Pagination", async ({ page }) => {
    const consoleErrors = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate through all tabs and test pagination
    await page.click('button:has-text("Eligibility")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Alerts")');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Requests")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Active Requests")');
    await page.waitForTimeout(500);

    // Check no errors
    expect(consoleErrors.length).toBe(0);
  });
});
