import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, test } from "vitest";
import { salvarRelatorios } from "../src/relatorio";
import { RelatorioExecucao } from "../src/types";

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "relatorio-parametrizacao-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function relatorio(): RelatorioExecucao {
  return {
    execucao: {
      inicio: "2026-07-15T10:00:00.000Z",
      fim: "2026-07-15T10:01:00.000Z",
      dryRun: true,
      cnpj: "11222333000144",
      customerId: "customer-1",
      customerName: "Cliente Teste",
      regimeFiscal: "simples_nacional",
      areas: ["dp"],
      totalTarefasCalculadas: 0,
      sucesso: 0,
      falha: 0,
      avisos: [],
    },
    resultados: [],
    timeline: [],
  };
}

describe("relatorios", () => {
  test("salva json e xlsx no diretorio informado", () => {
    const outputDir = createTempDir();
    const paths = salvarRelatorios(relatorio(), outputDir);

    expect(path.dirname(paths.jsonPath)).toBe(outputDir);
    expect(path.dirname(paths.xlsxPath)).toBe(outputDir);
    expect(fs.existsSync(paths.jsonPath)).toBe(true);
    expect(fs.existsSync(paths.xlsxPath)).toBe(true);
  });
});
