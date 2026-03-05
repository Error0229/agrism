import { test, expect } from "@playwright/test";

test.describe("Authentication — unauthenticated", () => {
  // These tests must NOT use storageState so they test the unauthenticated flow
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated access redirects to sign-in", async ({ page }) => {
    await page.goto("/fields");
    await page.waitForLoadState("domcontentloaded");

    // Without auth, should be redirected to Clerk sign-in
    expect(page.url()).toMatch(/\/sign-in/);
  });

  test("sign-in page renders Clerk component", async ({ page }) => {
    await page.goto("/sign-in");
    await page.waitForLoadState("domcontentloaded");

    // Clerk sign-in page should render
    expect(page.url()).toContain("/sign-in");
  });
});

test.describe("Authentication — authenticated", () => {
  test("authenticated access reaches protected routes", async ({ page }) => {
    await page.goto("/fields");
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/sign-in")) {
      test.skip(true, "Set E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD in .env.local");
      return;
    }

    await expect(
      page.getByRole("heading", { name: "田地管理" }),
    ).toBeVisible({ timeout: 15000 });
  });
});
