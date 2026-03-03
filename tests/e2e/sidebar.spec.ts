import { test, expect } from "@playwright/test";

test.describe("Sidebar Navigation", () => {
  const sidebarLinks = [
    { name: "首頁", href: "/", heading: "花蓮蔬果種植指南" },
    { name: "田地規劃", href: "/fields", heading: "田地管理" },
    { name: "作物資料庫", href: "/crops", heading: "作物資料庫" },
    { name: "種植月曆", href: "/calendar", heading: "種植行事曆" },
    { name: "收成紀錄", href: "/records/harvest", heading: "收成紀錄" },
    { name: "財務管理", href: "/records/finance", heading: "財務管理" },
    { name: "土壤管理", href: "/records/soil", heading: "土壤管理" },
    { name: "天氣", href: "/weather", heading: "天氣" },
    { name: "AI 助手", href: "/ai", heading: "AI 助手" },
    { name: "設定", href: "/settings", heading: "設定" },
  ];

  for (const { name, href, heading } of sidebarLinks) {
    test(`clicking "${name}" navigates to ${href}`, async ({ page }) => {
      // Start at home page
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // If redirected to login, sidebar is not available
      if (page.url().includes("/auth/login")) return;

      // Find sidebar link using data-sidebar attribute and href
      const sidebarLink = page
        .locator(`[data-sidebar="sidebar"] a[href="${href}"]`)
        .first();

      // Scroll to and click the link
      await sidebarLink.scrollIntoViewIfNeeded();
      await expect(sidebarLink).toBeVisible({ timeout: 10000 });
      await sidebarLink.click();

      // Wait for URL to update (Next.js soft navigation)
      if (href !== "/") {
        await page.waitForURL(`**${href}`, { timeout: 15000 }).catch(() => {
          // May redirect to login
        });
      }

      await page.waitForLoadState("networkidle");

      // Verify we landed on the correct page
      if (page.url().includes("/auth/login")) {
        await expect(page.locator('input[type="email"]')).toBeVisible();
      } else {
        await expect(
          page.getByRole("heading", { name: heading }),
        ).toBeVisible({ timeout: 15000 });
      }
    });
  }

  test("sidebar logo link navigates to home", async ({ page }) => {
    await page.goto("/crops");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/auth/login")) return;

    // Click the logo/brand link in the sidebar header
    const logoLink = page
      .locator('[data-sidebar="sidebar"] a[aria-label="回到首頁"]')
      .first();
    await expect(logoLink).toBeVisible({ timeout: 10000 });
    await logoLink.click();

    await page.waitForLoadState("networkidle");

    if (!page.url().includes("/auth/login")) {
      await expect(
        page.getByRole("heading", { name: "花蓮蔬果種植指南" }),
      ).toBeVisible({ timeout: 15000 });
    }
  });
});
