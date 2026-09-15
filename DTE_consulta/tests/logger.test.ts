import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { SafeLogger, sanitizeText } from "../src/logger.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("sanitizacao", () => {
  test("remove JWT, bearer, cookie, CPF e segredo explicito", () => {
    const input =
      "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.assinatura cf_clearance=abc123 CPF 123.456.789-09 senha-local";
    const safe = sanitizeText(input, ["senha-local"]);
    expect(safe).not.toContain("assinatura");
    expect(safe).not.toContain("abc123");
    expect(safe).not.toContain("123.456.789-09");
    expect(safe).not.toContain("senha-local");
  });

  test("grava apenas a mensagem sanitizada", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "dte-log-"));
    tempDirs.push(dir);
    const logger = new SafeLogger(dir, ["minha-senha"]);
    await logger.initialize();
    await logger.log("error", "falha com minha-senha");
    expect(await readFile(logger.logPath, "utf8")).not.toContain("minha-senha");
  });
});
