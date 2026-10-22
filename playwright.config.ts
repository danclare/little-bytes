import { defineConfig, devices } from "@playwright/test";

if (!process.env.DATABASE_URL && process.env.TEST_DATABASE_URL)
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
if (process.env.TEST_DATABASE_URL) {
  process.env.AUTH_SECRET ??= "test-only-auth-secret-with-at-least-32-characters";
  process.env.RATE_LIMIT_HMAC_KEY ??= "test-only-rate-limit-hmac-key-with-32-characters";
  process.env.APP_URL ??= "http://127.0.0.1:3000";
  process.env.PHOTO_STORAGE ??= "local";
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  ...(process.env.TEST_DATABASE_URL
    ? {
        webServer: {
          command: "npm run dev",
          url: `${baseURL}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
});
