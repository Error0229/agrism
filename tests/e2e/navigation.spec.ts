import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Authenticated Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("dashboard loads after login", async ({ page }) => {
    await page.goto("/");
    // Dashboard should show the app title or a dashboard element
    await expect(page.locator("text=花蓮蔬果種植指南")).toBeVisible();
  });

  test("fields page loads and shows header", async ({ page }) => {
    await page.goto("/fields");
    await expect(page.locator("text=田地管理")).toBeVisible();
  });

  test("crops page loads and shows header", async ({ page }) => {
    await page.goto("/crops");
    await expect(page.locator("text=作物資料庫")).toBeVisible();
  });

  test("calendar page loads and shows header", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.locator("text=種植行事曆")).toBeVisible();
  });

  test("harvest records page loads", async ({ page }) => {
    await page.goto("/records/harvest");
    await expect(page.locator("text=收成紀錄")).toBeVisible();
  });

  test("finance records page loads", async ({ page }) => {
    await page.goto("/records/finance");
    await expect(page.locator("text=收支紀錄")).toBeVisible();
  });

  test("soil records page loads", async ({ page }) => {
    await page.goto("/records/soil");
    await expect(page.locator("text=土壤管理")).toBeVisible();
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("text=設定")).toBeVisible();
  });

  test("sidebar navigation works", async ({ page }) => {
    await page.goto("/");

    // Click on fields in sidebar
    await page.click('a[href="/fields"]');
    await expect(page).toHaveURL("/fields");
    await expect(page.locator("text=田地管理")).toBeVisible();

    // Click on crops in sidebar
    await page.click('a[href="/crops"]');
    await expect(page).toHaveURL("/crops");
    await expect(page.locator("text=作物資料庫")).toBeVisible();
  });
});
