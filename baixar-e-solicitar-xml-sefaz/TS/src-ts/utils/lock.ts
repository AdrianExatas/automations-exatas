import { closeSync, existsSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ensureDir } from "./fs.js";

export interface FileLock {
  fd: number;
  path: string;
  release(): void;
}

function readPid(path: string): number | undefined {
  try {
    const pid = Number.parseInt(readFileSync(path, "utf8").trim(), 10);
    return Number.isFinite(pid) ? pid : undefined;
  } catch {
    return undefined;
  }
}

export function isProcessActive(pid: number): boolean {
  if (pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function acquireFileLock(path: string, message = "Ja existe uma execucao em andamento"): FileLock {
  ensureDir(dirname(path));

  if (existsSync(path)) {
    const existingPid = readPid(path);
    if (existingPid && isProcessActive(existingPid)) {
      throw new Error(`${message} (PID: ${existingPid})`);
    }
    rmSync(path, { force: true });
  }

  const fd = openSync(path, "wx");
  writeFileSync(fd, String(process.pid), "utf8");

  return {
    fd,
    path,
    release() {
      try {
        closeSync(fd);
      } catch {
        // noop
      }
      const pid = readPid(path);
      if (pid === process.pid) {
        rmSync(path, { force: true });
      }
    },
  };
}
