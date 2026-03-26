import 'dotenv/config';
import { chromium, type FullConfig } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getEnv } from '../src/schemas/env';
import { LoginPage } from '../src/pages/LoginPage';

const AUTH_DIR = 'test-results/.auth';
const STORAGE_STATE_PATH = join(AUTH_DIR, 'storageState.json');

async function globalSetup(_config: FullConfig): Promise<void> {
  const env = getEnv();
  const baseUrl = env.ONVIO_BASE_URL;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  const loginPage = new LoginPage(page);
  await loginPage.goto(baseUrl);
  await loginPage.login(env.ONVIO_EMAIL, env.ONVIO_PASSWORD);
  await loginPage.waitForLoginSuccess(/\/staff\/|portal-do-cliente|onvio\.com\.br\/br-/);

  if (!existsSync(AUTH_DIR)) {
    mkdirSync(AUTH_DIR, { recursive: true });
  }
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}

export default globalSetup;
