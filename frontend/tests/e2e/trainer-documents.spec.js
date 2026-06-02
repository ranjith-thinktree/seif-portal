import { test, expect } from "@playwright/test";
import path from "path";

const ADMIN_EMAIL = "admin@seif.org";
const ADMIN_PASSWORDS = ["Password123", "Admin@123"];

async function login(page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  for (const password of ADMIN_PASSWORDS) {
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL("**/dashboard", { timeout: 10000 });
      return;
    } catch {
      if (!page.url().includes("login")) {
        return;
      }
    }
  }

  throw new Error("Unable to login with known admin credentials");
}

async function goToTrainersTab(page) {
  await page.goto("/organization-management");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: /trainers/i }).click();
  await expect(page.getByRole("button", { name: /add trainer/i })).toBeVisible({
    timeout: 15000,
  });
}

async function selectFirstSearchableOption(page, comboboxIndex) {
  await page.getByRole("combobox").nth(comboboxIndex).click();
  const firstOption = page.locator("[cmdk-item]").first();
  await expect(firstOption).toBeVisible({ timeout: 10000 });
  await firstOption.click();
}

test.describe("Trainer Documents E2E", () => {
  test("create trainer with partial docs, then complete docs via edit", async ({
    page,
  }) => {
    const unique = Date.now();
    const trainerName = `E2E Trainer ${unique}`;
    const trainerEmail = `e2e.trainer.${unique}@example.com`;
    const trainerMobile = `9${String(unique).slice(-9)}`;

    const resumePath = path.resolve(
      process.cwd(),
      "tests/fixtures/trainer-resume.pdf",
    );
    const qualificationPath = path.resolve(
      process.cwd(),
      "tests/fixtures/trainer-qualification.docx",
    );
    const idProofPath = path.resolve(
      process.cwd(),
      "tests/fixtures/trainer-idproof.jpg",
    );

    await login(page);
    await goToTrainersTab(page);

    await page.getByRole("button", { name: /add trainer/i }).click();
    await expect(page.getByText(/create new trainer/i)).toBeVisible({
      timeout: 10000,
    });

    await selectFirstSearchableOption(page, 0);
    await selectFirstSearchableOption(page, 1);

    await page.fill('input[name="trainer_name"]', trainerName);
    await page.fill('input[name="email"]', trainerEmail);
    await page.fill('input[name="mobile_no"]', trainerMobile);
    await page.fill('input[name="course_name"]', "Electrical Basics");
    await page.fill('input[name="qualification"]', "B.Tech");

    await page.locator('input#resume[type="file"]').setInputFiles(resumePath);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/trainers") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: /create trainer/i }).click();
    const createResponse = await createResponsePromise;
    const createStatus = createResponse.status();
    if (createStatus < 200 || createStatus >= 300) {
      const createBody = await createResponse.text();
      throw new Error(
        `Trainer create failed with status ${createStatus}. Body: ${createBody}`,
      );
    }

    await expect(page.getByText(/create new trainer/i)).not.toBeVisible({
      timeout: 15000,
    });

    await page
      .getByPlaceholder(/search by trainer name, email, mobile, course/i)
      .fill(trainerName);
    const trainerRow = page
      .locator("tbody tr", { hasText: trainerName })
      .first();
    await expect(trainerRow).toBeVisible({ timeout: 15000 });
    await expect(trainerRow.getByText(/partial/i)).toBeVisible({
      timeout: 10000,
    });

    await trainerRow.getByRole("button").first().click();
    await page.getByRole("menuitem", { name: /^edit$/i }).click();
    await expect(page.getByText(/edit trainer/i)).toBeVisible({
      timeout: 10000,
    });

    await page
      .locator('input#qualificationCertificate[type="file"]')
      .setInputFiles(qualificationPath);
    await page.locator('input#idProof[type="file"]').setInputFiles(idProofPath);

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/trainers/") &&
        response.request().method() === "PUT",
    );
    await page.getByRole("button", { name: /update trainer/i }).click();
    const updateResponse = await updateResponsePromise;
    const updateStatus = updateResponse.status();
    if (updateStatus < 200 || updateStatus >= 300) {
      const updateBody = await updateResponse.text();
      throw new Error(
        `Trainer update failed with status ${updateStatus}. Body: ${updateBody}`,
      );
    }

    await expect(page.getByText(/edit trainer/i)).not.toBeVisible({
      timeout: 15000,
    });

    await page
      .getByPlaceholder(/search by trainer name, email, mobile, course/i)
      .fill(trainerName);
    const updatedRow = page
      .locator("tbody tr", { hasText: trainerName })
      .first();
    await expect(updatedRow).toBeVisible({ timeout: 15000 });
    await expect(updatedRow.getByText(/complete/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
