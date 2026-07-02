import { describe, expect, it } from "vitest";
import { resolveServiceRequestIdentifiers } from "./service-request-identifiers";
import type { ServiceRequestRow } from "./types";

function makeRow(overrides: Partial<ServiceRequestRow> = {}): ServiceRequestRow {
  return {
    cnpj: "12",
    codigo: "543",
    nome: "Link Informatica",
    solicitante: "",
    departamento: "",
    assunto: "",
    descricao: "",
    arquivos: [],
    ...overrides,
  };
}

describe("resolveServiceRequestIdentifiers", () => {
  it("avisa quando solicitante textual nao resolve para requesterId", () => {
    const result = resolveServiceRequestIdentifiers(
      makeRow({ solicitante: "Beltrano", departamento: "Fiscal" }),
      {
        clientIdByCode: new Map([["543", "client-map"]]),
        requesterIdByName: new Map(),
        departmentIdByName: new Map([["FISCAL", "dep-map"]]),
      },
      { clientId: "fallback-client", departmentId: "dep-fallback" },
    );

    expect(result.requesterId).toBeUndefined();
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Solicitante "Beltrano" sem ID do Onvio resolvido'),
      ]),
    );
  });

  it("usa clientRequesterId antes do fallback de employees", () => {
    const result = resolveServiceRequestIdentifiers(
      makeRow({ solicitante: "Beltrano", departamento: "Fiscal" }),
      {
        clientIdByCode: new Map([["543", "client-map"]]),
        requesterIdByName: new Map(),
        departmentIdByName: new Map([["FISCAL", "dep-map"]]),
      },
      { clientId: "fallback-client", departmentId: "dep-fallback" },
      { clientRequesterId: "client-contact-1" },
    );

    expect(result.requesterId).toBe("client-contact-1");
    expect(
      result.warnings?.some((w) => w.includes("sem ID do Onvio resolvido")),
    ).toBe(false);
  });

  it("nao avisa sobre solicitante vazio quando requesterId ausente", () => {
    const result = resolveServiceRequestIdentifiers(
      makeRow({ solicitante: "", departamento: "Fiscal" }),
      {
        clientIdByCode: new Map([["543", "client-map"]]),
        requesterIdByName: new Map(),
        departmentIdByName: new Map([["FISCAL", "dep-map"]]),
      },
      { clientId: "fallback-client", departmentId: "dep-fallback" },
    );

    expect(result.requesterId).toBeUndefined();
    expect(
      result.warnings?.some((w) => w.includes("sem ID do Onvio resolvido")),
    ).toBe(false);
  });
});
