import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { resetConfigForTests } from "../src/config";
import { resetDbForTests, getDb } from "../src/db/client";
import { upsertMasterIndex } from "../src/db/repository";
import { allocateCodes, formatDocCode } from "../src/services/numbering";
import { sectorCode } from "../src/types/status";

let testRoot = "";

describe("numbering", () => {
  beforeEach(() => {
    testRoot = join(
      import.meta.dir,
      "..",
      "storage",
      `test-numbering-${crypto.randomUUID()}`,
    );
    mkdirSync(testRoot, { recursive: true });
    process.env.STORAGE_PATH = testRoot;
    process.env.DATABASE_PATH = join(testRoot, "test.db");
    process.env.PUBLISH_ROOT = join(testRoot, "publish");
    process.env.SKIP_OFFICE = "1";
    process.env.LLM_PROVIDER = "ollama";
    resetConfigForTests();
    resetDbForTests();
    getDb();
  });

  afterEach(() => {
    resetDbForTests();
    try {
      rmSync(testRoot, { recursive: true, force: true });
    } catch {
      /* Windows pode manter lock breve no sqlite */
    }
  });

  test("sectorCode Atendimento → ATE", () => {
    expect(sectorCode("Atendimento")).toBe("ATE");
  });

  test("formatDocCode", () => {
    expect(formatDocCode("it", "Atendimento", 17)).toBe("IN.ATE.017");
    expect(formatDocCode("form", "Atendimento", 6)).toBe("FORM.ATE.006");
  });

  test("allocateCodes incrementa após índice", () => {
    upsertMasterIndex({
      code: "IN.ATE.016",
      title: "Anterior",
      docType: "it",
      setor: "Atendimento",
      sectorCode: "ATE",
      number: 16,
      version: "1.0",
      status: "vigente",
      responsible: "Líder",
    });
    const alloc = allocateCodes("Atendimento", ["it", "form"]);
    expect(alloc.codes.it).toBe("IN.ATE.017");
    expect(alloc.codes.form).toMatch(/^FORM\.ATE\.\d{3}$/);
  });
});
