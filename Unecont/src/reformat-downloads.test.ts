import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveRuntimePath } from "./project-paths";

const formatDownloadedReport = vi.fn();

vi.mock("./report-formatter", () => ({
  formatDownloadedReport,
}));

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe("reformatDownloadedReports", () => {
  let tempDir: string;
  let expectedOutputDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-reformat-test-"));
    expectedOutputDir = resolveRuntimePath("normalized", path.basename(tempDir));
    fs.writeFileSync(path.join(tempDir, "001 - relatorio.xlsx"), "stub");
    fs.writeFileSync(path.join(tempDir, "002 - relatorio.xlsx"), "stub");
    fs.writeFileSync(path.join(tempDir, "README.txt"), "ignorar");
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(expectedOutputDir, { recursive: true, force: true });
  });

  it("reprocessa planilhas do diretorio e falha quando restam inconsistencias mapeaveis", async () => {
    const logger = createLogger();
    formatDownloadedReport
      .mockResolvedValueOnce({
        outputPath: path.join(expectedOutputDir, "001 - relatorio.xlsx"),
        warnings: [],
        filledCount: 3,
        missingMappedCount: 0,
        missingUnmappedCount: 1,
        issues: [
          {
            rowNumber: 8,
            serviceItem: "17.25",
            reason: "missing_unmapped",
          },
        ],
      })
      .mockResolvedValueOnce({
        outputPath: path.join(expectedOutputDir, "002 - relatorio.xlsx"),
        warnings: ["Linha 31: Servico Federal com descricao ambigua (10.09)."],
        filledCount: 1,
        missingMappedCount: 2,
        missingUnmappedCount: 0,
        issues: [
          {
            rowNumber: 31,
            serviceItem: "09.01",
            reason: "missing_mapped",
          },
          {
            rowNumber: 33,
            serviceItem: "10.05",
            reason: "missing_mapped",
          },
        ],
      });

    const { reformatDownloadedReports } = await import("./reformat-downloads");
    const result = await reformatDownloadedReports({
      downloadsDir: tempDir,
      modelPath: "C:/tmp/modelo.xlsx",
      serviceMapPath: "C:/tmp/mapa.xlsx",
      overwrite: true,
      logger,
    });

    expect(result.summary).toEqual({
      total: 2,
      success: 1,
      failed: 1,
    });
    expect(result.downloadsDir).toBe(tempDir);
    expect(result.outputDir).toBe(expectedOutputDir);
    expect(result.items).toEqual([
      expect.objectContaining({
        filePath: path.join(expectedOutputDir, "001 - relatorio.xlsx"),
        status: "success",
        filledCount: 3,
        missingMappedCount: 0,
        missingUnmappedCount: 1,
      }),
      expect.objectContaining({
        filePath: path.join(expectedOutputDir, "002 - relatorio.xlsx"),
        status: "failed",
        missingMappedCount: 2,
        message:
          "Falha de consistencia em 002 - relatorio.xlsx: 2 linhas mapeaveis sem descricao [linha 31 (09.01), linha 33 (10.05)].",
      }),
    ]);
    expect(formatDownloadedReport.mock.calls).toEqual([
      [
        path.join(expectedOutputDir, "001 - relatorio.xlsx"),
        expect.objectContaining({
          modelPath: "C:/tmp/modelo.xlsx",
          serviceMapPath: "C:/tmp/mapa.xlsx",
        }),
      ],
      [
        path.join(expectedOutputDir, "002 - relatorio.xlsx"),
        expect.objectContaining({
          modelPath: "C:/tmp/modelo.xlsx",
          serviceMapPath: "C:/tmp/mapa.xlsx",
        }),
      ],
    ]);
    expect(fs.existsSync(path.join(expectedOutputDir, "001 - relatorio.xlsx"))).toBe(true);
    expect(fs.existsSync(path.join(expectedOutputDir, "002 - relatorio.xlsx"))).toBe(true);
    expect(fs.existsSync(path.join(expectedOutputDir, "README.txt"))).toBe(false);
    expect(fs.readFileSync(path.join(tempDir, "001 - relatorio.xlsx"), "utf8")).toBe("stub");
    expect(logger.info.mock.calls).toEqual([
      [`Iniciando reformatacao de 2 planilhas em ${tempDir}`],
      [`Diretorio de saida normalizada: ${expectedOutputDir}`],
      ["Formatando planilha: 001 - relatorio.xlsx"],
      [
        "Planilha validada: 001 - relatorio.xlsx (3 descricoes preenchidas, 0 inconsistencias mapeaveis, 1 sem mapa)",
      ],
      ["Formatando planilha: 002 - relatorio.xlsx"],
      [
        "Planilha validada: 002 - relatorio.xlsx (1 descricoes preenchidas, 2 inconsistencias mapeaveis, 0 sem mapa)",
      ],
      ["Resumo reformatacao: 1 sucesso, 1 falhas, 2 total."],
    ]);
    expect(logger.warn.mock.calls).toEqual([
      ["Aviso na formatacao 002 - relatorio.xlsx: Linha 31: Servico Federal com descricao ambigua (10.09)."],
    ]);
    expect(logger.error.mock.calls).toEqual([
      [
        "Falha de consistencia em 002 - relatorio.xlsx: 2 linhas mapeaveis sem descricao [linha 31 (09.01), linha 33 (10.05)].",
      ],
    ]);
  });
});
