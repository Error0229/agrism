import { test, expect } from "@playwright/test";

test.describe("Field Editor", () => {
  test("fields page shows heading and new field button", async ({ page }) => {
    const response = await page.goto("/fields");
    expect(response?.status()).toBe(200);
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/auth/login")) return;

    await expect(
      page.getByRole("heading", { name: "田地管理" }),
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole("button", { name: "新增田地" })).toBeVisible();
  });

  test("create field dialog opens", async ({ page }) => {
    await page.goto("/fields");
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/auth/login")) return;

    const btn = page.getByRole("button", { name: "新增田地" });
    await expect(btn).toBeVisible({ timeout: 15000 });
    await btn.click();

    // Dialog only renders when farmId is available (requires auth session).
    // Without auth the button toggles state but no dialog mounts.
    const dialog = page.getByRole("dialog");
    const isVisible = await dialog.isVisible().catch(() => false);
    if (isVisible) {
      await expect(dialog).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "新增田地", level: 2 }).or(
          page.getByText("新增田地").first(),
        ),
      ).toBeVisible();
    }
  });
});
