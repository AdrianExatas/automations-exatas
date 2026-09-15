import { describe, expect, it, vi } from "vitest";
import { OnvioHttpCompaniesProvider } from "./onvio-companies-provider";

function response(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function provider(fetchImpl: ReturnType<typeof vi.fn>) {
  return new OnvioHttpCompaniesProvider({
    token: "token",
    firmCompanyId: "firm",
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
}

describe("OnvioHttpCompaniesProvider", () => {
  it("retorna empresa ativa por codigo exato e reutiliza a consulta em cache", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ items: [{ id: "client-1", code: "123" }] }));
    const source = provider(fetchImpl);

    await expect(source.lookupCompany({ codigo: "00123", cnpj: "1", nome: "Empresa" })).resolves.toEqual({
      codigo: "123", clientId: "client-1", status: "ATIVO", fonte: "client-core-ativo",
    });
    await source.lookupCompany({ codigo: "123", cnpj: "1", nome: "Empresa" });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(url.searchParams.get("filter")).toContain("ACTIVE");
  });

  it("classifica como inativa quando somente a consulta sem filtro localiza a empresa", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({ items: [] }))
      .mockResolvedValueOnce(response({ items: [{ id: "client-2", code: "123" }] }));
    await expect(provider(fetchImpl).lookupCompany({ codigo: "123", cnpj: "1", nome: "Empresa" })).resolves.toMatchObject({
      clientId: "client-2", status: "INATIVO", fonte: "client-core",
    });
  });

  it("usa Core v3 quando client-core nao retorna correspondencia", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({ items: [] }))
      .mockResolvedValueOnce(response({ items: [] }))
      .mockResolvedValueOnce(response({ items: [{ id: "client-3", code: "123" }] }));
    await expect(provider(fetchImpl).lookupCompany({ codigo: "123", cnpj: "1", nome: "Empresa" })).resolves.toMatchObject({
      clientId: "client-3", status: "LOCALIZADO_SEM_STATUS", fonte: "core-v3",
    });
  });

  it("nao aceita correspondencia de codigo aproximada", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({ items: [{ id: "wrong", code: "1234" }] }))
      .mockResolvedValueOnce(response({ items: [] }))
      .mockResolvedValueOnce(response({ items: [] }));
    await expect(provider(fetchImpl).lookupCompany({ codigo: "123", cnpj: "1", nome: "Empresa" })).resolves.toMatchObject({
      status: "NAO_LOCALIZADO",
    });
  });

  it("renova o token uma vez ao receber 401", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({ message: "expired" }, { status: 401, statusText: "Unauthorized" }))
      .mockResolvedValueOnce(response({ items: [{ id: "client-1", code: "123" }] }));
    const refresh = vi.fn().mockResolvedValue("token-renovado");
    const source = new OnvioHttpCompaniesProvider({
      token: "token-antigo", firmCompanyId: "firm", onUnauthorized: refresh,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(source.lookupCompany({ codigo: "123", cnpj: "1", nome: "Empresa" })).resolves.toMatchObject({
      clientId: "client-1", status: "ATIVO",
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({ authorization: "UDSLongToken token-renovado" }),
    });
  });
});
