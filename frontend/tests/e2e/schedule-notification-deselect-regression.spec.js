/**
 * Playwright E2E Test: Schedule Notification Modal - Deselect All Crash Regression
 *
 * Reproduces and verifies the fix for "Maximum update depth exceeded" infinite loop:
 *   Bell icon → Type selector → Schedule modal → click "Deselect All" → app crash
 *
 * Root cause was: inline onSelectionChange arrow function in ScheduleNotificationModal
 * created a new reference on every render, causing Radix Checkbox cascades inside
 * react-remove-scroll's setRef tracking to loop infinitely.
 */

import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@seif.org";
const ADMIN_PASSWORD = "Admin@123";

// ─── Shared Login Helper ───────────────────────────────────────────────────────

async function loginAsAdmin(page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Schedule Notification Modal - Deselect All regression", () => {
  test.beforeEach(async ({ page }) => {
    // Capture all console errors to detect React crash messages
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (text.includes("Maximum update depth exceeded")) {
          throw new Error(`[REGRESSION] React infinite loop detected: ${text}`);
        }
      }
    });

    await loginAsAdmin(page);
    await page.goto("/admin/refurbishment");
    await page.waitForLoadState("networkidle");
  });

  // ─── Core regression test ──────────────────────────────────────────────

  test("clicking Deselect All inside Schedule Notification modal does NOT crash the app", async ({
    page,
  }) => {
    // Step 1: Find a bell/notify button in the Overview tab
    // The bell icon triggers the type selector (Instant vs Schedule)
    const bellButton = page
      .locator(
        'button[title*="notif" i], button[aria-label*="notif" i], button:has(svg.lucide-bell)',
      )
      .first();

    const bellButtonCount = await bellButton.count();
    if (bellButtonCount === 0) {
      // Fallback: look for any schedule notification button
      const scheduleButtons = page.locator(
        'button:has-text("Schedule"), button:has-text("Notify")',
      );
      const scheduleCount = await scheduleButtons.count();
      if (scheduleCount === 0) {
        test.skip(
          "No bell/notify button found on the page - may need data to appear",
        );
        return;
      }
      await scheduleButtons.first().click();
    } else {
      await bellButton.click();
    }

    // Step 2: Type Selector modal should appear (Instant vs Schedule)
    await expect(
      page
        .locator('[role="dialog"]')
        .filter({ hasText: /instant|schedule/i })
        .first(),
    ).toBeVisible({ timeout: 5000 });

    // Step 3: Click "Schedule" option
    const scheduleOption = page
      .locator(
        'button:has-text("Schedule"), [role="button"]:has-text("Schedule")',
      )
      .filter({ hasText: /schedule/i })
      .first();
    await scheduleOption.click();

    // Step 4: Schedule Notification Modal should open
    await expect(
      page
        .locator('[role="dialog"]')
        .filter({ hasText: /schedule notification|notification reminder/i })
        .first(),
    ).toBeVisible({ timeout: 5000 });

    // Step 5: Wait for packages to load
    await page.waitForTimeout(1500); // allow getCourses API call to complete

    // Step 6: Verify packages are visible
    const packageItems = page.locator(
      '[role="dialog"] label[class*="font-semibold"], [role="dialog"] .font-semibold',
    );
    await expect(packageItems.first()).toBeVisible({ timeout: 8000 });

    // Step 7: Locate "Deselect All" button inside the open modal dialog
    const dialog = page.locator('[role="dialog"]').last();
    const deselectAllButton = dialog.locator('button:has-text("Deselect All")');

    const hasDeselectAll = await deselectAllButton.count();
    if (hasDeselectAll === 0) {
      // Packages might not all be selected; click "Select All Visible" first
      const selectAllButton = dialog.locator(
        'button:has-text("Select All Visible")',
      );
      if ((await selectAllButton.count()) > 0) {
        await selectAllButton.click();
        await page.waitForTimeout(300);
      }
    }

    const deselectBtn = dialog.locator('button:has-text("Deselect All")');
    await expect(deselectBtn).toBeVisible({ timeout: 5000 });

    // Step 8: THE CRITICAL ACTION - click Deselect All
    // Before the fix this crashed the entire app with "Maximum update depth exceeded"
    await deselectBtn.click();

    // Step 9: Wait briefly to let any React state settle
    await page.waitForTimeout(500);

    // Step 10: Verify the app hasn't crashed - the modal should still be visible
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Step 11: Verify the warning text appears (not a crash, just a validation warning)
    await expect(dialog.locator("text=/at least one package/i")).toBeVisible({
      timeout: 3000,
    });

    // Step 12: Verify the "Select All Visible" button is now shown
    await expect(
      dialog.locator('button:has-text("Select All Visible")'),
    ).toBeVisible({ timeout: 3000 });

    // Step 13: Verify the page title is still correct (app didn't reload/crash)
    await expect(page).not.toHaveURL(/error|crash/);
  });

  // ─── Full cycle test ───────────────────────────────────────────────────

  test("can deselect all then re-select packages and successfully close modal", async ({
    page,
  }) => {
    // Navigate to Overview tab and find a bell icon
    const bellButton = page.locator("button:has(svg.lucide-bell)").first();

    if ((await bellButton.count()) === 0) {
      test.skip("No bell button found - need data in the table");
      return;
    }

    await bellButton.click();

    // Click Schedule on the type selector
    const scheduleOption = page
      .locator('[role="dialog"] button')
      .filter({ hasText: /schedule/i })
      .last();
    await scheduleOption.click();

    // Wait for schedule modal
    const dialog = page.locator('[role="dialog"]').last();
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1500);

    // Deselect all
    const deselectAll = dialog.locator('button:has-text("Deselect All")');
    if ((await deselectAll.count()) === 0) {
      const selectAll = dialog.locator('button:has-text("Select All Visible")');
      if ((await selectAll.count()) > 0) {
        await selectAll.click();
        await page.waitForTimeout(300);
      }
    }

    if ((await dialog.locator('button:has-text("Deselect All")').count()) > 0) {
      await dialog.locator('button:has-text("Deselect All")').click();
      await page.waitForTimeout(300);
    }

    // Re-select all
    const selectAllAgain = dialog.locator(
      'button:has-text("Select All Visible")',
    );
    if ((await selectAllAgain.count()) > 0) {
      await selectAllAgain.click();
      await page.waitForTimeout(300);
    }

    // Cancel and close
    const cancelButton = dialog.locator('button:has-text("Cancel")');
    await cancelButton.click();

    // Dialog should be gone
    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  // ─── Rapid interaction test ────────────────────────────────────────────

  test("rapid Deselect/Select All toggling does not cause errors", async ({
    page,
  }) => {
    const bellButton = page.locator("button:has(svg.lucide-bell)").first();
    if ((await bellButton.count()) === 0) {
      test.skip("No bell button found");
      return;
    }

    await bellButton.click();

    const scheduleOption = page
      .locator('[role="dialog"] button')
      .filter({ hasText: /schedule/i })
      .last();
    await scheduleOption.click();

    const dialog = page.locator('[role="dialog"]').last();
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1500);

    // Toggle Deselect/Select 5 times rapidly
    for (let i = 0; i < 5; i++) {
      const deselectBtn = dialog.locator('button:has-text("Deselect All")');
      const selectBtn = dialog.locator('button:has-text("Select All Visible")');

      if ((await deselectBtn.count()) > 0) {
        await deselectBtn.click();
        await page.waitForTimeout(150);
      } else if ((await selectBtn.count()) > 0) {
        await selectBtn.click();
        await page.waitForTimeout(150);
      }
    }

    // App should still be running
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(page.locator("text=/refurbishment/i").first()).toBeVisible();
  });
});
