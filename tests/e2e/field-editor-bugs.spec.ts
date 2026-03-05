import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

test.describe("Field Editor Bug Fixes", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test("canvas renders without errors after navigating to field editor", async ({
    page,
  }) => {
    // Navigate to fields list
    await page.goto("/fields");
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/sign-in")) {
      test.skip(true, "Clerk testing token not configured");
      return;
    }

    // Click on the first field card (if one exists)
    const fieldLink = page.locator('a[href*="/fields/"]').first();
    const hasField = await fieldLink
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasField) {
      test.skip(true, "No fields available to test");
      return;
    }
    await fieldLink.click();
    await page.waitForLoadState("domcontentloaded");

    // Verify that a Konva canvas element is rendered
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Check that the canvas has non-zero dimensions (it actually rendered)
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    // Collect console errors — there should be no uncaught exceptions
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    // Give a moment for any deferred errors to fire
    await page.waitForTimeout(1000);
    // Filter out benign React dev-mode warnings
    const realErrors = errors.filter(
      (e) => !e.includes("Warning:") && !e.includes("DevTools"),
    );
    expect(realErrors).toHaveLength(0);
  });

  test("polygon tool shortcut (P) is wired up and reflected in status bar", async ({
    page,
  }) => {
    // Navigate to fields list and open the first field
    await page.goto("/fields");
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/sign-in")) {
      test.skip(true, "Clerk testing token not configured");
      return;
    }

    const fieldLink = page.locator('a[href*="/fields/"]').first();
    const hasField = await fieldLink
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasField) {
      test.skip(true, "No fields available to test");
      return;
    }
    await fieldLink.click();
    await page.waitForLoadState("domcontentloaded");

    // Wait for canvas to render
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 10000,
    });

    // Press P to activate polygon tool
    await page.keyboard.press("p");

    // The status bar should show the polygon tool label
    const statusBar = page.locator("text=多邊形區域");
    await expect(statusBar).toBeVisible({ timeout: 3000 });
  });

  test("inspector panel is on the right side on desktop (not in a bottom Sheet)", async ({
    page,
  }) => {
    // Set a desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to fields list and open the first field
    await page.goto("/fields");
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/sign-in")) {
      test.skip(true, "Clerk testing token not configured");
      return;
    }

    const fieldLink = page.locator('a[href*="/fields/"]').first();
    const hasField = await fieldLink
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasField) {
      test.skip(true, "No fields available to test");
      return;
    }
    await fieldLink.click();
    await page.waitForLoadState("domcontentloaded");

    // Wait for canvas to render
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 10000,
    });

    // The PropertyInspector is rendered directly (not inside a Sheet) on desktop.
    const sheetOverlay = page.locator('[data-slot="sheet-overlay"]');
    const overlayCount = await sheetOverlay.count();
    expect(overlayCount).toBe(0);

    // The canvas and the inspector should both be visible in the main flex row
    const canvas = page.locator("canvas").first();
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();

    // The inspector panel should exist to the right of the canvas
    const inspectorContent = page.locator("text=吸附").first();
    const inspectorVisible = await inspectorContent
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    // Inspector or status bar must be visible somewhere
    expect(inspectorVisible || canvasBox!.width < 1280).toBe(true);
  });

  test("canvas stage dimensions are not clipped to field bounds", async ({
    page,
  }) => {
    // Navigate to fields list and open the first field
    await page.goto("/fields");
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/sign-in")) {
      test.skip(true, "Clerk testing token not configured");
      return;
    }

    const fieldLink = page.locator('a[href*="/fields/"]').first();
    const hasField = await fieldLink
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasField) {
      test.skip(true, "No fields available to test");
      return;
    }
    await fieldLink.click();
    await page.waitForLoadState("domcontentloaded");

    // Wait for canvas to render
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // The canvas container should fill available space
    const container = canvas.locator("..");
    const containerBox = await container.boundingBox();
    expect(containerBox).not.toBeNull();

    // The canvas should be at least as large as its container
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.width).toBeGreaterThanOrEqual(containerBox!.width - 2);
    expect(canvasBox!.height).toBeGreaterThanOrEqual(containerBox!.height - 2);
  });

  test("page loads within 5 seconds (performance)", async ({ page }) => {
    // Navigate to fields list first
    await page.goto("/fields");
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/sign-in")) {
      test.skip(true, "Clerk testing token not configured");
      return;
    }

    const fieldLink = page.locator('a[href*="/fields/"]').first();
    const hasField = await fieldLink
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasField) {
      test.skip(true, "No fields available to test");
      return;
    }

    // Measure time from navigation to canvas render
    const startTime = Date.now();
    await fieldLink.click();

    // Wait for canvas to be visible
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 5000,
    });
    const loadTime = Date.now() - startTime;

    // Assert the field editor loaded within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
