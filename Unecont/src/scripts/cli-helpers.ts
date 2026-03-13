import fs from "node:fs";
import path from "node:path";
import { getProjectRoot, resolveFromProject, resolveRuntimePath } from "../project-paths";

export function loadDotenvFromProjectRoot(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require("dotenv") as typeof import("dotenv");
  dotenv.config({ path: path.resolve(getProjectRoot(), ".env") });
}

export function resolveExcelPath(excelPath: string): string | null {
  return resolveFromProject([excelPath]);
}

function findLatestUnecontDir(baseDir: string): string | null {
  if (!fs.existsSync(baseDir)) return null;

  const latest = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("Unecont_"))
    .map((entry) => entry.name)
    .sort()
    .reverse()[0];

  return latest ? path.join(baseDir, latest) : null;
}

export function findLatestDownloadsDir(baseDir?: string): string | null {
  const downloadsBase = baseDir ? path.resolve(baseDir) : resolveRuntimePath("downloads");
  return findLatestUnecontDir(downloadsBase);
}

export function findLatestNormalizedDir(baseDir?: string): string | null {
  const normalizedBase = baseDir ? path.resolve(baseDir) : resolveRuntimePath("normalized");
  return findLatestUnecontDir(normalizedBase);
}
