import { describe, expect, test } from "bun:test";
import { extractJsonFromResponse } from "../../src/agents/base";

describe("extractJsonFromResponse", () => {
  test("extrai JSON de bloco fenced", () => {
    const text = 'Aqui está:\n```json\n{"approved": true}\n```';
    expect(extractJsonFromResponse(text)).toEqual({ approved: true });
  });

  test("extrai JSON puro", () => {
    const text = '{"approved": false, "issues": ["x"]}';
    expect(extractJsonFromResponse(text)).toEqual({
      approved: false,
      issues: ["x"],
    });
  });

  test("extrai JSON embutido em texto", () => {
    const text = 'Resposta: {"ok": true} fim';
    expect(extractJsonFromResponse(text)).toEqual({ ok: true });
  });
});
