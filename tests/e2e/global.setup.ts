import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import path from "path";

setup.describe.configure({ mode: "serial" });

const authFile = path.join(__dirname, "../../playwright/.clerk/user.json");

setup("global setup", async ({}) => {
  await clerkSetup();
});

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_CLERK_USER_EMAIL;

  if (!email) {
    console.warn(
      "⚠ E2E_CLERK_USER_EMAIL not set in .env.local — skipping auth setup.\n" +
        "  Use a test email containing '+clerk_test' (e.g. test+clerk_test@test.com).\n" +
        "  Tests requiring authentication will be skipped.",
    );
    return;
  }

  await page.goto("/");
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "email_code",
      identifier: email,
    },
  });

  // Verify we're authenticated by checking we can access the dashboard
  await page.waitForURL("**/", { timeout: 15000 });
  await page.context().storageState({ path: authFile });
});
