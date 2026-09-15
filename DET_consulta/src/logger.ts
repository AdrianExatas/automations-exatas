import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._~-]+/gi;
const SENSITIVE_QUERY_PATTERN = /([?&](?:code|state|nonce|authorization_id|h-captcha-response)=)[^&\s]+/gi;
const SENSITIVE_COOKIE_PATTERN = /\b(?:cf_clearance|fgtsd_proc_auth_token|session|token)=([^;\s]+)/gi;
const CPF_PATTERN = /(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g;

export function sanitizeText(value: unknown, explicitSecrets: string[] = []): string {
  let text = value instanceof Error ? value.message : String(value ?? "");
  text = text
    .replace(JWT_PATTERN, "[JWT_REDACTED]")
    .replace(BEARER_PATTERN, "Bearer [REDACTED]")
    .replace(SENSITIVE_QUERY_PATTERN, "$1[REDACTED]")
    .replace(SENSITIVE_COOKIE_PATTERN, (match) => `${match.split("=")[0]}=[REDACTED]`)
    .replace(CPF_PATTERN, "[CPF_REDACTED]");

  for (const secret of explicitSecrets.filter((item) => item.length >= 3)) {
    text = text.split(secret).join("[REDACTED]");
  }
  return text;
}

export type LogLevel = "info" | "warn" | "error";

export class SafeLogger {
  readonly logPath: string;

  constructor(
    private readonly runDir: string,
    private readonly explicitSecrets: string[] = [],
  ) {
    this.logPath = path.join(runDir, "run.log");
  }

  async initialize(): Promise<void> {
    await mkdir(this.runDir, { recursive: true });
  }

  async log(level: LogLevel, message: unknown): Promise<void> {
    const safeMessage = sanitizeText(message, this.explicitSecrets).replace(/[\r\n]+/g, " ");
    const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${safeMessage}`;
    await appendFile(this.logPath, `${line}\n`, "utf8");
    const method = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    method(line);
  }
}
