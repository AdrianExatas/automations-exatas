import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendServiceRequestsBatch } from "./send-service-requests-batch";

const { openTicket, uploadTicketWithAttachments, existsSync, readFileSync, statSync, readdirSync } =
  vi.hoisted(() => ({
    openTicket: vi.fn(),
    uploadTicketWithAttachments: vi.fn(),
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(),
    readdirSync: vi.fn(),
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

function row(overrides: Record<string, unknown> = {}) {
  return {
    cnpj: "12",
    codigo: "543",
    nome: "Link Informatica",
    solicitante: "Fulano",
    departamento: "Fiscal",
    assunto: "Assunto",
    descricao: "Descricao",
    arquivos: [] as string[],
    ...overrides,
  };
}

describe("sendServiceRequestsBatch optional-attachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    existsSync.mockReturnValue(true);
    statSync.mockReturnValue({ isFile: () => true });
    readdirSync.mockReturnValue([]);
    readFileSync.mockImplementation((filePath: string) => Buffer.from(String(filePath)));
    openTicket.mockResolvedValue({ ticketId: "ticket-empty" });
    uploadTicketWithAttachments.mockResolvedValue({ ticketId: "ticket-files" });
  });

  it("abre sem anexos quando a linha nao tem arquivos", async () => {
    const result = await sendServiceRequestsBatch({
      token: "token",
      mode: "optional-attachments",
      validateAttachmentIdentity: false,
      input: { serviceRequests: [row()] },
      defaults: { clientId: "client-1", departmentId: "dep-1" },
    });

    expect(result.summary.success).toBe(1);
    expect(openTicket).toHaveBeenCalledTimes(1);
    expect(uploadTicketWithAttachments).not.toHaveBeenCalled();
    expect(result.items[0]).toMatchObject({
      status: "success",
      attachmentCount: 0,
      message: "Solicitacao aberta sem anexos.",
    });
  });

  it("anexa caminhos absolutos da linha e extras comuns", async () => {
    const result = await sendServiceRequestsBatch({
      token: "token",
      mode: "optional-attachments",
      validateAttachmentIdentity: false,
      extraAttachmentPaths: ["C:/comum/circular.pdf"],
      input: {
        serviceRequests: [row({ arquivos: ["C:/cliente/contrato.pdf"] })],
      },
      defaults: { clientId: "client-1", departmentId: "dep-1" },
    });

    expect(result.summary.success).toBe(1);
    expect(openTicket).not.toHaveBeenCalled();
    expect(uploadTicketWithAttachments).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: expect.arrayContaining([
          expect.objectContaining({ fileName: "contrato.pdf" }),
          expect.objectContaining({ fileName: "circular.pdf" }),
        ]),
      }),
    );
  });

  it("nao exige pasta de anexos no modo opcional", async () => {
    existsSync.mockImplementation((filePath: string) => String(filePath).includes("circular"));

    const result = await sendServiceRequestsBatch({
      token: "token",
      mode: "optional-attachments",
      validateAttachmentIdentity: false,
      extraAttachmentPaths: ["C:/comum/circular.pdf"],
      input: { serviceRequests: [row()] },
      defaults: { clientId: "client-1", departmentId: "dep-1" },
    });

    expect(result.summary.success).toBe(1);
    expect(uploadTicketWithAttachments).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [expect.objectContaining({ fileName: "circular.pdf" })],
      }),
    );
  });

  it("cancela entre itens e marca o restante como skipped", async () => {
    let calls = 0;
    openTicket.mockImplementation(async () => {
      calls += 1;
      return { ticketId: `ticket-${calls}` };
    });

    const result = await sendServiceRequestsBatch({
      token: "token",
      mode: "optional-attachments",
      validateAttachmentIdentity: false,
      input: {
        serviceRequests: [row({ codigo: "1" }), row({ codigo: "2" }), row({ codigo: "3" })],
      },
      defaults: { clientId: "client-1", departmentId: "dep-1" },
      shouldCancel: () => calls >= 1,
    });

    expect(result.summary.success).toBe(1);
    expect(result.summary.skipped).toBe(2);
    expect(result.summary.cancelled).toBe(true);
    expect(openTicket).toHaveBeenCalledTimes(1);
    expect(result.items.slice(1).every((item) => item.message === "Cancelado pelo usuario.")).toBe(
      true,
    );
  });
});
