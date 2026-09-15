import { test } from '@playwright/test';
import { incluirNotaFiscalAgil } from '../src/agil-flow';
import { loadDotEnv } from '../src/env';

loadDotEnv();

test.use({
  headless: false,
  channel: process.env.BROWSER_CHANNEL?.trim() || 'msedge',
});

test('inclui nota fiscal no AGIL', async ({ page }) => {
  await incluirNotaFiscalAgil(page, {
    danfe: process.env.SEFAZ_DANFE,
  });
});
