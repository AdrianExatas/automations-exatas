import fs from "node:fs";
import path from "node:path";
import type { AppConfig } from "../config.js";
import { redact } from "./redact.js";

export class AuditLogger {
  constructor(private readonly config: AppConfig) {
    this.prune();
  }

  write(event: Record<string, unknown>): void {
    const now = new Date();
    const file = path.join(this.config.auditDir, `${now.toISOString().slice(0, 10)}.jsonl`);
    const entry = redact({ timestamp: now.toISOString(), ...event });
    fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, { encoding: "utf8", mode: 0o600 });
  }

  private prune(): void {
    const cutoff = Date.now() - this.config.auditRetentionDays * 86_400_000;
    for (const item of fs.readdirSync(this.config.auditDir, { withFileTypes: true })) {
      if (!item.isFile() || !item.name.endsWith(".jsonl")) continue;
      const fullPath = path.join(this.config.auditDir, item.name);
      if (fs.statSync(fullPath).mtimeMs < cutoff) fs.rmSync(fullPath);
    }
  }
}
