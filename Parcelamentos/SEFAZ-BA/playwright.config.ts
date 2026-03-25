import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src",
  testMatch: ["**/*.ts"],
  outputDir: "./output/playwright/test-results",
  use: {
    ...devices["Desktop Chrome"],
    channel: "chrome",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
