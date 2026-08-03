import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export type GesttaAuthMode = "env" | "artifact";
export type GesttaAuthSource = "local-env" | "artifact" | "legacy-local-env";

export interface GesttaRuntimeAuth {
  mode: GesttaAuthMode;
  source: GesttaAuthSource;
  artifactPath?: string;
  getJwt(): string;
  refreshJwt(): Promise<string>;
}

export interface GesttaRuntimeAuthDeps {
  forceArtifact?: boolean;
  getExplicitEnvJwt?: () => string;
  resolveArtifactPath?: () => string;
  loadArtifactJwt?: (artifactPath: string) => string | null;
  refreshArtifactJwt?: (artifactPath: string, reason: string) => Promise<string>;
  resolveLegacyEnvPath?: () => string;
  loadLegacyEnvJwt?: (legacyEnvPath: string) => string | null;
}

let ongoingRefresh: Promise<string> | null = null;

function createStaticRuntimeAuth(
  source: GesttaAuthSource,
  jwt: string,
  artifactPath?: string,
): GesttaRuntimeAuth {
  return {
    mode: source === "artifact" ? "artifact" : "env",
    source,
    artifactPath,
    getJwt: () => jwt,
    refreshJwt: async () => jwt,
  };
}

function createArtifactRuntimeAuth(
  jwt: string,
  artifactPath: string,
  artifactRefresher: (artifactPath: string, reason: string) => Promise<string>,
): GesttaRuntimeAuth {
  let currentJwt = jwt;

  return {
    mode: "artifact",
    source: "artifact",
    artifactPath,
    getJwt: () => currentJwt,
    refreshJwt: async () => {
      currentJwt = await artifactRefresher(
        artifactPath,
        "Recebido erro de autenticacao do Gestta",
      );
      return currentJwt;
    },
  };
}

function getExplicitEnvJwt(): string {
  return process.env.JWT_GESTTA?.trim() || process.env.GESTTA_JWT_TOKEN?.trim() || "";
}

function shouldForceArtifactAuth(): boolean {
  const value = process.env.GESTTA_FORCE_ARTIFACT_AUTH?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "sim" || value === "yes";
}

function shouldDisableExternalAuthRefresh(): boolean {
  const value = process.env.GESTTA_DISABLE_EXTERNAL_AUTH_REFRESH?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "sim" || value === "yes";
}

function resolveLegacyLocalEnvPath(startDir = process.cwd()): string {
  return path.resolve(startDir, "..", "_local", ".env");
}

function loadLegacyLocalEnvJwt(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;

  const parsed = dotenv.parse(fs.readFileSync(filePath, "utf8"));
  const jwt = parsed.JWT_GESTTA?.trim() || parsed.GESTTA_JWT_TOKEN?.trim() || "";
  return jwt || null;
}

function resolveSharedOnvioAuthDir(startDir = process.cwd()): string {
  let current = path.resolve(startDir);

  for (;;) {
    const candidate = path.join(current, "shared", "onvio-auth");
    if (fs.existsSync(path.join(candidate, "package.json"))) return candidate;

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return path.resolve(startDir, "shared", "onvio-auth");
}

function resolveWorkspaceAuthArtifactPath(startDir = process.cwd()): string {
  let current = path.resolve(startDir);

  for (;;) {
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

function resolveConfiguredArtifactPath(startDir = process.cwd()): string {
  const explicit = process.env.ONVIO_AUTH_ARTIFACT_PATH?.trim();
  if (explicit) return path.resolve(startDir, explicit);
  return resolveWorkspaceAuthArtifactPath(startDir);
}

function loadArtifactJwt(artifactPath: string): string | null {
  try {
    const raw = fs.readFileSync(artifactPath, "utf8");
    const artifacts = JSON.parse(raw) as { gestta?: { jwt?: unknown } };
    const jwt = typeof artifacts.gestta?.jwt === "string" ? artifacts.gestta.jwt.trim() : "";
    return jwt || null;
  } catch {
    return null;
  }
}

function runCaptureTokens(authDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const bunCommand = process.platform === "win32" ? "bun.exe" : "bun";
    const child = spawn(bunCommand, ["run", "capture-tokens"], {
      cwd: authDir,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      reject(new Error(`Falha ao executar bun para renovar tokens: ${error.message}`));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      const details = stderr.trim() || stdout.trim();
      reject(new Error(`shared/onvio-auth capture-tokens falhou com codigo ${code}: ${details}`));
    });
  });
}

async function refreshArtifactJwt(artifactPath: string, reason: string): Promise<string> {
  if (shouldDisableExternalAuthRefresh()) {
    throw new Error(`${reason}. Faca login novamente pela interface para renovar o acesso ao Gestta.`);
  }

  if (!ongoingRefresh) {
    ongoingRefresh = (async () => {
      const authDir = resolveSharedOnvioAuthDir();
      console.warn(`[auth] ${reason}. Renovando token do Gestta via shared/onvio-auth...`);
      await runCaptureTokens(authDir);

      const jwt = loadArtifactJwt(artifactPath);
      if (!jwt) {
        throw new Error(`Artefato de auth invalido ou ausente em ${artifactPath} apos o refresh.`);
      }

      console.log(`[auth] Token do Gestta recarregado de ${artifactPath}.`);
      return jwt;
    })().finally(() => {
      ongoingRefresh = null;
    });
  }

  return ongoingRefresh;
}

export async function resolveGesttaRuntimeAuth(
  deps: GesttaRuntimeAuthDeps = {},
): Promise<GesttaRuntimeAuth> {
  const forceArtifact = deps.forceArtifact ?? shouldForceArtifactAuth();
  const envJwt = forceArtifact ? "" : (deps.getExplicitEnvJwt ?? getExplicitEnvJwt)();
  if (envJwt) return createStaticRuntimeAuth("local-env", envJwt);

  const artifactPath = (deps.resolveArtifactPath ?? resolveConfiguredArtifactPath)();
  const artifactLoader = deps.loadArtifactJwt ?? loadArtifactJwt;
  const artifactRefresher = deps.refreshArtifactJwt ?? refreshArtifactJwt;
  const artifactJwt = artifactLoader(artifactPath);
  if (artifactJwt) {
    return createArtifactRuntimeAuth(artifactJwt, artifactPath, artifactRefresher);
  }

  let refreshError: Error | null = null;
  try {
    const refreshedJwt = await artifactRefresher(
      artifactPath,
      `Artefato ausente ou invalido em ${artifactPath}`,
    );
    return createArtifactRuntimeAuth(refreshedJwt, artifactPath, artifactRefresher);
  } catch (error) {
    refreshError = error instanceof Error ? error : new Error(String(error));
  }

  const legacyEnvPath = (deps.resolveLegacyEnvPath ?? resolveLegacyLocalEnvPath)();
  const legacyJwt = forceArtifact ? null : (deps.loadLegacyEnvJwt ?? loadLegacyLocalEnvJwt)(legacyEnvPath);
  if (legacyJwt) {
    console.warn(`[auth] Falha ao usar o artefato em ${artifactPath}. Usando fallback legado de ${legacyEnvPath}.`);
    return createStaticRuntimeAuth("legacy-local-env", legacyJwt);
  }

  throw refreshError ?? new Error("Nao foi possivel resolver autenticacao do Gestta.");
}
