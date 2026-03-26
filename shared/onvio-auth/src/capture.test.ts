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

class FakeLocator {
  constructor(
    private readonly page: FakePage,
    private readonly selector: string,
  ) {}

  first(): FakeLocator {
    return this;
  }

  async waitFor(): Promise<void> {}

  async click(): Promise<void> {
    if (!this.selector.includes("api.gestta.com.br/dominio/auth/redirect")) return;
    this.page.triggerGesttaAuth();
  }

  async evaluate<T>(callback: (element: HTMLAnchorElement) => T): Promise<T> {
    this.page.target = "_self";
    this.page.triggerGesttaAuth();
    return callback({ target: "_self", click: () => undefined } as HTMLAnchorElement);
  }
}

class FakePopupPage {
  public closed = false;

  async close(): Promise<void> {
    this.closed = true;
  }

  async waitForLoadState(): Promise<void> {
    return;
  }
}

class FakePage {
  public currentUrl = "https://onvio.com.br/staff/#/dashboard-core-center";
  public gotoCalls: string[] = [];
  public target = "_blank";

  constructor(
    private readonly context: FakeContext,
    private readonly emitJwt: boolean,
  ) {}

  async goto(url: string): Promise<void> {
    this.gotoCalls.push(url);
    this.currentUrl = url;
  }

  locator(selector: string): FakeLocator {
    return new FakeLocator(this, selector);
  }

  async waitForLoadState(): Promise<void> {
    return;
  }

  async waitForURL(
    matcher: RegExp | ((url: URL) => boolean),
  ): Promise<void> {
    const destination = "https://app.gestta.com.br/dashboard-v2/#/dashboard-v2";
    const matches =
      matcher instanceof RegExp
        ? matcher.test(destination)
        : matcher(new URL(destination));
    if (!matches) {
      throw new Error(`URL nao corresponde: ${destination}`);
    }
    this.currentUrl = destination;
    return;
  }

  triggerGesttaAuth(): void {
    if (this.target !== "_self") {
      this.context.emit("page", new FakePopupPage());
    }
    if (!this.emitJwt) return;
    this.context.emit(
      "request",
      new FakeRequest("https://api.gestta.com.br/admin/customer", {
        authorization: "JWT jwt-capturado",
      }),
    );
  }
}

class FakeContext extends EventEmitter {
  public newPageCalls = 0;

  constructor(private readonly emitJwt: boolean) {
    super();
  }

  async newPage(): Promise<FakePage> {
    this.newPageCalls += 1;
    return new FakePage(this, this.emitJwt);
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
    const context = new FakeContext(true);
    const page = await context.newPage();

    const result = await collectAuthArtifactsFromContext(context as never, page as never, {
      email: "user@example.com",
      password: "secret",
      storageStatePath,
      artifactPath,
      writeArtifact: true,
    });

    expect(result.onvio.udsLongToken).toBe("uds-token");
    expect(result.gestta.jwt).toBe("jwt-capturado");
    expect(context.newPageCalls).toBe(1);
    expect(page.gotoCalls).toContain("https://onvio.com.br/staff/#/dashboard-core-center");
    expect(page.currentUrl).toBe("https://app.gestta.com.br/dashboard-v2/#/dashboard-v2");
    expect(page.target).toBe("_self");
    expect(fs.existsSync(storageStatePath)).toBe(true);
    expect(fs.existsSync(artifactPath)).toBe(true);
  });

  it("falha quando nenhuma request autenticada do Gestta e capturada", async () => {
    const context = new FakeContext(false);
    const page = await context.newPage();

    await expect(
      collectAuthArtifactsFromContext(context as never, page as never, {
        email: "user@example.com",
        password: "secret",
        storageStatePath: makeTempFile("storageState.json"),
        gesttaApiBaseUrl: "https://api.gestta.com.br/",
        mfa: { timeoutMs: 10 },
      }),
    ).rejects.toThrow("Nenhuma requisicao autenticada");
  });
});
