import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const uploadOnvioBatch = vi.fn();
const resolveExcelPath = vi.fn();
const loadDotenvFromProjectRoot = vi.fn();
const findLatestNormalizedDir = vi.fn();

vi.mock("../upload-onvio-batch", () => ({
  uploadOnvioBatch,
}));

vi.mock("./cli-helpers", () => ({
  resolveExcelPath,
  loadDotenvFromProjectRoot,
  findLatestNormalizedDir,
}));

describe("upload CLI", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.EMPRESAS_EXCEL_PATH = "empresas.xlsx";
    process.env.ONVIO_UDS_TOKEN = "token";
    process.env.BD_API_BASE_URL = "http://localhost:3001/api";
    resolveExcelPath.mockReturnValue("C:/tmp/empresas.xlsx");
    findLatestNormalizedDir.mockReturnValue("C:/tmp/normalized");
    uploadOnvioBatch.mockResolvedValue({
      summary: {
        total: 1,
        success: 1,
        failed: 0,
        skipped: 0,
      },
      warnings: [],
      items: [],
    });
  });

  afterEach(() => {
    delete process.env.EMPRESAS_EXCEL_PATH;
    delete process.env.ONVIO_UDS_TOKEN;
    delete process.env.BD_API_BASE_URL;
  });

  it("carrega env e chama a API publica de upload", async () => {
    const { main } = await import("./upload-onvio");
    const exitCode = await main();

    expect(exitCode).toBe(0);
    expect(loadDotenvFromProjectRoot).toHaveBeenCalled();
    expect(findLatestNormalizedDir).toHaveBeenCalled();
    expect(uploadOnvioBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "token",
        input: { excelPath: "C:/tmp/empresas.xlsx" },
        attachmentsDir: "C:/tmp/normalized",
        bdApiBaseUrl: "http://localhost:3001/api",
      }),
    );
  });
});
