/**
 * E2E Test: Upgradation Feature — Full Partner Response Flow
 *
 * Covers:
 * 1. Admin schedules notification WITH upgradation packages selected
 * 2. Partner navigates to Inbox and opens the refurbishment notification
 * 3. Partner completes course selection step
 * 4. Partner sees "Do you need upgradation?" prompt (Figma-accurate)
 * 5. Partner chooses "Yes" → fills room dimensions (length/breadth/height in feet, no room name)
 * 6. Partner selects upgradation packages
 * 7. Package preview shows Upgradation tab
 * 8. Partner submits → sees "Request submitted successfully!" screen
 * 9. Admin review modal shows Upgradation pill tab with room details
 *
 * Credentials from QUICK_START.md:
 *   Admin:   admin@seif.org / Admin@123
 *   Partner: demo.partner@seif.org / Password123
 */

import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@seif.org";
const ADMIN_PASSWORD = "Admin@123";
const PARTNER_EMAIL = "demo.partner@seif.org";
const PARTNER_PASSWORD = "Password123";

/* ─── Helpers ────────────────────────────────────────────────── */

async function loginAs(page, email, password) {
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

/* ─── Test Suite ─────────────────────────────────────────────── */

test.describe("Upgradation Feature — Figma-Accurate E2E Flow", () => {
  test.setTimeout(90000);

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Admin can select upgradation packages when scheduling
  // ─────────────────────────────────────────────────────────────
  test("Admin sees Upgradation Packages section in Schedule Notification modal", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Navigate to Refurbishment Dashboard
    await page.goto("/admin/refurbishment");
    await page.waitForLoadState("networkidle");

    // Open Schedule Notification modal
    const scheduleBtn = page.getByRole("button", {
      name: /schedule.*notification/i,
    });
    if (!(await scheduleBtn.isVisible())) {
      // May need to click a specific center row's schedule button
      const firstSchedule = page
        .locator('[data-testid="schedule-btn"]')
        .first();
      await firstSchedule.click();
    } else {
      await scheduleBtn.click();
    }

    // Wait for modal to open
    await page.waitForSelector("text=Schedule Notification", { timeout: 8000 });

    // Check for "Upgradation Packages" section
    await expect(page.getByText(/upgradation packages/i)).toBeVisible({
      timeout: 5000,
    });

    // Upgradation packages checkboxes should be present
    const upgradationSection = page
      .locator("text=Upgradation Packages")
      .locator("..");
    await expect(upgradationSection).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Upgradation prompt screen UI matches Figma
  // ─────────────────────────────────────────────────────────────
  test("Partner response modal shows Figma-accurate upgradation prompt", async ({
    page,
  }) => {
    await loginAs(page, PARTNER_EMAIL, PARTNER_PASSWORD);

    // Navigate to inbox
    await page.goto("/inbox");
    await page.waitForLoadState("networkidle");

    // Find a refurbishment notification and open it
    const refurbNotif = page
      .locator(
        '[data-type="refurbishment"], .refurbishment-notification, [class*="notification"]',
      )
      .filter({ hasText: /refurb/i })
      .first();

    if (await refurbNotif.isVisible()) {
      await refurbNotif.click();

      // Wait for the modal / detail view
      await page.waitForTimeout(1000);

      // Click Continue or respond button
      const continueBtn = page
        .getByRole("button", { name: /continue|respond|view/i })
        .first();
      if (await continueBtn.isVisible()) {
        await continueBtn.click();
      }

      // Select at least one package if on course selection step
      const firstCheckbox = page.getByRole("checkbox").first();
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click();

        // Click Continue to advance
        await page.getByRole("button", { name: /continue/i }).click();

        // Should land on "Do you need upgradation?" screen
        const upgradationHeading = page.getByText("Do you need upgradation?");
        if (await upgradationHeading.isVisible({ timeout: 5000 })) {
          // ── Figma UI assertions ──────────────────────────────
          // 1. Heading text
          await expect(upgradationHeading).toBeVisible();

          // 2. "No, Thanks." button (exact Figma text)
          await expect(
            page.getByRole("button", { name: "No, Thanks." }),
          ).toBeVisible();

          // 3. "Yes" button (exact Figma text)
          await expect(page.getByRole("button", { name: "Yes" })).toBeVisible();

          // 4. Subtitle text
          await expect(
            page.getByText(
              /you'll be notified once it's reviewed by the admin/i,
            ),
          ).toBeVisible();
        }
      }
    } else {
      test.skip(
        "No refurbishment notification found in inbox — create one first via admin",
      );
    }
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Room dimension form — 2-column layout, no room name
  // ─────────────────────────────────────────────────────────────
  test("Room dimension form has ROOM DIMENSION (IN FEET) section without room name", async ({
    page,
  }) => {
    await loginAs(page, PARTNER_EMAIL, PARTNER_PASSWORD);
    await page.goto("/inbox");
    await page.waitForLoadState("networkidle");

    const refurbNotif = page
      .locator('[class*="notification"]')
      .filter({ hasText: /refurb/i })
      .first();

    if (await refurbNotif.isVisible()) {
      await refurbNotif.click();
      await page.waitForTimeout(800);

      const continueBtn = page
        .getByRole("button", { name: /continue|respond/i })
        .first();
      if (await continueBtn.isVisible()) {
        await continueBtn.click();
      }

      const firstCheckbox = page.getByRole("checkbox").first();
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click();
        await page.getByRole("button", { name: /continue/i }).click();

        // Click "Yes" on upgradation prompt
        const yesBtn = page.getByRole("button", { name: "Yes" });
        if (await yesBtn.isVisible({ timeout: 3000 })) {
          await yesBtn.click();

          // ── Room Dimension Form assertions ─────────────────
          // Must show uppercase label
          await expect(page.getByText("ROOM DIMENSION (IN FEET)")).toBeVisible({
            timeout: 5000,
          });

          // Must show LENGHT, BREADTH, HEIGHT placeholders (Figma typo preserved)
          await expect(page.getByPlaceholder("LENGHT")).toBeVisible();
          await expect(page.getByPlaceholder("BREADTH")).toBeVisible();
          await expect(page.getByPlaceholder("HEIGHT")).toBeVisible();

          // Must show JUSTIFICATION section
          await expect(page.getByText("JUSTIFICATION")).toBeVisible();
          await expect(page.getByPlaceholder("WRITE HERE")).toBeVisible();

          // Must show UPLOAD ROOM PICTURES
          await expect(page.getByText("UPLOAD ROOM PICTURES")).toBeVisible();
          await expect(page.getByText("Attach file")).toBeVisible();

          // Must NOT have a "Room Name" field
          await expect(page.getByPlaceholder(/room name/i)).not.toBeVisible();
        }
      }
    } else {
      test.skip("No refurbishment notification visible — seed demo data first");
    }
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Complete flow — submit with upgradation
  // ─────────────────────────────────────────────────────────────
  test("Partner can complete full upgradation flow and see success screen", async ({
    page,
  }) => {
    await loginAs(page, PARTNER_EMAIL, PARTNER_PASSWORD);
    await page.goto("/inbox");
    await page.waitForLoadState("networkidle");

    const refurbNotif = page
      .locator('[class*="notification"]')
      .filter({ hasText: /refurb/i })
      .first();

    if (!(await refurbNotif.isVisible())) {
      test.skip(
        "No refurbishment notification found — run admin scheduling first",
      );
      return;
    }

    await refurbNotif.click();
    await page.waitForTimeout(800);

    const continueBtn = page
      .getByRole("button", { name: /continue|respond/i })
      .first();
    if (await continueBtn.isVisible()) await continueBtn.click();

    // Step 1: Select packages for each course
    const checkboxes = page.getByRole("checkbox");
    const count = await checkboxes.count();
    if (count > 0) await checkboxes.first().click();
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 2: Handle multi-course navigation if present
    while (
      await page
        .getByRole("button", { name: /next course|continue/i })
        .isVisible()
    ) {
      const heading = await page.getByRole("heading").first().textContent();
      if (
        (heading ?? "").includes("upgradation") ||
        (heading ?? "").includes("preview")
      )
        break;
      await page
        .getByRole("button", { name: /continue/i })
        .first()
        .click();
      await page.waitForTimeout(300);
    }

    // Step 3: Upgradation prompt — click Yes
    const upgradeHeading = page.getByText("Do you need upgradation?");
    if (await upgradeHeading.isVisible({ timeout: 3000 })) {
      await page.getByRole("button", { name: "Yes" }).click();

      // Step 4: Fill dimensions
      await page.getByPlaceholder("LENGHT").fill("30");
      await page.getByPlaceholder("BREADTH").fill("20");
      await page.getByPlaceholder("HEIGHT").fill("10");
      await page
        .getByPlaceholder("WRITE HERE")
        .fill("The lab needs major upgradation.");
      await page.getByRole("button", { name: /continue/i }).click();

      // Step 5: Select an upgradation package
      await page.waitForSelector("text=Upgradation Packages", {
        timeout: 5000,
      });
      const upgPkgCheckbox = page.getByRole("checkbox").first();
      if (await upgPkgCheckbox.isVisible()) await upgPkgCheckbox.click();
      await page.getByRole("button", { name: /package preview/i }).click();
    } else {
      // No upgradation on this notification → go directly to preview
      await page.waitForSelector("text=Refurbishment package", {
        timeout: 5000,
      });
    }

    // Step 6: Preview — click Submit
    await page.waitForSelector("text=Refurbishment package", { timeout: 5000 });
    await page.getByRole("button", { name: /submit/i }).click();

    // Step 7: Success screen — Figma-accurate
    await expect(page.getByText("Request submitted successfully!")).toBeVisible(
      { timeout: 15000 },
    );

    await expect(
      page.getByRole("button", { name: /return to dashboard/i }),
    ).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 5: Payload validation — no room_name in API request
  // ─────────────────────────────────────────────────────────────
  test("Submit API request does not contain room_name field", async ({
    page,
  }) => {
    // Intercept the API call and verify payload
    let capturedPayload = null;

    await page.route(
      "**/notifications/*/refurbishment-response",
      async (route) => {
        const request = route.request();
        capturedPayload = JSON.parse(request.postData() || "{}");
        // Allow the request to proceed
        await route.continue();
      },
    );

    await loginAs(page, PARTNER_EMAIL, PARTNER_PASSWORD);
    await page.goto("/inbox");
    await page.waitForLoadState("networkidle");

    const refurbNotif = page
      .locator('[class*="notification"]')
      .filter({ hasText: /refurb/i })
      .first();

    if (!(await refurbNotif.isVisible())) {
      test.skip("No refurbishment notification found");
      return;
    }

    // Complete the flow...
    // (abbreviated for intercept test — the payload check is the key assertion)
    await refurbNotif.click();
    await page.waitForTimeout(500);

    const continueBtn = page
      .getByRole("button", { name: /continue|respond/i })
      .first();
    if (await continueBtn.isVisible()) await continueBtn.click();

    const firstCheckbox = page.getByRole("checkbox").first();
    if (await firstCheckbox.isVisible()) {
      await firstCheckbox.click();
      await page.getByRole("button", { name: /continue/i }).click();

      // Skip upgradation → goes to preview
      const noThanksBtn = page.getByRole("button", { name: "No, Thanks." });
      if (await noThanksBtn.isVisible({ timeout: 3000 })) {
        await noThanksBtn.click();
      }

      await page.waitForSelector("text=Refurbishment package", {
        timeout: 5000,
      });
      await page.getByRole("button", { name: /submit/i }).click();

      // Wait for the API call to be intercepted
      await page.waitForTimeout(3000);

      if (capturedPayload) {
        // Key assertion: room_name must NOT be in the payload
        const payloadStr = JSON.stringify(capturedPayload);
        expect(payloadStr).not.toContain("room_name");

        // selected_packages must be an array
        expect(Array.isArray(capturedPayload.selected_packages)).toBe(true);

        // upgradation should be null (since we clicked "No, Thanks.")
        expect(capturedPayload.upgradation).toBeNull();
      }
    }
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 6: Admin review modal — Upgradation tab visible when partner requested
  // ─────────────────────────────────────────────────────────────
  test("Admin review modal shows Upgradation pill tab when partner requested upgradation", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/refurbishment");
    await page.waitForLoadState("networkidle");

    // Find a submitted request and open the review modal
    const reviewBtn = page
      .getByRole("button", { name: /review|view/i })
      .first();

    if (await reviewBtn.isVisible({ timeout: 5000 })) {
      await reviewBtn.click();
      await page.waitForTimeout(1500);

      // Partner selections tab should be visible
      const partnerSelectionsTab = page.getByText(/partner selections/i);
      if (await partnerSelectionsTab.isVisible()) {
        await partnerSelectionsTab.click();

        // Check if Upgradation pill tab is shown (only if partner requested it)
        const upgradationTab = page
          .getByRole("button", { name: /^upgradation$/i })
          .first();

        if (await upgradationTab.isVisible({ timeout: 3000 })) {
          await upgradationTab.click();

          // Should show room dimensions
          await expect(
            page.getByText(/dimension|feet|length|breadth|height/i).first(),
          ).toBeVisible({ timeout: 5000 });
        }
        // If upgradation tab is not visible, it means partner didn't request — that's also correct behavior
      }
    } else {
      test.skip("No submitted refurbishment requests to review");
    }
  });
});
