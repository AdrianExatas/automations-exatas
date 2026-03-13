import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const downloadUnecontBatch = vi.fn();
const resolveExcelPath = vi.fn();
const loadDotenvFromProjectRoot = vi.fn();

vi.mock("../download-unecont", () => ({
  downloadUnecontBatch,
}));

vi.mock("./cli-helpers", () => ({
  resolveExcelPath,
  loadDotenvFromProjectRoot,
}));

describe("download CLI", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.UNECONT_EMAIL = "teste@example.com";
    process.env.UNECONT_SENHA = "123";
    process.env.EMPRESAS_EXCEL_PATH = "empresas.xlsx";
    resolveExcelPath.mockReturnValue("C:/tmp/empresas.xlsx");
    downloadUnecontBatch.mockResolvedValue({
      downloadsDir: "C:/tmp/downloads",
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
    const { main } = await import("./run");
    const exitCode = await main();

    expect(exitCode).toBe(0);
    expect(loadDotenvFromProjectRoot).toHaveBeenCalled();
    expect(resolveExcelPath).toHaveBeenCalledWith("empresas.xlsx");
    expect(downloadUnecontBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        credentials: {
          email: "teste@example.com",
          senha: "123",
        },
        input: { excelPath: "C:/tmp/empresas.xlsx" },
        logger: console,
      }),
    );
    expect(downloadUnecontBatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        reportFormatting: expect.anything(),
      }),
    );
  });
});
