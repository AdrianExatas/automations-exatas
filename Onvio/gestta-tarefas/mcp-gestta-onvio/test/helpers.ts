import path from "node:path";
import type { AppConfig } from "../src/config.js";

export function testConfig(base: string): AppConfig {
  return {
    gesttaBaseUrl: "https://api.gestta.test",
    onvioBaseUrl: "https://onvio.test",
    artifactPath: path.join(base, "missing-auth.json"),
    allowedRoots: [base],
    outputDir: base,
    auditDir: base,
    confirmationTtlMs: 900_000,
    httpTimeoutMs: 1_000,
    readRetries: 2,
    maxDocumentBytes: 20 * 1024 * 1024,
    concurrency: 2,
    allowBrowserFallback: false,
    browserHeadless: true,
    auditRetentionDays: 30,
  };
}
