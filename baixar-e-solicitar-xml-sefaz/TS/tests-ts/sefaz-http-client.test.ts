import { afterEach, describe, expect, it, mock } from "bun:test";
import { SefazHttpClient, SefazHttpError } from "../src-ts/sefaz-http/client.js";

type RequestForTest = (
  method: "GET" | "POST",
  url: string,
  options?: {
    checkSession?: boolean;
    retry?: boolean;
    timeoutMs?: number;
  },
) => Promise<{ status: number; text: string }>;

const originalFetch = globalThis.fetch;

function requestForTest(client: SefazHttpClient): RequestForTest {
  return (client as unknown as { request: RequestForTest }).request.bind(client);
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
