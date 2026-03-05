import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup, expect } from "@playwright/test";
import path from "path";

setup.describe.configure({ mode: "serial" });

const authFile = path.join(__dirname, "../../playwright/.clerk/user.json");

setup("global setup", async ({}) => {
  await clerkSetup();
});

setup("authenticate", async ({ page }) => {
  const username = process.env.E2E_CLERK_USER_USERNAME;
  const password = process.env.E2E_CLERK_USER_PASSWORD;

  if (!username || !password) {
    console.warn(
      "⚠ E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD not set in .env.local — skipping auth setup.\n" +
        "  Tests requiring authentication will be skipped.",
    );
    return;
  }

  await page.goto("/");
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: username,
      password: password,
    },
  });

  // Verify we're authenticated by checking we can access the dashboard
  await page.waitForURL("**/", { timeout: 15000 });
  await page.context().storageState({ path: authFile });
});
