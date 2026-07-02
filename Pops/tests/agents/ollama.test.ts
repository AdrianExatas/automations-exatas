import {
  describe,
  expect,
  test,
  beforeEach,
  afterEach,
  mock,
} from "bun:test";
import { OllamaProvider, checkOllamaConnection } from "../../src/agents/providers/ollama";
import { resetConfigForTests } from "../../src/config";
import { resetLlmProviderForTests } from "../../src/agents/providers";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  process.env.LLM_PROVIDER = "ollama";
  process.env.OLLAMA_BASE_URL = "http://localhost:11434";
  process.env.OLLAMA_MODEL = "qwen2.5:7b";
  process.env.OLLAMA_TIMEOUT_MS = "5000";
  resetConfigForTests();
  resetLlmProviderForTests();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetConfigForTests();
  resetLlmProviderForTests();
});

describe("OllamaProvider", () => {
  test("envia payload com format json e roles corretas", async () => {
    let capturedBody: Record<string, unknown> | null = null;

    globalThis.fetch = mock(async (_url, init) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(
        JSON.stringify({
          message: { content: '{"approved": true}' },
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const provider = new OllamaProvider();
    const result = await provider.complete("system prompt", "user prompt");

    expect(result).toBe('{"approved": true}');
    expect(capturedBody?.model).toBe("qwen2.5:7b");
    expect(capturedBody?.stream).toBe(false);
    expect(capturedBody?.format).toBe("json");
    expect(capturedBody?.messages).toEqual([
      { role: "system", content: "system prompt" },
      { role: "user", content: "user prompt" },
    ]);
  });

  test("rejeita resposta vazia", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify({ message: {} }), { status: 200 });
    }) as typeof fetch;

    const provider = new OllamaProvider();
    await expect(provider.complete("s", "u")).rejects.toThrow("Resposta vazia");
  });

  test("propaga erro HTTP do Ollama", async () => {
    globalThis.fetch = mock(async () => {
      return new Response("model not found", { status: 404 });
    }) as typeof fetch;

    const provider = new OllamaProvider();
    await expect(provider.complete("s", "u")).rejects.toThrow("404");
  });
});

describe("checkOllamaConnection", () => {
  test("retorna ok quando modelo está instalado", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          models: [{ name: "qwen2.5:7b" }, { name: "llama3.2:latest" }],
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const result = await checkOllamaConnection();
    expect(result.ok).toBe(true);
    expect(result.models).toContain("qwen2.5:7b");
  });

  test("falha quando modelo configurado não existe", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({ models: [{ name: "llama3.2:latest" }] }),
        { status: 200 },
      );
    }) as typeof fetch;

    const result = await checkOllamaConnection();
    expect(result.ok).toBe(false);
    expect(result.error).toContain("qwen2.5:7b");
  });

  test("falha quando Ollama não responde", async () => {
    globalThis.fetch = mock(async () => {
      throw new Error("fetch failed");
    }) as typeof fetch;

    const result = await checkOllamaConnection();
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("getStoragePaths com STORAGE_PATH customizado", () => {
  test("deriva uploads e outputs de STORAGE_PATH", async () => {
    process.env.STORAGE_PATH = "D:/auto-pop-hub";
    resetConfigForTests();

    const { getStoragePaths } = await import("../../src/config");
    const paths = getStoragePaths();

    expect(paths.base).toBe("D:/auto-pop-hub");
    expect(paths.uploads).toContain("uploads");
    expect(paths.outputs).toContain("outputs");
  });
});
