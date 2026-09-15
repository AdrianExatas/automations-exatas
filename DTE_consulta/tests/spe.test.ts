import { describe, expect, test } from "bun:test";

import { mapSpeRecordsToTargets, parseSpeSearchResponse } from "../src/spe.js";

const PROCURATOR = "04252011000110";

describe("SPE", () => {
  test("interpreta o contrato content/pageMetadata do HAR", () => {
    const parsed = parseSpeSearchResponse({
      content: [{ uid: "abc", status: 0 }],
      pageMetadata: { pageSize: 100, pageLength: 1, pageNumber: 1, totalItems: 1 },
    });
    expect(parsed.content).toHaveLength(1);
    expect(parsed.pageMetadata.totalItems).toBe(1);
  });

  test("rejeita payload fora do contrato", () => {
    expect(() => parseSpeSearchResponse({ items: [] })).toThrow("content");
  });

  test("deduplica por CNPJ e prefere procuracao ativa", () => {
    const targets = mapSpeRecordsToTargets(
      [
        {
          uid: "old",
          status: 2,
          niOutorgante: "11.222.333/0001-81",
          nomeOutorgante: "Empresa Teste",
          niOutorgado: PROCURATOR,
        },
        {
          uid: "current",
          status: 0,
          niOutorgante: "11.222.333/0001-81",
          nomeOutorgante: "Empresa Teste",
          niOutorgado: PROCURATOR,
        },
      ],
      PROCURATOR,
    );
    expect(targets).toEqual([
      {
        cnpj: "11222333000181",
        corporateName: "Empresa Teste",
        rawStatus: "ATIVA",
        status: "active",
      },
    ]);
  });

  test("descarta CPF, CNPJ invalido e registro de outro outorgado", () => {
    const targets = mapSpeRecordsToTargets(
      [
        { status: 0, niOutorgante: "12345678901", niOutorgado: PROCURATOR },
        { status: 0, niOutorgante: "11222333000182", niOutorgado: PROCURATOR },
        { status: 0, niOutorgante: "11222333000181", niOutorgado: "11444777000161" },
      ],
      PROCURATOR,
    );
    expect(targets).toEqual([]);
  });
});
