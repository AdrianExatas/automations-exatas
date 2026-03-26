import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadOnvioBatch } from "./upload-onvio-batch";

const {
  loadBdLookupData,
  openTicket,
  uploadTicketWithAttachments,
  readdirSync,
  existsSync,
  readFileSync,
} = vi.hoisted(() => ({
  loadBdLookupData: vi.fn(),
  openTicket: vi.fn(),
  uploadTicketWithAttachments: vi.fn(),
  readdirSync: vi.fn(),
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
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
  },
}));

describe("uploadOnvioBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    existsSync.mockReturnValue(true);
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
