import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultReportFormattingOptions } from "./report-formatting-defaults";

const downloadUnecontBatch = vi.fn();
const resolveExcelPath = vi.fn();
const loadDotenvFromProjectRoot = vi.fn();
const getExcelPathArg = vi.fn();
const openExcelFileDialog = vi.fn();

vi.mock("../download-unecont", () => ({
  downloadUnecontBatch,
}));

vi.mock("./cli-helpers", () => ({
  resolveExcelPath,
  loadDotenvFromProjectRoot,
  getExcelPathArg,
  openExcelFileDialog,
}));

describe("download CLI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.UNECONT_EMAIL = "teste@example.com";
    process.env.UNECONT_SENHA = "123";
    process.env.EMPRESAS_EXCEL_PATH = "empresas.xlsx";
    getExcelPathArg.mockReturnValue(null);
    openExcelFileDialog.mockReturnValue("C:/tmp/selecionada.xlsx");
    resolveExcelPath.mockReturnValue("C:/tmp/empresas.xlsx");
    downloadUnecontBatch.mockResolvedValue({
      downloadsDir: "C:/tmp/downloads",
      reportPath: "C:/tmp/downloads/_meta/relatorio-execucao.xlsx",
      summary: {
        total: 1,
        success: 1,
        noNotas: 0,
        notFound: 0,
        failed: 0,
        skipped: 0,
      },
    });
  });

  afterEach(() => {
    delete process.env.UNECONT_EMAIL;
    delete process.env.UNECONT_SENHA;
    delete process.env.EMPRESAS_EXCEL_PATH;
  });

  it("carrega env e chama a API publica de download", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { main } = await import("./run");
    try {
      const exitCode = await main();

      expect(exitCode).toBe(0);
      expect(loadDotenvFromProjectRoot).toHaveBeenCalled();
      expect(openExcelFileDialog).toHaveBeenCalled();
      expect(resolveExcelPath).toHaveBeenCalledWith("C:/tmp/selecionada.xlsx");
      expect(downloadUnecontBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: {
            email: "teste@example.com",
            senha: "123",
          },
          input: { excelPath: "C:/tmp/empresas.xlsx" },
          logger: console,
          reportFormatting: getDefaultReportFormattingOptions(),
        }),
      );
      expect(logSpy).toHaveBeenCalledWith("Downloads: C:/tmp/downloads");
      expect(logSpy).toHaveBeenCalledWith(
        "Relatorio: C:/tmp/downloads/_meta/relatorio-execucao.xlsx",
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  it("usa EMPRESAS_EXCEL_PATH quando o seletor e cancelado", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    openExcelFileDialog.mockReturnValue(null);
    const { main } = await import("./run");
    try {
      const exitCode = await main();

      expect(exitCode).toBe(0);
      expect(resolveExcelPath).toHaveBeenCalledWith("empresas.xlsx");
    } finally {
      logSpy.mockRestore();
    }
  });
});
