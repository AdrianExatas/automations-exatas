import fs from "node:fs";
import path from "node:path";

function ensureRuntimeDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function resolvePackageRoot(): string {
  return path.resolve(__dirname, "..");
}

export function resolveDefaultArtifactPath(): string {
  return path.join(resolvePackageRoot(), "runtime", "latest-auth.json");
}

export function resolveDefaultStorageStatePath(): string {
  return path.join(resolvePackageRoot(), "runtime", "storageState.json");
}

export function ensureParentDir(filePath: string): void {
  ensureRuntimeDir(filePath);
}

export function resolveWorkspaceAuthArtifactPath(startDir = process.cwd()): string {
  let current = path.resolve(startDir);

  while (true) {
    const candidateDir = path.join(current, "shared", "onvio-auth");
    const candidatePkg = path.join(candidateDir, "package.json");
    if (fs.existsSync(candidatePkg)) {
      return path.join(candidateDir, "runtime", "latest-auth.json");
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return path.resolve(startDir, "shared", "onvio-auth", "runtime", "latest-auth.json");
}
