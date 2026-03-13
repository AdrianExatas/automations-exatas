import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadBdLookupData } from "./bd-api";

const originalFetch = globalThis.fetch;
const fetchMock = vi.fn();

describe("bd-api", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("pagina recursos e monta mapas por codigo e nome normalizado", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/companies?") && url.includes("offset=0")) {
        return {
          ok: true,
          json: async () => ({
            data: [{ onvio_id: "client-1", code: "0543" }],
            total: 2,
            limit: 1,
            offset: 0,
          }),
        };
      }
      if (url.includes("/companies?") && url.includes("offset=1")) {
        return {
          ok: true,
          json: async () => ({
            data: [{ onvio_id: "client-2", code: "13" }],
            total: 2,
            limit: 1,
            offset: 1,
          }),
        };
      }
      if (url.includes("/employees?")) {
        return {
          ok: true,
          json: async () => ({
            data: [{ employee_id: "employee-1", name: "João Silva" }],
            total: 1,
            limit: 1,
            offset: 0,
          }),
        };
      }
      if (url.includes("/departments?")) {
        return {
          ok: true,
          json: async () => ({
            data: [{ department_id: "department-1", name: "Setor Fiscal" }],
            total: 1,
            limit: 1,
            offset: 0,
          }),
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await loadBdLookupData("http://localhost:3000/api/");

    expect(result.clientIdByCode.get("543")).toBe("client-1");
    expect(result.clientIdByCode.get("13")).toBe("client-2");
    expect(result.requesterIdByName.get("JOAO SILVA")).toBe("employee-1");
    expect(result.departmentIdByName.get("SETOR FISCAL")).toBe("department-1");
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/companies?limit=500&offset=0", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/companies?limit=500&offset=1", expect.any(Object));
  });

  it("propaga erro quando um endpoint retorna falha HTTP", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(loadBdLookupData("http://localhost:3001/api")).rejects.toThrow(
      "Falha ao consultar /companies: 500 Internal Server Error",
    );
  });
});
