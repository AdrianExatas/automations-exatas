import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendServiceRequestsBatch = vi.fn();
const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

vi.mock("../send-service-requests-batch", () => ({
  sendServiceRequestsBatch,
}));

describe("standalone send CLI", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    sendServiceRequestsBatch.mockResolvedValue({
      summary: {
        total: 1,
        success: 1,
        failed: 0,
        skipped: 0,
      },
      warnings: [],
      items: [
        {
          serviceRequest: {
            cnpj: "12",
            codigo: "543",
            nome: "Link Informatica",
            solicitante: "",
            departamento: "Fiscal",
            assunto: "Assunto",
            descricao: "Descricao",
            arquivos: [],
          },
          status: "success",
          message: "Solicitacao aberta sem anexos.",
          attachmentCount: 0,
        },
      ],
    });
  });

  afterEach(() => {
    delete process.env.ONVIO_UDS_TOKEN;
    delete process.env.BD_API_BASE_URL;
    delete process.env.ONVIO_CLIENT_ID;
    delete process.env.ONVIO_DEPARTMENT_ID;
    delete process.env.ONVIO_REQUESTER_ID;
    delete process.env.EMPRESAS_EXCEL_PATH;
    delete process.env.ONVIO_ATTACHMENTS_DIR;
  });

  it("aceita o modo standalone sem anexos com dry-run", async () => {
    sendServiceRequestsBatch.mockResolvedValue({
      summary: {
        total: 1,
        success: 0,
        failed: 0,
        skipped: 1,
      },
      warnings: [],
      items: [
        {
          serviceRequest: {
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

    const { main } = await import("./send");
    const exitCode = await main([
      "send",
      "--excel",
      "C:/tmp/empresas.xlsx",
      "--mode",
      "no-attachments",
      "--dry-run",
    ]);

    expect(exitCode).toBe(0);
    expect(sendServiceRequestsBatch).toHaveBeenCalledWith({
      token: "",
      input: { excelPath: "C:/tmp/empresas.xlsx" },
      attachmentsDir: undefined,
      mode: "no-attachments",
      dryRun: true,
      attachmentStrategy: "explicit",
      bdApiBaseUrl: undefined,
      defaults: {
        clientId: undefined,
        departmentId: undefined,
        requesterId: undefined,
      },
    });
    expect(consoleLog).toHaveBeenCalledWith(
      "[PREVIEW] 543 - Link Informatica: Pre-validacao OK: solicitacao sem anexos seria aberta.",
    );
  });

  it("aceita flags explicitas para anexos, provider e fallbacks", async () => {
    const { main } = await import("./send");
    const exitCode = await main([
      "--token",
      "token",
      "--excel",
      "C:/tmp/empresas.xlsx",
      "--attachments-dir",
      "C:/tmp/anexos",
      "--mode",
      "attachments",
      "--attachment-strategy",
      "code-fallback",
      "--bd-api-base-url",
      "http://localhost:3001/api",
      "--default-client-id",
      "client-default",
      "--default-department-id",
      "department-default",
      "--default-requester-id",
      "requester-default",
    ]);

    expect(exitCode).toBe(0);
    expect(sendServiceRequestsBatch).toHaveBeenCalledWith({
      token: "token",
      input: { excelPath: "C:/tmp/empresas.xlsx" },
      attachmentsDir: "C:/tmp/anexos",
      mode: "attachments",
      dryRun: false,
      attachmentStrategy: "code-fallback",
      bdApiBaseUrl: "http://localhost:3001/api",
      defaults: {
        clientId: "client-default",
        departmentId: "department-default",
        requesterId: "requester-default",
      },
    });
  });

  it("usa variaveis de ambiente como fallback", async () => {
    process.env.ONVIO_UDS_TOKEN = "token-env";
    process.env.EMPRESAS_EXCEL_PATH = "C:/tmp/empresas.xlsx";
    process.env.ONVIO_ATTACHMENTS_DIR = "C:/tmp/anexos";
    process.env.BD_API_BASE_URL = "http://localhost:3001/api";
    process.env.ONVIO_CLIENT_ID = "client-env";
    process.env.ONVIO_DEPARTMENT_ID = "department-env";
    process.env.ONVIO_REQUESTER_ID = "requester-env";

    const { main } = await import("./send");
    const exitCode = await main([]);

    expect(exitCode).toBe(0);
    expect(sendServiceRequestsBatch).toHaveBeenCalledWith({
      token: "token-env",
      input: { excelPath: "C:/tmp/empresas.xlsx" },
      attachmentsDir: "C:/tmp/anexos",
      mode: "attachments",
      dryRun: false,
      attachmentStrategy: "explicit",
      bdApiBaseUrl: "http://localhost:3001/api",
      defaults: {
        clientId: "client-env",
        departmentId: "department-env",
        requesterId: "requester-env",
      },
    });
  });

  it("falha cedo sem attachmentsDir no modo attachments", async () => {
    const { main } = await import("./send");
    const exitCode = await main(["--excel", "C:/tmp/empresas.xlsx"]);

    expect(exitCode).toBe(1);
    expect(sendServiceRequestsBatch).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Informe --attachments-dir <pasta> quando --mode=attachments.",
    );
  });
});
