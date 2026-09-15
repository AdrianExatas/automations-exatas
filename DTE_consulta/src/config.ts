import { access } from "node:fs/promises";

import type { AppConfig } from "./types.js";
import { requireValidCnpj, resolveFromCwd } from "./utils.js";

const DEFAULT_OUTPUT_DIR = "output";
const DEFAULT_CAPTCHA_TIMEOUT_MS = 300_000;
const DEFAULT_REQUEST_DELAY_MS = 250;

export async function loadConfig(env: NodeJS.ProcessEnv = process.env): Promise<AppConfig> {
  const certificatePathValue = required(env.CERT_PFX_PATH, "CERT_PFX_PATH");
  const certificatePassword = required(env.CERT_PASSWORD, "CERT_PASSWORD");
  const procuratorCnpj = requireValidCnpj(required(env.PROCURADOR_CNPJ, "PROCURADOR_CNPJ"), "PROCURADOR_CNPJ");
  const certificatePath = resolveFromCwd(certificatePathValue);

  try {
    await access(certificatePath);
  } catch {
    throw new Error(`Certificado PFX nao encontrado: ${certificatePath}`);
  }

  if (!/\.p(?:fx|12)$/i.test(certificatePath)) {
    throw new Error("CERT_PFX_PATH deve apontar para um arquivo .pfx ou .p12.");
  }

  return {
    certificatePath,
    certificatePassword,
    procuratorCnpj,
    outputDir: resolveFromCwd(env.OUTPUT_DIR?.trim() || DEFAULT_OUTPUT_DIR),
    captchaTimeoutMs: positiveInteger(env.CAPTCHA_TIMEOUT_MS, DEFAULT_CAPTCHA_TIMEOUT_MS, "CAPTCHA_TIMEOUT_MS"),
    requestDelayMs: nonNegativeInteger(env.REQUEST_DELAY_MS, DEFAULT_REQUEST_DELAY_MS, "REQUEST_DELAY_MS"),
  };
}

function required(value: string | undefined, key: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`Variavel obrigatoria ausente: ${key}.`);
  return normalized;
}

function positiveInteger(value: string | undefined, fallback: number, key: string): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${key} deve ser um inteiro positivo.`);
  return parsed;
}

function nonNegativeInteger(value: string | undefined, fallback: number, key: string): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${key} deve ser um inteiro nao negativo.`);
  return parsed;
}
