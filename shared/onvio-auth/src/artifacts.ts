import fs from "node:fs";
import type { AuthArtifacts } from "./types";
import { ensureParentDir, resolveWorkspaceAuthArtifactPath } from "./runtime-paths";

function validateAuthArtifacts(value: unknown): AuthArtifacts {
  if (!value || typeof value !== "object") {
    throw new Error("Artefato de auth invalido: objeto ausente.");
  }

  const parsed = value as Partial<AuthArtifacts>;
  if (!parsed.onvio?.udsLongToken) {
    throw new Error("Artefato de auth invalido: onvio.udsLongToken ausente.");
  }
  if (!parsed.gestta?.jwt) {
    throw new Error("Artefato de auth invalido: gestta.jwt ausente.");
  }
  if (!parsed.session?.storageState) {
    throw new Error("Artefato de auth invalido: session.storageState ausente.");
  }

  return parsed as AuthArtifacts;
}

export function writeAuthArtifacts(filePath: string, artifacts: AuthArtifacts): void {
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(artifacts, null, 2), "utf8");
}

export function loadAuthArtifactsFromFile(filePath: string): AuthArtifacts | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  return validateAuthArtifacts(JSON.parse(raw));
}

export function loadWorkspaceAuthArtifacts(
  startDir = process.cwd(),
  filePath?: string,
): AuthArtifacts | null {
  return loadAuthArtifactsFromFile(filePath ?? resolveWorkspaceAuthArtifactPath(startDir));
}
