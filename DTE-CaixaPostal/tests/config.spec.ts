import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { ensureAppConfig, resolveRunOptions } from '../src/app/config';

test('ensureAppConfig cria config.json com defaults da aplicacao', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'dte-caixa-postal-config-'));

  try {
    const environment = {
      userDataDir: path.resolve(tempRoot, 'userData'),
      documentsDir: path.resolve(tempRoot, 'documents'),
      resourcesDir: process.cwd(),
      cwd: process.cwd(),
    };

    const { config, configPath } = await ensureAppConfig(environment);
    const persistedConfig = JSON.parse(await readFile(configPath, 'utf8')) as {
      certificate: { path: string; password: string; user: string };
      output: { dir: string };
      browser: { channel: string };
    };
    const runOptions = resolveRunOptions(config);

    expect(configPath).toBe(path.resolve(environment.userDataDir, 'config.json'));
    expect(config.certificate.path).toBe(
      path.resolve(process.cwd(), 'certificado', 'EXATAS CONTABILIDADE LTDA_27939154000108.pfx'),
    );
    expect(config.certificate.password.length).toBeGreaterThan(0);
    expect(config.output.dir).toBe(path.resolve(environment.documentsDir, 'DTE Caixa Postal', 'output'));
    expect(persistedConfig.browser.channel).toBe('chrome');
    expect(runOptions.chromeChannel).toBe('chrome');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
