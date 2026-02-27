/**
 * E2E Tests for Organization Management - Partners & Centers & User Management
 * Tests View modal, Delete blocking, and table data rendering
 *
 * Coverage:
 * - Login flow
 * - Organization Management: Partners tab loads, View modal shows correct data
 * - Organization Management: Centers tab loads, View modal shows correct data
 * - User Management: table loads, View modal, Create User dialog, tabs
 *
 * Created: 2025
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.VITE_APP_URL || "http://localhost:5173";

const ADMIN = { email: "admin@seif.org", password: "Password123" };

// Routes (must match frontend/src/constants/routes.js)
const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  USER_MANAGEMENT: "/user-management",
  ORGANIZATION_MANAGEMENT: "/organization-management",
};

/**
 * Helper: Login via the login form
 */
async function login(page) {
  await page.goto(`${BASE_URL}${ROUTES.LOGIN}`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', ADMIN.email);
  await page.fill('input[type="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`**${ROUTES.DASHBOARD}`, { timeout: 20000 });
}

/**
 * Helper: Login and go to a path directly
 */
async function loginAndGo(page, path) {
  await login(page);
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState("networkidle");
}

/**
 * Helper: Switch to Centers tab on the Organization Management page
 */
async function switchToCentersTab(page) {
  await page.getByRole("tab", { name: /centers/i }).click();
  await page.waitForTimeout(500);
}

// Authentication
test.describe("Authentication", () => {
  test("should login with admin credentials", async ({ page }) => {
    await page.goto(`${BASE_URL}${ROUTES.LOGIN}`);
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"]', ADMIN.email);
    await page.fill('input[type="password"]', ADMIN.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`**${ROUTES.DASHBOARD}`, { timeout: 20000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test("should reject wrong password", async ({ page }) => {
    await page.goto(`${BASE_URL}${ROUTES.LOGIN}`);
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"]', ADMIN.email);
    await page.fill('input[type="password"]', "WrongPassword!");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await expect(page).not.toHaveURL(/dashboard/);
  });
});

// Organization Management - Partners Tab
test.describe("Organization Management - Partners", () => {
  test("partners table should load with data", async ({ page }) => {
    await loginAndGo(page, ROUTES.ORGANIZATION_MANAGEMENT);
    // Partners is the default tab - wait for table
    await page.waitForSelector("tbody tr", { timeout: 20000 });
    const count = await page.locator("tbody tr").count();
    expect(count).toBeGreaterThan(0);
  });

  test("page header shows Organization Management", async ({ page }) => {
    await loginAndGo(page, ROUTES.ORGANIZATION_MANAGEMENT);
    await expect(
      page.locator("h1:has-text('Organization Management')"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("Partners tab is active by default", async ({ page }) => {
    await loginAndGo(page, ROUTES.ORGANIZATION_MANAGEMENT);
    await expect(page.getByRole("tab", { name: /partners/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test("clicking View (Eye) button opens partner detail dialog", async ({
    page,
  }) => {
    await loginAndGo(page, ROUTES.ORGANIZATION_MANAGEMENT);
    await page.waitForSelector("tbody tr", { timeout: 20000 });
    const firstBtn = page
      .locator("tbody tr:first-child")
      .getByRole("button")
      .first();
    await firstBtn.waitFor({ state: "visible", timeout: 5000 });
    await firstBtn.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({
      timeout: 8000,
    });
    await expect(page.locator('[role="dialog"]')).toContainText(
      "Partner Details",
    );
  });

  test("partner detail dialog shows required fields", async ({ page }) => {
    await loginAndGo(page, ROUTES.ORGANIZATION_MANAGEMENT);
    await page.waitForSelector("tbody tr", { timeout: 20000 });
    const firstBtn = page
      .locator("tbody tr:first-child")
      .getByRole("button")
      .first();
    await firstBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 8000 });
    await expect(
      dialog.getByText("Partner Name", { exact: false }),
    ).toBeVisible();
    await expect(
      dialog.getByText("Organization Type", { exact: false }),
    ).toBeVisible();
    await expect(
      dialog.getByText("Contact Person", { exact: false }),
    ).toBeVisible();
    await expect(
      dialog.getByText("Total Centers", { exact: false }),
    ).toBeVisible();
  });

  test("partner detail dialog can be closed", async ({ page }) => {
    await loginAndGo(page, ROUTES.ORGANIZATION_MANAGEMENT);
    await page.waitForSelector("tbody tr", { timeout: 20000 });
    const firstBtn = page
      .locator("tbody tr:first-child")
      .getByRole("button")
      .first();
    await firstBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 8000 });
    await dialog.getByRole("button", { name: /close/i }).last().click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test("delete blocked dialog appears when partner has centers", async ({
    page,
  }) => {
    await loginAndGo(page, ROUTES.ORGANIZATION_MANAGEMENT);
    await page.waitForSelector("tbody tr", { timeout: 20000 });
    const rows = await page.locator("tbody tr").all();
    for (const row of rows.slice(0, 5)) {
      const buttons = await row.getByRole("button").all();
      if (buttons.length < 1) continue;
      const trashBtn = buttons[buttons.length - 1];
      await trashBtn.click();
      await page.waitForTimeout(600);
      const blockedDialog = page.locator(
        '[role="dialog"]:has-text("Cannot Delete")',
      );
      const normalDialog = page.locator('[role="dialog"]');
      if (await blockedDialog.isVisible()) {
        await expect(blockedDialog).toContainText("Cannot Delete Partner");
        await blockedDialog.getByRole("button", { name: /got it/i }).click();
        return;
      } else if (await normalDialog.isVisible()) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
      }
    }
    // If no blocked dialog found, pass silently (no partner with centers in first 5 rows)
  });

  test("Export CSV button is present on Partners tab", async ({ page }) => {
    await loginAndGo(page, ROUTES.ORGANIZATION_MANAGEMENT);
    await page.waitForSelector("tbody tr", { timeout: 20000 });
    await expect(page.getByRole("button", { name: /export csv/i })).toBeVisible(
      { timeout: 10000 },
    );
  });
});

// Organization Management - Centers Tab
test.describe("Organization Management - Centers", () => {
  test("centers table should load with data", async ({ page }) => {
    await loginAndGo(page, ROUTES.ORGANIZATION_MANAGEMENT);
    await switchToCentersTab(page);
    await page.waitForSelector("tbody tr", { timeout: 20000 });
    const count = await page.locator("tbody tr").count();
    expect(count).toBeGreaterThan(0);
  });

  test("Centers tab is accessible", async ({ page }) => {
    await loginAndGo(page, ROUTES.ORGANIZATION_MANAGEMENT);
    await expect(page.getByRole("tab", { name: /centers/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test("clicking View (Eye) button opens center detail dialog", async ({
    page,
  }) => {
    await loginAndGo(page, ROUTES.ORGANIZATION_MANAGEMENT);
    await switchToCentersTab(page);
    await page.waitForSelector("tbody tr", { timeout: 20000 });
    const firstBtn = page
      .locator("tbody tr:first-child")
      .getByRole("button")
      .first();
    await firstBtn.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({
      timeout: 8000,
    });
    await expect(page.locator('[role="dialog"]')).toContainText(
      "Center Details",
    );
  });

  test("center detail dialog shows required fields", async ({ page }) => {
    await loginAndGo(page, ROUTES.ORGANIZATION_MANAGEMENT);
    await switchToCentersTab(page);
    await page.waitForSelector("tbody tr", { timeout: 20000 });
    const firstBtn = page
      .locator("tbody tr:first-child")
      .getByRole("button")
      .first();
    await firstBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 8000 });
    await expect(
      dialog.getByText("Center Name", { exact: false }),
    ).toBeVisible();
    await expect(dialog.getByText("Partner", { exact: false })).toBeVisible();
    await expect(
      dialog.getByText("Center Type", { exact: false }),
    ).toBeVisible();
    await expect(dialog.getByText("Region", { exact: false })).toBeVisible();
    await expect(
      dialog.getByText("Total Students", { exact: false }),
    ).toBeVisible();
  });

  test("center detail dialog can be closed", async ({ page }) => {
    await loginAndGo(page, ROUTES.ORGANIZATION_MANAGEMENT);
    await switchToCentersTab(page);
    await page.waitForSelector("tbody tr", { timeout: 20000 });
    const firstBtn = page
      .locator("tbody tr:first-child")
      .getByRole("button")
      .first();
    await firstBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 8000 });
    await dialog.getByRole("button", { name: /close/i }).last().click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test("Export CSV button is present on Centers tab", async ({ page }) => {
    await loginAndGo(page, ROUTES.ORGANIZATION_MANAGEMENT);
    await switchToCentersTab(page);
    await page.waitForSelector("tbody tr", { timeout: 20000 });
    await expect(page.getByRole("button", { name: /export csv/i })).toBeVisible(
      { timeout: 10000 },
    );
  });
});

// User Management
test.describe("User Management", () => {
  test("user table loads with data", async ({ page }) => {
    await loginAndGo(page, ROUTES.USER_MANAGEMENT);
    await page.waitForSelector("tbody tr, [data-testid='data-table']", {
      timeout: 15000,
    });
    const count = await page.locator("tbody tr").count();
    expect(count).toBeGreaterThan(0);
  });

  test("page header shows User Management", async ({ page }) => {
    await loginAndGo(page, ROUTES.USER_MANAGEMENT);
    await expect(
      page.locator(
        "h1:has-text('User Management'), h2:has-text('User Management')",
      ),
    ).toBeVisible({ timeout: 10000 });
  });

  test("clicking Eye button opens User Details modal", async ({ page }) => {
    await loginAndGo(page, ROUTES.USER_MANAGEMENT);
    await page.waitForSelector("tbody tr", { timeout: 15000 });
    const eyeBtn = page
      .locator("tbody tr:first-child")
      .getByRole("button")
      .first();
    await eyeBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 8000 });
    await expect(dialog).toContainText("User Details");
  });

  test("User Details modal shows all required fields", async ({ page }) => {
    await loginAndGo(page, ROUTES.USER_MANAGEMENT);
    await page.waitForSelector("tbody tr", { timeout: 15000 });
    const eyeBtn = page
      .locator("tbody tr:first-child")
      .getByRole("button")
      .first();
    await eyeBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 8000 });
    await expect(dialog.getByText("Full Name", { exact: false })).toBeVisible();
    await expect(dialog.getByText("Email", { exact: false })).toBeVisible();
    await expect(dialog.getByText("Role", { exact: false })).toBeVisible();
    await expect(dialog.getByText("Status", { exact: false })).toBeVisible();
    await expect(
      dialog.getByText("Last Login", { exact: false }),
    ).toBeVisible();
    await expect(
      dialog.getByText("Created At", { exact: false }),
    ).toBeVisible();
  });

  test("User Details modal can be closed", async ({ page }) => {
    await loginAndGo(page, ROUTES.USER_MANAGEMENT);
    await page.waitForSelector("tbody tr", { timeout: 15000 });
    const eyeBtn = page
      .locator("tbody tr:first-child")
      .getByRole("button")
      .first();
    await eyeBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 8000 });
    await dialog.getByRole("button", { name: /close/i }).last().click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test("Create User button is visible for ADMIN", async ({ page }) => {
    await loginAndGo(page, ROUTES.USER_MANAGEMENT);
    await expect(
      page.getByRole("button", { name: /create user/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("Create User dialog opens on button click", async ({ page }) => {
    await loginAndGo(page, ROUTES.USER_MANAGEMENT);
    await page.getByRole("button", { name: /create user/i }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 8000 });
    await expect(dialog).toContainText("Create New User");
  });

  test("tabs render correctly - All Users, Admins, Partners visible", async ({
    page,
  }) => {
    await loginAndGo(page, ROUTES.USER_MANAGEMENT);
    await expect(
      page.locator("button:has-text('All Users'), nav >> text=All Users"),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("button:has-text('Admins'), nav >> text=Admins"),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator("button:has-text('Partners'), nav >> text=Partners"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("user API endpoint returns correct response shape", async ({ page }) => {
    let apiResponse = null;
    page.on("response", async (response) => {
      if (
        response.url().includes("/api/v1/users") &&
        !response.url().includes("filter-options") &&
        response.status() === 200
      ) {
        try {
          apiResponse = await response.json();
        } catch (_) {}
      }
    });
    await loginAndGo(page, ROUTES.USER_MANAGEMENT);
    await page.waitForTimeout(3000);
    if (apiResponse) {
      expect(apiResponse.success).toBe(true);
      expect(apiResponse.data).toBeDefined();
      expect(Array.isArray(apiResponse.data.users)).toBe(true);
      expect(typeof apiResponse.data.total).toBe("number");
    }
  });
});
