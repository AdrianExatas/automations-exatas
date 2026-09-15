import { describe, test, expect } from "bun:test";
import { DominioMockAdapter } from "../../Dominio/reinf-dctfweb-conferencia/src/dominio/mock_adapter.ts";
import { ConferenciaOrchestrator } from "../../Dominio/reinf-dctfweb-conferencia/src/orchestrator.ts";

describe("Homologação dos 5 Casos Reais Controlados (PLAN.md)", () => {
  const competencia = "2026-01";
  const mockDominio = new DominioMockAdapter();

  // Provedor mock de DCTFWeb simulando os retornos oficiais do SERPRO
  const mockDctfwebProvider = async (cnpj: string, comp: string): Promise<string | null> => {
    if (cnpj === "11222333000144") {
      // Caso 1: R-2000 puro -> CPRB 1162-01 = 5500.00
      const xml = `
      <Dctfweb>
        <identificacaoContribuinte><cnpj>${cnpj}</cnpj></identificacaoContribuinte>
        <identificacaoDeclaracao>
          <periodoApuracao>${comp}</periodoApuracao>
          <numeroRecibo>2.2026.1010101</numeroRecibo>
          <tipoDeclaracao>ORIGINAL</tipoDeclaracao>
        </identificacaoDeclaracao>
        <tributos>
          <tributo>
            <origem>6</origem>
            <codigoReceita>1162-01</codigoReceita>
            <baseCalculo>50000.00</baseCalculo>
            <valorDevido>5500.00</valorDevido>
            <saldoExigivel>5500.00</saldoExigivel>
          </tributo>
        </tributos>
      </Dctfweb>`;
      return Buffer.from(xml, "utf-8").toString("base64");
    }

    if (cnpj === "22333444000155") {
      // Caso 2: R-4000 puro -> 1708 = 150.00 e 0588 = 300.00
      const xml = `
      <Dctfweb>
        <identificacaoContribuinte><cnpj>${cnpj}</cnpj></identificacaoContribuinte>
        <identificacaoDeclaracao>
          <periodoApuracao>${comp}</periodoApuracao>
          <numeroRecibo>2.2026.2020202</numeroRecibo>
          <tipoDeclaracao>ORIGINAL</tipoDeclaracao>
        </identificacaoDeclaracao>
        <tributos>
          <tributo>
            <origem>7</origem>
            <codigoReceita>1708</codigoReceita>
            <baseCalculo>10000.00</baseCalculo>
            <valorDevido>150.00</valorDevido>
            <saldoExigivel>150.00</saldoExigivel>
          </tributo>
          <tributo>
            <origem>7</origem>
            <codigoReceita>0588</codigoReceita>
            <baseCalculo>20000.00</baseCalculo>
            <valorDevido>300.00</valorDevido>
            <saldoExigivel>300.00</saldoExigivel>
          </tributo>
        </tributos>
      </Dctfweb>`;
      return Buffer.from(xml, "utf-8").toString("base64");
    }

    if (cnpj === "33444555000166") {
      // Caso 3: Ambas as séries -> R-2000 com 8800.00 e R-4000 com 450.00 (Total 9250.00)
      const xml = `
      <Dctfweb>
        <identificacaoContribuinte><cnpj>${cnpj}</cnpj></identificacaoContribuinte>
        <identificacaoDeclaracao>
          <periodoApuracao>${comp}</periodoApuracao>
          <numeroRecibo>2.2026.3030303</numeroRecibo>
          <tipoDeclaracao>ORIGINAL</tipoDeclaracao>
        </identificacaoDeclaracao>
        <tributos>
          <tributo>
            <origem>6</origem>
            <codigoReceita>1162-01</codigoReceita>
            <baseCalculo>80000.00</baseCalculo>
            <valorDevido>8800.00</valorDevido>
            <saldoExigivel>8800.00</saldoExigivel>
          </tributo>
          <tributo>
            <origem>7</origem>
            <codigoReceita>1708</codigoReceita>
            <baseCalculo>30000.00</baseCalculo>
            <valorDevido>450.00</valorDevido>
            <saldoExigivel>450.00</saldoExigivel>
          </tributo>
        </tributos>
      </Dctfweb>`;
      return Buffer.from(xml, "utf-8").toString("base64");
    }

    if (cnpj === "44555666000177") {
      // Caso 4: Sem movimento -> sem débitos
      const xml = `
      <Dctfweb>
        <identificacaoContribuinte><cnpj>${cnpj}</cnpj></identificacaoContribuinte>
        <identificacaoDeclaracao>
          <periodoApuracao>${comp}</periodoApuracao>
          <numeroRecibo>2.2026.4040404</numeroRecibo>
          <tipoDeclaracao>ORIGINAL</tipoDeclaracao>
        </identificacaoDeclaracao>
        <tributos></tributos>
      </Dctfweb>`;
      return Buffer.from(xml, "utf-8").toString("base64");
    }

    if (cnpj === "55666777000188") {
      // Caso 5: Retificação -> coincide com o retificador 4620.00 (recibo 9999002)
      const xml = `
      <Dctfweb>
        <identificacaoContribuinte><cnpj>${cnpj}</cnpj></identificacaoContribuinte>
        <identificacaoDeclaracao>
          <periodoApuracao>${comp}</periodoApuracao>
          <numeroRecibo>2.2026.5050505</numeroRecibo>
          <tipoDeclaracao>RETIFICADORA</tipoDeclaracao>
        </identificacaoDeclaracao>
        <tributos>
          <tributo>
            <origem>6</origem>
            <codigoReceita>1162-01</codigoReceita>
            <baseCalculo>42000.00</baseCalculo>
            <valorDevido>4620.00</valorDevido>
            <saldoExigivel>4620.00</saldoExigivel>
          </tributo>
        </tributos>
      </Dctfweb>`;
      return Buffer.from(xml, "utf-8").toString("base64");
    }

    return null;
  };

  const orchestrator = new ConferenciaOrchestrator({
    dominioClient: mockDominio,
    mockDctfwebProvider,
  });

  test("Caso 1: R-2000 puro resulta em CONFORME com recibo e valores exatos", async () => {
    const res = await orchestrator.reconcileCompany(competencia, "101");
    expect(res.status).toBe("CONFORME");
    expect(res.totalGeralDominio).toBe(5500.0);
    expect(res.totalGeralDctfweb).toBe(5500.0);
    expect(res.diferencaGeral).toBe(0.0);
    expect(res.reciboReinfR2000).toBe("1.2026.1234567");
    expect(res.reciboDctfweb).toBe("2.2026.1010101");
  });

  test("Caso 2: R-4000 puro resulta em CONFORME conciliando múltiplos códigos de retenção", async () => {
    const res = await orchestrator.reconcileCompany(competencia, "102");
    expect(res.status).toBe("CONFORME");
    expect(res.totalDominioOrigem7).toBe(450.0);
    expect(res.totalDctfwebOrigem7).toBe(450.0);
    expect(res.diferencaGeral).toBe(0.0);
    expect(res.reciboReinfR4000).toBe("1.2026.7654321");
    expect(res.detalhes.length).toBe(2);
  });

  test("Caso 3: Ambas as séries combinadas conciliam Origem 6 e Origem 7 conjuntamente", async () => {
    const res = await orchestrator.reconcileCompany(competencia, "103");
    expect(res.status).toBe("CONFORME");
    expect(res.totalDominioOrigem6).toBe(8800.0);
    expect(res.totalDominioOrigem7).toBe(450.0);
    expect(res.totalGeralDominio).toBe(9250.0);
    expect(res.totalGeralDctfweb).toBe(9250.0);
    expect(res.diferencaGeral).toBe(0.0);
    expect(res.reciboReinfR2000).toBe("1.2026.1111111");
    expect(res.reciboReinfR4000).toBe("1.2026.2222222");
  });

  test("Caso 4: Sem movimento valida declaração vazia sem declarar divergência", async () => {
    const res = await orchestrator.reconcileCompany(competencia, "104");
    expect(res.status).toBe("CONFORME");
    expect(res.totalGeralDominio).toBe(0.0);
    expect(res.totalGeralDctfweb).toBe(0.0);
    expect(res.diferencaGeral).toBe(0.0);
    expect(res.detalhes.length).toBe(0);
  });

  test("Caso 5: Retificação posterior adota o fechamento mais recente e valida com sucesso", async () => {
    const res = await orchestrator.reconcileCompany(competencia, "105");
    expect(res.status).toBe("CONFORME");
    // Garante que o valor utilizado é R$ 4620.00 (recibo 9999002) e NÃO R$ 3300.00 (recibo 9999001)
    expect(res.totalGeralDominio).toBe(4620.0);
    expect(res.totalGeralDctfweb).toBe(4620.0);
    expect(res.diferencaGeral).toBe(0.0);
    expect(res.reciboReinfR2000).toBe("1.2026.9999002");
  });

  test("Cenários de bloqueio: Período incompleto ou reaberto NUNCA é classificado como conforme", async () => {
    // Empresa 106: Período reaberto posteriormente
    const res106 = await orchestrator.reconcileCompany(competencia, "106");
    expect(res106.status).toBe("PENDENTE");
    expect(res106.status).not.toBe("CONFORME");

    // Empresa 107: Fechamento com erro/rejeição
    const res107 = await orchestrator.reconcileCompany(competencia, "107");
    expect(res107.status).toBe("PENDENTE");
    expect(res107.status).not.toBe("CONFORME");
  });
});
