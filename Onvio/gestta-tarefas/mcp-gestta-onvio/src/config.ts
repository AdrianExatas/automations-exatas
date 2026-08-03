import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface AppConfig {
  gesttaBaseUrl: string;
  onvioBaseUrl: string;
  artifactPath?: string;
  allowedRoots: string[];
  outputDir: string;
  auditDir: string;
  confirmationTtlMs: number;
  httpTimeoutMs: number;
  readRetries: number;
  maxDocumentBytes: number;
  concurrency: number;
  allowBrowserFallback: boolean;
  browserHeadless: boolean;
  auditRetentionDays: number;
}

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} deve ser inteiro entre ${min} e ${max}.`);
  }
  return parsed;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "sim"].includes(raw)) return true;
  if (["0", "false", "no", "nao", "não"].includes(raw)) return false;
  throw new Error(`${name} deve ser true ou false.`);
}

function splitRoots(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(path.delimiter)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => path.resolve(item));
}

function defaultDataDir(): string {
  const localAppData = process.env.LOCALAPPDATA?.trim();
  return path.join(localAppData || path.join(os.homedir(), ".local", "share"), "Exatas", "gestta-onvio-mcp");
}

export function loadConfig(): AppConfig {
  const dataDir = defaultDataDir();
  const outputDir = path.resolve(process.env.MCP_OUTPUT_DIR?.trim() || path.join(dataDir, "downloads"));
  const auditDir = path.resolve(process.env.MCP_AUDIT_DIR?.trim() || path.join(dataDir, "audit"));
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(auditDir, { recursive: true });

  return {
    gesttaBaseUrl: (process.env.GESTTA_BASE_URL || "https://api.gestta.com.br").replace(/\/$/, ""),
    onvioBaseUrl: (process.env.ONVIO_BASE_URL || "https://onvio.com.br").replace(/\/$/, ""),
    artifactPath: process.env.ONVIO_AUTH_ARTIFACT_PATH?.trim() || undefined,
    allowedRoots: splitRoots(process.env.MCP_ALLOWED_ROOTS),
    outputDir,
    auditDir,
    confirmationTtlMs: intEnv("MCP_CONFIRMATION_TTL_MS", 900_000, 60_000, 3_600_000),
    httpTimeoutMs: intEnv("MCP_HTTP_TIMEOUT_MS", 60_000, 1_000, 300_000),
    readRetries: intEnv("MCP_READ_RETRIES", 3, 0, 10),
    maxDocumentBytes: intEnv("MCP_MAX_DOCUMENT_BYTES", 20 * 1024 * 1024, 1024, 200 * 1024 * 1024),
    concurrency: intEnv("MCP_CONCURRENCY", 3, 1, 10),
    allowBrowserFallback: boolEnv("MCP_ALLOW_BROWSER_FALLBACK", true),
    browserHeadless: boolEnv("MCP_BROWSER_HEADLESS", true),
    auditRetentionDays: intEnv("MCP_AUDIT_RETENTION_DAYS", 30, 1, 3650),
  };
}
