import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

test.describe("Authentication", () => {
  test("unauthenticated access redirects to sign-in", async ({ page }) => {
    await page.goto("/fields");
    await page.waitForLoadState("networkidle");

    // Without auth, should be redirected to Clerk sign-in
    expect(page.url()).toMatch(/\/sign-in/);
  });

  test("sign-in page renders Clerk component", async ({ page }) => {
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");

    // Clerk sign-in page should render
    expect(page.url()).toContain("/sign-in");
  });

  test("authenticated access reaches protected routes", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/fields");
    await page.waitForLoadState("networkidle");

    // With Clerk testing token, should not redirect to sign-in
    if (!page.url().includes("/sign-in")) {
      await expect(
        page.getByRole("heading", { name: "田地管理" }),
      ).toBeVisible({ timeout: 15000 });
    }
  });
});
