import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadDotEnv(path = '.env') {
  const envPath = resolve(process.cwd(), path);

  if (!existsSync(envPath)) {
    return;
  }

  const contents = readFileSync(envPath, 'utf8');

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    const quote = value[0];

    if (
      (quote === '"' || quote === "'") &&
      value.length >= 2 &&
      value[value.length - 1] === quote
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

export function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Defina ${name} no ambiente ou no arquivo .env.`);
  }

  return value;
}

export function booleanEnv(name: string, defaultValue: boolean) {
  const value = process.env[name];

  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'sim'].includes(value.toLowerCase());
}

/** Inteiro positivo opcional (ms ou outros usos); ignorado se ausente ou invalido. */
export function optionalPositiveIntEnv(name: string): number | undefined {
  const value = process.env[name]?.trim();

  if (value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.floor(parsed);
}
