import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function readJsonFile<T>(path: string): T | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isRetriableFsError(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) {
    return false;
  }
  return ["EPERM", "EBUSY", "EACCES"].includes(String(error.code));
}

export function writeJsonAtomic(path: string, data: unknown): void {
  ensureDir(dirname(path));
  const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  writeFileSync(tempPath, payload, "utf8");

  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      renameSync(tempPath, path);
      return;
    } catch (error) {
      lastError = error;
      if (!isRetriableFsError(error)) {
        break;
      }
      sleepSync(Math.min(1000, 25 * 2 ** attempt));
    }
  }

  if (process.platform === "win32" && isRetriableFsError(lastError)) {
    copyFileSync(tempPath, path);
    rmSync(tempPath, { force: true });
    return;
  }

  rmSync(tempPath, { force: true });
  throw lastError;
}

export function backupFile(source: string, destination: string): boolean {
  if (!existsSync(source)) {
    return false;
  }
  ensureDir(dirname(destination));
  copyFileSync(source, destination);
  return true;
}

export function removeFileIfExists(path: string): boolean {
  if (!existsSync(path)) {
    return false;
  }
  rmSync(path, { force: true });
  return true;
}

export function readTextBestEffort(path: string): string {
  const buffer = readFileSync(path);
  const utf8 = buffer.toString("utf8");
  if (!utf8.includes("\uFFFD")) {
    return utf8;
  }
  return buffer.toString("latin1");
}
