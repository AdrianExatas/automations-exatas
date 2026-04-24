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

interface GesttaRuntimeAuthDeps {
  getExplicitEnvJwt?: () => string;
  resolveArtifactPath?: () => string;
  loadArtifactJwt?: (artifactPath: string) => string | null;
  refreshArtifactJwt?: (artifactPath: string, reason: string) => Promise<string>;
  resolveLegacyEnvPath?: () => string;
  loadLegacyEnvJwt?: (legacyEnvPath: string) => string | null;
}

let ongoingRefresh: Promise<string> | null = null;
let workspaceAuthModule:
  | {
      loadWorkspaceAuthArtifacts: (cwd: string, artifactPath: string) => {
        gestta?: { jwt?: string };
      } | null;
      resolveWorkspaceAuthArtifactPath: (cwd: string) => string;
    }
  | null = null;

function getWorkspaceAuthModule(): NonNullable<typeof workspaceAuthModule> {
  if (!workspaceAuthModule) {
    workspaceAuthModule = require("@exatas/onvio-auth") as NonNullable<
      typeof workspaceAuthModule
    >;
  }

  return workspaceAuthModule;
}

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

function getExplicitEnvJwt(): string {
  return process.env.JWT_GESTTA?.trim() || process.env.GESTTA_JWT_TOKEN?.trim() || "";
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

  while (true) {
    const candidate = path.join(current, "shared", "onvio-auth");
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return path.resolve(startDir, "shared", "onvio-auth");
}

function resolveConfiguredArtifactPath(startDir = process.cwd()): string {
  const explicitPath = process.env.ONVIO_AUTH_ARTIFACT_PATH?.trim();
  if (explicitPath) {
    return path.resolve(startDir, explicitPath);
  }
  return getWorkspaceAuthModule().resolveWorkspaceAuthArtifactPath(startDir);
}

function loadArtifactJwt(artifactPath: string): string | null {
  try {
    const artifacts = getWorkspaceAuthModule().loadWorkspaceAuthArtifacts(
      process.cwd(),
      artifactPath,
    );
    const jwt = artifacts?.gestta?.jwt?.trim() || "";
    return jwt || null;
  } catch {
    return null;
  }
}

function runCaptureTokens(authDir: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
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
        resolvePromise();
        return;
      }

      const details = stderr.trim() || stdout.trim();
      reject(
        new Error(`shared/onvio-auth capture-tokens falhou com codigo ${code}: ${details}`),
      );
    });
  });
}

async function refreshArtifactJwt(artifactPath: string, reason: string): Promise<string> {
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
  const explicitEnvJwt = (deps.getExplicitEnvJwt ?? getExplicitEnvJwt)();
  if (explicitEnvJwt) {
    return createStaticRuntimeAuth("local-env", explicitEnvJwt);
  }

  const artifactPath = (deps.resolveArtifactPath ?? resolveConfiguredArtifactPath)();
  const artifactLoader = deps.loadArtifactJwt ?? loadArtifactJwt;
  const artifactRefresher = deps.refreshArtifactJwt ?? refreshArtifactJwt;
  const legacyEnvPath = (deps.resolveLegacyEnvPath ?? resolveLegacyLocalEnvPath)();
  const legacyEnvJwt = (deps.loadLegacyEnvJwt ?? loadLegacyLocalEnvJwt)(legacyEnvPath);

  const artifactJwt = artifactLoader(artifactPath);
  if (artifactJwt) {
    return {
      mode: "artifact",
      source: "artifact",
      artifactPath,
      getJwt: () => artifactJwt,
      refreshJwt: async () =>
        artifactRefresher(artifactPath, "Recebido erro de autenticacao do Gestta"),
    };
  }

  let refreshError: Error | null = null;
  try {
    const refreshedJwt = await artifactRefresher(
      artifactPath,
      `Artefato ausente ou invalido em ${artifactPath}`,
    );
    return {
      mode: "artifact",
      source: "artifact",
      artifactPath,
      getJwt: () => refreshedJwt,
      refreshJwt: async () =>
        artifactRefresher(artifactPath, "Recebido erro de autenticacao do Gestta"),
    };
  } catch (error: unknown) {
    refreshError = error instanceof Error ? error : new Error(String(error));
  }

  if (legacyEnvJwt) {
    console.warn(
      `[auth] Falha ao usar o artefato em ${artifactPath}. Usando fallback legado de ${legacyEnvPath}.`,
    );
    return createStaticRuntimeAuth("legacy-local-env", legacyEnvJwt);
  }

  throw (
    refreshError ??
    new Error(
      `Defina JWT_GESTTA ou GESTTA_JWT_TOKEN no .env, gere ${artifactPath}, ou configure o fallback legado em ${legacyEnvPath}.`,
    )
  );
}
