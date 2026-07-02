import { describe, expect, it, vi } from "vitest";
import {
  buildRelationshipSearchPayload,
  OnvioHttpClientUsersProvider,
} from "./onvio-http-client-users-provider";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("buildRelationshipSearchPayload", () => {
  it("monta filtro contactIsClientCenterEnabled para solicitacao de servico", () => {
    expect(buildRelationshipSearchPayload(1, 50, "serviceRequest")).toEqual({
      expand: "contact.displayAs,contact.id",
      excludeCount: false,
      filterSearchSort: {
        search: "true",
        searchBy: "contactIsClientCenterEnabled",
      },
      pagingDataRequest: { itemsPerPage: 1000 },
    });
  });

  it("mantem payload legado para tela de configuracao", () => {
    expect(buildRelationshipSearchPayload(2, 25, "settings")).toEqual({
      expand:
        "contact.displayAs,contact.primaryEmail.emailAddress,contact.id,contactIsClientCenterEnabled",
      excludeCount: false,
      filterSearchSort: {
        orderBy: "",
        search: "",
        searchBy: "",
        filter: "",
      },
      pagingDataRequest: {
        startIndex: 26,
        pageIndex: 2,
        itemsPerPage: 25,
      },
    });
  });
});

describe("OnvioHttpClientUsersProvider", () => {
  it("consulta usuarios por clientCode e mapeia nome/email no modo serviceRequest", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ code: "123", primaryContactExpanded: { id: "contact-1" } }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              contact: {
                id: "user-1",
                displayAs: "Cliente Um",
                primaryEmail: { emailAddress: "cliente1@example.com" },
              },
              contactIsClientCenterEnabled: true,
            },
            {
              contact: {
                id: "user-2",
                displayAs: "Cliente Dois",
                primaryEmail: { emailAddress: "cliente2@example.com" },
              },
              contactIsClientCenterEnabled: false,
            },
          ],
        }),
      );
    const provider = new OnvioHttpClientUsersProvider({
      token: "token",
      firmCompanyId: "firm-id",
      baseUrl: "https://onvio.com.br",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await provider.lookupUsers({
      codigo: "00123",
      cnpj: "11111111000111",
      nome: "Empresa Teste",
    });

    expect(result.users).toEqual([
      {
        nome: "Cliente Um",
        email: "cliente1@example.com",
        id: "user-1",
      },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("https://onvio.com.br/api/service-requesting/v1/client-core"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "UDSLongToken token",
          referer: "https://onvio.com.br/br-portal-do-cliente/service-requesting/general",
        }),
      }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://onvio.com.br/api/core/v1/companies/firm-id/contacts/contact-1/relationship-views/search",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "UDSLongToken token",
          referer: "https://onvio.com.br/br-portal-do-cliente/service-requesting/general",
        }),
        body: JSON.stringify(buildRelationshipSearchPayload(1, 50, "serviceRequest")),
      }),
    );
    const clientSearchUrl = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(clientSearchUrl.searchParams.get("search")).toBe("123");
    expect(clientSearchUrl.searchParams.get("searchBy")).toBe("code");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("pagina enquanto a resposta vem cheia no modo settings", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ code: "123", primaryContactExpanded: { id: "contact-1" } }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ contact: { id: "user-1", displayAs: "Cliente Um" } }],
          total: 2,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ contact: { id: "user-2", displayAs: "Cliente Dois" } }],
          total: 2,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    const provider = new OnvioHttpClientUsersProvider({
      token: "token",
      firmCompanyId: "firm-id",
      itemsPerPage: 1,
      lookupPurpose: "settings",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await provider.lookupUsers({
      codigo: "123",
      cnpj: "11111111000111",
      nome: "Empresa Teste",
    });

    expect(result.users.map((user) => user.nome)).toEqual(["Cliente Um", "Cliente Dois"]);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("retorna aviso quando cliente nao e encontrado no client-core", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    const provider = new OnvioHttpClientUsersProvider({
      token: "token",
      firmCompanyId: "firm-id",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await provider.lookupUsers({
      codigo: "999",
      cnpj: "11111111000111",
      nome: "Empresa Teste",
    });

    expect(result.users).toEqual([]);
    expect(result.warnings?.[0]).toContain("nao encontrado no client-core");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("retorna erro com status quando o Onvio falha", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ message: "unauthorized" }, { status: 401, statusText: "Unauthorized" }),
    );
    const provider = new OnvioHttpClientUsersProvider({
      token: "token",
      firmCompanyId: "firm-id",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      provider.lookupUsers({
        codigo: "123",
        cnpj: "11111111000111",
        nome: "Empresa Teste",
      }),
    ).rejects.toThrow("401 Unauthorized");
  });
});
