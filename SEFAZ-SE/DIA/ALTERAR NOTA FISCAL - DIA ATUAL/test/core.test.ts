import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "../src/config";
import { buildReportPaths, saveExecutionReports } from "../src/nf-report";
import type { NotaFiscalAlteracaoEntry } from "../src/nf-types";
import { matchesNotaFiscal, normalizeEtiqueta, normalizeIcms, normalizeRecolhimento } from "../src/normalize";
import { runAlterarNotaFiscal } from "../src/runner";
import { actionForColor, readNotaFiscalSpreadsheet, validateRequiredColumns } from "../src/spreadsheet";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("normalizacao", () => {
  test("normaliza etiqueta ignorando zeros a esquerda", () => {
    expect(normalizeEtiqueta("0010070493004781")).toBe("10070493004781");
    expect(normalizeEtiqueta("10070493004781")).toBe("10070493004781");
  });

  test("normaliza ICMS com virgula e ponto", () => {
    expect(normalizeIcms("212,75")).toBe("212.75");
    expect(normalizeIcms("1.212,75")).toBe("1212.75");
    expect(normalizeIcms("212.75")).toBe("212.75");
  });

  test("normaliza recolhimento para comparacao", () => {
    expect(normalizeRecolhimento("  forma   teste ")).toBe("FORMA TESTE");
  });

  test("compara nota por etiqueta, ICMS e recolhimento", () => {
    expect(matchesNotaFiscal(
      { etiqueta: "000123", icms: "1.234,50", recolhimento: "  Normal " },
      { etiqueta: "123", icms: "1234,50", recolhimento: "normal" },
    )).toBe(true);
  });
});

describe("planilha", () => {
  test("valida colunas obrigatorias", () => {
    expect(() => validateRequiredColumns(["Etiqueta"])).toThrow("Colunas obrigatorias ausentes");
  });

  test("mapeia vermelho e rejeita cor desconhecida", () => {
    expect(actionForColor("FF0000", 9)).toBe("zerar-cobranca");
    expect(() => actionForColor("ABCDEF", 9)).toThrow("Cor de linha desconhecida na linha 9: ABCDEF.");
  });

  test("le novo espelho com empresa, cabecalho na linha 2 e acoes por cor", () => {
    const items = readNotaFiscalSpreadsheet(modelSpreadsheetPath());

    expect(items[0]).toMatchObject({
      inscricaoMunicipal: "271922052",
      nomeEmpresa: "CONSTRUAGRO BARBOSA LTDA",
      etiqueta: "10069238615190",
      icmsNovo: "51.97",
      icmsAtual: "51.97",
      recolhimentoNovo: "COMPLEMENTACAO DE ALIQUOTA INTERESTADUAL",
      recolhimentoAtual: "COMPLEMENTACAO DE ALIQUOTA INTERESTADUAL",
      acao: "ignorar",
      corRgb: "99CC00",
      observacao: "",
      adiar: false,
      rowNumber: 3,
    });

    expect(items.find((item) => item.etiqueta === "10070044715249")).toMatchObject({
      acao: "alterar-imposto",
      corRgb: "FFFF00",
      icmsAtual: "8.17",
      icmsNovo: "7.08",
      observacao: "ALTERAR VALOR PARA 7,08",
      adiar: false,
      rowNumber: 5,
    });

    expect(items.find((item) => item.etiqueta === "50005768614587")).toMatchObject({
      acao: "adiar",
      corRgb: "00CCFF",
      icmsAtual: "3.69",
      icmsNovo: "3.69",
      observacao: "ADIAR NOTA",
      adiar: true,
      rowNumber: 8,
    });
  });

  test("relata linha verde como ignorada sem acessar o portal", async () => {
    const dir = await makeTempDir();
    const result = await runAlterarNotaFiscal({
      user: "usuario",
      password: "senha",
      authMode: "password",
      spreadsheetPath: modelSpreadsheetPath(),
      outDir: dir,
      headless: true,
      dryRun: true,
      limit: 1,
      stepDelayMs: 0,
      timeoutMs: 1,
    });

    expect(result.successCount).toBe(0);
    expect(result.errorCount).toBe(0);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      etiqueta: "10069238615190",
      acao: "ignorar",
      status: "ignorado",
    });
  });
});

describe("relatorio", () => {
  test("gera JSON e XLSX de execucao", async () => {
    const dir = await makeTempDir();
    const entry: NotaFiscalAlteracaoEntry = {
      inscricaoMunicipal: "271803444",
      nomeEmpresa: "EMPRESA TESTE",
      etiqueta: "10070493004781",
      icmsNovo: "300,00",
      icmsAtual: "212,75",
      recolhimentoNovo: "8",
      recolhimentoAtual: "33",
      acao: "alterar-imposto",
      corRgb: "FFFF00",
      observacao: "ALTERAR VALOR PARA 300,00",
      adiar: false,
      rowNumber: 2,
      status: "sucesso",
      timestamp: "2026-04-24T12:00:00.000Z",
    };

    const paths = await saveExecutionReports({ outDir: dir }, [entry]);
    expect(await exists(paths.jsonPath)).toBe(true);
    expect(await exists(paths.excelPath)).toBe(true);
    expect(buildReportPaths({ outDir: dir }).jsonPath.endsWith("relatorio-alteracao-notas.json")).toBe(true);
  });
});

describe("config", () => {
  test("aceita dry-run, headed e limite no CLI", async () => {
    const config = await loadConfig([
      "--user",
      "usuario",
      "--password",
      "senha",
      "--planilha",
      "planilha.xlsx",
      "--headed",
      "--dry-run",
      "--limit",
      "1",
      "--step-delay-ms",
      "1000",
    ]);

    expect(config.headless).toBe(false);
    expect(config.dryRun).toBe(true);
    expect(config.limit).toBe(1);
    expect(config.stepDelayMs).toBe(1000);
  });

  test("aceita canal do navegador no CLI", async () => {
    const config = await loadConfig([
      "--user",
      "u",
      "--password",
      "p",
      "--planilha",
      "x.xls",
      "--channel",
      "msedge",
    ]);

    expect(config.browserChannel).toBe("msedge");
  });
});

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "alterar-nf-"));
  tempDirs.push(dir);
  return dir;
}

function modelSpreadsheetPath(): string {
  return path.resolve("model", "Extrato_Espelho_DIA_20_04_2026.xls");
}

async function exists(filePath: string): Promise<boolean> {
  return fs.access(filePath).then(() => true, () => false);
}
