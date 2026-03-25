import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { AppConfig, ConfigEnvironment, RunOptions } from './types';

const APP_NAME = 'DTE Caixa Postal';
const DEFAULT_CERTIFICATE_USER = '27939154000108 - CNPJ';
const DEFAULT_CERTIFICATE_FILE = 'EXATAS CONTABILIDADE LTDA_27939154000108.pfx';
const DEFAULT_PASSWORD_FILE = 'Senha.txt';

export interface EnsuredAppConfig {
  config: AppConfig;
  configPath: string;
}

export async function ensureAppConfig(environment: ConfigEnvironment): Promise<EnsuredAppConfig> {
  const configPath = getConfigPath(environment);
  const defaultConfig = await buildDefaultConfig(environment);

  await mkdir(environment.userDataDir, { recursive: true });

  try {
    const rawConfig = await readFile(configPath, 'utf8');
    const parsedConfig = JSON.parse(rawConfig) as Partial<AppConfig>;
    const mergedConfig = mergeWithDefaults(defaultConfig, parsedConfig);

    if (JSON.stringify(mergedConfig) !== JSON.stringify(parsedConfig)) {
      await persistConfig(configPath, mergedConfig);
    }

    return {
      config: mergedConfig,
      configPath,
    };
  } catch (error) {
    if (isMissingFile(error)) {
      await persistConfig(configPath, defaultConfig);
      return {
        config: defaultConfig,
        configPath,
      };
    }

    throw new Error(`Nao foi possivel carregar o config.json: ${formatError(error)}`);
  }
}

export async function buildDefaultConfig(environment: ConfigEnvironment): Promise<AppConfig> {
  const certificateDir = await resolveCertificateDirectory(environment);
  const certificatePath = path.resolve(certificateDir, DEFAULT_CERTIFICATE_FILE);
  const passwordPath = path.resolve(certificateDir, DEFAULT_PASSWORD_FILE);
  const password = await readCertificatePassword(passwordPath);

  return {
    certificate: {
      path: certificatePath,
      password,
      user: DEFAULT_CERTIFICATE_USER,
    },
    output: {
      dir: path.resolve(environment.documentsDir, APP_NAME, 'output'),
    },
    browser: {
      channel: 'chrome',
    },
  };
}

export function resolveRunOptions(config: AppConfig): RunOptions {
  return {
    certificatePath: config.certificate.path,
    certificatePassword: config.certificate.password,
    certificateUser: config.certificate.user,
    outputDir: config.output.dir,
    chromeChannel: config.browser.channel,
  };
}

export function getConfigPath(environment: ConfigEnvironment): string {
  return path.resolve(environment.userDataDir, 'config.json');
}

async function resolveCertificateDirectory(environment: ConfigEnvironment): Promise<string> {
  const packagedDirectory = path.resolve(environment.resourcesDir, 'certificado');
  const developmentDirectory = path.resolve(environment.cwd, 'certificado');

  try {
    await access(packagedDirectory);
    return packagedDirectory;
  } catch {
    return developmentDirectory;
  }
}

async function persistConfig(configPath: string, config: AppConfig): Promise<void> {
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function mergeWithDefaults(defaultConfig: AppConfig, input: Partial<AppConfig>): AppConfig {
  return {
    certificate: {
      path: coalesceString(input.certificate?.path, defaultConfig.certificate.path),
      password: coalesceString(input.certificate?.password, defaultConfig.certificate.password),
      user: coalesceString(input.certificate?.user, defaultConfig.certificate.user),
    },
    output: {
      dir: coalesceString(input.output?.dir, defaultConfig.output.dir),
    },
    browser: {
      channel: input.browser?.channel === 'chrome' ? 'chrome' : defaultConfig.browser.channel,
    },
  };
}

function coalesceString(value: string | undefined, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

async function readCertificatePassword(filePath: string): Promise<string> {
  try {
    await access(filePath);
  } catch {
    return '';
  }

  const contents = await readFile(filePath, 'utf8');
  return contents.replace(/^\uFEFF/, '').trim();
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ENOENT'
  );
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
