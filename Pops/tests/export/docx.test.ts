import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  exportPopToDocx,
  getFeedbackUrlForJob,
} from "../../src/export/docx";
import type { PopDocument } from "../../src/types/pop";

const TEST_DIR = "./storage/test-outputs";

const samplePop: PopDocument = {
  header: {
    title: "Teste POP",
    version: "1.0",
    responsible: "Processos",
    reviewDate: "27/05/2026",
  },
  objective: "Validar exportação docx",
  prerequisites: ["Sistema X", "Token Y"],
  steps: [
    { order: 1, action: "Acessar", detail: "Abrir o sistema" },
    { order: 2, action: "Conferir", detail: "Validar dados" },
  ],
  qualityControl: ["Documento gerado corretamente"],
};

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("exportPopToDocx", () => {
  test("gera arquivo .docx", async () => {
    const outputPath = join(TEST_DIR, "test-job.docx");
    const feedbackUrl = getFeedbackUrlForJob(
      "http://localhost:3000",
      "token-123",
    );

    const result = await exportPopToDocx(samplePop, outputPath, feedbackUrl);
    expect(result).toBe(outputPath);

    const file = Bun.file(outputPath);
    expect(await file.exists()).toBe(true);
    expect(file.size).toBeGreaterThan(1000);
  });
});

describe("getFeedbackUrlForJob", () => {
  test("monta URL sem barra duplicada", () => {
    expect(
      getFeedbackUrlForJob("http://localhost:3000/", "abc"),
    ).toBe("http://localhost:3000/feedback/abc");
  });
});
