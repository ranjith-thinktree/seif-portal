/**
 * Authentication Helper for Playwright Tests
 * Reusable login function and authentication utilities
 */

/**
 * Login to SEIF Portal
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} credentials - User credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.password - User password
 */
async function login(page, credentials = {}) {
  const email =
    credentials.email || process.env.TEST_USER_EMAIL || "demo.partner@seif.org";
  const password =
    credentials.password || process.env.TEST_USER_PASSWORD || "Password123";

  // Navigate to login page
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Fill login form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL("**/dashboard", { timeout: 10000 });

  console.log(`✅ Logged in as: ${email}`);
}

/**
 * Navigate to Data Overview Tab
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
async function navigateToDataOverview(page) {
  // Click Data menu
  await page.click("text=Data");
  await page.waitForTimeout(500);

  // Click Overview tab if exists
  const overviewTab = page.locator(
    'button:has-text("Overview"), a:has-text("Overview")',
  );
  if ((await overviewTab.count()) > 0) {
    await overviewTab.first().click();
    await page.waitForTimeout(1000);
  }

  // Wait for content to load
  await page.waitForSelector("text=Partner-wise Breakdown", { timeout: 10000 });
  await page.waitForTimeout(2000);

  console.log("✅ Navigated to Data Overview tab");
}

/**
 * Login and navigate to Data Overview (combined helper)
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} credentials - User credentials (optional)
 */
async function loginAndNavigateToOverview(page, credentials = {}) {
  await login(page, credentials);
  await navigateToDataOverview(page);
}

/**
 * Logout from SEIF Portal
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
async function logout(page) {
  // Click on user menu/profile
  const userMenu = page.locator(
    '[data-testid="user-menu"], .user-menu, button:has-text("Profile")',
  );

  if ((await userMenu.count()) > 0) {
    await userMenu.click();
    await page.waitForTimeout(300);

    // Click logout
    await page.click("text=Logout, text=Sign Out");
    await page.waitForURL("**/login", { timeout: 5000 });
  }

  console.log("✅ Logged out");
}

/**
 * Check if user is authenticated
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<boolean>} True if authenticated
 */
async function isAuthenticated(page) {
  try {
    // Check if on dashboard or protected page
    const url = page.url();
    return (
      url.includes("dashboard") ||
      url.includes("data") ||
      url.includes("partner")
    );
  } catch (error) {
    return false;
  }
}

module.exports = {
  login,
  navigateToDataOverview,
  loginAndNavigateToOverview,
  logout,
  isAuthenticated,
};
