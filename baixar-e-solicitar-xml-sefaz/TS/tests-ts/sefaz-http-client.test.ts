import { afterEach, describe, expect, it, mock } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { SefazHttpClient, SefazHttpError, SefazPortalIncompatibleError } from "../src-ts/sefaz-http/client.js";

type RequestForTest = (
  method: "GET" | "POST",
  url: string,
  options?: {
    checkSession?: boolean;
    retry?: boolean;
    timeoutMs?: number;
  },
) => Promise<{ status: number; text: string }>;

type HttpResponseForTest = {
  url: string;
  status: number;
  headers: Headers;
  text: string;
  buffer: Buffer;
};

const originalFetch = globalThis.fetch;
const currentFile = fileURLToPath(import.meta.url);

function requestForTest(client: SefazHttpClient): RequestForTest {
  return (client as unknown as { request: RequestForTest }).request.bind(client);
}

function mockCertificateRequest(
  client: SefazHttpClient,
  handler: (url: string) => Promise<{ url: string; status: number; headers?: Headers; text?: string }>,
): void {
  (client as unknown as {
    requestWithClientCertificate: (url: string) => Promise<{
      url: string;
      status: number;
      headers: Headers;
      text: string;
      buffer: Buffer;
    }>;
  }).requestWithClientCertificate = async (url: string) => {
    const response = await handler(url);
    return {
      url: response.url,
      status: response.status,
      headers: response.headers ?? new Headers(),
      text: response.text ?? "",
      buffer: Buffer.from(response.text ?? ""),
    };
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("sefaz-http client retry/timeout", () => {
  it("repete erro de abort e retorna sucesso na tentativa seguinte", async () => {
    let calls = 0;
    globalThis.fetch = mock(async () => {
      calls += 1;
      if (calls === 1) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }
      return new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
    }) as unknown as typeof fetch;

    const client = new SefazHttpClient(10, 2);
    const response = await requestForTest(client)("GET", "https://example.test/retry", { checkSession: false });

    expect(response.text).toBe("ok");
    expect(calls).toBe(2);
  });

  it("gera erro legivel quando o timeout esgota as tentativas", async () => {
    globalThis.fetch = mock(async () => {
      throw new DOMException("The operation was aborted.", "AbortError");
    }) as unknown as typeof fetch;

    const client = new SefazHttpClient(10, 1);
    const promise = requestForTest(client)("GET", "https://example.test/slow", { checkSession: false });

    await expect(promise).rejects.toThrow(SefazHttpError);
    await expect(promise).rejects.toThrow("Timeout HTTP apos 10ms em GET https://example.test/slow");
  });

  it("repete status 503 e preserva cookies entre tentativas", async () => {
    let calls = 0;
    let cookieOnRetry = "";
    globalThis.fetch = mock(async (_url, init) => {
      calls += 1;
      if (calls === 1) {
        return new Response("indisponivel", {
          status: 503,
          headers: {
            "content-type": "text/plain",
            "set-cookie": "SESSAO=abc123; Path=/",
          },
        });
      }
      cookieOnRetry = init?.headers instanceof Headers ? (init.headers.get("Cookie") ?? "") : "";
      return new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
    }) as unknown as typeof fetch;

    const client = new SefazHttpClient(10, 2);
    const response = await requestForTest(client)("GET", "https://example.test/status", { checkSession: false });

    expect(response.text).toBe("ok");
    expect(calls).toBe(2);
    expect(cookieOnRetry).toContain("SESSAO=abc123");
  });

  it("nao repete quando retry e false", async () => {
    let calls = 0;
    globalThis.fetch = mock(async () => {
      calls += 1;
      throw new DOMException("The operation was aborted.", "AbortError");
    }) as unknown as typeof fetch;

    const client = new SefazHttpClient(10, 3);
    const promise = requestForTest(client)("POST", "https://example.test/final", {
      checkSession: false,
      retry: false,
    });

    await expect(promise).rejects.toThrow("tentativa 1/1");
    expect(calls).toBe(1);
  });
});

describe("sefaz-http client login com certificado", () => {
  it("autentica quando o portal retorna portal.jsp", async () => {
    const client = new SefazHttpClient(10, 1);
    mockCertificateRequest(client, async () => ({
      url: "https://security.sefaz.se.gov.br/internet/portal.jsp",
      status: 200,
      text: "<html>portal</html>",
    }));

    await expect(client.loginComCertificado(currentFile, "senha")).resolves.toBe(true);
  });

  it("gera erro quando o destino final nao e o portal", async () => {
    const client = new SefazHttpClient(10, 1);
    mockCertificateRequest(client, async () => ({
      url: "https://security.sefaz.se.gov.br/certificado/login.aspx",
      status: 200,
      text: "<html>Falha no certificado</html>",
    }));

    await expect(client.loginComCertificado(currentFile, "senha")).rejects.toThrow(SefazPortalIncompatibleError);
    await expect(client.loginComCertificado(currentFile, "senha")).rejects.toThrow("Falha no login por certificado no portal legado");
  });

  it("preserva cookie do login por certificado nas proximas requisicoes", async () => {
    const client = new SefazHttpClient(10, 1);
    mockCertificateRequest(client, async () => ({
      url: "https://security.sefaz.se.gov.br/internet/portal.jsp",
      status: 200,
      headers: new Headers({ "set-cookie": "CERTSESSAO=abc123; Path=/; HttpOnly" }),
      text: "<html>portal</html>",
    }));

    await client.loginComCertificado(currentFile, "senha");

    let cookieHeader = "";
    globalThis.fetch = mock(async (_url, init) => {
      cookieHeader = init?.headers instanceof Headers ? (init.headers.get("Cookie") ?? "") : "";
      return new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
    }) as unknown as typeof fetch;

    await requestForTest(client)("GET", "https://security.sefaz.se.gov.br/internet/portal.jsp", {
      checkSession: false,
    });

    expect(cookieHeader).toContain("CERTSESSAO=abc123");
  });

  it("valida caminho do certificado antes de chamar o portal", async () => {
    const client = new SefazHttpClient(10, 1);

    await expect(client.loginComCertificado("", "senha")).rejects.toThrow("SEFAZ_CERT_PFX_PATH nao configurado");
    await expect(client.loginComCertificado("C:\\certificado\\inexistente.pfx", "senha")).rejects.toThrow(
      "Certificado PFX nao encontrado",
    );
  });

  it("valida senha do certificado antes de chamar o portal", async () => {
    const client = new SefazHttpClient(10, 1);

    await expect(client.loginComCertificado(currentFile, "")).rejects.toThrow(
      "SEFAZ_CERT_PFX_PASSWORD nao configurado",
    );
  });
});

describe("sefaz-http client formulario de solicitacao", () => {
  function response(url: string, text: string): HttpResponseForTest {
    return {
      url,
      status: 200,
      headers: new Headers({ "content-type": "text/html" }),
      text,
      buffer: Buffer.from(text),
    };
  }

  function portalHtml(): string {
    return `<a href="process.jsp?AppName=SPED&TransId=T10461&token=portal-token">Solicitar Arquivos XML</a>`;
  }

  it("refaz a listagem uma vez quando o link novo nao aparece inicialmente", async () => {
    const client = new SefazHttpClient(10, 1);
    const internals = client as unknown as {
      ensurePortal: () => Promise<HttpResponseForTest>;
      request: (method: "GET" | "POST", url: string, options?: Record<string, unknown>) => Promise<HttpResponseForTest>;
    };
    const requestedUrls: string[] = [];
    let listingCalls = 0;

    internals.ensurePortal = async () =>
      response("https://security.sefaz.se.gov.br/internet/portal.jsp", portalHtml());
    internals.request = async (_method, url) => {
      requestedUrls.push(url);
      if (url.includes("TransId=T10464")) {
        return response(
          url,
          `<form method="post" action="next.jsp"><select name="cdPessoaContribuinte"><option value="123">Empresa Teste</option></select></form>`,
        );
      }

      listingCalls += 1;
      if (listingCalls === 1) {
        return response(
          "https://security.sefaz.se.gov.br/internet/process.jsp?AppName=SPED&TransId=T10461&token=first-token",
          `<a href="process.jsp?TransId=T10461&token=first-token">Data de Solicitacao</a>`,
        );
      }

      return response(
        "https://security.sefaz.se.gov.br/internet/process.jsp?AppName=SPED&TransId=T10461&token=second-token",
        `<a href="/internet/process.jsp?RedirectUrl=/internet/process.jsp?AppName=SPED;TransId=T10461;Flag=42&AppName=SPED&TransId=T10464&token=second-token"></a>`,
      );
    };

    const form = await client.abrirFormularioSolicitacao();

    expect(listingCalls).toBe(2);
    expect(requestedUrls.some((url) => url.includes("TransId=T10464"))).toBe(true);
    expect(form.selectOptions.cdPessoaContribuinte?.["Empresa Teste"]).toBe("123");
  });

  it("salva diagnostico sanitizado quando o link novo continua ausente", async () => {
    const client = new SefazHttpClient(10, 1);
    const internals = client as unknown as {
      ensurePortal: () => Promise<HttpResponseForTest>;
      request: (method: "GET" | "POST", url: string, options?: Record<string, unknown>) => Promise<HttpResponseForTest>;
    };

    internals.ensurePortal = async () =>
      response("https://security.sefaz.se.gov.br/internet/portal.jsp", portalHtml());
    internals.request = async () =>
      response(
        "https://security.sefaz.se.gov.br/internet/process.jsp?AppName=SPED&TransId=T10461&token=secret-token",
        `<a href="process.jsp?TransId=T10461&token=secret-token">Data de Solicitacao</a>`,
      );

    let thrown: unknown;
    try {
      await client.abrirFormularioSolicitacao();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(SefazPortalIncompatibleError);
    const message = (thrown as Error).message;
    expect(message).toContain("comando de nova solicitacao");
    expect(message).toContain("Links encontrados: 1");
    expect(message).toContain("token=<redacted>");
    expect(message).not.toContain("secret-token");

    const debugPath = /HTML salvo em (.+\.html)$/.exec(message)?.[1];
    expect(debugPath).toBeTruthy();
    expect(existsSync(debugPath ?? "")).toBe(true);

    const debugHtml = readFileSync(debugPath ?? "", "utf8");
    expect(debugHtml).toContain("token=<redacted>");
    expect(debugHtml).not.toContain("secret-token");
    rmSync(debugPath ?? "", { force: true });
  });
});

describe("sefaz-http client listagem e download", () => {
  function response(url: string, text: string, contentType = "text/html"): HttpResponseForTest {
    return {
      url,
      status: 200,
      headers: new Headers({ "content-type": contentType }),
      text,
      buffer: Buffer.from(text),
    };
  }

  function portalHtml(): string {
    return `<a href="process.jsp?AppName=SPED&TransId=T10461&token=portal-token">Solicitar Arquivos XML</a>`;
  }

  it("retorna a primeira pagina quando o HTML nao tem chrome de paginacao", async () => {
    const client = new SefazHttpClient(10, 1);
    const internals = client as unknown as {
      ensurePortal: () => Promise<HttpResponseForTest>;
      request: (method: "GET" | "POST", url: string, options?: Record<string, unknown>) => Promise<HttpResponseForTest>;
    };

    internals.ensurePortal = async () =>
      response("https://security.sefaz.se.gov.br/internet/portal.jsp", portalHtml());
    internals.request = async (_method, url) =>
      response(
        url,
        `
        <table>
          <tr>
            <td><a href="process.jsp?nmArquivo=271_EMPRESA&tdb_dsTipoDownload=NFE&dtSolicitacao=02012026090000&dsSituacao=PRONTO%20PARA%20DOWNLOAD">Baixar</a></td>
          </tr>
        </table>
        <a href="process.jsp?TransId=T10464">Novo</a>
        `,
      );

    const listing = await client.listarDownloads(1, true);
    expect(listing.currentPage).toBeUndefined();
    expect(listing.downloads).toHaveLength(1);
    expect(listing.downloads[0]?.nmArquivo).toBe("271_EMPRESA");
  });

  it("falha de forma explicita apos redirecionamentos HTML repetidos", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "sefaz-download-"));
    const config = await import("../src-ts/core/config.js");
    config.PATHS.downloadsDir = join(tempDir, "downloads");
    mkdirSync(config.PATHS.downloadsDir, { recursive: true });

    const client = new SefazHttpClient(10, 1);
    const internals = client as unknown as {
      request: (method: "GET" | "POST", url: string, options?: Record<string, unknown>) => Promise<HttpResponseForTest>;
    };
    let calls = 0;
    internals.request = async (_method, url) => {
      calls += 1;
      return response(url, `<script>window.location='next${calls}.jsp'</script>`);
    };

    await expect(
      client.baixarArquivo({
        url: "https://security.sefaz.se.gov.br/internet/process.jsp?nmArquivo=ARQUIVO",
        nmArquivo: "ARQUIVO",
        situacao: "PRONTO PARA DOWNLOAD",
        tipoDownload: "NFE",
        rowText: "",
      }),
    ).rejects.toThrow("redirecionamentos HTML repetidos");
    expect(calls).toBe(3);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("redige token no HTML inesperado de download", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "sefaz-download-html-"));
    const config = await import("../src-ts/core/config.js");
    const originalProjectRoot = config.PATHS.projectRoot;
    config.PATHS.projectRoot = tempDir;
    mkdirSync(join(tempDir, "_local", "debug", "sefaz_download_html"), { recursive: true });

    const client = new SefazHttpClient(10, 1);
    const internals = client as unknown as {
      request: (method: "GET" | "POST", url: string, options?: Record<string, unknown>) => Promise<HttpResponseForTest>;
    };
    internals.request = async () =>
      response(
        "https://security.sefaz.se.gov.br/internet/process.jsp?token=secret-download",
        `<html><a href="process.jsp?token=secret-download">sem zip</a></html>`,
      );

    let thrown: unknown;
    try {
      await client.baixarArquivo({
        url: "https://security.sefaz.se.gov.br/internet/process.jsp?nmArquivo=ARQUIVO&token=secret-download",
        nmArquivo: "ARQUIVO",
        situacao: "PRONTO PARA DOWNLOAD",
        tipoDownload: "NFE",
        rowText: "",
      });
    } catch (error) {
      thrown = error;
    } finally {
      config.PATHS.projectRoot = originalProjectRoot;
    }

    expect(thrown).toBeInstanceOf(SefazHttpError);
    const message = (thrown as Error).message;
    expect(message).toContain("HTML em vez do ZIP");
    const debugPath = /salva em (.+\.html)/.exec(message)?.[1];
    expect(debugPath).toBeTruthy();
    const debugHtml = readFileSync(debugPath ?? "", "utf8");
    expect(debugHtml).toContain("token=<redacted>");
    expect(debugHtml).not.toContain("secret-download");
    rmSync(tempDir, { recursive: true, force: true });
  });
});
