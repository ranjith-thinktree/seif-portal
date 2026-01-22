import { test, expect } from "@playwright/test";

test.describe("SEIF Portal - Authentication & Analytics Flow", () => {
  const BASE_URL = "http://localhost:5173";
  const API_URL = "http://localhost:5000/api/v1";

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(BASE_URL);
  });

  test("should login successfully and see analytics with centers", async ({
    page,
  }) => {
    // Step 1: Login
    await page.fill('input[type="email"]', "demo.partner@seif.org");
    await page.fill('input[type="password"]', "Password123");
    await page.click('button[type="submit"]');

    // Wait for successful login
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Step 2: Wait for authentication to complete
    await page.waitForFunction(
      () => {
        const token =
          localStorage.getItem("accessToken") ||
          localStorage.getItem("seif_access_token");
        return token !== null && token.length > 0;
      },
      { timeout: 5000 },
    );

    // Step 3: Navigate to Data Management page
    await page.click("text=Data Management");
    await expect(page).toHaveURL(/\/data/);

    // Step 4: Wait for API calls to complete
    await page.waitForResponse(
      (response) =>
        response.url().includes("/analytics/filter-options") &&
        response.status() === 200,
      { timeout: 10000 },
    );

    // Step 5: Verify centers loaded
    const centerCount = await page.evaluate(() => {
      // Check if filter options have centers
      const selectElements = document.querySelectorAll('select[name="center"]');
      return selectElements.length > 0
        ? selectElements[0].options.length - 1
        : 0; // -1 for "All Centers" option
    });

    console.log(`✅ Found ${centerCount} centers in filter dropdown`);
    expect(centerCount).toBeGreaterThan(0);

    // Step 6: Check console for DEBUG message
    const consoleLogs = [];
    page.on("console", (msg) => {
      if (msg.text().includes("DEBUG: Database has")) {
        consoleLogs.push(msg.text());
      }
    });

    // Trigger a filter change to see DEBUG message
    await page.selectOption('select[name="financialYear"]', "2024");
    await page.waitForTimeout(2000); // Wait for analytics fetch

    // Verify no "0 centers" error
    const hasZeroCenters = consoleLogs.some((log) =>
      log.includes("Database has 0 centers"),
    );
    expect(hasZeroCenters).toBe(false);
  });

  test("should verify filter-options API returns data", async ({
    page,
    request,
  }) => {
    // Step 1: Login
    await page.fill('input[type="email"]', "demo.partner@seif.org");
    await page.fill('input[type="password"]', "Password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Step 2: Get token from localStorage
    const token = await page.evaluate(() => {
      return (
        localStorage.getItem("accessToken") ||
        localStorage.getItem("seif_access_token")
      );
    });

    expect(token).toBeTruthy();
    console.log(`✅ Token retrieved: ${token.substring(0, 20)}...`);

    // Step 3: Test API directly
    const response = await request.get(`${API_URL}/analytics/filter-options`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    console.log(`✅ API Response:`, data);
    expect(data.success).toBe(true);
    expect(data.data.centers).toBeDefined();
    expect(data.data.centers.length).toBeGreaterThan(0);

    console.log(`✅ API returned ${data.data.centers.length} centers`);
  });

  test("should handle authentication timing correctly", async ({ page }) => {
    // Monitor network requests
    const apiCalls = [];

    page.on("request", (request) => {
      if (request.url().includes("/api/v1/")) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          timestamp: new Date().toISOString(),
        });
      }
    });

    page.on("response", (response) => {
      if (response.url().includes("/api/v1/")) {
        console.log(
          `📡 API Response: ${response.url()} - Status: ${response.status()}`,
        );
      }
    });

    // Login
    await page.fill('input[type="email"]', "demo.partner@seif.org");
    await page.fill('input[type="password"]', "Password123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    // Navigate to analytics
    await page.click("text=Data Management");
    await page.waitForTimeout(3000); // Wait for API calls

    // Check which API calls failed
    console.log("\n📊 API Call Timeline:");
    apiCalls.forEach((call, index) => {
      console.log(`${index + 1}. ${call.method} ${call.url}`);
      console.log(`   Time: ${call.timestamp}`);
      console.log(`   Has Auth: ${!!call.headers.authorization}`);
    });

    // Verify filter-options was called with auth header
    const filterOptionsCall = apiCalls.find((call) =>
      call.url.includes("/analytics/filter-options"),
    );
    expect(filterOptionsCall).toBeDefined();
    expect(filterOptionsCall.headers.authorization).toMatch(/Bearer .+/);
  });

  test("should show error message if API fails", async ({ page }) => {
    // Intercept and block filter-options API
    await page.route("**/api/v1/analytics/filter-options", (route) => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({
          success: false,
          message: "You are not authorized to access this resource",
        }),
      });
    });

    // Login
    await page.fill('input[type="email"]', "demo.partner@seif.org");
    await page.fill('input[type="password"]', "Password123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    // Navigate to analytics
    await page.click("text=Data Management");
    await page.waitForTimeout(2000);

    // Should show error message
    await expect(
      page.locator("text=/Failed to load filter options/"),
    ).toBeVisible({ timeout: 5000 });
  });
});

// Export configuration
export default {
  testDir: "./tests",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
};
