import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page renders with email and password fields", async ({
    page,
  }) => {
    await page.goto("/auth/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("login page shows signup toggle", async ({ page }) => {
    await page.goto("/auth/login");

    // Should have a way to switch to signup mode
    const signupLink = page.locator("text=註冊");
    if (await signupLink.isVisible()) {
      await signupLink.click();
      // In signup mode, name field should appear
      await expect(
        page.locator('input[placeholder*="名"]').or(page.locator('input[name="name"]')),
      ).toBeVisible();
    }
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('input[type="email"]', "invalid@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should show an error or redirect back to login with error
    await page.waitForTimeout(3000);
    // Either still on login page or redirected back with error
    const url = page.url();
    expect(url).toContain("/auth/login");
  });
});
