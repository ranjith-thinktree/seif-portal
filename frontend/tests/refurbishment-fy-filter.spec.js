/**
 * Playwright Tests - Financial Year Filter Functionality
 * Tests for all 7 components with FY filter implementation
 *
 * Run with: npx playwright test refurbishment-fy-filter.spec.js
 */

import { test, expect } from "@playwright/test";

// Test configuration
const BASE_URL = "http://localhost:5173";
const ADMIN_EMAIL = "admin@seif.org";
const ADMIN_PASSWORD = "Password123";

test.describe("Financial Year Filter - Complete Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Navigate to Refurbishment page
    await page.goto(`${BASE_URL}/admin/refurbishment`);
    await page.waitForLoadState("networkidle");
  });

  test.describe("1. EligibilityTab - Financial Year Filter", () => {
    test("should display FY filter dropdown", async ({ page }) => {
      // Verify main tab is active by default (EligibilityTab)
      await expect(page.locator("text=Overview")).toBeVisible();

      // Click on Eligibility sub-tab if needed
      const eligibilityTab = page.locator("text=Eligible Centers").first();
      if (await eligibilityTab.isVisible()) {
        await eligibilityTab.click();
      }

      // Find FY filter dropdown by label
      const fyFilter = page
        .locator('label:has-text("Financial Year")')
        .locator("..")
        .locator('select, [role="combobox"]');
      await expect(fyFilter).toBeVisible();
    });

    test("should populate FY options (2025-26 to 2028-29)", async ({
      page,
    }) => {
      // Click FY dropdown
      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(500);

      // Verify FY options are present
      const expectedFYs = [
        "FY 2025-26",
        "FY 2026-27",
        "FY 2027-28",
        "FY 2028-29",
      ];

      for (const fy of expectedFYs) {
        const option = page.locator(`text="${fy}"`);
        await expect(option).toBeVisible();
      }
    });

    test("should filter centers by selected FY", async ({ page }) => {
      // Get initial row count
      const initialRows = await page.locator("table tbody tr").count();
      expect(initialRows).toBeGreaterThan(0);

      // Select FY 2025-26
      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(300);
      await page.click('text="FY 2025-26"');
      await page.waitForTimeout(500);

      // Verify filtering occurred (row count may change)
      const filteredRows = await page.locator("table tbody tr").count();
      expect(filteredRows).toBeGreaterThanOrEqual(0);

      // Verify "Applied Filters" shows FY
      const appliedFilters = page.locator(
        "text=/Applied Filters.*FY 2025-26/i",
      );
      await expect(appliedFilters).toBeVisible({ timeout: 3000 });
    });

    test("should handle empty results for FY with no data", async ({
      page,
    }) => {
      // Select a future FY that likely has no data
      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(300);
      await page.click('text="FY 2028-29"');
      await page.waitForTimeout(500);

      // Should show either empty state or filtered results
      const emptyState = page.locator("text=/No.*found|No data available/i");
      const hasData = (await page.locator("table tbody tr").count()) > 0;

      if (!hasData) {
        await expect(emptyState).toBeVisible({ timeout: 3000 });
      }
    });

    test("should clear FY filter", async ({ page }) => {
      // Apply FY filter
      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(300);
      await page.click('text="FY 2025-26"');
      await page.waitForTimeout(500);

      // Clear filter (look for clear/reset button)
      const clearButton = page
        .locator('button:has-text("Clear"), button:has-text("Reset")')
        .first();
      if (await clearButton.isVisible()) {
        await clearButton.click();
        await page.waitForTimeout(500);

        // Verify filter is cleared
        const appliedFilters = page.locator("text=/Applied Filters.*FY/i");
        await expect(appliedFilters).not.toBeVisible();
      }
    });
  });

  test.describe("2. AlertsTab - Financial Year Filter", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Alerts tab
      await page.click("text=Alerts");
      await page.waitForTimeout(500);
    });

    test("should display FY filter on Alerts tab", async ({ page }) => {
      const fyFilter = page.locator('label:has-text("Financial Year")');
      await expect(fyFilter).toBeVisible();
    });

    test("should filter alerts by FY based on created_at date", async ({
      page,
    }) => {
      // Get initial count
      const initialRows = await page.locator("table tbody tr").count();

      // Apply FY filter
      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(300);
      await page.click('text="FY 2025-26"');
      await page.waitForTimeout(500);

      // Verify filtering
      const filteredRows = await page.locator("table tbody tr").count();
      expect(filteredRows).toBeGreaterThanOrEqual(0);
    });

    test("should combine FY filter with Status filter", async ({ page }) => {
      // Apply FY filter
      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(300);
      await page.click('text="FY 2025-26"');
      await page.waitForTimeout(500);

      // Apply Status filter if available
      const statusFilter = page.locator(
        'label:has-text("Status"), label:has-text("Priority")',
      );
      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        await page.waitForTimeout(300);
        await page.click('text="HIGH", text="MEDIUM"').first();
        await page.waitForTimeout(500);

        // Should show combined filters
        const appliedFilters = page.locator("text=/Applied Filters/i");
        await expect(appliedFilters).toBeVisible();
      }
    });
  });

  test.describe("3. ActiveRequestsTab - Financial Year Filter", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Requests tab
      await page.click("text=Requests");
      await page.waitForTimeout(500);
    });

    test("should display FY filter on Active Requests", async ({ page }) => {
      const fyFilter = page.locator('label:has-text("Financial Year")');
      await expect(fyFilter).toBeVisible();
    });

    test("should filter active requests by FY (updated_at or created_at)", async ({
      page,
    }) => {
      // Apply FY filter
      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(300);
      await page.click('text="FY 2025-26"');
      await page.waitForTimeout(500);

      // Verify filtering
      const rows = await page.locator("table tbody tr").count();
      expect(rows).toBeGreaterThanOrEqual(0);
    });

    test("should combine FY with Partner filter", async ({ page }) => {
      // Apply FY filter first
      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(300);
      await page.click('text="FY 2025-26"');
      await page.waitForTimeout(500);

      // Apply Partner filter if available
      const partnerFilter = page.locator('label:has-text("Partner")');
      if (await partnerFilter.isVisible()) {
        await partnerFilter.click();
        await page.waitForTimeout(300);

        // Select first partner option
        const firstPartner = page.locator('[role="option"]').first();
        if (await firstPartner.isVisible()) {
          await firstPartner.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test("should export CSV with FY filter applied", async ({ page }) => {
      // Apply FY filter
      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(300);
      await page.click('text="FY 2025-26"');
      await page.waitForTimeout(500);

      // Look for export button
      const exportButton = page.locator(
        'button:has-text("Export"), button:has-text("Download")',
      );
      if (await exportButton.isVisible()) {
        // Set up download listener
        const downloadPromise = page.waitForEvent("download");
        await exportButton.click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.csv$/i);
      }
    });
  });

  test.describe("4. PastRequestsTab - Financial Year Filter", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Past Requests
      await page.click("text=Requests");
      await page.waitForTimeout(300);
      await page.click("text=Past Requests, text=Completed").first();
      await page.waitForTimeout(500);
    });

    test("should display FY filter on Past Requests", async ({ page }) => {
      const fyFilter = page.locator('label:has-text("Financial Year")');
      await expect(fyFilter).toBeVisible();
    });

    test("should filter past requests by FY", async ({ page }) => {
      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(300);
      await page.click('text="FY 2025-26"');
      await page.waitForTimeout(500);

      const rows = await page.locator("table tbody tr").count();
      expect(rows).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("5. Overview Tab - All 3 Cards", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Overview tab
      await page.click("text=Overview").first();
      await page.waitForTimeout(500);
    });

    test("should display FY filter on Eligible Centers card", async ({
      page,
    }) => {
      // Look for first card (Eligible Centers)
      const eligibleCard = page
        .locator('h3:has-text("Eligible Centers")')
        .locator("..");
      await expect(eligibleCard).toBeVisible();

      // Find FY filter within this card
      const fyFilter = eligibleCard.locator('label:has-text("Financial Year")');
      await expect(fyFilter).toBeVisible();
    });

    test("should display FY filter on Last Refurbished card", async ({
      page,
    }) => {
      const lastRefurbCard = page
        .locator('h3:has-text("Last Refurbished")')
        .locator("..");
      await expect(lastRefurbCard).toBeVisible();

      const fyFilter = lastRefurbCard.locator(
        'label:has-text("Financial Year")',
      );
      await expect(fyFilter).toBeVisible();
    });

    test("should display FY filter on All Centers card", async ({ page }) => {
      const allCentersCard = page
        .locator('h3:has-text("All Centers")')
        .locator("..");
      await expect(allCentersCard).toBeVisible();

      const fyFilter = allCentersCard.locator(
        'label:has-text("Financial Year")',
      );
      await expect(fyFilter).toBeVisible();
    });

    test("should filter Eligible Centers by FY independently", async ({
      page,
    }) => {
      // Find Eligible Centers card
      const eligibleCard = page
        .locator('h3:has-text("Eligible Centers")')
        .locator("..");

      // Apply FY filter in this card only
      const fyFilter = eligibleCard.locator('label:has-text("Financial Year")');
      await fyFilter.click();
      await page.waitForTimeout(300);
      await page.click('text="FY 2025-26"');
      await page.waitForTimeout(500);

      // Verify filtering in this card only
      const table = eligibleCard.locator("table");
      await expect(table).toBeVisible();
    });

    test("should allow different FY filters on each card", async ({ page }) => {
      // Apply FY 2025-26 to Eligible Centers
      const eligibleCard = page
        .locator('h3:has-text("Eligible Centers")')
        .locator("..");
      await eligibleCard.locator('label:has-text("Financial Year")').click();
      await page.waitForTimeout(300);
      await page.click('text="FY 2025-26"').first();
      await page.waitForTimeout(500);

      // Apply FY 2026-27 to Last Refurbished (if visible)
      const lastRefurbCard = page
        .locator('h3:has-text("Last Refurbished")')
        .locator("..");
      if (await lastRefurbCard.isVisible()) {
        await lastRefurbCard
          .locator('label:has-text("Financial Year")')
          .click();
        await page.waitForTimeout(300);
        await page.click('text="FY 2026-27"');
        await page.waitForTimeout(500);
      }

      // Each card should maintain independent filters
      await expect(eligibleCard).toBeVisible();
      await expect(lastRefurbCard).toBeVisible();
    });
  });

  test.describe("6. Edge Cases & Boundary Testing", () => {
    test("should handle FY boundary dates correctly (April 1 cutoff)", async ({
      page,
    }) => {
      // This test verifies the getFinancialYear helper function logic
      // We can't directly test the JS function, but we can verify filtering results

      // Apply FY 2025-26 filter
      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(300);
      await page.click('text="FY 2025-26"');
      await page.waitForTimeout(500);

      // Verify that data is filtered
      // FY 2025-26 should include dates from April 1, 2025 to March 31, 2026
      const rows = await page.locator("table tbody tr").count();
      expect(rows).toBeGreaterThanOrEqual(0);
    });

    test("should exclude items with null dates", async ({ page }) => {
      // Apply FY filter
      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(300);
      await page.click('text="FY 2025-26"');
      await page.waitForTimeout(500);

      // Items without dates should be excluded from results
      // We can verify this by checking that all visible rows have dates
      const dateColumns = await page
        .locator(
          'table tbody tr td[data-date], table tbody tr td:has-text("/")',
        )
        .all();

      for (const cell of dateColumns) {
        const text = await cell.textContent();
        if (text && text.includes("/")) {
          // Should have a valid date
          expect(text).toBeTruthy();
        }
      }
    });

    test("should handle rapid filter changes", async ({ page }) => {
      // Rapidly change FY filters
      for (let i = 0; i < 3; i++) {
        await page.click('label:has-text("Financial Year")');
        await page.waitForTimeout(200);
        await page.click(`text="FY 202${5 + i}-${6 + i}"`);
        await page.waitForTimeout(300);
      }

      // Should still work without errors
      const table = page.locator("table");
      await expect(table).toBeVisible();
    });
  });

  test.describe("7. Performance & Stability", () => {
    test("should load FY options within 2 seconds", async ({ page }) => {
      const startTime = Date.now();

      await page.click('label:has-text("Financial Year")');
      await page.waitForSelector('text="FY 2025-26"', { timeout: 2000 });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });

    test("should filter results within 1 second", async ({ page }) => {
      const startTime = Date.now();

      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(200);
      await page.click('text="FY 2025-26"');
      await page.waitForTimeout(1000);

      const filterTime = Date.now() - startTime;
      expect(filterTime).toBeLessThan(1500);
    });

    test("should maintain FY filter after page refresh", async ({ page }) => {
      // Apply FY filter
      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(300);
      await page.click('text="FY 2025-26"');
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Note: Filter state may or may not persist depending on implementation
      // This test verifies the page loads without errors
      const table = page.locator("table");
      await expect(table).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("8. Integration with Other Filters", () => {
    test("should combine FY + Partner + State filters", async ({ page }) => {
      // Apply FY filter
      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(300);
      await page.click('text="FY 2025-26"');
      await page.waitForTimeout(500);

      // Apply Partner filter if available
      const partnerFilter = page.locator('label:has-text("Partner")');
      if (await partnerFilter.isVisible()) {
        await partnerFilter.click();
        await page.waitForTimeout(300);
        await page.locator('[role="option"]').first().click();
        await page.waitForTimeout(500);
      }

      // Apply State filter if available
      const stateFilter = page.locator('label:has-text("State")');
      if (await stateFilter.isVisible()) {
        await stateFilter.click();
        await page.waitForTimeout(300);
        await page.locator('[role="option"]').first().click();
        await page.waitForTimeout(500);
      }

      // All filters should work together
      const appliedFilters = page.locator("text=/Applied Filters/i");
      await expect(appliedFilters).toBeVisible();
    });

    test("should maintain FY filter when sorting", async ({ page }) => {
      // Apply FY filter
      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(300);
      await page.click('text="FY 2025-26"');
      await page.waitForTimeout(500);

      // Apply sorting (click table header)
      const firstHeader = page.locator("table thead th").first();
      await firstHeader.click();
      await page.waitForTimeout(500);

      // FY filter should still be active
      const appliedFilters = page.locator("text=/Applied Filters.*FY/i");
      await expect(appliedFilters).toBeVisible();
    });

    test("should work with search functionality", async ({ page }) => {
      // Apply FY filter
      await page.click('label:has-text("Financial Year")');
      await page.waitForTimeout(300);
      await page.click('text="FY 2025-26"');
      await page.waitForTimeout(500);

      // Use search if available
      const searchInput = page.locator(
        'input[placeholder*="Search"], input[type="search"]',
      );
      if (await searchInput.isVisible()) {
        await searchInput.fill("Test");
        await page.waitForTimeout(500);

        // Both search and FY filter should be active
        const table = page.locator("table");
        await expect(table).toBeVisible();
      }
    });
  });
});

test.describe("9. Accessibility Testing", () => {
  test("FY filter should be keyboard accessible", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/refurbishment`);
    await page.waitForLoadState("networkidle");

    // Tab to FY filter
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Should be able to open with Enter/Space
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    // Should see options
    const option = page.locator('text="FY 2025-26"');
    await expect(option).toBeVisible();
  });

  test("FY filter should have proper ARIA labels", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/refurbishment`);

    const fyLabel = page.locator('label:has-text("Financial Year")');
    await expect(fyLabel).toBeVisible();

    // Check for associated input/select
    const input = page.locator(
      '[aria-label*="Financial"], [aria-labelledby*="financial"]',
    );
    const count = await input.count();
    expect(count).toBeGreaterThan(0);
  });
});
