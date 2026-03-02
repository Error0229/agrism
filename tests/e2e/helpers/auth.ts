import { type Page, expect } from "@playwright/test";

/**
 * Log in through the login form. Requires a valid user in the database.
 * Uses env vars E2E_USER_EMAIL and E2E_USER_PASSWORD.
 */
export async function login(page: Page) {
  const email = process.env.E2E_USER_EMAIL ?? "test@example.com";
  const password = process.env.E2E_USER_PASSWORD ?? "test1234";

  await page.goto("/auth/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect away from login
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10000 });
}
