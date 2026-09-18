import { defineConfig, devices } from "@playwright/test";

const testPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const testBaseUrl = `http://127.0.0.1:${testPort}`;
const testWebCommand =
  process.env.PLAYWRIGHT_WEB_COMMAND ?? `corepack.cmd pnpm dev --port ${testPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: testBaseUrl,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: testWebCommand,
    url: testBaseUrl,
    reuseExistingServer: !process.env.CI,
  },
});
