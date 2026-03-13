// @ts-check
import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/automations',
  fullyParallel: false,
  workers: 1,
  forbidOnly: false,
  retries: 0,
  reporter: [['html', { open: 'on-failure' }]],
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    headless: false,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'reduce',
    acceptDownloads: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'unecont',
      testDir: './src/automations/unecont',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'onvio',
      testDir: './src/automations/onvio',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
