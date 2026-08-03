import { describe, expect, test } from "bun:test";
import { normalizeTranscriptionStatus } from "../src/workers/pipeline";

describe("normalizeTranscriptionStatus", () => {
  test("mapeia success → concluida", () => {
    expect(normalizeTranscriptionStatus("success")).toBe("concluida");
  });

  test("preserva enums válidos", () => {
    expect(normalizeTranscriptionStatus("fornecida")).toBe("fornecida");
    expect(normalizeTranscriptionStatus("falhou")).toBe("falhou");
  });
});
