import path from 'node:path';

import { expect, test } from '@playwright/test';

import { ensureAppConfig, resolveRunOptions } from '../src/app/config';
import { runCaixaPostal } from '../src/app/runCaixaPostal';

test('varre a caixa postal da SEFAZ via browser e exporta o resultado em xlsx', async () => {
  test.skip(
    !process.env.RUN_SEFAZ_BROWSER_INTEGRATION,
    'Defina RUN_SEFAZ_BROWSER_INTEGRATION=1 para executar a integracao real via browser.',
  );

  test.setTimeout(60 * 60 * 1000);

  const tempRoot = path.resolve(process.cwd(), '.tmp-tests', 'sefaz-browser-integration');
  const environment = {
    userDataDir: path.resolve(tempRoot, 'userData'),
    documentsDir: path.resolve(tempRoot, 'documents'),
    resourcesDir: process.cwd(),
    cwd: process.cwd(),
  };

  const { config } = await ensureAppConfig(environment);
  const result = await runCaixaPostal({
    ...resolveRunOptions(config),
    executionStrategy: 'browser',
    outputDir: path.resolve(process.cwd(), 'output', 'caixa-postal'),
  });

  expect(result.processed).toBeGreaterThan(0);
  expect(result.outputPath.endsWith('.xlsx')).toBeTruthy();
});
