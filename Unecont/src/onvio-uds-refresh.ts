import { spawn } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import {
  loadWorkspaceAuthArtifacts,
  resolveWorkspaceAuthArtifactPath,
} from "@exatas/onvio-auth";

const nodeRequire = createRequire(__filename);

export function resolveOnvioAuthPackageRoot(): string {
  const entry = nodeRequire.resolve("@exatas/onvio-auth");
  return path.resolve(path.dirname(entry), "..");
}

function resolveArtifactPathForRead(): string {
  const explicit = process.env.ONVIO_AUTH_ARTIFACT_PATH?.trim();
  if (explicit) {
    return path.isAbsolute(explicit) ? explicit : path.resolve(process.cwd(), explicit);
  }
  return resolveWorkspaceAuthArtifactPath(process.cwd());
}

export function runOnvioAuthCaptureTokens(authPackageRoot: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", "capture-tokens"], {
      cwd: authPackageRoot,
      env: process.env,
      stdio: "inherit",
      shell: true,
    });

    child.on("error", (error) => {
      reject(new Error(`Falha ao executar capture-tokens: ${error.message}`));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`shared/onvio-auth capture-tokens falhou com codigo ${code ?? "desconhecido"}`));
    });
  });
}

export function readCachedUdsLongTokenForUpload(): string {
  try {
    const artifactPath = resolveArtifactPathForRead();
    const artifacts = loadWorkspaceAuthArtifacts(process.cwd(), artifactPath);
    return artifacts?.onvio?.udsLongToken?.trim() ?? "";
  } catch {
    return "";
  }
}

export async function refreshUdsLongTokenForUpload(): Promise<string> {
  const authRoot = resolveOnvioAuthPackageRoot();
  await runOnvioAuthCaptureTokens(authRoot);

  const artifactPath = resolveArtifactPathForRead();
  const artifacts = loadWorkspaceAuthArtifacts(process.cwd(), artifactPath);
  const token = artifacts?.onvio?.udsLongToken?.trim() ?? "";
  if (!token) {
    throw new Error(
      `UDSLongToken ausente apos capture-tokens. Verifique o artefato em ${artifactPath}.`,
    );
  }
  return token;
}
