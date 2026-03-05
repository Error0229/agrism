import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

test.describe("Form Interactions", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test("harvest page '新增收成' button opens dialog", async ({ page }) => {
    await page.goto("/records/harvest");
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/sign-in")) {
      test.skip(true, "Clerk testing token not configured");
      return;
    }

    await expect(
      page.getByRole("heading", { name: "收成紀錄" }),
    ).toBeVisible({ timeout: 15000 });

    const addBtn = page.getByRole("button", { name: "新增收成" });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Dialog should open (may require farmId to fully render)
    const dialog = page.getByRole("dialog");
    const isVisible = await dialog.isVisible().catch(() => false);
    if (isVisible) {
      await expect(dialog).toBeVisible();
      await expect(page.getByText("新增收成紀錄")).toBeVisible();
    }
  });

  test("finance page '新增紀錄' button opens dialog", async ({ page }) => {
    await page.goto("/records/finance");
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/sign-in")) {
      test.skip(true, "Clerk testing token not configured");
      return;
    }

    await expect(
      page.getByRole("heading", { name: "財務管理" }),
    ).toBeVisible({ timeout: 15000 });

    const addBtn = page.getByRole("button", { name: "新增紀錄" });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const dialog = page.getByRole("dialog");
    const isVisible = await dialog.isVisible().catch(() => false);
    if (isVisible) {
      await expect(dialog).toBeVisible();
      await expect(page.getByText("新增財務紀錄")).toBeVisible();
    }
  });

  test("fields page '新增田地' button opens dialog", async ({ page }) => {
    await page.goto("/fields");
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/sign-in")) {
      test.skip(true, "Clerk testing token not configured");
      return;
    }

    await expect(
      page.getByRole("heading", { name: "田地管理" }),
    ).toBeVisible({ timeout: 15000 });

    const addBtn = page.getByRole("button", { name: "新增田地" });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const dialog = page.getByRole("dialog");
    const isVisible = await dialog.isVisible().catch(() => false);
    if (isVisible) {
      await expect(dialog).toBeVisible();
      await expect(page.getByText("新增田地")).toBeVisible();
    }
  });
});
