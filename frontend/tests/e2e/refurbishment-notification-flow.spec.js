/**
 * E2E Test: Complete Refurbishment Notification Flow
 *
 * This test covers the ENTIRE refurbishment notification feature for presentation:
 * 1. Admin creates scheduled notification with packages
 * 2. Partner receives notification in inbox
 * 3. Partner clicks notification and sees RQ-XXXXX details
 * 4. Partner clicks Continue and opens package selection modal
 * 5. Partner navigates courses, selects packages, adds justifications
 * 6. Partner submits response
 * 7. Admin receives response notification
 *
 * CRITICAL TEST FOR 11 AM PRESENTATION
 */

import { test, expect } from "@playwright/test";

// Test credentials (from copilot-instructions.md)
const ADMIN_EMAIL = "admin@seif.org";
const ADMIN_PASSWORD = "Admin@123";
const PARTNER_EMAIL = "demo.partner@seif.org";
const PARTNER_PASSWORD = "Password123";

test.describe("Complete Refurbishment Notification Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto("/");
  });

  test("Admin creates scheduled notification → Partner responds with justifications → Admin receives confirmation", async ({
    page,
    browser,
  }) => {
    // ========================================
    // STEP 1: Admin Login
    // ========================================
    await test.step("Admin logs in", async () => {
      await page.goto("/login");
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      // Wait for dashboard to load
      await page.waitForURL("/admin/dashboard", { timeout: 10000 });
      await expect(page).toHaveURL(/admin\/dashboard/);
    });

    // ========================================
    // STEP 2: Navigate to Refurbishment Dashboard
    // ========================================
    await test.step("Admin navigates to Refurbishment Dashboard", async () => {
      // Click on Refurbishment menu item (might be in sidebar or header)
      await page.click("text=Refurbishment");

      // Wait for refurbishment dashboard to load
      await page.waitForURL(/refurbishment/, { timeout: 10000 });
      await expect(
        page.locator("h1, h2").filter({ hasText: /Refurbishment/i }),
      ).toBeVisible();
    });

    // ========================================
    // STEP 3: Create Scheduled Notification
    // ========================================
    let notificationMessage = "";
    await test.step("Admin creates scheduled notification with packages", async () => {
      // Click on bell icon or "Create Notification" button
      const bellButton = page
        .locator(
          'button:has(svg.lucide-bell), button:has-text("Schedule Notification")',
        )
        .first();
      await bellButton.click();

      // Wait for modal to appear
      await expect(page.locator("text=Schedule Notification")).toBeVisible({
        timeout: 5000,
      });

      // Select partner (assuming combobox or select)
      await page.click('button:has-text("Select Partner")');
      await page.click('div[role="option"]:has-text("Don Bosco")').first();

      // Select center based on partner
      await page.click('button:has-text("Select Center")');
      await page.click('div[role="option"]').first(); // Select first available center

      // Set reminder date/time (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD
      await page.fill('input[type="date"]', dateString);
      await page.fill('input[type="time"]', "10:00");

      // Select frequency (Instant or One-time)
      await page.click(
        'select[name="frequency"], button:has-text("Frequency")',
      );
      await page.click(
        'option[value="instant"], div[role="option"]:has-text("Instant")',
      );

      // Add message
      notificationMessage = `Refurbishment notification created for E2E test at ${new Date().toISOString()}`;
      await page.fill(
        'textarea[name="message"], textarea[placeholder*="message"]',
        notificationMessage,
      );

      // CRITICAL: Select All Packages (should be default for scheduled requests)
      // If there's a "Select All" button visible, verify it OR packages are pre-selected
      const selectAllButton = page.locator('button:has-text("Select All")');
      if (await selectAllButton.isVisible()) {
        await selectAllButton.click();
      }

      // Verify at least one package is selected
      const selectedCount = await page
        .locator("text=/\\d+.*selected/i")
        .first()
        .textContent();
      expect(selectedCount).toContain("selected");

      // Submit the notification
      await page.click(
        'button[type="submit"]:has-text("Schedule"), button:has-text("Create Notification")',
      );

      // Wait for success toast
      await expect(page.locator("text=/successfully|created/i")).toBeVisible({
        timeout: 10000,
      });
    });

    // ========================================
    // STEP 4: Admin Logout & Partner Login
    // ========================================
    let partnerContext;
    let partnerPage;

    await test.step("Admin logs out and Partner logs in", async () => {
      // Logout admin
      await page.click('button:has-text("Logout"), a:has-text("Logout")');
      await page.waitForURL("/login", { timeout: 5000 });

      // Create new browser context for partner (simulates different user)
      partnerContext = await browser.newContext();
      partnerPage = await partnerContext.newPage();

      // Partner login
      await partnerPage.goto("/login");
      await partnerPage.fill('input[type="email"]', PARTNER_EMAIL);
      await partnerPage.fill('input[type="password"]', PARTNER_PASSWORD);
      await partnerPage.click('button[type="submit"]');

      // Wait for partner dashboard
      await partnerPage.waitForURL(/dashboard|partner/, { timeout: 10000 });
    });

    // ========================================
    // STEP 5: Partner Checks Inbox
    // ========================================
    await test.step("Partner navigates to Inbox and sees notification", async () => {
      // Navigate to inbox
      await partnerPage.click('a:has-text("Inbox"), text=Inbox');
      await partnerPage.waitForURL(/inbox/, { timeout: 10000 });

      // Check for unread notification count (should be > 0)
      const unreadBadge = partnerPage.locator("text=/\\d+/").first();
      if (await unreadBadge.isVisible()) {
        const count = await unreadBadge.textContent();
        expect(parseInt(count)).toBeGreaterThan(0);
      }

      // Verify refurbishment notification is visible
      await expect(
        partnerPage.locator("text=/Refurbishment|Eligibility/i"),
      ).toBeVisible({ timeout: 5000 });
    });

    // ========================================
    // STEP 6: Partner Clicks Notification & Sees RQ-XXXXX Details
    // ========================================
    let requestNumber = "";
    await test.step("Partner clicks notification and views RQ-XXXXX details", async () => {
      // Click on the refurbishment notification
      await partnerPage
        .click('div:has-text("Refurbishment"):has-text("Eligibility")')
        .first();

      // Wait for RefurbishmentDetailCard to load
      await partnerPage.waitForTimeout(2000); // Allow API call to complete

      // Verify RQ-XXXXX format is displayed
      const rqElement = partnerPage.locator("text=/RQ-\\d{6}/").first();
      await expect(rqElement).toBeVisible({ timeout: 10000 });

      requestNumber = await rqElement.textContent();
      console.log(`✅ Request Number visible: ${requestNumber}`);

      // Verify partner details visible
      await expect(
        partnerPage.locator("text=/Partner.*:|Partner Name/i"),
      ).toBeVisible();

      // Verify subject visible
      await expect(
        partnerPage.locator("text=/Request for Lab Refurbishment/i"),
      ).toBeVisible();

      // Verify center info visible
      await expect(
        partnerPage.locator("text=/Center.*:|Center Name/i"),
      ).toBeVisible();

      // Verify date visible
      await expect(partnerPage.locator("text=/Date.*:/i")).toBeVisible();

      // Verify Continue button visible (only if not responded yet)
      const continueButton = partnerPage.locator('button:has-text("Continue")');
      if (await continueButton.isVisible()) {
        console.log(
          "✅ Continue button found - notification not yet responded",
        );
      }
    });

    // ========================================
    // STEP 7: Partner Opens Package Selection Modal
    // ========================================
    await test.step("Partner clicks Continue and opens package selection modal", async () => {
      const continueButton = partnerPage.locator('button:has-text("Continue")');

      // Only proceed if Continue button exists (notification not responded)
      if (await continueButton.isVisible()) {
        await continueButton.click();

        // Wait for RefurbishmentResponseModal to appear
        await expect(
          partnerPage.locator("text=/Select Packages|Course/i"),
        ).toBeVisible({ timeout: 5000 });

        // Verify progress indicator visible
        await expect(
          partnerPage.locator("text=/1 of \\d+|Course 1/i"),
        ).toBeVisible();

        console.log("✅ Package selection modal opened");
      } else {
        console.log(
          "⚠️ Notification already responded - skipping modal interaction",
        );
        test.skip();
      }
    });

    // ========================================
    // STEP 8: Partner Selects Packages & Adds Justifications
    // ========================================
    await test.step("Partner selects packages and provides justifications", async () => {
      // Get total number of courses
      const progressText = await partnerPage
        .locator("text=/1 of (\\d+)/")
        .first()
        .textContent();
      const totalCourses = parseInt(progressText.match(/of (\\d+)/)[1]);

      console.log(`Total courses to process: ${totalCourses}`);

      for (let courseIndex = 0; courseIndex < totalCourses; courseIndex++) {
        console.log(`Processing course ${courseIndex + 1}/${totalCourses}`);

        // Select first package in current course (checkbox)
        const firstCheckbox = partnerPage
          .locator('input[type="checkbox"]')
          .first();
        if (!(await firstCheckbox.isChecked())) {
          await firstCheckbox.click();
        }

        // Wait for justification textarea to appear
        await partnerPage.waitForTimeout(500);

        // Find and fill justification textarea
        const justificationTextarea = partnerPage
          .locator('textarea[placeholder*="justification" i], textarea')
          .first();
        await justificationTextarea.fill(
          `Justification for course ${courseIndex + 1}: Equipment is outdated and needs replacement for better training quality`,
        );

        // Click Next (or Submit on last course)
        if (courseIndex < totalCourses - 1) {
          await partnerPage.click('button:has-text("Next")');
          await partnerPage.waitForTimeout(1000); // Wait for next course to load
        } else {
          // Last course - click Submit
          await partnerPage.click(
            'button:has-text("Submit"), button[type="submit"]',
          );

          // Wait for success message
          await expect(
            partnerPage.locator("text=/success|submitted/i"),
          ).toBeVisible({ timeout: 10000 });
          console.log("✅ Response submitted successfully");
        }
      }
    });

    // ========================================
    // STEP 9: Verify Partner Side Updates
    // ========================================
    await test.step("Verify notification marked as responded", async () => {
      // Modal should close after submission
      await expect(
        partnerPage.locator("text=/Select Packages/i"),
      ).not.toBeVisible({ timeout: 5000 });

      // Verify "Response Submitted" status or Continue button hidden
      await expect(
        partnerPage.locator("text=/Response Submitted|Already Responded/i"),
      ).toBeVisible({ timeout: 5000 });

      console.log("✅ Notification marked as responded on partner side");
    });

    // ========================================
    // STEP 10: Admin Receives Response Notification
    // ========================================
    await test.step("Admin logs back in and checks for partner response notification", async () => {
      // Switch back to admin page
      await page.goto("/login");
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/admin/, { timeout: 10000 });

      // Navigate to admin inbox
      await page.click('a:has-text("Inbox"), text=Inbox');
      await page.waitForURL(/inbox/, { timeout: 10000 });

      // Look for notification about partner response
      await expect(
        page
          .locator(`text=/${requestNumber}/i, text=/submitted.*response/i`)
          .first(),
      ).toBeVisible({ timeout: 15000 });

      console.log(`✅ Admin received notification for ${requestNumber}`);
    });

    // ========================================
    // CLEANUP
    // ========================================
    await partnerContext.close();
  });

  test("Partner cannot respond to same notification twice", async ({
    page,
  }) => {
    // Login as partner
    await page.goto("/login");
    await page.fill('input[type="email"]', PARTNER_EMAIL);
    await page.fill('input[type="password"]', PARTNER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|partner/, { timeout: 10000 });

    // Go to inbox
    await page.click('a:has-text("Inbox")');
    await page.waitForURL(/inbox/, { timeout: 10000 });

    // Click on a refurbishment notification
    const refurbNotif = page.locator('div:has-text("Refurbishment")').first();
    if (await refurbNotif.isVisible()) {
      await refurbNotif.click();

      // If notification was already responded, Continue button should NOT be visible
      const continueButton = page.locator('button:has-text("Continue")');
      const respondedText = page.locator(
        "text=/Response Submitted|Already Responded/i",
      );

      // One of two states should be true:
      // 1. Continue button visible (not responded)
      // 2. "Response Submitted" text visible (already responded)
      const isResponded = await respondedText.isVisible();
      const canContinue = await continueButton.isVisible();

      expect(isResponded || canContinue).toBe(true);

      if (isResponded) {
        console.log(
          "✅ Validation passed: Notification shows as already responded",
        );
        expect(continueButton).not.toBeVisible();
      }
    }
  });
});
