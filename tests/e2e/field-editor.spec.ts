import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Field Editor", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("fields list shows empty state or field cards", async ({ page }) => {
    await page.goto("/fields");

    // Either show the empty state or field cards
    const emptyState = page.locator("text=尚未建立田地");
    const fieldCards = page.locator('[href^="/fields/"]');

    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasCards = (await fieldCards.count()) > 0;

    expect(hasEmpty || hasCards).toBeTruthy();
  });

  test("create field dialog opens", async ({ page }) => {
    await page.goto("/fields");

    // Click the "新增田地" button
    await page.click("text=新增田地");

    // Dialog should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator("text=新增田地").nth(1)).toBeVisible();
  });

  test("field editor loads with toolbar when field exists", async ({
    page,
  }) => {
    await page.goto("/fields");

    // Check if there are any field cards
    const fieldCards = page.locator('[href^="/fields/"]');
    const count = await fieldCards.count();

    if (count > 0) {
      // Click the first field
      await fieldCards.first().click();

      // Editor should load with toolbar
      await expect(page.locator("text=返回田地列表").or(page.locator('a[href="/fields"]'))).toBeVisible({
        timeout: 10000,
      });
    }
  });
});
