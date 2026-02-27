/**
 * Authentication Helpers for Playwright Tests
 * Senior Full-Stack Developer Test Utilities
 */

export async function loginAsAdmin(page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', "admin@seif.org");
  await page.fill('input[name="password"]', "Admin@123");
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 10000 });
}

export async function loginAsPartner(
  page,
  email = "partner@example.com",
  password = "Partner@123",
) {
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 10000 });
}

export async function logout(page) {
  await page.click('button:has-text("Logout")');
  await page.waitForURL("/login");
}

export async function isLoggedIn(page) {
  try {
    await page.waitForSelector("text=Dashboard", { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}
