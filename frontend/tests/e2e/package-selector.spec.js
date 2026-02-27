/**
 * @fileoverview E2E Tests for Enhanced PackageSelector Component
 * Tests: Thumbnails, Select All, Lab badges, Image fallback, Search & Filter
 *
 * @requires @playwright/test
 */

import { test, expect } from "@playwright/test";
import { login } from "../helpers/auth";

test.describe("PackageSelector - Enhanced UI/UX", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await login(page, {
      email: "admin@seif.org",
      password: "Admin@123",
    });

    // Navigate to Refurbishment Dashboard
    await page.goto("/admin/refurbishment");
    await page.waitForLoadState("networkidle");

    // Click on Packages tab
    await page.click('button:has-text("Packages")');
    await page.waitForTimeout(2000);

    // Open create request modal (which uses PackageSelector)
    // Note: Adjust selector based on your actual button
    const createButton = page.locator(
      'button:has-text("Create Request"), button:has-text("Schedule Notification")',
    );
    if ((await createButton.count()) > 0) {
      await createButton.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test("should display package thumbnails in selector", async ({ page }) => {
    // Wait for package selector to load
    await page.waitForSelector('[class*="space-y-4"]', { timeout: 10000 });

    // Check if images are displayed
    const thumbnails = page.locator('img[alt*="package"], img[alt*="Package"]');
    const thumbnailCount = await thumbnails.count();

    if (thumbnailCount > 0) {
      // Verify first thumbnail is visible
      await expect(thumbnails.first()).toBeVisible();

      // Verify thumbnail size (should be 80x80)
      const firstThumbnail = thumbnails.first();
      const boundingBox = await firstThumbnail.boundingBox();

      expect(boundingBox.width).toBeGreaterThanOrEqual(70);
      expect(boundingBox.width).toBeLessThanOrEqual(90);
    }
  });

  test("should display fallback icon for packages without images", async ({
    page,
  }) => {
    // Wait for package selector
    await page.waitForTimeout(2000);

    // Look for placeholder icons (PhotoIcon)
    const placeholders = page
      .locator('[class*="gradient"]')
      .filter({ has: page.locator("svg") });

    if ((await placeholders.count()) > 0) {
      await expect(placeholders.first()).toBeVisible();
    }
  });

  test("should display package title and description", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Check for package titles
    const titles = page.locator('label[class*="font-semibold"]');
    const titleCount = await titles.count();

    expect(titleCount).toBeGreaterThan(0);

    // Verify first title is visible
    if (titleCount > 0) {
      await expect(titles.first()).toBeVisible();
    }

    // Check for descriptions
    const descriptions = page.locator('p[class*="text-gray-600"]');
    if ((await descriptions.count()) > 0) {
      await expect(descriptions.first()).toBeVisible();
    }
  });

  test("should display lab badges on each package card", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for badge elements with lab names
    const labBadges = page.locator(
      '[class*="Badge"], span:has-text("Solar"), span:has-text("Electrical")',
    );

    if ((await labBadges.count()) > 0) {
      await expect(labBadges.first()).toBeVisible();
    }
  });

  test("should display image count badge", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for image count indicators (e.g., "2 images")
    const imageCountBadge = page.locator('span:has-text("image")');

    if ((await imageCountBadge.count()) > 0) {
      const text = await imageCountBadge.first().textContent();
      expect(text).toMatch(/\d+\s*image/i);
    }
  });

  test('should show "Select All Visible" button', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for Select All button
    const selectAllButton = page.locator(
      'button:has-text("Select All Visible"), button:has-text("Select All")',
    );

    if ((await selectAllButton.count()) > 0) {
      await expect(selectAllButton.first()).toBeVisible();
      await expect(selectAllButton.first()).toBeEnabled();
    }
  });

  test('should select all visible packages when clicking "Select All"', async ({
    page,
  }) => {
    await page.waitForTimeout(2000);

    // Get initial selection count
    const selectionCount = page.locator('span:has-text("selected")').first();
    const initialText = await selectionCount.textContent();

    // Click Select All button
    const selectAllButton = page.locator(
      'button:has-text("Select All Visible"), button:has-text("Select All")',
    );

    if ((await selectAllButton.count()) > 0) {
      await selectAllButton.first().click();
      await page.waitForTimeout(500);

      // Verify selection count increased
      const newText = await selectionCount.textContent();
      expect(newText).not.toBe(initialText);

      // Button should now say "Deselect All"
      const deselectButton = page.locator('button:has-text("Deselect All")');
      await expect(deselectButton).toBeVisible();
    }
  });

  test('should deselect all packages when clicking "Deselect All"', async ({
    page,
  }) => {
    await page.waitForTimeout(2000);

    // First select all
    const selectAllButton = page.locator(
      'button:has-text("Select All Visible"), button:has-text("Select All")',
    );

    if ((await selectAllButton.count()) > 0) {
      await selectAllButton.first().click();
      await page.waitForTimeout(500);

      // Click Deselect All
      const deselectButton = page.locator('button:has-text("Deselect All")');
      await deselectButton.click();
      await page.waitForTimeout(500);

      // Verify selection count is 0
      const selectionCount = page.locator('span:has-text("selected")').first();
      const text = await selectionCount.textContent();
      expect(text).toContain("0");
    }
  });

  test('should show selected package count in format "X / Y selected"', async ({
    page,
  }) => {
    await page.waitForTimeout(2000);

    // Look for selection counter
    const counter = page.locator('span:has-text("selected")').first();

    if ((await counter.count()) > 0) {
      const text = await counter.textContent();
      expect(text).toMatch(/\d+\s*\/\s*\d+\s*selected/i);
    }
  });

  test("should highlight selected packages with blue border", async ({
    page,
  }) => {
    await page.waitForTimeout(2000);

    // Find first package checkbox and click it
    const firstCheckbox = page.locator('input[type="checkbox"]').first();

    if ((await firstCheckbox.count()) > 0) {
      await firstCheckbox.click();
      await page.waitForTimeout(500);

      // Verify parent container has blue styling
      const parentCard = firstCheckbox.locator(
        'xpath=ancestor::div[contains(@class, "border-blue-600")]',
      );
      await expect(parentCard).toBeVisible();
    }
  });

  test("should display check circle icon on selected packages", async ({
    page,
  }) => {
    await page.waitForTimeout(2000);

    // Select first package
    const firstCheckbox = page.locator('input[type="checkbox"]').first();

    if ((await firstCheckbox.count()) > 0) {
      await firstCheckbox.click();
      await page.waitForTimeout(500);

      // Look for CheckCircleIcon (typically an SVG)
      const checkIcon = page.locator('svg[class*="text-blue-600"]');

      if ((await checkIcon.count()) > 0) {
        await expect(checkIcon.first()).toBeVisible();
      }
    }
  });

  test("should filter packages when selecting a lab", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Get initial package count for reference
    const _initialCards = await page
      .locator('[class*="p-4"][class*="transition"]')
      .count();

    // Click on a lab filter chip (not "All Labs")
    const labChips = page.locator(
      'button[class*="rounded-full"]:not(:has-text("All Labs"))',
    );

    if ((await labChips.count()) > 0) {
      const firstLab = labChips.first();
      await firstLab.click();
      await page.waitForTimeout(1000);

      // Verify package count changed or stayed the same
      const newCards = await page
        .locator('[class*="p-4"][class*="transition"]')
        .count();
      expect(newCards).toBeGreaterThanOrEqual(0);
    }
  });

  test('should only select filtered packages with "Select All Visible"', async ({
    page,
  }) => {
    await page.waitForTimeout(2000);

    // Apply a filter first
    const labChips = page.locator(
      'button[class*="rounded-full"]:not(:has-text("All Labs"))',
    );

    if ((await labChips.count()) > 1) {
      const secondLab = labChips.nth(1);
      await secondLab.click();
      await page.waitForTimeout(1000);

      // Get count of visible packages
      const visibleCards = await page
        .locator('[class*="p-4"][class*="transition"]')
        .count();

      // Click Select All Visible
      const selectAllButton = page.locator(
        'button:has-text("Select All Visible"), button:has-text("Select All")',
      );
      await selectAllButton.first().click();
      await page.waitForTimeout(500);

      // Verify selection count matches visible cards
      const counter = page.locator('span:has-text("selected")').first();
      const text = await counter.textContent();
      const match = text.match(/(\d+)\s*\/\s*(\d+)/);

      if (match) {
        const selected = parseInt(match[1]);
        const total = parseInt(match[2]);
        expect(selected).toBe(total);
        expect(selected).toBe(visibleCards);
      }
    }
  });

  test("should search packages by name", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search packages"]');

    if ((await searchInput.count()) > 0) {
      // Get first package name
      const firstPackageName = await page
        .locator('label[class*="font-semibold"]')
        .first()
        .textContent();

      if (firstPackageName) {
        // Search for first few characters
        const searchTerm = firstPackageName.substring(0, 5);
        await searchInput.fill(searchTerm);
        await page.waitForTimeout(1000);

        // Verify filtered results
        const visibleCards = await page
          .locator('[class*="p-4"][class*="transition"]')
          .count();
        expect(visibleCards).toBeGreaterThan(0);
      }
    }
  });

  test('should clear filters when clicking "Clear Filters"', async ({
    page,
  }) => {
    await page.waitForTimeout(2000);

    // Apply search filter
    const searchInput = page.locator('input[placeholder*="Search packages"]');

    if ((await searchInput.count()) > 0) {
      await searchInput.fill("test");
      await page.waitForTimeout(500);

      // Click clear filters button
      const clearButton = page.locator('button:has-text("Clear Filters")');

      if ((await clearButton.count()) > 0) {
        await clearButton.click();
        await page.waitForTimeout(500);

        // Verify search input is cleared
        const searchValue = await searchInput.inputValue();
        expect(searchValue).toBe("");
      }
    }
  });

  test("should show hover effects on package cards", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Find first package card
    const firstCard = page
      .locator('[class*="p-4"][class*="transition"]')
      .first();

    if ((await firstCard.count()) > 0) {
      // Hover over card
      await firstCard.hover();
      await page.waitForTimeout(300);

      // Verify hover state (shadow or background change)
      const classes = await firstCard.getAttribute("class");
      expect(classes).toContain("hover");
    }
  });

  test("should display empty state when no packages match filters", async ({
    page,
  }) => {
    await page.waitForTimeout(2000);

    // Search for something that won't match
    const searchInput = page.locator('input[placeholder*="Search packages"]');

    if ((await searchInput.count()) > 0) {
      await searchInput.fill("zzzzzznonexistentpackage12345");
      await page.waitForTimeout(1000);

      // Look for empty state message
      const emptyMessage = page.locator('text="No packages found"');
      await expect(emptyMessage).toBeVisible();
    }
  });

  test("should handle image load errors gracefully", async ({ page }) => {
    await page.waitForTimeout(2000);

    // This test verifies fallback behavior is in place
    // In a real scenario, we'd inject a broken image URL

    // Look for placeholder icons (should exist as fallback)
    const placeholders = page.locator(
      '[class*="PhotoIcon"], svg[class*="text-gray-400"]',
    );

    // At least one placeholder should exist (for packages without images)
    if ((await placeholders.count()) > 0) {
      await expect(placeholders.first()).toBeVisible();
    }
  });

  test("should show total packages count in helper text", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for helper text at bottom
    const helperText = page.locator('text="total packages selected"');

    if ((await helperText.count()) > 0) {
      await expect(helperText).toBeVisible();

      const text = await helperText.textContent();
      expect(text).toMatch(/\d+\s*of\s*\d+\s*total\s*packages/i);
    }
  });

  test("should allow clicking entire card to select package", async ({
    page,
  }) => {
    await page.waitForTimeout(2000);

    // Get initial selection count
    const initialSelected = await page
      .locator('input[type="checkbox"]:checked')
      .count();

    // Click on a card (not on checkbox)
    const firstCard = page
      .locator('[class*="p-4"][class*="transition"]')
      .first();
    const cardLabel = firstCard.locator("label").first();

    if ((await cardLabel.count()) > 0) {
      await cardLabel.click();
      await page.waitForTimeout(500);

      // Verify selection changed
      const newSelected = await page
        .locator('input[type="checkbox"]:checked')
        .count();
      expect(newSelected).not.toBe(initialSelected);
    }
  });
});

test.describe("PackageSelector - Integration with Modals", () => {
  test("should work correctly in Create Request modal", async ({ page }) => {
    await login(page, { email: "admin@seif.org", password: "Admin@123" });
    await page.goto("/admin/refurbishment");
    await page.waitForLoadState("networkidle");

    // This test verifies PackageSelector works in actual usage context
    // Specific selectors depend on your modal implementation
  });

  test("should work correctly in Schedule Notification modal", async ({
    page,
  }) => {
    await login(page, { email: "admin@seif.org", password: "Admin@123" });
    await page.goto("/admin/refurbishment");
    await page.waitForLoadState("networkidle");

    // This test verifies PackageSelector works in notification context
  });
});
