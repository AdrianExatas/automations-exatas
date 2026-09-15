import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..");

export function getProjectRoot(): string {
  return PROJECT_ROOT;
}

export function resolveProjectPath(...segments: string[]): string {
  return path.resolve(PROJECT_ROOT, ...segments);
}

export function resolveAssetPath(...segments: string[]): string {
  return resolveProjectPath("assets", ...segments);
}

export function resolveRuntimePath(...segments: string[]): string {
  return resolveProjectPath("runtime", ...segments);
}

export function resolveFromProject(candidates: string[]): string | null {
  for (const candidate of candidates) {
    const resolved = path.isAbsolute(candidate)
      ? path.resolve(candidate)
      : resolveProjectPath(candidate);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  return null;
}
