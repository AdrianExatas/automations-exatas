import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshUdsLongTokenForUploadMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue("token-renovado-mock"),
);

const uploadOnvioBatch = vi.fn();
const resolveExcelPath = vi.fn();
const loadDotenvFromProjectRoot = vi.fn();
const findLatestNormalizedDir = vi.fn();
const loadEmpresasFromExcel = vi.fn();
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

vi.mock("../input", () => ({
  loadEmpresasFromExcel,
}));

vi.mock("../onvio-uds-refresh", () => ({
  refreshUdsLongTokenForUpload: refreshUdsLongTokenForUploadMock,
}));

describe("upload CLI", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    refreshUdsLongTokenForUploadMock.mockReset();
    refreshUdsLongTokenForUploadMock.mockResolvedValue("token-renovado-mock");
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
    delete process.env.UNECONT_ONVIO_NFS_VIDEO_PATH;
    delete process.env.ONVIO_AUTO_REFRESH_TOKEN;
    delete process.env.ONVIO_EMAIL;
    delete process.env.ONVIO_PASSWORD;
  });

  it("passa onUnauthorized quando ONVIO_AUTO_REFRESH_TOKEN e credenciais Onvio estao definidos", async () => {
    process.env.ONVIO_AUTO_REFRESH_TOKEN = "true";
    process.env.ONVIO_EMAIL = "user@example.com";
    process.env.ONVIO_PASSWORD = "secret";

    const { main } = await import("./upload-onvio");
    await main();

    expect(refreshUdsLongTokenForUploadMock).not.toHaveBeenCalled();
    expect(uploadOnvioBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        onUnauthorized: expect.any(Function),
        token: "token",
      }),
    );
  });

  it("com ONVIO_UDS_TOKEN vazio obtem token via refresh antes do batch quando auto-refresh e credenciais estao ativos", async () => {
    process.env.ONVIO_UDS_TOKEN = "";
    process.env.ONVIO_AUTO_REFRESH_TOKEN = "true";
    process.env.ONVIO_EMAIL = "user@example.com";
    process.env.ONVIO_PASSWORD = "secret";
    refreshUdsLongTokenForUploadMock.mockResolvedValue("token-bootstrap-mock");

    const { main } = await import("./upload-onvio");
    const exitCode = await main();

    expect(exitCode).toBe(0);
    expect(refreshUdsLongTokenForUploadMock).toHaveBeenCalledTimes(1);
    expect(uploadOnvioBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "token-bootstrap-mock",
        onUnauthorized: expect.any(Function),
      }),
    );
  });

  it("falha com mensagem clara quando ONVIO_UDS_TOKEN vazio e auto-refresh nao pode rodar", async () => {
    process.env.ONVIO_UDS_TOKEN = "   ";

    const { main } = await import("./upload-onvio");
    const exitCode = await main();

    expect(exitCode).toBe(1);
    expect(refreshUdsLongTokenForUploadMock).not.toHaveBeenCalled();
    expect(uploadOnvioBatch).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Token do Onvio nao informado. Defina ONVIO_UDS_TOKEN ou ative ONVIO_AUTO_REFRESH_TOKEN com ONVIO_EMAIL e ONVIO_PASSWORD preenchidos.",
    );
  });

  it("propaga falha do bootstrap quando capture-tokens falha com token vazio", async () => {
    process.env.ONVIO_UDS_TOKEN = "";
    process.env.ONVIO_AUTO_REFRESH_TOKEN = "true";
    process.env.ONVIO_EMAIL = "user@example.com";
    process.env.ONVIO_PASSWORD = "secret";
    refreshUdsLongTokenForUploadMock.mockRejectedValue(new Error("capture falhou"));

    const { main } = await import("./upload-onvio");
    const exitCode = await main();

    expect(exitCode).toBe(1);
    expect(refreshUdsLongTokenForUploadMock).toHaveBeenCalledTimes(1);
    expect(uploadOnvioBatch).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith("Erro na execucao:", "capture falhou");
  });

  it("nao passa onUnauthorized em dry-run mesmo com auto-refresh ativo", async () => {
    process.env.ONVIO_AUTO_REFRESH_TOKEN = "true";
    process.env.ONVIO_EMAIL = "user@example.com";
    process.env.ONVIO_PASSWORD = "secret";

    const { main } = await import("./upload-onvio");
    await main(["--sem-anexos", "--dry-run"]);

    expect(uploadOnvioBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        dryRun: true,
        onUnauthorized: undefined,
      }),
    );
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

  it("repassa extraAttachmentPaths quando UNECONT_ONVIO_NFS_VIDEO_PATH esta definido", async () => {
    process.env.UNECONT_ONVIO_NFS_VIDEO_PATH = "C:/gravacoes/nfs-run.mp4";

    const { main } = await import("./upload-onvio");
    const exitCode = await main();

    expect(exitCode).toBe(0);
    expect(uploadOnvioBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentsMode: "required",
        extraAttachmentPaths: [path.resolve("C:/gravacoes/nfs-run.mp4")],
      }),
    );
  });

  it("nao repassa extraAttachmentPaths no modo sem anexos mesmo com env de video", async () => {
    process.env.UNECONT_ONVIO_NFS_VIDEO_PATH = "C:/gravacoes/nfs-run.mp4";

    const { main } = await import("./upload-onvio");
    await main(["--sem-anexos"]);

    expect(uploadOnvioBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentsMode: "none",
        extraAttachmentPaths: undefined,
      }),
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

  it("com --codigos filtra linhas da planilha pela ordem informada", async () => {
    const row = (codigo: string) => ({
      cnpj: "12",
      codigo,
      nome: `Empresa ${codigo}`,
      solicitante: "",
      departamento: "Fiscal",
      assunto: "",
      descricao: "",
      arquivos: [] as string[],
    });
    loadEmpresasFromExcel.mockReturnValue([row("107"), row("108"), row("120")]);

    const { main } = await import("./upload-onvio");
    const exitCode = await main(["--codigos", "120,107"]);

    expect(exitCode).toBe(0);
    const payload = uploadOnvioBatch.mock.calls[0]?.[0] as { input: { empresas: { codigo: string }[] } };
    expect(payload.input.empresas.map((e) => e.codigo)).toEqual(["120", "107"]);
  });

  it("falha quando --limite e --codigos sao usados juntos", async () => {
    const { main } = await import("./upload-onvio");
    const exitCode = await main(["--limite", "2", "--codigos", "1,2"]);

    expect(exitCode).toBe(1);
    expect(uploadOnvioBatch).not.toHaveBeenCalled();
  });

  it("com --limite N envia apenas as primeiras N linhas da planilha", async () => {
    const row = (codigo: string) => ({
      cnpj: "12",
      codigo,
      nome: "Empresa",
      solicitante: "",
      departamento: "Fiscal",
      assunto: "",
      descricao: "",
      arquivos: [] as string[],
    });
    loadEmpresasFromExcel.mockReturnValue([row("1"), row("2"), row("3"), row("4"), row("5")]);

    const { main } = await import("./upload-onvio");
    const exitCode = await main(["--limite", "3"]);

    expect(exitCode).toBe(0);
    expect(loadEmpresasFromExcel).toHaveBeenCalledWith("C:/tmp/empresas.xlsx");
    const payload = uploadOnvioBatch.mock.calls[0]?.[0] as { input: { empresas: unknown[] } };
    expect(payload.input.empresas).toHaveLength(3);
    expect(payload.input.empresas.map((e: { codigo: string }) => e.codigo)).toEqual(["1", "2", "3"]);
  });

  it("falha quando --limite nao e um inteiro positivo", async () => {
    const { main } = await import("./upload-onvio");
    const exitCode = await main(["--limite", "0"]);

    expect(exitCode).toBe(1);
    expect(uploadOnvioBatch).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith("Uso: --limite N (N inteiro positivo), ex.: --limite 3");
  });
});
