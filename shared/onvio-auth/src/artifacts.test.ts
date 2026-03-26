import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  loadAuthArtifactsFromFile,
  loadWorkspaceAuthArtifacts,
  writeAuthArtifacts,
} from "./artifacts";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onvio-auth-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("auth artifacts", () => {
  it("serializa e recarrega o artefato", () => {
    const dir = makeTempDir();
    const filePath = path.join(dir, "latest-auth.json");
    writeAuthArtifacts(filePath, {
      capturedAt: "2026-03-26T12:00:00.000Z",
      session: {
        baseUrl: "https://onvio.com.br",
        capturedAt: "2026-03-26T12:00:00.000Z",
        storageState: { cookies: [], origins: [] },
        cookies: [],
      },
      onvio: { udsLongToken: "UDS" },
      gestta: { jwt: "JWT123", requestUrl: "https://api.gestta.com.br/admin/customer" },
    });

    expect(loadAuthArtifactsFromFile(filePath)?.gestta.jwt).toBe("JWT123");
  });

  it("carrega artefato a partir da raiz do workspace", () => {
    const repoRoot = makeTempDir();
    const packageDir = path.join(repoRoot, "shared", "onvio-auth");
    fs.mkdirSync(packageDir, { recursive: true });
    fs.writeFileSync(path.join(packageDir, "package.json"), "{}", "utf8");

    const artifactPath = path.join(packageDir, "runtime", "latest-auth.json");
    writeAuthArtifacts(artifactPath, {
      capturedAt: "2026-03-26T12:00:00.000Z",
      session: {
        baseUrl: "https://onvio.com.br",
        capturedAt: "2026-03-26T12:00:00.000Z",
        storageState: { cookies: [], origins: [] },
        cookies: [],
      },
      onvio: { udsLongToken: "UDS" },
      gestta: { jwt: "JWT123", requestUrl: "https://api.gestta.com.br/admin/customer" },
    });

    const appDir = path.join(repoRoot, "Onvio", "gestta-tarefas", "alterar-responsavel");
    fs.mkdirSync(appDir, { recursive: true });

    expect(loadWorkspaceAuthArtifacts(appDir)?.onvio.udsLongToken).toBe("UDS");
  });
});
