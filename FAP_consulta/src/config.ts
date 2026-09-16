import { access } from "node:fs/promises";

import type { AppConfig, BrowserMode } from "./types.js";
import { booleanValue, digitsOnly, resolveFromCwd } from "./utils.js";

const DEFAULT_OUTPUT_DIR = "output";
const DEFAULT_CAPTCHA_TIMEOUT_MS = 300_000;
const DEFAULT_REQUEST_DELAY_MS = 300;
const DEFAULT_BROWSER_MODE: BrowserMode = "cdp";

export async function loadConfig(): Promise<AppConfig> {
  const certificatePathRaw = process.env.CERT_PFX_PATH?.trim();
  if (!certificatePathRaw) {
    throw new Error("CERT_PFX_PATH nao informado no arquivo de ambiente (.env).");
  }
  const certificatePath = resolveFromCwd(certificatePathRaw);
  const exists = await access(certificatePath)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    throw new Error(`Certificado digital nao encontrado no caminho informado: ${certificatePath}`);
  }

  const certificatePassword = process.env.CERT_PASSWORD ?? "";
  if (!certificatePassword) {
    throw new Error("CERT_PASSWORD nao informado no arquivo de ambiente (.env).");
  }

  const procuratorCnpjRaw = process.env.PROCURADOR_CNPJ?.trim();
  if (!procuratorCnpjRaw) {
    throw new Error("PROCURADOR_CNPJ nao informado no arquivo de ambiente (.env).");
  }
  const procuratorCnpj = digitsOnly(procuratorCnpjRaw);
  if (procuratorCnpj.length !== 14) {
    throw new Error("PROCURADOR_CNPJ deve conter 14 digitos numericos.");
  }

  const outputDirRaw = process.env.OUTPUT_DIR?.trim() || DEFAULT_OUTPUT_DIR;
  const outputDir = resolveFromCwd(outputDirRaw);

  const captchaTimeoutMs = parsePositiveInt(
    process.env.CAPTCHA_TIMEOUT_MS,
    DEFAULT_CAPTCHA_TIMEOUT_MS,
  );
  const requestDelayMs = parsePositiveInt(
    process.env.REQUEST_DELAY_MS,
    DEFAULT_REQUEST_DELAY_MS,
  );

  const browserModeRaw = process.env.BROWSER_MODE?.trim().toLowerCase();
  const browserMode: BrowserMode = browserModeRaw === "playwright" ? "playwright" : DEFAULT_BROWSER_MODE;

  const fapAnoVigenciaRaw = process.env.FAP_ANO_VIGENCIA?.trim();
  const fapAnoVigencia = fapAnoVigenciaRaw ? parseInt(fapAnoVigenciaRaw, 10) : undefined;

  const dominioDsn = process.env.DOMINIO_ODBC_DSN?.trim().replace(/^["']|["']$/g, "");
  const dominioUser = process.env.DOMINIO_USER?.trim().replace(/^["']|["']$/g, "");
  const dominioPassword = process.env.DOMINIO_PASSWORD?.trim().replace(/^["']|["']$/g, "");
  const filterDominioActive = booleanValue(process.env.DOMINIO_FILTER_ACTIVE) ?? false;

  return {
    certificatePath,
    certificatePassword,
    procuratorCnpj,
    outputDir,
    captchaTimeoutMs,
    requestDelayMs,
    browserMode,
    fapAnoVigencia,
    dominioDsn,
    dominioUser,
    dominioPassword,
    filterDominioActive,
  };
}

function parsePositiveInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : defaultValue;
}
