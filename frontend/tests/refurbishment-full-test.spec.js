import { test, expect } from "@playwright/test";

test.describe("Refurbishment Dashboard - Full E2E Test", () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("1. Login with admin credentials", async () => {
    await page.goto("http://localhost:5173/login");

    // Wait for login form
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Fill login form
    await page.fill('input[type="email"]', "admin@seif.org");
    await page.fill('input[type="password"]', "Password123");

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await page.waitForTimeout(2000);

    // Check if redirected to dashboard or home
    const currentUrl = page.url();
    console.log("After login URL:", currentUrl);

    // Verify token exists in localStorage
    const token = await page.evaluate(() => localStorage.getItem("token"));
    const user = await page.evaluate(() => localStorage.getItem("user"));

    console.log("Token exists:", !!token);
    console.log("User:", user);

    expect(token).toBeTruthy();
    expect(user).toBeTruthy();

    const userData = JSON.parse(user);
    expect(userData.role).toMatch(/ADMIN|SUPER_ADMIN/);
  });

  test("2. Navigate to Refurbishment Dashboard", async () => {
    await page.goto("http://localhost:5173/admin/refurbishment");

    // Wait for page load
    await page.waitForTimeout(3000);

    // Check page title
    const title = await page.textContent("h1, h2");
    console.log("Page title:", title);

    // Take screenshot
    await page.screenshot({
      path: "refurbishment-dashboard.png",
      fullPage: true,
    });
  });

  test("3. Check API calls in Network", async () => {
    // Listen to all network requests
    const requests = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/v1/admin/refurbishment")) {
        requests.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method(),
        });
      }
    });

    // Navigate to dashboard
    await page.goto("http://localhost:5173/admin/refurbishment");
    await page.waitForTimeout(3000);

    console.log("API Requests captured:", requests);

    // Check if API calls were made
    expect(requests.length).toBeGreaterThan(0);

    // Check if any returned 200
    const successCalls = requests.filter((r) => r.status === 200);
    console.log("Successful API calls:", successCalls.length);

    // Check if any returned 401
    const authErrors = requests.filter((r) => r.status === 401);
    console.log("Auth errors (401):", authErrors.length);

    if (authErrors.length > 0) {
      console.error("Authentication errors detected!");
    }
  });

  test("4. Check Cards Display Data", async () => {
    await page.goto("http://localhost:5173/admin/refurbishment");
    await page.waitForTimeout(3000);

    // Find cards
    const cards = await page.$$('[class*="card"]');
    console.log("Cards found:", cards.length);

    // Check for "Eligible Centers" text
    const pageContent = await page.content();
    const hasEligibleCenters = pageContent.includes("Eligible Centers");
    const hasAllCenters = pageContent.includes("All Centers");

    console.log('Has "Eligible Centers":', hasEligibleCenters);
    console.log('Has "All Centers":', hasAllCenters);

    // Try to find numbers in cards
    const numbers = await page.$$eval('[class*="text-"]', (elements) =>
      elements
        .map((el) => el.textContent)
        .filter((text) => /^\d+$/.test(text.trim())),
    );
    console.log("Numbers found in page:", numbers);
  });

  test("5. Check Console Errors", async () => {
    const consoleErrors = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("http://localhost:5173/admin/refurbishment");
    await page.waitForTimeout(3000);

    console.log("Console errors:", consoleErrors);

    if (consoleErrors.length > 0) {
      console.error("Found console errors:", consoleErrors);
    }
  });

  test("6. Test Backend API Directly", async () => {
    // Get token from page
    const token = await page.evaluate(() => localStorage.getItem("token"));

    // Test API call directly
    const response = await page.evaluate(async (authToken) => {
      try {
        const res = await fetch(
          "http://localhost:5000/api/v1/admin/refurbishment/all-centers?limit=10",
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        const data = await res.json();
        return {
          status: res.status,
          data: data,
        };
      } catch (error) {
        return {
          error: error.message,
        };
      }
    }, token);

    console.log("Direct API call result:", JSON.stringify(response, null, 2));

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });
});
