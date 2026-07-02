import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { PATHS } from "../core/config.js";
import { ensureDir } from "./fs.js";

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export function createLogger(name: string): Logger {
  ensureDir(PATHS.logsDir);
  const logPath = join(PATHS.logsDir, `${name}_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.log`);

  function write(level: string, message: string): void {
    const line = `[${new Date().toISOString()}] [${level}] ${message}`;
    appendFileSync(logPath, `${line}\n`, "utf8");
    if (level === "ERROR") {
      console.error(message);
    } else if (level === "WARN") {
      console.warn(message);
    } else {
      console.log(message);
    }
  }

  return {
    info: (message) => write("INFO", message),
    warn: (message) => write("WARN", message),
    error: (message) => write("ERROR", message),
  };
}
