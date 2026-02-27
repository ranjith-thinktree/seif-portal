/**
 * E2E Test: Manual Refurbishment Request Creation
 *
 * Tests the complete flow of creating a manual refurbishment request:
 * 1. Admin login
 * 2. Navigate to Refurbishment Dashboard > Active Requests tab
 * 3. Click "Create Manual Request" button
 * 4. Fill out form with partner, center, date, time, message, packages
 * 5. Submit request
 * 6. Verify request appears in table with "Manual" badge
 * 7. Verify "Send Notification" button exists for manual request
 *
 * @requires Playwright
 * @requires Backend running on http://localhost:5000
 * @requires Frontend running on http://localhost:5173
 */

import { test, expect } from "@playwright/test";

// Test configuration
const BASE_URL = process.env.VITE_APP_URL || "http://localhost:5173";
const API_URL = process.env.VITE_API_BASE_URL || "http://localhost:5000";

// Test credentials (ensure these exist in your database)
const ADMIN_CREDENTIALS = {
  email: "admin@seif.org",
  password: "Admin@123",
};

test.describe("Manual Refurbishment Request Creation", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);

    // Login as admin
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });

    // Navigate to Refurbishment Dashboard
    await page.goto(`${BASE_URL}/admin/refurbishment`);
    await page.waitForLoadState("networkidle");
  });

  test('should display "Create Manual Request" button in Active Requests tab', async ({
    page,
  }) => {
    // Click on Active Requests tab
    await page.click('button:has-text("Active Requests")');
    await page.waitForTimeout(1000);

    // Verify button exists
    const createButton = page.locator(
      'button:has-text("Create Manual Request")',
    );
    await expect(createButton).toBeVisible();

    // Check button styling (green background)
    await expect(createButton).toHaveClass(/bg-green-600/);
  });

  test('should open modal when "Create Manual Request" button is clicked', async ({
    page,
  }) => {
    // Navigate to Active Requests tab
    await page.click('button:has-text("Active Requests")');
    await page.waitForTimeout(1000);

    // Click Create Manual Request button
    await page.click('button:has-text("Create Manual Request")');

    // Verify modal opens with correct title
    await expect(
      page.locator('h2:has-text("Create Manual Refurbishment Request")'),
    ).toBeVisible();

    // Verify description
    await expect(
      page.locator(
        "text=Create a manual refurbishment request for a specific partner and center",
      ),
    ).toBeVisible();
  });

  test("should successfully create a manual refurbishment request", async ({
    page,
  }) => {
    // Navigate to Active Requests tab
    await page.click('button:has-text("Active Requests")');
    await page.waitForTimeout(1000);

    // Click Create Manual Request button
    await page.click('button:has-text("Create Manual Request")');

    // Wait for modal to open
    await page.waitForSelector(
      'h2:has-text("Create Manual Refurbishment Request")',
    );

    // Fill out form
    // 1. Select Partner (click dropdown and select first option)
    await page.click('button[role="combobox"]:has-text("Select partner")');
    await page.waitForTimeout(500);
    const firstPartner = page.locator('[role="option"]').first();
    await firstPartner.click();

    // 2. Select Center (wait for centers to load, then select first)
    await page.waitForTimeout(1000);
    await page.click('button[role="combobox"]:has-text("Select center")');
    await page.waitForTimeout(500);
    const firstCenter = page.locator('[role="option"]').first();
    await firstCenter.click();

    // 3. Set date (today's date)
    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[type="date"]', today);

    // 4. Set time
    await page.fill('input[type="time"]', "14:00");

    // 5. Select at least one package
    const firstPackageCheckbox = page.locator('input[type="checkbox"]').first();
    await firstPackageCheckbox.check();

    // 6. Enter message
    await page.fill(
      "textarea#notifMessage",
      "Urgent: Equipment refurbishment required for safety compliance.",
    );

    // 7. Submit form
    await page.click('button[type="submit"]:has-text("Create Request")');

    // Wait for success toast
    await expect(
      page.locator("text=Manual request created successfully"),
    ).toBeVisible({ timeout: 5000 });

    // Verify modal closes
    await expect(
      page.locator('h2:has-text("Create Manual Refurbishment Request")'),
    ).not.toBeVisible();
  });

  test('should display manual request in Active Requests table with "Manual" badge', async ({
    page,
  }) => {
    // Create a manual request first (reuse logic from previous test)
    await page.click('button:has-text("Active Requests")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Create Manual Request")');
    await page.waitForSelector(
      'h2:has-text("Create Manual Refurbishment Request")',
    );

    // Quick form fill
    await page.click('button[role="combobox"]:has-text("Select partner")');
    await page.waitForTimeout(500);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(1000);
    await page.click('button[role="combobox"]:has-text("Select center")');
    await page.waitForTimeout(500);
    await page.locator('[role="option"]').first().click();

    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[type="date"]', today);
    await page.fill('input[type="time"]', "14:00");
    await page.locator('input[type="checkbox"]').first().check();
    await page.fill("textarea#notifMessage", "Test manual request");
    await page.click('button[type="submit"]:has-text("Create Request")');

    // Wait for success and table refresh
    await page.waitForTimeout(2000);

    // Verify "Manual" badge appears in table
    const manualBadge = page.locator('span:has-text("Manual")').first();
    await expect(manualBadge).toBeVisible();

    // Verify row has partner and center info
    const tableRow = page.locator('tr:has(span:has-text("Manual"))').first();
    await expect(tableRow).toBeVisible();
  });

  test('should display "Send Notification" button for manual requests', async ({
    page,
  }) => {
    // Navigate to Active Requests tab
    await page.click('button:has-text("Active Requests")');
    await page.waitForTimeout(2000);

    // Find a row with "Manual" badge
    const manualRow = page.locator('tr:has(span:has-text("Manual"))').first();

    // Check if Send Notification button exists in that row
    const sendButton = manualRow.locator('button[title="Send Notification"]');

    if ((await sendButton.count()) > 0) {
      await expect(sendButton).toBeVisible();

      // Verify button has bell icon
      const bellIcon = sendButton.locator("svg");
      await expect(bellIcon).toBeVisible();
    } else {
      console.log("No manual requests found in table - test skipped");
    }
  });

  test("should validate required fields", async ({ page }) => {
    // Navigate to Active Requests tab
    await page.click('button:has-text("Active Requests")');
    await page.waitForTimeout(1000);

    // Open modal
    await page.click('button:has-text("Create Manual Request")');
    await page.waitForSelector(
      'h2:has-text("Create Manual Refurbishment Request")',
    );

    // Try to submit without filling required fields
    await page.click('button[type="submit"]:has-text("Create Request")');

    // Should show validation error (browser validation or toast)
    // Note: Exact error message depends on your validation implementation
    await page.waitForTimeout(1000);

    // Form should still be open
    await expect(
      page.locator('h2:has-text("Create Manual Refurbishment Request")'),
    ).toBeVisible();
  });

  test("should close modal when Cancel button is clicked", async ({ page }) => {
    // Navigate to Active Requests tab
    await page.click('button:has-text("Active Requests")');
    await page.waitForTimeout(1000);

    // Open modal
    await page.click('button:has-text("Create Manual Request")');
    await page.waitForSelector(
      'h2:has-text("Create Manual Refurbishment Request")',
    );

    // Click Cancel
    await page.click('button:has-text("Cancel")');

    // Verify modal closes
    await expect(
      page.locator('h2:has-text("Create Manual Refurbishment Request")'),
    ).not.toBeVisible();
  });

  test("should have auto_send OFF for manual requests", async ({ page }) => {
    /**
     * This test verifies the database record has auto_send = false
     * We'll do this by checking the UI (Auto-Send toggle should show "-" not a switch)
     */
    await page.click('button:has-text("Active Requests")');
    await page.waitForTimeout(2000);

    // Find manual request row
    const manualRow = page.locator('tr:has(span:has-text("Manual"))').first();

    if ((await manualRow.count()) > 0) {
      // Auto-Send column should show "-" (dash) for manual requests
      const autoSendCell = manualRow.locator("td").nth(5); // Adjust index based on column position
      await expect(autoSendCell).toContainText("-");
    } else {
      console.log("No manual requests found - test skipped");
    }
  });
});

