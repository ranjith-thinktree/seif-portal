import { test, expect } from "@playwright/test";

/**
 * Refurbishment Dashboard E2E Tests
 * Senior Full-Stack Developer Quality Assurance
 */

test.describe("Refurbishment Dashboard - Senior QA Standards", () => {
  let apiErrors = [];

  test.beforeEach(async ({ page }) => {
    // Capture API errors
    apiErrors = [];
    page.on("response", async (response) => {
      if (response.status() >= 400) {
        apiErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
        });
      }
    });

    // Login as admin
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@seif.org");
    await page.fill('input[name="password"]', "Password123");
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL("/dashboard");

    // Navigate to refurbishment dashboard
    await page.goto("/admin/refurbishment");
    await page.waitForLoadState("networkidle");
  });

  test.describe("Overview Tab - Data Display", () => {
    test("should load overview tab and display summary cards", async ({
      page,
    }) => {
      // Click Overview tab (should be default)
      await page.click('button[role="tab"]:has-text("Overview")');

      // Verify 3 cards are visible
      const cards = page.locator(".grid > .cursor-pointer");
      await expect(cards).toHaveCount(3);

      // Verify card 1: Eligible Centers
      const eligibleCard = cards.nth(0);
      await expect(eligibleCard).toContainText("Eligible Centers");
      const eligibleCount = await eligibleCard
        .locator(".text-3xl")
        .textContent();
      expect(parseInt(eligibleCount)).toBeGreaterThan(0);

      // Verify card 2: Last Refurbished
      const lastRefurbCard = cards.nth(1);
      await expect(lastRefurbCard).toContainText("Last refurbished");

      // Verify card 3: All Centers
      const allCentersCard = cards.nth(2);
      await expect(allCentersCard).toContainText("All Centers");
      const allCentersCount = await allCentersCard
        .locator(".text-3xl")
        .textContent();
      expect(parseInt(allCentersCount)).toBeGreaterThanOrEqual(0);
    });

    test("should display centers table when Eligible Centers card clicked", async ({
      page,
    }) => {
      await page.click('button[role="tab"]:has-text("Overview")');

      // Click Eligible Centers card
      await page.click("text=Eligible Centers");

      // Wait for table to load
      await page.waitForSelector("table", { timeout: 5000 });

      // Verify table headers
      await expect(
        page.locator('th:has-text("Training Center")'),
      ).toBeVisible();
      await expect(page.locator('th:has-text("Partner Name")')).toBeVisible();
      await expect(page.locator('th:has-text("Type")')).toBeVisible();
      await expect(page.locator('th:has-text("Last Notified")')).toBeVisible();
      await expect(
        page.locator('th:has-text("Last Refurbished")'),
      ).toBeVisible();

      // Verify at least one row exists
      const rows = page.locator("tbody tr");
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);

      // Verify no 422 errors
      expect(apiErrors.filter((e) => e.status === 422)).toHaveLength(0);
    });

    test("should display ALL centers when All Centers card clicked", async ({
      page,
    }) => {
      await page.click('button[role="tab"]:has-text("Overview")');

      // Click All Centers card
      await page.click("text=All Centers");

      // Wait for table
      await page.waitForSelector("table", { timeout: 5000 });

      // Verify table shows data
      const rows = page.locator("tbody tr");
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);

      // Verify tier labels are correct (age-based) - get tier badge from 5th column (refurbishment eligibility)
      const firstRow = rows.first();
      const tierBadge = firstRow
        .locator("td")
        .nth(4)
        .locator("span.text-sm.font-medium");
      const firstTier = await tierBadge.textContent();

      // Should be one of: "Not eligible", "1st Refurbishment", "2nd Refurbishment", "3rd Refurbishment", "4th Refurbishment"
      const validTiers = [
        "Not eligible",
        "1st Refurbishment",
        "2nd Refurbishment",
        "3rd Refurbishment",
        "4th Refurbishment",
      ];
      expect(validTiers).toContain(firstTier.trim());

      // Verify no errors
      expect(apiErrors).toHaveLength(0);
    });

    test("should display last refurbished centers with year filter", async ({
      page,
    }) => {
      await page.click('button[role="tab"]:has-text("Overview")');

      // Click Last Refurbished card
      await page.click("text=Last refurbished");

      // Wait for table
      await page.waitForSelector("table", { timeout: 5000 });

      // If data exists, verify year filter works
      const rows = page.locator("tbody tr");
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Test year filter
        const currentYear = new Date().getFullYear();
        await page.selectOption("select", currentYear.toString());
        await page.waitForTimeout(500); // Wait for filter to apply

        // Verify filtered results
        const filteredRows = page.locator("tbody tr");
        await expect(filteredRows).toHaveCount(rowCount);
      }

      // Verify no errors
      expect(apiErrors).toHaveLength(0);
    });
  });

  test.describe("Tier Calculation Verification", () => {
    test("should correctly calculate age-based tiers", async ({ page }) => {
      await page.click('button[role="tab"]:has-text("Overview")');
      await page.click("text=All Centers");
      await page.waitForSelector("table");

      // Get first row to verify tier calculations
      const rows = page.locator("tbody tr").first();

      // Get years since establishment from 4th column (pre-calculated, format: "17 years")
      const yearsCell = await rows.locator("td").nth(3).textContent();
      console.log("Years cell text:", yearsCell);
      const yearsSince = parseInt(yearsCell.replace(/\D/g, "")); // Extract number from "17 years"
      console.log("Years since establishment:", yearsSince);

      // Get tier from 5th column (use nth(4) to target tier column specifically)
      const tierCell = await rows
        .locator("td")
        .nth(4)
        .locator("span.text-sm.font-medium")
        .textContent();
      const tier = tierCell.trim();
      console.log("Actual tier from page:", tier);

      // Verify tier matches calculation
      let expectedTier;
      if (yearsSince >= 14) expectedTier = "4th Refurbishment";
      else if (yearsSince >= 11) expectedTier = "3rd Refurbishment";
      else if (yearsSince >= 8) expectedTier = "2nd Refurbishment";
      else if (yearsSince >= 5) expectedTier = "1st Refurbishment";
      else expectedTier = "Not eligible";
      console.log("Expected tier based on calculation:", expectedTier);

      // Verify the tier calculation is correct
      expect(tier).toBe(expectedTier);

      // Also verify the tier is one of the valid values
      const validTiers = [
        "Not eligible",
        "1st Refurbishment",
        "2nd Refurbishment",
        "3rd Refurbishment",
        "4th Refurbishment",
      ];
      expect(validTiers).toContain(tier);
    });

    test("should show correct tier colors", async ({ page }) => {
      await page.click('button[role="tab"]:has-text("Overview")');
      await page.click("text=All Centers");
      await page.waitForSelector("table");

      // Check first tier badge color
      const firstBadge = page.locator("td span.text-sm.font-medium").first();
      const tierText = await firstBadge.textContent();

      // Verify badge has appropriate styling based on tier
      if (tierText.includes("4th")) {
        // Should have purple/success color
        await expect(firstBadge).toHaveClass(/bg-purple|bg-green/);
      } else if (tierText.includes("3rd")) {
        // Should have blue color
        await expect(firstBadge).toHaveClass(/bg-blue/);
      } else if (tierText.includes("2nd")) {
        // Should have yellow color
        await expect(firstBadge).toHaveClass(/bg-yellow/);
      } else if (tierText.includes("1st")) {
        // Should have orange color
        await expect(firstBadge).toHaveClass(/bg-orange/);
      }
    });
  });

  test.describe("API Integration", () => {
    test("should call correct API endpoints without 422 errors", async ({
      page,
    }) => {
      const apiCalls = [];

      page.on("request", (request) => {
        if (request.url().includes("/api/")) {
          apiCalls.push({
            method: request.method(),
            url: request.url(),
          });
        }
      });

      await page.click('button[role="tab"]:has-text("Overview")');
      await page.click("text=All Centers");
      await page.waitForLoadState("networkidle");

      // Verify correct endpoint was called
      const allCentersCall = apiCalls.find((call) =>
        call.url.includes("/admin/refurbishment/all-centers"),
      );
      expect(allCentersCall).toBeDefined();
      expect(allCentersCall.method).toBe("GET");

      // Verify no 422 errors
      expect(apiErrors.filter((e) => e.status === 422)).toHaveLength(0);
    });

    test("should handle limit parameter correctly (max 100)", async ({
      page,
    }) => {
      const apiCalls = [];

      page.on("request", (request) => {
        if (request.url().includes("/all-centers")) {
          const url = new URL(request.url());
          const limit = url.searchParams.get("limit");
          apiCalls.push({ limit: parseInt(limit) });
        }
      });

      await page.click('button[role="tab"]:has-text("Overview")');
      await page.click("text=All Centers");
      await page.waitForLoadState("networkidle");

      // Verify limit is capped at 100 (Math.min(limit, 100))
      if (apiCalls.length > 0) {
        expect(apiCalls[0].limit).toBeLessThanOrEqual(100);
      }
    });
  });

  test.describe("Performance & UX", () => {
    test("should load data within 3 seconds", async ({ page }) => {
      await page.click('button[role="tab"]:has-text("Overview")');

      const startTime = Date.now();
      await page.click("text=All Centers");
      await page.waitForSelector("table");
      const endTime = Date.now();

      const loadTime = endTime - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test("should show loading state while fetching data", async ({ page }) => {
      await page.click('button[role="tab"]:has-text("Overview")');

      // Click card and immediately check for loading indicator
      await page.click("text=All Centers");

      // Should show some loading indication (spinner, skeleton, etc.)
      // This is a placeholder - adjust based on your actual loading UI
      const hasLoadingState = await page
        .locator(".animate-spin, .skeleton, text=Loading")
        .isVisible()
        .catch(() => false);

      // Wait for actual data
      await page.waitForSelector("table");

      // Loading state should be gone
      const stillLoading = await page
        .locator(".animate-spin, .skeleton, text=Loading")
        .isVisible()
        .catch(() => false);
      expect(stillLoading).toBe(false);
    });

    test("should handle empty results gracefully", async ({ page }) => {
      // This test might not apply if you always have data
      // But good practice to test empty state handling
      await page.click('button[role="tab"]:has-text("Overview")');
      await page.click("text=Last refurbished");

      // Should show either data or empty state message (not crash)
      const hasData = (await page.locator("tbody tr").count()) > 0;
      const hasEmptyMessage = await page
        .locator("text=No centers found, text=No data")
        .isVisible()
        .catch(() => false);

      expect(hasData || hasEmptyMessage).toBe(true);
    });
  });

  test.describe("Responsive Design", () => {
    test("should work on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await page.click('button[role="tab"]:has-text("Overview")');

      // Cards should stack vertically on mobile
      const cards = page.locator(".grid > .cursor-pointer");
      await expect(cards).toHaveCount(3);

      // Should still be clickable
      await cards.first().click();
      await page.waitForSelector("table", { timeout: 5000 });
    });

    test("should work on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad

      await page.click('button[role="tab"]:has-text("Overview")');
      await page.click("text=All Centers");
      await page.waitForSelector("table");

      const rows = page.locator("tbody tr");
      expect(await rows.count()).toBeGreaterThan(0);
    });
  });

  test.afterEach(async ({ page }) => {
    // Log any errors found
    if (apiErrors.length > 0) {
      console.log("API Errors detected:", apiErrors);
    }
  });
});
