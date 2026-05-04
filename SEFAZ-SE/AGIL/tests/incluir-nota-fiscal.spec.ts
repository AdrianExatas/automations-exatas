import { test } from '@playwright/test';
import { incluirNotaFiscalAgil } from '../src/agil-flow';
import { loadDotEnv, requiredEnv } from '../src/env';

loadDotEnv();

test('inclui nota fiscal no AGIL', async ({ page }) => {
  await incluirNotaFiscalAgil(page, {
    authMode: 'credentials',
    username: requiredEnv('SEFAZ_USERNAME'),
    password: requiredEnv('SEFAZ_PASSWORD'),
    danfe: process.env.SEFAZ_DANFE,
  });
});
