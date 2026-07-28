/**
 * E2E: Certification Files page — UI + real ZIP/Excel downloads
 */
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";

const ADMIN = {
  email: "admin@seif.org",
  password: "Password123",
};

async function loginAsAdmin(page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', ADMIN.email);
  await page.fill('input[name="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|home|admin/i, { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
}

function listZipEntryNames(filePath) {
  const escaped = filePath.replace(/'/g, "''");
  const ps = `
    Add-Type -AssemblyName System.IO.Compression.FileSystem;
    $z = [System.IO.Compression.ZipFile]::OpenRead('${escaped}');
    $z.Entries | ForEach-Object { $_.FullName };
    $z.Dispose();
  `;
  const out = execFileSync("powershell", ["-NoProfile", "-Command", ps], {
    encoding: "utf8",
  });
  return out
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function gotoFilesPage(page) {
  await page.goto("/certification/files");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: /Certification Files/i })).toBeVisible({
    timeout: 15000,
  });
}

test.describe("Certification Files page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await gotoFilesPage(page);
  });

  test("By month / List toggle shows active background", async ({ page }) => {
    const byMonth = page.getByRole("button", { name: /By month/i });
    const list = page.getByRole("button", { name: /^List$/i });

    await expect(byMonth).toHaveAttribute("aria-pressed", "true");
    await expect(byMonth).toHaveClass(/bg-\[#009530\]/);

    await list.click();
    await expect(list).toHaveAttribute("aria-pressed", "true");
    await expect(list).toHaveClass(/bg-\[#009530\]/);
  });

  test("Select all and Expand/Collapse sit with search toolbar", async ({ page }) => {
    await expect(page.getByPlaceholder(/Search partner/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Filters/i })).toBeVisible();
    await expect(page.getByText(/Select all/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Collapse|Expand/i }).first()).toBeVisible();
  });

  test("Apply/Reset button switches after applying trainee filter draft", async ({ page }) => {
    await page.getByRole("button", { name: /Filters/i }).click();
    await page.getByRole("button", { name: /Trainee results/i }).click();
    await page.getByText(/^Passed$/i).last().click();

    const actionBtn = page.getByRole("button", { name: /^(Apply|Reset)$/i }).first();
    await expect(actionBtn).toBeEnabled({ timeout: 5000 });
    await actionBtn.click();
    await expect(page.getByRole("button", { name: /^Reset$/i }).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("certificates-only selection downloads a non-empty ZIP", async ({ page }) => {
    const certBox = page.locator('[aria-label^="Select "][aria-label*=".pdf"]').first();
    const altCert = page.locator('[aria-label^="Select "]').filter({ hasNotText: /xlsx|csv|Result/i }).first();
    const target = (await certBox.count()) > 0 ? certBox : altCert;
    test.skip((await target.count()) === 0, "No certificate-like files to select");

    // Clear any prior selection by reloading page state
    await target.click();
    await expect(page.getByText(/Export selected files/i)).toBeVisible();

    const zipBtn = page.getByRole("button", { name: /Download ZIP/i });
    await expect(zipBtn).toBeEnabled();

    const excelBtn = page.getByRole("button", { name: /Download Excel/i });
    // May be disabled if no sheets selected
    const excelEnabled = await excelBtn.isEnabled();

    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
    await zipBtn.click();
    const download = await downloadPromise;
    const suggested = download.suggestedFilename();
    expect(suggested.toLowerCase()).toMatch(/\.zip$/);

    const tmp = path.join(os.tmpdir(), `pw-cert-${Date.now()}.zip`);
    await download.saveAs(tmp);
    const size = fs.statSync(tmp).size;
    expect(size).toBeGreaterThan(100);

    const entries = listZipEntryNames(tmp);
    expect(entries.length).toBeGreaterThan(0);
    fs.unlinkSync(tmp);

    if (!excelEnabled) {
      await expect(excelBtn).toBeDisabled();
    }
  });

  test("result-sheet selection downloads merged Excel", async ({ page }) => {
    const sheetBox = page
      .locator('[aria-label^="Select "]')
      .filter({ hasText: /xlsx|csv|Result|Summary|Annex/i })
      .first();
    // aria-label is on checkbox; use attribute filter
    const sheetByLabel = page.locator(
      '[aria-label^="Select "][aria-label*=".xlsx"], [aria-label^="Select "][aria-label*=".csv"], [aria-label^="Select "][aria-label*="Result"], [aria-label^="Select "][aria-label*="Annex"]',
    ).first();

    const target = (await sheetByLabel.count()) > 0 ? sheetByLabel : sheetBox;
    test.skip((await target.count()) === 0, "No result sheet files to select");

    await target.click();
    await expect(page.getByText(/Export selected files/i)).toBeVisible();

    const excelBtn = page.getByRole("button", { name: /Download Excel/i });
    await expect(excelBtn).toBeEnabled({ timeout: 5000 });

    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
    await excelBtn.click();
    const download = await downloadPromise;
    const suggested = download.suggestedFilename();
    expect(suggested.toLowerCase()).toMatch(/\.xlsx$/);

    const tmp = path.join(os.tmpdir(), `pw-cert-${Date.now()}.xlsx`);
    await download.saveAs(tmp);
    const size = fs.statSync(tmp).size;
    expect(size).toBeGreaterThan(500);
    // XLSX zip signature PK
    const magic = fs.readFileSync(tmp).subarray(0, 2).toString("binary");
    expect(magic).toBe("PK");
    fs.unlinkSync(tmp);
  });

  test("select all downloads ZIP and Excel when both types exist", async ({ page }) => {
    const selectAll = page.locator("label").filter({ hasText: /Select all/i }).first();
    await expect(selectAll).toBeVisible();
    await selectAll.click();

    await expect(page.getByText(/Export selected files/i)).toBeVisible({ timeout: 10000 });

    const zipBtn = page.getByRole("button", { name: /Download ZIP/i });
    const excelBtn = page.getByRole("button", { name: /Download Excel/i });

    if (await zipBtn.isEnabled()) {
      const zipDownload = page.waitForEvent("download", { timeout: 30000 });
      await zipBtn.click();
      const dl = await zipDownload;
      expect(dl.suggestedFilename().toLowerCase()).toMatch(/\.zip$/);
      const tmp = path.join(os.tmpdir(), `pw-all-${Date.now()}.zip`);
      await dl.saveAs(tmp);
      expect(fs.statSync(tmp).size).toBeGreaterThan(100);
      expect(listZipEntryNames(tmp).length).toBeGreaterThan(0);
      fs.unlinkSync(tmp);
    }

    if (await excelBtn.isEnabled()) {
      const excelDownload = page.waitForEvent("download", { timeout: 30000 });
      await excelBtn.click();
      const dl = await excelDownload;
      expect(dl.suggestedFilename().toLowerCase()).toMatch(/\.xlsx$/);
      const tmp = path.join(os.tmpdir(), `pw-all-${Date.now()}.xlsx`);
      await dl.saveAs(tmp);
      expect(fs.statSync(tmp).size).toBeGreaterThan(500);
      fs.unlinkSync(tmp);
    }
  });
});
