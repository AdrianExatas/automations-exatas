import { describe, expect, it } from "vitest";
import { CAPABILITIES } from "../src/catalog/definitions.js";
import { CapabilityCatalog } from "../src/catalog/catalog.js";
import { validateInput } from "../src/operations/schema-validation.js";

describe("schemas e catálogo", () => {
  it("valida obrigatórios, tipos, limites e campos extras", () => {
    const schema = {
      type: "object",
      properties: { name: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 50 } },
      required: ["name"],
      additionalProperties: false,
    } as const;
    expect(() => validateInput(schema, { name: "A", limit: 10 })).not.toThrow();
    expect(() => validateInput(schema, { limit: 10 })).toThrow(/name/i);
    expect(() => validateInput(schema, { name: "A", limit: 100 })).toThrow(/máximo/i);
    expect(() => validateInput(schema, { name: "A", extra: true })).toThrow(/não é aceito/i);
  });

  it("não possui IDs duplicados nem lacunas sem classificação", () => {
    expect(new Set(CAPABILITIES.map((item) => item.operationId)).size).toBe(CAPABILITIES.length);
    for (const item of CAPABILITIES) {
      expect(["verified", "unavailable", "policy_blocked", "drifted"]).toContain(item.status);
      expect(item.evidence.source).toBeTruthy();
      if (item.status === "verified") expect(item.transport).not.toBe("informational");
      else expect(item.unavailableReason).toBeTruthy();
    }
  });

  it("pagina capacidades com cursor opaco", async () => {
    const client = {
      request: async (request: { provider: string }) => request.provider === "gestta"
        ? { permissions: [] }
        : { items: [{ feature: "OnvioDrive", resource: "Documents" }] },
    };
    const catalog = new CapabilityCatalog(client as never);
    const first = await catalog.list({ limit: 3 });
    expect(first.items).toHaveLength(3);
    expect(first.nextCursor).toBeTruthy();
    const second = await catalog.list({ limit: 3, cursor: first.nextCursor });
    expect(second.items[0]?.operationId).not.toBe(first.items[0]?.operationId);
    await expect(catalog.list({ cursor: "inválido" })).rejects.toThrow(/cursor/i);
  });
});
