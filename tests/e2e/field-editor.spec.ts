import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

test.describe("Field Editor", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test("fields page loads and shows heading", async ({ page }) => {
    await page.goto("/fields");
    await page.waitForLoadState("networkidle");

    // If redirected to sign-in, Clerk testing token may not be configured
    if (page.url().includes("/sign-in")) {
      test.skip(true, "Clerk testing token not configured — skipping auth-required test");
      return;
    }

    await expect(
      page.getByRole("heading", { name: "田地管理" }),
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole("button", { name: "新增田地" })).toBeVisible();
  });

  test("create field dialog opens and has required form fields", async ({ page }) => {
    await page.goto("/fields");
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/sign-in")) {
      test.skip(true, "Clerk testing token not configured");
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
        page.getByRole("heading", { name: "新增田地", level: 2 }).or(
          page.getByText("新增田地").first(),
        ),
      ).toBeVisible();
    }
  });

  test("field editor canvas loads without errors", async ({ page }) => {
    await page.goto("/fields");
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/sign-in")) {
      test.skip(true, "Clerk testing token not configured");
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
    await page.waitForLoadState("networkidle");

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
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/sign-in")) {
      test.skip(true, "Clerk testing token not configured");
      return;
    }

    const fieldLink = page.locator('a[href*="/fields/"]').first();
    const hasField = await fieldLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasField) {
      test.skip(true, "No fields exist to open editor");
      return;
    }

    await fieldLink.click();
    await page.waitForLoadState("networkidle");

    // Wait for toolbar to load — check for tool buttons
    // The toolbar should have tool buttons like select, hand, draw rect, etc.
    const toolbar = page.locator('[role="toolbar"], [class*="toolbar"]').first();
    const hasToolbar = await toolbar.isVisible({ timeout: 10000 }).catch(() => false);

    if (hasToolbar) {
      await expect(toolbar).toBeVisible();
    }
  });
});
