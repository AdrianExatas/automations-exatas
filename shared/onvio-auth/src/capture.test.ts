import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { collectAuthArtifactsFromContext, waitForGesttaJwtRequest } from "./capture";

class FakeRequest {
  constructor(
    private readonly requestUrl: string,
    private readonly requestHeaders: Record<string, string>,
  ) {}

  url(): string {
    return this.requestUrl;
  }

  headers(): Record<string, string> {
    return this.requestHeaders;
  }
}

class FakePage {
  constructor(private readonly onGoto: () => void) {}

  async goto(): Promise<void> {
    this.onGoto();
  }
}

class FakeContext extends EventEmitter {
  constructor(private readonly emitJwt: boolean) {
    super();
  }

  async newPage(): Promise<FakePage> {
    return new FakePage(() => {
      if (!this.emitJwt) return;
      this.emit(
        "request",
        new FakeRequest("https://api.gestta.com.br/admin/customer", {
          authorization: "JWT jwt-capturado",
        }),
      );
    });
  }

  async storageState(): Promise<{ cookies: []; origins: [] }> {
    return { cookies: [], origins: [] };
  }

  async cookies(): Promise<
    Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
      expires: number;
      httpOnly: boolean;
      secure: boolean;
      sameSite: string;
    }>
  > {
    return [
      {
        name: "UDSLongToken",
        value: "uds-token",
        domain: ".onvio.com.br",
        path: "/",
        expires: 1_800_000_000,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    ];
  }
}

const tempDirs: string[] = [];

function makeTempFile(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onvio-auth-capture-"));
  tempDirs.push(dir);
  return path.join(dir, name);
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("capture flow", () => {
  it("captura JWT do Gestta por request", async () => {
    const context = new FakeContext(true);
    const result = waitForGesttaJwtRequest(
      context as never,
      "https://api.gestta.com.br/",
      50,
    );

    context.emit(
      "request",
      new FakeRequest("https://api.gestta.com.br/admin/customer", {
        authorization: "JWT jwt-capturado",
      }),
    );

    await expect(result).resolves.toEqual({
      jwt: "jwt-capturado",
      requestUrl: "https://api.gestta.com.br/admin/customer",
    });
  });

  it("coleta artefatos completos a partir do contexto autenticado", async () => {
    const storageStatePath = makeTempFile("storageState.json");
    const artifactPath = makeTempFile("latest-auth.json");

    const result = await collectAuthArtifactsFromContext(new FakeContext(true) as never, {
      email: "user@example.com",
      password: "secret",
      storageStatePath,
      artifactPath,
      writeArtifact: true,
    });

    expect(result.onvio.udsLongToken).toBe("uds-token");
    expect(result.gestta.jwt).toBe("jwt-capturado");
    expect(fs.existsSync(storageStatePath)).toBe(true);
    expect(fs.existsSync(artifactPath)).toBe(true);
  });

  it("falha quando nenhuma request autenticada do Gestta e capturada", async () => {
    await expect(
      collectAuthArtifactsFromContext(new FakeContext(false) as never, {
        email: "user@example.com",
        password: "secret",
        storageStatePath: makeTempFile("storageState.json"),
        gesttaApiBaseUrl: "https://api.gestta.com.br/",
        mfa: { timeoutMs: 10 },
      }),
    ).rejects.toThrow("Nenhuma requisicao autenticada");
  });
});
