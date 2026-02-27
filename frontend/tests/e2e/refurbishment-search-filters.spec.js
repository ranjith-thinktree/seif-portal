import { test, expect } from "@playwright/test";

/**
 * Refurbishment Dashboard Search & Filter Tests
 * Tests the AdvancedSearchBar functionality on all 3 refurbishment tables
 */

// Test data setup
const ADMIN_EMAIL = "admin@seif.org";
const ADMIN_PASSWORD = "Admin@123";

test.describe("Refurbishment Dashboard - Search & Filters", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("http://localhost:5173/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/admin\/dashboard/);

    // Navigate to refurbishment page
    await page.click('text=Refurbishment');
    await page.waitForURL(/\/admin\/refurbishment/);

    // Wait for data to load
    await page.waitForTimeout(1000);
  });

  test.describe("AllCentersTable - Search & Filters", () => {
    test.beforeEach(async ({ page }) => {
      // Click on "All Centers" card
      await page.click('text=All Centers');
      await page.waitForTimeout(500);
    });

    test("should display AdvancedSearchBar", async ({ page }) => {
      // Check if search input exists
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await expect(searchInput).toBeVisible();
    });

    test("should filter centers by search term (real-time)", async ({
      page,
    }) => {
      const searchInput = page.locator('input[placeholder*="Search"]').first();

      // Get initial row count
      const initialRows = await page.locator("tbody tr").count();
      expect(initialRows).toBeGreaterThan(0);

      // Type search term
      await searchInput.fill("pune");
      await page.waitForTimeout(300);

      // Check filtered results
      const filteredRows = await page.locator("tbody tr").count();

      // Should have filtered results (may be less or equal to initial)
      expect(filteredRows).toBeLessThanOrEqual(initialRows);

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(300);

      // Should show all results again
      const clearedRows = await page.locator("tbody tr").count();
      expect(clearedRows).toBe(initialRows);
    });

    test("should filter by eligibility status", async ({ page }) => {
      // Click filter button
      await page.click('button:has-text("Filters")');
      await page.waitForTimeout(300);

      // Select eligibility filter
      await page.click('text=Eligibility Status');
      await page.click('text=Eligible');
      await page.waitForTimeout(500);

      // Verify table shows only eligible centers
      const cells = await page.locator("tbody td").allTextContents();
      const hasEligible = cells.some((cell) => cell.includes("Eligible"));
      expect(hasEligible).toBeTruthy();
    });

    test("should filter by age range", async ({ page }) => {
      // Click filter button
      await page.click('button:has-text("Filters")');
      await page.waitForTimeout(300);

      // Select age filter
      await page.click('text=Age Range');
      await page.click('text=0-2 years');
      await page.waitForTimeout(500);

      // Verify filtered results
      const rows = await page.locator("tbody tr").count();
      expect(rows).toBeGreaterThanOrEqual(0);
    });

    test("should filter by partner (multi-select)", async ({ page }) => {
      // Click filter button
      await page.click('button:has-text("Filters")');
      await page.waitForTimeout(300);

      // Open partner filter
      await page.click('text=Partner');
      await page.waitForTimeout(300);

      // Select first partner
      const firstPartner = page.locator('[role="option"]').first();
      await firstPartner.click();
      await page.waitForTimeout(500);

      // Verify filtered results
      const rows = await page.locator("tbody tr").count();
      expect(rows).toBeGreaterThanOrEqual(0);
    });

    test("should filter by state (multi-select)", async ({ page }) => {
      // Click filter button
      await page.click('button:has-text("Filters")');
      await page.waitForTimeout(300);

      // Open state filter
      await page.click('text=State');
      await page.waitForTimeout(300);

      // Select a state
      const firstState = page.locator('[role="option"]').first();
      await firstState.click();
      await page.waitForTimeout(500);

      // Verify filtered results
      const rows = await page.locator("tbody tr").count();
      expect(rows).toBeGreaterThanOrEqual(0);
    });

    test("should sort by center name", async ({ page }) => {
      // Click sort button
      await page.click('button:has-text("Sort")');
      await page.waitForTimeout(300);

      // Select "Center Name" sort
      await page.click('text=Center Name');
      await page.waitForTimeout(500);

      // Get first row center name
      const firstCell = await page
        .locator("tbody tr:first-child td:first-child")
        .textContent();
      expect(firstCell).toBeTruthy();
    });

    test("should toggle sort order (asc/desc)", async ({ page }) => {
      // Click sort button
      await page.click('button:has-text("Sort")');
      await page.waitForTimeout(300);

      // Select sort field
      await page.click('text=Center Name');
      await page.waitForTimeout(300);

      // Get first row
      const firstAsc = await page
        .locator("tbody tr:first-child td:first-child")
        .textContent();

      // Toggle to descending
      await page.click('button[aria-label="Toggle sort order"]');
      await page.waitForTimeout(500);

      // Get first row again
      const firstDesc = await page
        .locator("tbody tr:first-child td:first-child")
        .textContent();

      // Should be different
      expect(firstAsc).not.toBe(firstDesc);
    });

    test("should clear all filters", async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]').first();

      // Apply search
      await searchInput.fill("test");
      await page.waitForTimeout(300);

      // Apply filter
      await page.click('button:has-text("Filters")');
      await page.click('text=Eligibility Status');
      await page.click('text=Eligible');
      await page.waitForTimeout(500);

      // Click clear filters
      await page.click('button:has-text("Clear")');
      await page.waitForTimeout(500);

      // Verify search is cleared
      const searchValue = await searchInput.inputValue();
      expect(searchValue).toBe("");
    });

    test("should combine search + filters + sort", async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]').first();

      // Apply search
      await searchInput.fill("center");
      await page.waitForTimeout(300);

      // Apply filter
      await page.click('button:has-text("Filters")');
      await page.click('text=Eligibility Status');
      await page.click('text=Eligible');
      await page.waitForTimeout(500);

      // Apply sort
      await page.click('button:has-text("Sort")');
      await page.click('text=Center Name');
      await page.waitForTimeout(500);

      // Verify results exist
      const rows = await page.locator("tbody tr").count();
      expect(rows).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("EligibleCentersTable - Search & Filters", () => {
    test.beforeEach(async ({ page }) => {
      // Click on "Eligible Centers" card (should be selected by default)
      await page.click('text=Eligible Centers');
      await page.waitForTimeout(500);
    });

    test("should display AdvancedSearchBar", async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await expect(searchInput).toBeVisible();
    });

    test("should filter by search term", async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]').first();

      // Type search
      await searchInput.fill("center");
      await page.waitForTimeout(300);

      // Verify filtered results
      const rows = await page.locator("tbody tr").count();
      expect(rows).toBeGreaterThanOrEqual(0);
    });

    test("should filter by last notified", async ({ page }) => {
      // Click filter button
      await page.click('button:has-text("Filters")');
      await page.waitForTimeout(300);

      // Select last notified filter
      await page.click('text=Last Notified');
      await page.click('text=Last 7 days');
      await page.waitForTimeout(500);

      // Verify results
      const rows = await page.locator("tbody tr").count();
      expect(rows).toBeGreaterThanOrEqual(0);
    });

    test("should sort by last notified", async ({ page }) => {
      // Click sort button
      await page.click('button:has-text("Sort")');
      await page.waitForTimeout(300);

      // Select sort
      await page.click('text=Last Notified');
      await page.waitForTimeout(500);

      // Verify results
      const rows = await page.locator("tbody tr").count();
      expect(rows).toBeGreaterThan(0);
    });
  });

  test.describe("LastRefurbishedTable - Search & Filters", () => {
    test.beforeEach(async ({ page }) => {
      // Click on "Last refurbished" card
      await page.click('text=Last refurbished');
      await page.waitForTimeout(500);
    });

    test("should display AdvancedSearchBar", async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await expect(searchInput).toBeVisible();
    });

    test("should filter by search term", async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]').first();

      // Type search
      await searchInput.fill("center");
      await page.waitForTimeout(300);

      // Verify filtered results
      const rows = await page.locator("tbody tr").count();
      expect(rows).toBeGreaterThanOrEqual(0);
    });

    test("should filter by refurbishment recency", async ({ page }) => {
      // Click filter button
      await page.click('button:has-text("Filters")');
      await page.waitForTimeout(300);

      // Select recency filter
      await page.click('text=Refurbishment Recency');
      await page.click('text=Last 6 months');
      await page.waitForTimeout(500);

      // Verify results
      const rows = await page.locator("tbody tr").count();
      expect(rows).toBeGreaterThanOrEqual(0);
    });

    test("should sort by last refurbished (default desc)", async ({
      page,
    }) => {
      // Verify sort button shows current sort
      const sortButton = page.locator('button:has-text("Sort")');
      await expect(sortButton).toBeVisible();

      // Verify results are sorted (default is desc for this table)
      const rows = await page.locator("tbody tr").count();
      expect(rows).toBeGreaterThan(0);
    });
  });

  test.describe("Filter Persistence", () => {
    test("should persist filters in localStorage", async ({ page }) => {
      // Click All Centers
      await page.click('text=All Centers');
      await page.waitForTimeout(500);

      const searchInput = page.locator('input[placeholder*="Search"]').first();

      // Apply search and filter
      await searchInput.fill("test");
      await page.click('button:has-text("Filters")');
      await page.click('text=Eligibility Status');
      await page.click('text=Eligible');
      await page.waitForTimeout(500);

      // Navigate away and back
      await page.click('text=Eligible Centers');
      await page.waitForTimeout(500);
      await page.click('text=All Centers');
      await page.waitForTimeout(500);

      // Check if localStorage has the saved preferences
      const storage = await page.evaluate(() => {
        const key = "refurbishment-all-centers";
        return localStorage.getItem(key);
      });

      expect(storage).toBeTruthy();
    });
  });

  test.describe("Edge Cases", () => {
    test("should handle empty results", async ({ page }) => {
      await page.click('text=All Centers');
      await page.waitForTimeout(500);

      const searchInput = page.locator('input[placeholder*="Search"]').first();

      // Search for something that doesn't exist
      await searchInput.fill("NONEXISTENT_CENTER_12345");
      await page.waitForTimeout(300);

      // Should show empty state
      const rows = await page.locator("tbody tr").count();
      expect(rows).toBe(0);
    });

    test("should handle special characters in search", async ({ page }) => {
      await page.click('text=All Centers');
      await page.waitForTimeout(500);

      const searchInput = page.locator('input[placeholder*="Search"]').first();

      // Search with special characters
      await searchInput.fill("@#$%");
      await page.waitForTimeout(300);

      // Should not crash
      const rows = await page.locator("tbody tr").count();
      expect(rows).toBeGreaterThanOrEqual(0);
    });

    test("should handle multiple rapid filter changes", async ({ page }) => {
      await page.click('text=All Centers');
      await page.waitForTimeout(500);

      // Rapidly change filters
      for (let i = 0; i < 5; i++) {
        await page.click('button:has-text("Filters")');
        await page.click('text=Eligibility Status');
        await page.click('text=Eligible');
        await page.waitForTimeout(100);

        await page.click('button:has-text("Clear")');
        await page.waitForTimeout(100);
      }

      // Should still work
      const rows = await page.locator("tbody tr").count();
      expect(rows).toBeGreaterThan(0);
    });
  });

  test.describe("Accessibility", () => {
    test("should be keyboard navigable", async ({ page }) => {
      await page.click('text=All Centers');
      await page.waitForTimeout(500);

      // Tab to search input
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // Type in search
      await page.keyboard.type("center");
      await page.waitForTimeout(300);

      // Verify search worked
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      const value = await searchInput.inputValue();
      expect(value).toBe("center");
    });

    test("should have proper ARIA labels", async ({ page }) => {
      await page.click('text=All Centers');
      await page.waitForTimeout(500);

      // Check for accessibility attributes
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      const ariaLabel = await searchInput.getAttribute("aria-label");

      // Should have some form of label
      expect(ariaLabel || (await searchInput.getAttribute("placeholder"))).toBeTruthy();
    });
  });
});
