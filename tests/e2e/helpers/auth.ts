import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { type Page } from "@playwright/test";

/**
 * Set up Clerk testing token for a page.
 * This bypasses Clerk auth by injecting a testing token,
 * allowing tests to access protected routes without real login.
 */
export async function setupAuth(page: Page) {
  await setupClerkTestingToken({ page });
}
