import { describe, expect, it, vi } from "vitest";
import {
  buildDepartmentIdByName,
  createOnvioDepartmentsIdentifierProvider,
  OnvioHttpDepartmentsProvider,
} from "./onvio-http-departments-provider";

function response(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("buildDepartmentIdByName", () => {
  it("mapeia SETOR FISCAL/CONTABIL e aliases curtos", () => {
    const map = buildDepartmentIdByName([
      { id: "fiscal-id", name: "SETOR FISCAL", code: "FISCAL" },
      { id: "contabil-id", name: "SETOR CONTÁBIL", code: "CONTÁBIL" },
      { id: "fiscal-short", name: "Fiscal", code: "DP04" },
    ]);

    expect(map.get("SETOR FISCAL")).toBe("fiscal-id");
    expect(map.get("SETOR CONTABIL")).toBe("contabil-id");
    expect(map.get("CONTABIL")).toBe("contabil-id");
    // "Fiscal" curto nao sobrescreve alias ja ocupado por SETOR FISCAL
    expect(map.get("FISCAL")).toBe("fiscal-id");
  });
});

describe("OnvioHttpDepartmentsProvider", () => {
  it("lista departamentos via departments/search", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      response({
        items: [
          { id: "dep-1", name: "SETOR FISCAL", code: "FISCAL" },
          { id: "dep-2", name: "SETOR CONTÁBIL", code: "CONTÁBIL" },
        ],
      }),
    );

    const provider = new OnvioHttpDepartmentsProvider({
      token: "token",
      firmCompanyId: "firm",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const departments = await provider.listDepartments();
    expect(departments).toEqual([
      { id: "dep-1", name: "SETOR FISCAL", code: "FISCAL" },
      { id: "dep-2", name: "SETOR CONTÁBIL", code: "CONTÁBIL" },
    ]);

    const url = String(fetchImpl.mock.calls[0]?.[0]);
    expect(url).toContain("/api/core/v1/companies/firm/departments/search");
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe("POST");
  });

  it("renova o token uma vez ao receber 401", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({ message: "expired" }, { status: 401, statusText: "Unauthorized" }))
      .mockResolvedValueOnce(
        response({ items: [{ id: "dep-1", name: "SETOR FISCAL", code: "FISCAL" }] }),
      );
    const refresh = vi.fn().mockResolvedValue("token-novo");

    const provider = new OnvioHttpDepartmentsProvider({
      token: "token-antigo",
      firmCompanyId: "firm",
      onUnauthorized: refresh,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(provider.loadDepartmentIdByName()).resolves.toEqual(
      new Map([["SETOR FISCAL", "dep-1"], ["FISCAL", "dep-1"]]),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("identifierProvider expoe departmentIdByName para o batch", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      response({ items: [{ id: "dep-1", name: "SETOR FISCAL", code: "FISCAL" }] }),
    );
    const provider = new OnvioHttpDepartmentsProvider({
      token: "token",
      firmCompanyId: "firm",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const lookups = await createOnvioDepartmentsIdentifierProvider(provider).loadLookupData();
    expect(lookups.departmentIdByName.get("SETOR FISCAL")).toBe("dep-1");
    expect(lookups.clientIdByCode.size).toBe(0);
    expect(lookups.requesterIdByName.size).toBe(0);
  });
});
