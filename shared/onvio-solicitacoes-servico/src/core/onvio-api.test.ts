import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addAttachment,
  createTicket,
  openTicket,
  OnvioApiError,
  uploadTicketWithAttachments,
} from "./onvio-api";

function makeJsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("onvio core api", () => {
  it("cria ticket e extrai id do header location", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeJsonResponse(
          {},
          {
            headers: {
              location: "https://onvio.com.br/api/service-requesting/v1/tickets/generic/ABC123",
            },
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await createTicket(
      {
        token: "token",
        departmentId: "dep-1",
        requesterId: "req-1",
      },
      {
        clientId: "client-1",
        subject: "assunto",
        description: "descricao",
      },
    );

    expect(response.id).toBe("ABC123");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falha com mensagem explicita em 401", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401, statusText: "Unauthorized" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createTicket(
        { token: "token", departmentId: "dep-1" },
        { clientId: "client-1", subject: "assunto", description: "descricao" },
      ),
    ).rejects.toThrow("401 Unauthorized");
  });

  it("valida extensoes de upload no addAttachment", async () => {
    vi.stubGlobal("fetch", vi.fn());

    await expect(
      addAttachment(
        { token: "token", departmentId: "dep-1" },
        "ticket-1",
        { fileBuffer: Buffer.from("abc"), fileName: "arquivo.txt" },
      ),
    ).rejects.toThrow("Extensao de arquivo nao suportada");
  });

  it("orquestra ticket, topico e anexos no uploadTicketWithAttachments", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse({ id: "ticket-1" }))
      .mockResolvedValueOnce(makeJsonResponse({ ok: true }))
      .mockResolvedValueOnce(makeJsonResponse({ ok: true }))
      .mockResolvedValueOnce(makeJsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadTicketWithAttachments({
      token: "token",
      clientId: "client-1",
      departmentId: "dep-1",
      requesterId: "req-1",
      subject: "assunto",
      description: "descricao",
      attachments: [
        { fileName: "a.pdf", fileBuffer: Buffer.from("a") },
        { fileName: "b.xlsx", fileBuffer: Buffer.from("b") },
      ],
    });

    expect(result).toEqual({ ticketId: "ticket-1" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("abre ticket sem anexos pela API generica", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse({ id: "ticket-1" }))
      .mockResolvedValueOnce(makeJsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await openTicket({
      token: "token",
      clientId: "client-1",
      departmentId: "dep-1",
      subject: "assunto",
      description: "descricao",
    });

    expect(result).toEqual({ ticketId: "ticket-1" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falha quando nao ha anexos", async () => {
    await expect(
      uploadTicketWithAttachments({
        token: "token",
        clientId: "client-1",
        departmentId: "dep-1",
        subject: "assunto",
        description: "descricao",
        attachments: [],
      }),
    ).rejects.toBeInstanceOf(OnvioApiError);
  });
});
