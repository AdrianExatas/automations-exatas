import { describe, expect, test } from "bun:test";
import {
  parseTranscriptionFile,
  shouldRetryValidation,
  formatValidationFeedback,
} from "../src/utils/transcription";
import { popDocumentSchema, validationResultSchema } from "../src/types/pop";

describe("parseTranscriptionFile", () => {
  test("extrai texto de arquivo .txt", () => {
    const result = parseTranscriptionFile("video.txt", "  Conteúdo da transcrição  ");
    expect(result).toBe("Conteúdo da transcrição");
  });

  test("extrai campo transcription de JSON", () => {
    const json = JSON.stringify({ transcription: "Texto do vídeo" });
    const result = parseTranscriptionFile("video.json", json);
    expect(result).toBe("Texto do vídeo");
  });

  test("extrai campo text de JSON", () => {
    const json = JSON.stringify({ text: "Outro formato" });
    const result = parseTranscriptionFile("video.json", json);
    expect(result).toBe("Outro formato");
  });

  test("rejeita JSON sem campo de transcrição", () => {
    expect(() => parseTranscriptionFile("video.json", "{}")).toThrow(
      'deve conter campo "transcription"',
    );
  });

  test("rejeita arquivo vazio", () => {
    expect(() => parseTranscriptionFile("vazio.txt", "   ")).toThrow("vazio");
  });
});

describe("shouldRetryValidation", () => {
  test("retenta quando rejeitado e attempt < max", () => {
    expect(shouldRetryValidation(false, 1, 3)).toBe(true);
  });

  test("não retenta quando aprovado", () => {
    expect(shouldRetryValidation(true, 1, 3)).toBe(false);
  });

  test("não retenta quando attempt >= max", () => {
    expect(shouldRetryValidation(false, 3, 3)).toBe(false);
  });
});

describe("formatValidationFeedback", () => {
  test("formata feedback completo", () => {
    const result = formatValidationFeedback({
      issues: ["Problema A"],
      missingSteps: ["Passo X"],
      hallucinations: ["Passo inventado"],
    });
    expect(result).toContain("Problema A");
    expect(result).toContain("Passo X");
    expect(result).toContain("Passo inventado");
  });
});

describe("popDocumentSchema", () => {
  test("valida POP estruturado", () => {
    const pop = {
      header: {
        title: "Emissão de GPS",
        version: "1.0",
        responsible: "DP",
        reviewDate: "27/05/2026",
      },
      objective: "Emitir guia corretamente",
      prerequisites: ["Acesso ao Domínio"],
      steps: [{ order: 1, action: "Acessar", detail: "Abrir o sistema" }],
      qualityControl: ["Conferir valor da guia"],
    };
    expect(popDocumentSchema.parse(pop)).toEqual(pop);
  });
});

describe("validationResultSchema", () => {
  test("valida resultado de aprovação", () => {
    const result = {
      approved: true,
      issues: [],
      missingSteps: [],
      hallucinations: [],
    };
    expect(validationResultSchema.parse(result)).toEqual(result);
  });
});
