// playwright.config.js
// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',

  // Local-only and no concurrency requirement
  fullyParallel: false,
  workers: 1,

  forbidOnly: false,
  retries: 0,

  reporter: [['html', { open: 'on-failure' }]],
  outputDir: 'test-results',

  timeout: 60_000,
  expect: { timeout: 10_000 },

  // Creates auth state once and reuses across tests
  // Create this file in TypeScript: tests/global-setup.ts
  globalSetup: './tests/global-setup.ts',

  use: {
    // Optional: set if you always run against a fixed URL
    // baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:3000',

    // Local debugging
    headless: false,

    // Determinism
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'reduce',

    // Common for excel flows
    acceptDownloads: true,

    // Practical timeouts
    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    // Artifacts, since local has no retry
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Reuse session created in global-setup
    storageState: 'test-results/.auth/storageState.json',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
