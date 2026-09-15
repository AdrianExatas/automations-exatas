import fs from "node:fs";
import * as XLSX from "xlsx";

export interface EnsureWorkbookReadyOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export interface WorkbookReadyResult {
  stable: boolean;
  sizeBytes: number;
  attempts: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureWorkbookReady(
  filePath: string,
  options: EnsureWorkbookReadyOptions = {},
): Promise<WorkbookReadyResult> {
  const timeoutMs = options.timeoutMs ?? 5_000;
  const pollIntervalMs = options.pollIntervalMs ?? 250;
  const deadline = Date.now() + timeoutMs;

  let attempts = 0;
  let previousSize = -1;
  let stableReads = 0;
  let sizeBytes = 0;

  while (Date.now() <= deadline) {
    attempts++;

    if (fs.existsSync(filePath)) {
      try {
        const stats = fs.statSync(filePath);
        sizeBytes = stats.size;

        if (stats.isFile() && stats.size > 0) {
          stableReads = stats.size === previousSize ? stableReads + 1 : 1;
          previousSize = stats.size;

          if (stableReads >= 2) {
            try {
              XLSX.readFile(filePath, { cellDates: false });
              return {
                stable: true,
                sizeBytes: stats.size,
                attempts,
              };
            } catch {
              stableReads = 0;
            }
          }
        }
      } catch {
        // tenta novamente ate o timeout
      }
    }

    await sleep(pollIntervalMs);
  }

  return {
    stable: false,
    sizeBytes,
    attempts,
  };
}
