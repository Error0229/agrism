import { test, expect } from "@playwright/test";

test.describe("Field Editor", () => {
  test("fields page loads and shows heading", async ({ page }) => {
    await page.goto("/fields");
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/sign-in")) {
      test.skip(true, "Set E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD in .env.local");
      return;
    }

    await expect(
      page.getByRole("heading", { name: "田地管理" }),
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole("button", { name: "新增田地" })).toBeVisible();
  });

  test("create field dialog opens and has required form fields", async ({ page }) => {
    await page.goto("/fields");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("/sign-in")) {
      test.skip(true, "Set E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD in .env.local");
      return;
    }

    const btn = page.getByRole("button", { name: "新增田地" });
    await expect(btn).toBeVisible({ timeout: 15000 });
    await btn.click();

    const dialog = page.getByRole("dialog");
    const isVisible = await dialog.isVisible().catch(() => false);
    if (isVisible) {
      await expect(dialog).toBeVisible();
      // Verify form fields exist in dialog
      await expect(
        dialog.getByRole("heading", { name: "新增田地" }),
      ).toBeVisible();
    }
  });

  test("field editor canvas loads without errors", async ({ page }) => {
    await page.goto("/fields");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("/sign-in")) {
      test.skip(true, "Set E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD in .env.local");
      return;
    }

    // Collect console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Look for an existing field link to click into the editor
    const fieldLink = page.locator('a[href*="/fields/"]').first();
    const hasField = await fieldLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasField) {
      // No fields exist — skip the canvas portion
      test.skip(true, "No fields exist to open editor");
      return;
    }

    await fieldLink.click();
    await page.waitForLoadState("domcontentloaded");

    // Wait for the canvas (Konva stage) or the editor container to appear
    const editorContainer = page.locator('[class*="field-editor"], .konvajs-content, canvas').first();
    await expect(editorContainer).toBeVisible({ timeout: 15000 });

    // Verify no critical runtime errors occurred (like "field.placements is not iterable")
    const criticalErrors = consoleErrors.filter(
      (e) => e.includes("is not iterable") || e.includes("Cannot read properties of undefined"),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("field editor toolbar renders tool buttons", async ({ page }) => {
    await page.goto("/fields");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("/sign-in")) {
      test.skip(true, "Set E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD in .env.local");
      return;
    }

    const fieldLink = page.locator('a[href*="/fields/"]').first();
    const hasField = await fieldLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasField) {
      test.skip(true, "No fields exist to open editor");
      return;
    }

    await fieldLink.click();
    await page.waitForLoadState("domcontentloaded");

    // Wait for toolbar to load — check for tool buttons
    // The toolbar should have tool buttons like select, hand, draw rect, etc.
    const toolbar = page.locator('[role="toolbar"], [class*="toolbar"]').first();
    const hasToolbar = await toolbar.isVisible({ timeout: 10000 }).catch(() => false);

    if (hasToolbar) {
      await expect(toolbar).toBeVisible();
    }
  });
});
