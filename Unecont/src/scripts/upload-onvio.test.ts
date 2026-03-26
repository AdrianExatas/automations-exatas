import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const uploadOnvioBatch = vi.fn();
const resolveExcelPath = vi.fn();
const loadDotenvFromProjectRoot = vi.fn();
const findLatestNormalizedDir = vi.fn();
const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

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
    delete process.env.ONVIO_SKIP_ATTACHMENTS;
    delete process.env.ONVIO_DRY_RUN;
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
        attachmentsMode: "required",
        dryRun: false,
        bdApiBaseUrl: "http://localhost:3001/api",
      }),
    );
  });

  it("ativa modo sem anexos e dry-run por flags sem buscar pasta normalizada", async () => {
    uploadOnvioBatch.mockResolvedValue({
      summary: {
        total: 1,
        success: 0,
        failed: 0,
        skipped: 1,
      },
      warnings: [],
      items: [
        {
          empresa: {
            cnpj: "12",
            codigo: "543",
            nome: "Link Informatica",
            solicitante: "",
            departamento: "Fiscal",
            assunto: "Assunto",
            descricao: "Descricao",
            arquivos: [],
          },
          status: "skipped",
          message: "Pre-validacao OK: solicitacao sem anexos seria aberta.",
          attachmentCount: 0,
        },
      ],
    });

    const { main } = await import("./upload-onvio");
    const exitCode = await main(["--sem-anexos", "--dry-run"]);

    expect(exitCode).toBe(0);
    expect(findLatestNormalizedDir).not.toHaveBeenCalled();
    expect(uploadOnvioBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentsDir: undefined,
        attachmentsMode: "none",
        dryRun: true,
      }),
    );
    expect(consoleLog).toHaveBeenCalledWith(
      "[PREVIEW] 543 - Link Informatica: Pre-validacao OK: solicitacao sem anexos seria aberta.",
    );
  });

  it("ativa modo sem anexos por ambiente", async () => {
    process.env.ONVIO_SKIP_ATTACHMENTS = "true";

    const { main } = await import("./upload-onvio");
    const exitCode = await main();

    expect(exitCode).toBe(0);
    expect(findLatestNormalizedDir).not.toHaveBeenCalled();
    expect(uploadOnvioBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentsMode: "none",
      }),
    );
  });
});
