import { test, expect } from "@playwright/test";

test.describe("Page Rendering", () => {
  const pages = [
    { path: "/", heading: "花蓮蔬果種植指南" },
    { path: "/fields", heading: "田地管理" },
    { path: "/crops", heading: "作物資料庫" },
    { path: "/calendar", heading: "種植行事曆" },
    { path: "/records/harvest", heading: "收成紀錄" },
    { path: "/records/finance", heading: "財務管理" },
    { path: "/records/soil", heading: "土壤管理" },
    { path: "/ai", heading: "AI 助手" },
    { path: "/weather", heading: "天氣" },
    { path: "/settings", heading: "設定" },
  ];

  for (const { path, heading } of pages) {
    test(`${path} responds without error`, async ({ page }) => {
      const response = await page.goto(path);
      // Page should return 200 (either the page or login redirect followed by login page)
      expect(response?.status()).toBe(200);

      // After load, we're either on the actual page or login
      await page.waitForLoadState("networkidle");
      const url = page.url();

      if (url.includes("/auth/login")) {
        // Auth redirect working — verify login form is present
        await expect(page.locator('input[type="email"]')).toBeVisible();
      } else {
        // Page loaded — verify heading renders
        await expect(
          page.getByRole("heading", { name: heading }),
        ).toBeVisible({ timeout: 15000 });
      }
    });
  }

  test("404 page renders for unknown routes", async ({ page }) => {
    const response = await page.goto("/this-does-not-exist");
    await page.waitForLoadState("networkidle");
    const url = page.url();

    if (url.includes("/auth/login")) {
      // Auth redirect — login page shown
      await expect(page.locator('input[type="email"]')).toBeVisible();
    } else {
      // 404 page should show "找不到此頁面" text
      await expect(page.getByText("404")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("找不到此頁面")).toBeVisible();
    }
  });
});
