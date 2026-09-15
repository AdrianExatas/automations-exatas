import { describe, test, expect } from "bun:test";
import { DominioReinfExtractor } from "../../Dominio/reinf-dctfweb-conferencia/src/dominio/extractor.ts";
import { DominioMockAdapter } from "../../Dominio/reinf-dctfweb-conferencia/src/dominio/mock_adapter.ts";
import type { Empresa } from "../../Dominio/reinf-dctfweb-conferencia/src/types.ts";

describe("Seleção e Validação de Fechamentos da EFD-Reinf no Domínio", () => {
  const mockAdapter = new DominioMockAdapter();
  const extractor = new DominioReinfExtractor(mockAdapter);

  test("seleciona o fechamento retificador mais recente ignorando o anterior", async () => {
    // Empresa 105 possui fechamento 9999001 (antigo) e 9999002 (recente retificador)
    const emp: Empresa = { codiEmp: "105", cnpj: "55666777000188", razaoSocial: "EPSILON" };
    const res = await extractor.extract(emp, "2026-01");

    expect(res.pendencias.length).toBe(0);
    expect(res.fechamentoR2000).toBeDefined();
    expect(res.fechamentoR2000?.recibo).toBe("1.2026.9999002");
    expect(res.fechamentoR2000?.aceito).toBe(true);
    expect(res.fechamentoR2000?.reabertoPosteriormente).toBe(false);

    // Deve conter os totalizadores atrelados ao recibo mais recente (4620.00) e não o antigo (3300.00)
    expect(res.itens.length).toBe(1);
    expect(res.itens[0].valorDevido).toBe(4620.0);
  });

  test("detecta reabertura posterior (R-2098) e classifica como pendente no Domínio", async () => {
    // Empresa 106 possui R-2099 seguido de R-2098 posterior
    const emp: Empresa = { codiEmp: "106", cnpj: "66777888000199", razaoSocial: "ZETA" };
    const res = await extractor.extract(emp, "2026-01");

    expect(res.fechamentoR2000?.reabertoPosteriormente).toBe(true);
    expect(res.pendencias.length).toBeGreaterThan(0);
    expect(res.pendencias.some((p) => p.includes("Período reaberto posteriormente"))).toBe(true);

    // Por estar reaberto, não deve carregar totalizadores como consolidados
    expect(res.itens.length).toBe(0);
  });

  test("detecta fechamento rejeitado ou com erro de transmissão", async () => {
    // Empresa 107 possui R-2099 com status REJEITADO
    const emp: Empresa = { codiEmp: "107", cnpj: "77888999000100", razaoSocial: "ETA" };
    const res = await extractor.extract(emp, "2026-01");

    expect(res.pendencias.length).toBeGreaterThan(0);
    expect(res.pendencias.some((p) => p.includes("não foi aceito"))).toBe(true);
  });

  test("reconhece corretamente declaração sem movimento", async () => {
    // Empresa 104 possui R-2099 e R-4099 com SEM_MOVIMENTO = 1
    const emp: Empresa = { codiEmp: "104", cnpj: "44555666000177", razaoSocial: "DELTA" };
    const res = await extractor.extract(emp, "2026-01");

    expect(res.pendencias.length).toBe(0);
    expect(res.fechamentoR2000?.temMovimento).toBe(false);
    expect(res.fechamentoR4000?.temMovimento).toBe(false);
    expect(res.itens.length).toBe(0);
  });

  test("registra pendência quando nenhum fechamento foi localizado", async () => {
    // Empresa inexistente ou sem eventos
    const emp: Empresa = { codiEmp: "999", cnpj: "99999999000199", razaoSocial: "INEXISTENTE" };
    const res = await extractor.extract(emp, "2026-01");

    expect(res.pendencias.length).toBeGreaterThan(0);
    expect(res.pendencias[0]).toContain("Nenhum evento de fechamento");
  });
});
