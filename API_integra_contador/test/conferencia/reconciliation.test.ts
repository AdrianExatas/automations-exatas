import { describe, test, expect } from "bun:test";
import { ReconciliationComparator } from "../../Dominio/reinf-dctfweb-conferencia/src/reconciliation/comparator.ts";
import type {
  DominioReinfData,
  DctfwebParsedDeclaration,
  Empresa,
} from "../../Dominio/reinf-dctfweb-conferencia/src/types.ts";

describe("Motor de Conciliação Fiscal — Regras de Tolerância e Divergência", () => {
  const comparator = new ReconciliationComparator();
  const baseEmpresa: Empresa = {
    codiEmp: "101",
    cnpj: "11222333000144",
    razaoSocial: "EMPRESA TESTE",
  };

  test("declara CONFORME quando valores são 100% idênticos em centavos", () => {
    const dominio: DominioReinfData = {
      empresa: baseEmpresa,
      competencia: "2026-01",
      fechamentoR2000: {
        serie: "R-2000",
        eventoFechamento: "R-2099",
        competencia: "2026-01",
        recibo: "rec_2000",
        dataHoraEnvio: "2026-02-10T10:00:00",
        aceito: true,
        excluido: false,
        reabertoPosteriormente: false,
        temMovimento: true,
      },
      itens: [
        {
          serie: "R-2000",
          origem: 6,
          codigoReceita: "1162-01",
          baseCalculo: 50000.0,
          valorDevido: 5500.0,
          valorDeducao: 0,
          valorRetencao: 5500.0,
          valorSuspenso: 0,
          saldoExigivel: 5500.0,
        },
      ],
      pendencias: [],
    };

    const dctfweb: DctfwebParsedDeclaration = {
      cnpj: "11222333000144",
      competencia: "2026-01",
      categoria: "GERAL_MENSAL",
      numeroRecibo: "rec_dctf",
      tipoDeclaracao: "ORIGINAL",
      totalApuradoOrigem6: 5500.0,
      totalApuradoOrigem7: 0,
      tributos: [
        {
          origem: 6,
          codigoReceita: "1162-01",
          baseCalculo: 50000.0,
          valorDevido: 5500.0,
          valorDeducao: 0,
          valorRetencao: 5500.0,
          valorSuspenso: 0,
          saldoExigivel: 5500.0,
        },
      ],
    };

    const res = comparator.compare(dominio, dctfweb);
    expect(res.status).toBe("CONFORME");
    expect(res.diferencaGeral).toBe(0.0);
    expect(res.detalhes[0].situacao).toBe("conforme");
  });

  test("declara DIVERGENTE quando houver diferença de R$ 0,01 em centavos", () => {
    const dominio: DominioReinfData = {
      empresa: baseEmpresa,
      competencia: "2026-01",
      fechamentoR2000: {
        serie: "R-2000",
        eventoFechamento: "R-2099",
        competencia: "2026-01",
        recibo: "rec_2000",
        dataHoraEnvio: "2026-02-10T10:00:00",
        aceito: true,
        excluido: false,
        reabertoPosteriormente: false,
        temMovimento: true,
      },
      itens: [
        {
          serie: "R-2000",
          origem: 6,
          codigoReceita: "1162-01",
          baseCalculo: 50000.0,
          valorDevido: 5500.01, // Diferença de 1 centavo!
          valorDeducao: 0,
          valorRetencao: 5500.01,
          valorSuspenso: 0,
          saldoExigivel: 5500.01,
        },
      ],
      pendencias: [],
    };

    const dctfweb: DctfwebParsedDeclaration = {
      cnpj: "11222333000144",
      competencia: "2026-01",
      categoria: "GERAL_MENSAL",
      numeroRecibo: "rec_dctf",
      tipoDeclaracao: "ORIGINAL",
      totalApuradoOrigem6: 5500.0,
      totalApuradoOrigem7: 0,
      tributos: [
        {
          origem: 6,
          codigoReceita: "1162-01",
          baseCalculo: 50000.0,
          valorDevido: 5500.0,
          valorDeducao: 0,
          valorRetencao: 5500.0,
          valorSuspenso: 0,
          saldoExigivel: 5500.0,
        },
      ],
    };

    const res = comparator.compare(dominio, dctfweb);
    expect(res.status).toBe("DIVERGENTE");
    expect(res.diferencaGeral).toBe(0.01);
    expect(res.detalhes[0].situacao).toBe("divergente");
  });

  test("classifica código presente em apenas uma fonte como 'somente no Domínio' ou 'somente na DCTFWeb'", () => {
    const dominio: DominioReinfData = {
      empresa: baseEmpresa,
      competencia: "2026-01",
      itens: [
        {
          serie: "R-4000",
          origem: 7,
          codigoReceita: "1708", // Presente no Domínio
          baseCalculo: 1000.0,
          valorDevido: 15.0,
          valorDeducao: 0,
          valorRetencao: 15.0,
          valorSuspenso: 0,
          saldoExigivel: 15.0,
        },
      ],
      pendencias: [],
    };

    const dctfweb: DctfwebParsedDeclaration = {
      cnpj: "11222333000144",
      competencia: "2026-01",
      categoria: "GERAL_MENSAL",
      numeroRecibo: "rec_dctf",
      tipoDeclaracao: "ORIGINAL",
      totalApuradoOrigem6: 0,
      totalApuradoOrigem7: 20.0,
      tributos: [
        {
          origem: 7,
          codigoReceita: "0588", // Presente SOMENTE na DCTFWeb
          baseCalculo: 2000.0,
          valorDevido: 20.0,
          valorDeducao: 0,
          valorRetencao: 20.0,
          valorSuspenso: 0,
          saldoExigivel: 20.0,
        },
      ],
    };

    const res = comparator.compare(dominio, dctfweb);
    expect(res.status).toBe("DIVERGENTE");

    const item1708 = res.detalhes.find((d) => d.codigoReceita === "1708");
    expect(item1708?.situacao).toBe("somente_dominio");

    const item0588 = res.detalhes.find((d) => d.codigoReceita === "0588");
    expect(item0588?.situacao).toBe("somente_dctfweb");
  });

  test("totais iguais com detalhamento diferente é classificado como DIVERGENTE", () => {
    // Domínio: código 1708 = R$ 100,00, código 0588 = R$ 50,00 (Total R$ 150,00)
    // DCTFWeb: código 1708 = R$ 50,00, código 0588 = R$ 100,00 (Total R$ 150,00)
    // Total bate perfeitamente, mas os códigos individuais são divergentes!
    const dominio: DominioReinfData = {
      empresa: baseEmpresa,
      competencia: "2026-01",
      itens: [
        {
          serie: "R-4000",
          origem: 7,
          codigoReceita: "1708",
          baseCalculo: 5000.0,
          valorDevido: 100.0,
          valorDeducao: 0,
          valorRetencao: 100.0,
          valorSuspenso: 0,
          saldoExigivel: 100.0,
        },
        {
          serie: "R-4000",
          origem: 7,
          codigoReceita: "0588",
          baseCalculo: 2500.0,
          valorDevido: 50.0,
          valorDeducao: 0,
          valorRetencao: 50.0,
          valorSuspenso: 0,
          saldoExigivel: 50.0,
        },
      ],
      pendencias: [],
    };

    const dctfweb: DctfwebParsedDeclaration = {
      cnpj: "11222333000144",
      competencia: "2026-01",
      categoria: "GERAL_MENSAL",
      numeroRecibo: "rec_dctf",
      tipoDeclaracao: "ORIGINAL",
      totalApuradoOrigem6: 0,
      totalApuradoOrigem7: 150.0,
      tributos: [
        {
          origem: 7,
          codigoReceita: "1708",
          baseCalculo: 2500.0,
          valorDevido: 50.0,
          valorDeducao: 0,
          valorRetencao: 50.0,
          valorSuspenso: 0,
          saldoExigivel: 50.0,
        },
        {
          origem: 7,
          codigoReceita: "0588",
          baseCalculo: 5000.0,
          valorDevido: 100.0,
          valorDeducao: 0,
          valorRetencao: 100.0,
          valorSuspenso: 0,
          saldoExigivel: 100.0,
        },
      ],
    };

    const res = comparator.compare(dominio, dctfweb);
    // Totais coincidem (diferença geral = 0.0)
    expect(res.diferencaGeral).toBe(0.0);
    // Porém o status geral NUNCA pode ser conforme pois há detalhamento divergente!
    expect(res.status).toBe("DIVERGENTE");
  });

  test("NUNCA declara conformidade se houver pendência de fechamento no Domínio", () => {
    const dominioComPendencia: DominioReinfData = {
      empresa: baseEmpresa,
      competencia: "2026-01",
      itens: [],
      pendencias: ["Período reaberto posteriormente (R-2098)"],
    };

    const dctfweb: DctfwebParsedDeclaration = {
      cnpj: "11222333000144",
      competencia: "2026-01",
      categoria: "GERAL_MENSAL",
      numeroRecibo: "rec_dctf",
      tipoDeclaracao: "ORIGINAL",
      totalApuradoOrigem6: 0,
      totalApuradoOrigem7: 0,
      tributos: [],
    };

    const res = comparator.compare(dominioComPendencia, dctfweb);
    expect(res.status).toBe("PENDENTE");
    expect(res.status).not.toBe("CONFORME");
  });
});
