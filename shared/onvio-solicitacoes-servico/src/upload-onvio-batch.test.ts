import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnvioApiError } from "./core/onvio-api";
import { uploadOnvioBatch } from "./upload-onvio-batch";

const {
  loadBdLookupData,
  openTicket,
  uploadTicketWithAttachments,
  readdirSync,
  existsSync,
  readFileSync,
  statSync,
} = vi.hoisted(() => ({
  loadBdLookupData: vi.fn(),
  openTicket: vi.fn(),
  uploadTicketWithAttachments: vi.fn(),
  readdirSync: vi.fn(),
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock("./api/bd-api", () => ({
  loadBdLookupData,
}));

vi.mock("./core/onvio-api", async () => {
  const actual = await vi.importActual<typeof import("./core/onvio-api")>("./core/onvio-api");
  return {
    ...actual,
    openTicket,
    uploadTicketWithAttachments,
  };
});

vi.mock("node:fs", () => ({
  default: {
    readdirSync,
    existsSync,
    readFileSync,
    statSync,
  },
}));

describe("uploadOnvioBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    existsSync.mockReturnValue(true);
    statSync.mockReturnValue({ isFile: () => true });
    readdirSync.mockReturnValue([
      { isFile: () => true, name: "Empresa 543 - LINK INFORMATICA.pdf" },
      { isFile: () => true, name: "Empresa 543 - LINK INFORMATICA.xlsx" },
    ]);
    readFileSync.mockImplementation((filePath: string) => Buffer.from(String(filePath)));
    loadBdLookupData.mockResolvedValue({
      clientIdByCode: new Map([["543", "client-1"]]),
      requesterIdByName: new Map([["FULANO", "req-1"]]),
      departmentIdByName: new Map([["FISCAL", "dep-1"]]),
    });
    openTicket.mockResolvedValue({ ticketId: "ticket-2" });
    uploadTicketWithAttachments.mockResolvedValue({ ticketId: "ticket-1" });
  });

  it("mantem o contrato batch e envia anexos resolvidos", async () => {
    const result = await uploadOnvioBatch({
      token: "token",
      attachmentsDir: "C:/tmp",
      bdApiBaseUrl: "http://localhost:3001/api",
      input: {
        empresas: [
          {
            cnpj: "12",
            codigo: "543",
            nome: "Link Informatica",
            solicitante: "Fulano",
            departamento: "Fiscal",
            assunto: "",
            descricao: "",
            arquivos: [],
          },
        ],
      },
    });

    expect(result.summary).toEqual({
      total: 1,
      success: 1,
      failed: 0,
      skipped: 0,
    });
    expect(uploadTicketWithAttachments).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "token",
        clientId: "client-1",
        departmentId: "dep-1",
        requesterId: "req-1",
      }),
    );
  });

  it("emite onProgress batch_start, item_start e item_done em ordem", async () => {
    const onProgress = vi.fn();
    await uploadOnvioBatch({
      token: "token",
      attachmentsDir: "C:/tmp",
      bdApiBaseUrl: "http://localhost:3001/api",
      onProgress,
      input: {
        empresas: [
          {
            cnpj: "12",
            codigo: "543",
            nome: "Link Informatica",
            solicitante: "Fulano",
            departamento: "Fiscal",
            assunto: "",
            descricao: "",
            arquivos: [],
          },
        ],
      },
    });

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress.mock.calls[0]![0]).toEqual({ type: "batch_start", total: 1 });
    expect(onProgress.mock.calls[1]![0]).toMatchObject({
      type: "item_start",
      index: 1,
      total: 1,
      row: { codigo: "543" },
    });
    expect(onProgress.mock.calls[2]![0]).toMatchObject({
      type: "item_done",
      index: 1,
      total: 1,
      outcome: "success",
      ticketId: "ticket-1",
    });
  });

  it("emite item_done skipped no dryRun", async () => {
    const onProgress = vi.fn();
    await uploadOnvioBatch({
      token: "",
      dryRun: true,
      attachmentsDir: "C:/tmp",
      bdApiBaseUrl: "http://localhost:3001/api",
      onProgress,
      input: {
        empresas: [
          {
            cnpj: "12",
            codigo: "543",
            nome: "Link Informatica",
            solicitante: "Fulano",
            departamento: "Fiscal",
            assunto: "",
            descricao: "",
            arquivos: [],
          },
        ],
      },
    });

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress.mock.calls[2]![0]).toMatchObject({
      type: "item_done",
      outcome: "skipped",
    });
  });

  it("emite item_done failed quando upload falha", async () => {
    uploadTicketWithAttachments.mockRejectedValueOnce(new OnvioApiError("falha api", 500));
    const onProgress = vi.fn();
    await uploadOnvioBatch({
      token: "token",
      attachmentsDir: "C:/tmp",
      bdApiBaseUrl: "http://localhost:3001/api",
      onProgress,
      input: {
        empresas: [
          {
            cnpj: "12",
            codigo: "543",
            nome: "Link Informatica",
            solicitante: "Fulano",
            departamento: "Fiscal",
            assunto: "",
            descricao: "",
            arquivos: [],
          },
        ],
      },
    });

    expect(onProgress.mock.calls[2]![0]).toMatchObject({
      type: "item_done",
      outcome: "failed",
      message: "falha api",
    });
  });

  it("preserva warnings quando o lookup do BD falha e usa fallbacks", async () => {
    loadBdLookupData.mockRejectedValue(new Error("api offline"));

    const result = await uploadOnvioBatch({
      token: "token",
      attachmentsDir: "C:/tmp",
      bdApiBaseUrl: "http://localhost:3001/api",
      input: {
        empresas: [
          {
            cnpj: "12",
            codigo: "543",
            nome: "Link Informatica",
            solicitante: "Fulano",
            departamento: "Fiscal",
            assunto: "",
            descricao: "",
            arquivos: [],
          },
        ],
      },
      defaults: {
        clientId: "client-default",
        requesterId: "req-default",
        departmentId: "dep-default",
      },
    });

    expect(result.warnings[0]).toContain("api offline");
    expect(result.items[0]?.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Falha ao carregar dados da API do BD"),
        "ClientId do Onvio resolvido pelo fallback global.",
      ]),
    );
  });

  it("abre solicitacao sem anexos quando attachmentsMode=none", async () => {
    const result = await uploadOnvioBatch({
      token: "token",
      input: {
        empresas: [
          {
            cnpj: "12",
            codigo: "543",
            nome: "Link Informatica",
            solicitante: "",
            departamento: "Fiscal",
            assunto: "Assunto sob medida",
            descricao: "Descricao sob medida",
            arquivos: [],
          },
        ],
      },
      attachmentsMode: "none",
      bdApiBaseUrl: "http://localhost:3001/api",
      defaults: {
        clientId: "client-default",
        departmentId: "dep-default",
      },
    });

    expect(result.summary).toEqual({
      total: 1,
      success: 1,
      failed: 0,
      skipped: 0,
    });
    expect(openTicket).toHaveBeenCalledWith({
      token: "token",
      clientId: "client-1",
      departmentId: "dep-1",
      requesterId: undefined,
      subject: "Assunto sob medida",
      description: "Descricao sob medida",
    });
    expect(uploadTicketWithAttachments).not.toHaveBeenCalled();
    expect(readdirSync).not.toHaveBeenCalled();
    expect(result.items[0]).toMatchObject({
      status: "success",
      attachmentCount: 0,
      message: "Solicitacao aberta sem anexos.",
    });
  });

  it("faz dry-run sem tocar a API do Onvio", async () => {
    const result = await uploadOnvioBatch({
      token: "token",
      input: {
        empresas: [
          {
            cnpj: "12",
            codigo: "543",
            nome: "Link Informatica",
            solicitante: "",
            departamento: "Fiscal",
            assunto: "Assunto sob medida",
            descricao: "Descricao sob medida",
            arquivos: [],
          },
        ],
      },
      attachmentsMode: "none",
      dryRun: true,
      defaults: {
        clientId: "client-default",
        departmentId: "dep-default",
      },
    });

    expect(result.summary).toEqual({
      total: 1,
      success: 0,
      failed: 0,
      skipped: 1,
    });
    expect(openTicket).not.toHaveBeenCalled();
    expect(uploadTicketWithAttachments).not.toHaveBeenCalled();
    expect(result.items[0]).toMatchObject({
      status: "skipped",
      attachmentCount: 0,
      message: "Pre-validacao OK: solicitacao sem anexos seria aberta.",
    });
  });

  it("concatena extraAttachmentPaths aos anexos resolvidos", async () => {
    const result = await uploadOnvioBatch({
      token: "token",
      attachmentsDir: "C:/tmp",
      extraAttachmentPaths: ["C:/extras/evidencia.mp4"],
      input: {
        empresas: [
          {
            cnpj: "12",
            codigo: "543",
            nome: "Link Informatica",
            solicitante: "Fulano",
            departamento: "Fiscal",
            assunto: "",
            descricao: "",
            arquivos: [],
          },
        ],
      },
      defaults: {
        clientId: "client-default",
        departmentId: "dep-default",
      },
    });

    expect(result.summary.success).toBe(1);
    expect(uploadTicketWithAttachments).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: expect.arrayContaining([
          expect.objectContaining({ fileName: "Empresa 543 - LINK INFORMATICA.pdf" }),
          expect.objectContaining({ fileName: "Empresa 543 - LINK INFORMATICA.xlsx" }),
          expect.objectContaining({ fileName: "evidencia.mp4" }),
        ]),
      }),
    );
    expect(uploadTicketWithAttachments.mock.calls[0]?.[0].attachments).toHaveLength(3);
  });

  it("em 401 chama onUnauthorized uma vez e repete upload com novo token", async () => {
    const onUnauthorized = vi.fn().mockResolvedValue("token-novo");
    uploadTicketWithAttachments
      .mockRejectedValueOnce(new OnvioApiError("401 Unauthorized", 401))
      .mockResolvedValueOnce({ ticketId: "ticket-1" });

    const result = await uploadOnvioBatch({
      token: "token-velho",
      onUnauthorized,
      attachmentsDir: "C:/tmp",
      input: {
        empresas: [
          {
            cnpj: "12",
            codigo: "543",
            nome: "Link Informatica",
            solicitante: "Fulano",
            departamento: "Fiscal",
            assunto: "",
            descricao: "",
            arquivos: [],
          },
        ],
      },
      defaults: {
        clientId: "client-default",
        departmentId: "dep-default",
      },
    });

    expect(result.summary.success).toBe(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(uploadTicketWithAttachments).toHaveBeenCalledTimes(2);
    expect(uploadTicketWithAttachments.mock.calls[0]?.[0]).toMatchObject({ token: "token-velho" });
    expect(uploadTicketWithAttachments.mock.calls[1]?.[0]).toMatchObject({ token: "token-novo" });
  });

  it("apos 401 o segundo item usa o token renovado sem chamar onUnauthorized de novo", async () => {
    const onUnauthorized = vi.fn().mockResolvedValue("token-novo");
    uploadTicketWithAttachments
      .mockRejectedValueOnce(new OnvioApiError("401 Unauthorized", 401))
      .mockResolvedValueOnce({ ticketId: "ticket-1" })
      .mockResolvedValueOnce({ ticketId: "ticket-2" });

    const result = await uploadOnvioBatch({
      token: "token-velho",
      onUnauthorized,
      attachmentsDir: "C:/tmp",
      input: {
        empresas: [
          {
            cnpj: "12",
            codigo: "543",
            nome: "Link Informatica",
            solicitante: "Fulano",
            departamento: "Fiscal",
            assunto: "",
            descricao: "",
            arquivos: [],
          },
          {
            cnpj: "13",
            codigo: "543",
            nome: "Link Informatica 2",
            solicitante: "Fulano",
            departamento: "Fiscal",
            assunto: "",
            descricao: "",
            arquivos: [],
          },
        ],
      },
      defaults: {
        clientId: "client-default",
        departmentId: "dep-default",
      },
    });

    expect(result.summary.success).toBe(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(uploadTicketWithAttachments).toHaveBeenCalledTimes(3);
    expect(uploadTicketWithAttachments.mock.calls[2]?.[0]).toMatchObject({ token: "token-novo" });
  });

  it("resolve requesterId via resolveRequesterId antes de employees e envia requesterExpanded", async () => {
    loadBdLookupData.mockResolvedValue({
      clientIdByCode: new Map([["543", "client-1"]]),
      requesterIdByName: new Map(),
      departmentIdByName: new Map([["FISCAL", "dep-1"]]),
    });

    const result = await uploadOnvioBatch({
      token: "token",
      attachmentsDir: "C:/tmp",
      bdApiBaseUrl: "http://localhost:3001/api",
      input: {
        empresas: [
          {
            cnpj: "12",
            codigo: "543",
            nome: "Link Informatica",
            solicitante: "EMANUEL - FUNCIONARIO NOVO",
            departamento: "Fiscal",
            assunto: "",
            descricao: "",
            arquivos: [],
          },
        ],
      },
      resolveRequesterId: async () => "contact-emanuel",
      defaults: {
        clientId: "client-default",
        departmentId: "dep-default",
      },
    });

    expect(result.summary.success).toBe(1);
    expect(result.items[0]?.warnings ?? []).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining('Solicitante "EMANUEL - FUNCIONARIO NOVO" sem ID do Onvio resolvido'),
      ]),
    );
    expect(uploadTicketWithAttachments).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterId: "contact-emanuel",
      }),
    );
  });

  it("avisa quando solicitante nao resolve requesterId para o Onvio", async () => {
    loadBdLookupData.mockResolvedValue({
      clientIdByCode: new Map([["543", "client-1"]]),
      requesterIdByName: new Map(),
      departmentIdByName: new Map([["FISCAL", "dep-1"]]),
    });

    const result = await uploadOnvioBatch({
      token: "token",
      attachmentsDir: "C:/tmp",
      bdApiBaseUrl: "http://localhost:3001/api",
      input: {
        empresas: [
          {
            cnpj: "12",
            codigo: "543",
            nome: "Link Informatica",
            solicitante: "Fulano",
            departamento: "Fiscal",
            assunto: "",
            descricao: "",
            arquivos: [],
          },
        ],
      },
      defaults: {
        clientId: "client-default",
        departmentId: "dep-default",
      },
    });

    expect(result.summary.success).toBe(1);
    expect(result.items[0]?.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Solicitante "Fulano" sem ID do Onvio resolvido'),
      ]),
    );
    expect(uploadTicketWithAttachments).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterId: undefined,
      }),
    );
  });

  it("marca item como falha quando nao encontra anexo", async () => {
    readdirSync.mockReturnValue([{ isFile: () => true, name: "Empresa 999 - OUTRA.pdf" }]);

    const result = await uploadOnvioBatch({
      token: "token",
      attachmentsDir: "C:/tmp",
      input: {
        empresas: [
          {
            cnpj: "12",
            codigo: "543",
            nome: "Link Informatica",
            solicitante: "Fulano",
            departamento: "Fiscal",
            assunto: "",
            descricao: "",
            arquivos: [],
          },
        ],
      },
      defaults: {
        clientId: "client-default",
        departmentId: "dep-default",
      },
    });

    expect(result.summary.failed).toBe(1);
    expect(result.items[0]?.status).toBe("failed");
  });
});