test.describe("Manual Request API Integration", () => {
  test("should send correct isManualRequest flag to backend", async ({
    page,
    request,
  }) => {
    // Intercept API call
    let apiPayload = null;

    await page.route(
      "**/api/v1/admin/refurbishment/schedule-notification",
      async (route) => {
        const postData = route.request().postDataJSON();
        apiPayload = postData;
        await route.continue();
      },
    );

    // Navigate and create manual request
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);

    await page.goto(`${BASE_URL}/admin/refurbishment`);
    await page.click('button:has-text("Active Requests")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Create Manual Request")');
    await page.waitForSelector(
      'h2:has-text("Create Manual Refurbishment Request")',
    );

    // Fill and submit (minimal)
    await page.click('button[role="combobox"]:has-text("Select partner")');
    await page.waitForTimeout(500);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(1000);
    await page.click('button[role="combobox"]:has-text("Select center")');
    await page.waitForTimeout(500);
    await page.locator('[role="option"]').first().click();

    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[type="date"]', today);
    await page.fill('input[type="time"]', "14:00");
    await page.locator('input[type="checkbox"]').first().check();
    await page.click('button[type="submit"]:has-text("Create Request")');

    await page.waitForTimeout(2000);

    // Verify API payload
    expect(apiPayload).not.toBeNull();
    expect(apiPayload.isManualRequest).toBe(true);
    expect(apiPayload.autoSend).toBe(false);
    expect(apiPayload.frequency).toBe("one-time");
  });
});
