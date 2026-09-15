/**
 * Adaptador Mock em memória para desenvolvimento, demonstrações e testes automatizados.
 * Fornece dados dos 5 casos reais controlados e cenários de anomalia.
 */
import type { IDominioClient } from "./client.ts";
import { SQL_ASSERT_SELECT_ONLY } from "./queries.ts";

export interface MockDataset {
  companies: Array<{ CODI_EMP: string; CGC_EMP: string; RAZAO_EMP: string; STAT_EMP?: string }>;
  closings: Array<{
    CODI_EMP: string;
    TIPO_SERIE: string;
    EVENTO: string;
    COMPETENCIA: string;
    RECIBO: string | null;
    DATA_HORA_ENVIO: string;
    SITUACAO_LOTE: string;
    EXCLUIDO: number;
    SEM_MOVIMENTO: number;
    MENSAGEM_ERRO: string | null;
  }>;
  r2000Totals: Array<{
    CODI_EMP: string;
    COMPETENCIA: string;
    RECIBO_FECHAMENTO: string;
    EVENTO_ORIGEM: string;
    CODIGO_RECEITA: string;
    BASE_CALCULO: number;
    VALOR_CONTRIBUICAO: number;
    VALOR_RETENCAO: number;
    VALOR_DEDUCAO: number;
    VALOR_SUSPENSO: number;
    VALOR_EXIGIVEL: number;
  }>;
  r4000Totals: Array<{
    CODI_EMP: string;
    COMPETENCIA: string;
    RECIBO_FECHAMENTO: string;
    EVENTO_ORIGEM: string;
    CODIGO_RECEITA: string;
    BASE_CALCULO: number;
    VALOR_IRRF: number;
    VALOR_RETENCAO: number;
    VALOR_DEDUCAO: number;
    VALOR_SUSPENSO: number;
    VALOR_EXIGIVEL: number;
  }>;
}

export function createDefaultMockDataset(competencia = "2026-01"): MockDataset {
  return {
    companies: [
      { CODI_EMP: "101", CGC_EMP: "11222333000144", RAZAO_EMP: "ALFA SERVICOS DE ENGENHARIA LTDA", STAT_EMP: "A" },
      { CODI_EMP: "102", CGC_EMP: "22333444000155", RAZAO_EMP: "BETA CONSULTORIA TRIBUTARIA S/S", STAT_EMP: "A" },
      { CODI_EMP: "103", CGC_EMP: "33444555000166", RAZAO_EMP: "GAMA INDUSTRIA E COMERCIO LTDA", STAT_EMP: "A" },
      { CODI_EMP: "104", CGC_EMP: "44555666000177", RAZAO_EMP: "DELTA PARTICIPACOES S/A", STAT_EMP: "A" },
      { CODI_EMP: "105", CGC_EMP: "55666777000188", RAZAO_EMP: "EPSILON TRANSPORTES RODOVIARIOS LTDA", STAT_EMP: "A" },
      { CODI_EMP: "106", CGC_EMP: "66777888000199", RAZAO_EMP: "ZETA COMERCIO VAREJISTA EIRELI", STAT_EMP: "A" },
      { CODI_EMP: "107", CGC_EMP: "77888999000100", RAZAO_EMP: "ETA CONSTRUCAO CIVIL LTDA", STAT_EMP: "I" },
    ],
    closings: [
      // Caso 1: R-2000 puro (Empresa 101)
      {
        CODI_EMP: "101",
        TIPO_SERIE: "R-2000",
        EVENTO: "R-2099",
        COMPETENCIA: competencia,
        RECIBO: "1.2026.1234567",
        DATA_HORA_ENVIO: "2026-02-10T14:30:00",
        SITUACAO_LOTE: "ACEITO",
        EXCLUIDO: 0,
        SEM_MOVIMENTO: 0,
        MENSAGEM_ERRO: null,
      },
      // Caso 2: R-4000 puro (Empresa 102)
      {
        CODI_EMP: "102",
        TIPO_SERIE: "R-4000",
        EVENTO: "R-4099",
        COMPETENCIA: competencia,
        RECIBO: "1.2026.7654321",
        DATA_HORA_ENVIO: "2026-02-11T10:15:00",
        SITUACAO_LOTE: "ACEITO",
        EXCLUIDO: 0,
        SEM_MOVIMENTO: 0,
        MENSAGEM_ERRO: null,
      },
      // Caso 3: Ambas as séries (Empresa 103)
      {
        CODI_EMP: "103",
        TIPO_SERIE: "R-2000",
        EVENTO: "R-2099",
        COMPETENCIA: competencia,
        RECIBO: "1.2026.1111111",
        DATA_HORA_ENVIO: "2026-02-12T09:00:00",
        SITUACAO_LOTE: "ACEITO",
        EXCLUIDO: 0,
        SEM_MOVIMENTO: 0,
        MENSAGEM_ERRO: null,
      },
      {
        CODI_EMP: "103",
        TIPO_SERIE: "R-4000",
        EVENTO: "R-4099",
        COMPETENCIA: competencia,
        RECIBO: "1.2026.2222222",
        DATA_HORA_ENVIO: "2026-02-12T09:05:00",
        SITUACAO_LOTE: "ACEITO",
        EXCLUIDO: 0,
        SEM_MOVIMENTO: 0,
        MENSAGEM_ERRO: null,
      },
      // Caso 4: Sem movimento (Empresa 104)
      {
        CODI_EMP: "104",
        TIPO_SERIE: "R-2000",
        EVENTO: "R-2099",
        COMPETENCIA: competencia,
        RECIBO: "1.2026.0000001",
        DATA_HORA_ENVIO: "2026-02-05T08:00:00",
        SITUACAO_LOTE: "ACEITO",
        EXCLUIDO: 0,
        SEM_MOVIMENTO: 1,
        MENSAGEM_ERRO: null,
      },
      {
        CODI_EMP: "104",
        TIPO_SERIE: "R-4000",
        EVENTO: "R-4099",
        COMPETENCIA: competencia,
        RECIBO: "1.2026.0000002",
        DATA_HORA_ENVIO: "2026-02-05T08:02:00",
        SITUACAO_LOTE: "ACEITO",
        EXCLUIDO: 0,
        SEM_MOVIMENTO: 1,
        MENSAGEM_ERRO: null,
      },
      // Caso 5: Retificação posterior (Empresa 105)
      {
        CODI_EMP: "105",
        TIPO_SERIE: "R-2000",
        EVENTO: "R-2099",
        COMPETENCIA: competencia,
        RECIBO: "1.2026.9999001",
        DATA_HORA_ENVIO: "2026-02-08T10:00:00", // Mais antigo
        SITUACAO_LOTE: "ACEITO",
        EXCLUIDO: 0,
        SEM_MOVIMENTO: 0,
        MENSAGEM_ERRO: null,
      },
      {
        CODI_EMP: "105",
        TIPO_SERIE: "R-2000",
        EVENTO: "R-2099",
        COMPETENCIA: competencia,
        RECIBO: "1.2026.9999002",
        DATA_HORA_ENVIO: "2026-02-14T16:00:00", // Retificador mais recente
        SITUACAO_LOTE: "ACEITO",
        EXCLUIDO: 0,
        SEM_MOVIMENTO: 0,
        MENSAGEM_ERRO: null,
      },
      // Caso Edge 1: Reabertura posterior sem novo fechamento (Empresa 106) -> PENDENTE
      {
        CODI_EMP: "106",
        TIPO_SERIE: "R-2000",
        EVENTO: "R-2099",
        COMPETENCIA: competencia,
        RECIBO: "1.2026.6666001",
        DATA_HORA_ENVIO: "2026-02-08T10:00:00",
        SITUACAO_LOTE: "ACEITO",
        EXCLUIDO: 0,
        SEM_MOVIMENTO: 0,
        MENSAGEM_ERRO: null,
      },
      {
        CODI_EMP: "106",
        TIPO_SERIE: "R-2000",
        EVENTO: "R-2098", // Reabertura posterior
        COMPETENCIA: competencia,
        RECIBO: "1.2026.6666002",
        DATA_HORA_ENVIO: "2026-02-12T11:00:00",
        SITUACAO_LOTE: "ACEITO",
        EXCLUIDO: 0,
        SEM_MOVIMENTO: 0,
        MENSAGEM_ERRO: null,
      },
      // Caso Edge 2: Erro de transmissão / Rejeitado (Empresa 107) -> PENDENTE
      {
        CODI_EMP: "107",
        TIPO_SERIE: "R-2000",
        EVENTO: "R-2099",
        COMPETENCIA: competencia,
        RECIBO: null,
        DATA_HORA_ENVIO: "2026-02-09T17:00:00",
        SITUACAO_LOTE: "REJEITADO",
        EXCLUIDO: 0,
        SEM_MOVIMENTO: 0,
        MENSAGEM_ERRO: "MS1009 - O evento não atende às regras de validação do esquema XML.",
      },
    ],
    r2000Totals: [
      // Empresa 101: R-2010 tomados, código 1162-01
      {
        CODI_EMP: "101",
        COMPETENCIA: competencia,
        RECIBO_FECHAMENTO: "1.2026.1234567",
        EVENTO_ORIGEM: "R-2010",
        CODIGO_RECEITA: "1162-01",
        BASE_CALCULO: 50000.0,
        VALOR_CONTRIBUICAO: 5500.0,
        VALOR_RETENCAO: 5500.0,
        VALOR_DEDUCAO: 0.0,
        VALOR_SUSPENSO: 0.0,
        VALOR_EXIGIVEL: 5500.0,
      },
      // Empresa 103: R-2010 tomados, código 1162-01
      {
        CODI_EMP: "103",
        COMPETENCIA: competencia,
        RECIBO_FECHAMENTO: "1.2026.1111111",
        EVENTO_ORIGEM: "R-2010",
        CODIGO_RECEITA: "1162-01",
        BASE_CALCULO: 80000.0,
        VALOR_CONTRIBUICAO: 8800.0,
        VALOR_RETENCAO: 8800.0,
        VALOR_DEDUCAO: 0.0,
        VALOR_SUSPENSO: 0.0,
        VALOR_EXIGIVEL: 8800.0,
      },
      // Empresa 105: Fechamento retificador (recibo 1.2026.9999002)
      {
        CODI_EMP: "105",
        COMPETENCIA: competencia,
        RECIBO_FECHAMENTO: "1.2026.9999002",
        EVENTO_ORIGEM: "R-2010",
        CODIGO_RECEITA: "1162-01",
        BASE_CALCULO: 42000.0,
        VALOR_CONTRIBUICAO: 4620.0,
        VALOR_RETENCAO: 4620.0,
        VALOR_DEDUCAO: 0.0,
        VALOR_SUSPENSO: 0.0,
        VALOR_EXIGIVEL: 4620.0,
      },
      // Empresa 105: Fechamento original antigo (recibo 1.2026.9999001) que NÃO deve ser usado!
      {
        CODI_EMP: "105",
        COMPETENCIA: competencia,
        RECIBO_FECHAMENTO: "1.2026.9999001",
        EVENTO_ORIGEM: "R-2010",
        CODIGO_RECEITA: "1162-01",
        BASE_CALCULO: 30000.0,
        VALOR_CONTRIBUICAO: 3300.0,
        VALOR_RETENCAO: 3300.0,
        VALOR_DEDUCAO: 0.0,
        VALOR_SUSPENSO: 0.0,
        VALOR_EXIGIVEL: 3300.0,
      },
    ],
    r4000Totals: [
      // Empresa 102: R-4020, código 1708 e 0588
      {
        CODI_EMP: "102",
        COMPETENCIA: competencia,
        RECIBO_FECHAMENTO: "1.2026.7654321",
        EVENTO_ORIGEM: "R-4020",
        CODIGO_RECEITA: "1708",
        BASE_CALCULO: 10000.0,
        VALOR_IRRF: 150.0,
        VALOR_RETENCAO: 150.0,
        VALOR_DEDUCAO: 0.0,
        VALOR_SUSPENSO: 0.0,
        VALOR_EXIGIVEL: 150.0,
      },
      {
        CODI_EMP: "102",
        COMPETENCIA: competencia,
        RECIBO_FECHAMENTO: "1.2026.7654321",
        EVENTO_ORIGEM: "R-4020",
        CODIGO_RECEITA: "0588",
        BASE_CALCULO: 20000.0,
        VALOR_IRRF: 300.0,
        VALOR_RETENCAO: 300.0,
        VALOR_DEDUCAO: 0.0,
        VALOR_SUSPENSO: 0.0,
        VALOR_EXIGIVEL: 300.0,
      },
      // Empresa 103: R-4020, código 1708
      {
        CODI_EMP: "103",
        COMPETENCIA: competencia,
        RECIBO_FECHAMENTO: "1.2026.2222222",
        EVENTO_ORIGEM: "R-4020",
        CODIGO_RECEITA: "1708",
        BASE_CALCULO: 30000.0,
        VALOR_IRRF: 450.0,
        VALOR_RETENCAO: 450.0,
        VALOR_DEDUCAO: 0.0,
        VALOR_SUSPENSO: 0.0,
        VALOR_EXIGIVEL: 450.0,
      },
    ],
  };
}

export class DominioMockAdapter implements IDominioClient {
  private dataset: MockDataset;

  constructor(customDataset?: MockDataset) {
    this.dataset = customDataset || createDefaultMockDataset();
  }

  public setDataset(dataset: MockDataset): void {
    this.dataset = dataset;
  }

  public async executeSelect<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    // Assegurar invariante de segurança SELECT-only
    SQL_ASSERT_SELECT_ONLY(sql);

    const normalizedSql = sql.replace(/\s+/g, " ").toUpperCase();

    if (normalizedSql.includes("CODI_EMP = ? OR") || normalizedSql.includes("CODI_EMP=? OR")) {
      const p1 = String(params[0]);
      const p2 = String(params[1]);
      const matched = this.dataset.companies.filter(
        (c) => c.CODI_EMP === p1 || c.CGC_EMP === p2,
      );
      return matched as unknown as T[];
    }

    if (normalizedSql.includes("FROM BETHADBA.GEEMPRE") && !normalizedSql.includes("JOIN") && !normalizedSql.includes("MAX(")) {
      return this.dataset.companies as unknown as T[];
    }
    if (normalizedSql.includes("FROM GEEMPRE") && !normalizedSql.includes("JOIN") && !normalizedSql.includes("MAX(")) {
      return this.dataset.companies as unknown as T[];
    }

    if (normalizedSql.includes("MAX(CASE WHEN E.I_EVENTO")) {
      const comp = String(params[0] || "2026-01");
      const overview = this.dataset.companies.map((emp) => {
        const closings = this.dataset.closings.filter((c) => c.CODI_EMP === emp.CODI_EMP && c.COMPETENCIA === comp);
        const r2000 = closings.find((c) => c.TIPO_SERIE === "R-2000" || c.EVENTO === "R-2099");
        const r4000 = closings.find((c) => c.TIPO_SERIE === "R-4000" || c.EVENTO === "R-4099");
        const reab2000 = closings.some((c) => c.EVENTO === "R-2098");
        const reab4000 = closings.some((c) => c.EVENTO === "R-4098");

        const tot2000 = this.dataset.r2000Totals
          .filter((t) => t.CODI_EMP === emp.CODI_EMP && t.COMPETENCIA === comp)
          .reduce((sum, t) => sum + (t.VALOR_CONTRIBUICAO || 0), 0);

        const tot4000 = this.dataset.r4000Totals
          .filter((t) => t.CODI_EMP === emp.CODI_EMP && t.COMPETENCIA === comp)
          .reduce((sum, t) => sum + (t.VALOR_IRRF || t.VALOR_RETENCAO || 0), 0);

        return {
          CODI_EMP: emp.CODI_EMP,
          CGC_EMP: emp.CGC_EMP,
          RAZAO_EMP: emp.RAZAO_EMP,
          STAT_EMP: emp.STAT_EMP || "A",
          RECIBO_R2000: r2000?.RECIBO || null,
          RECIBO_R4000: r4000?.RECIBO || null,
          REABERTO_R2000: reab2000 ? 1 : 0,
          REABERTO_R4000: reab4000 ? 1 : 0,
          TOTAL_R2000: tot2000,
          TOTAL_R4000: tot4000,
        };
      });
      return overview as unknown as T[];
    }

    if (normalizedSql.includes("COUNT(DISTINCT")) {
      const comps = Array.from(new Set(this.dataset.closings.map((c) => c.COMPETENCIA))).sort().reverse();
      return comps.map((c) => ({
        COMPETENCIA: c,
        TOTAL_EMPRESAS: this.dataset.companies.length,
        TOTAL_FECHAMENTOS: this.dataset.closings.filter((x) => x.COMPETENCIA === c).length,
      })) as unknown as T[];
    }

    if (normalizedSql.includes("R2099_R2010") || normalizedSql.includes("TOTALIZADORES_R2000")) {
      const [empresaId, comp, recibo] = params as [string, string, string];
      const matched = this.dataset.r2000Totals.filter(
        (t) =>
          String(t.CODI_EMP) === String(empresaId) &&
          t.COMPETENCIA === comp &&
          t.RECIBO_FECHAMENTO === recibo,
      );
      return matched as unknown as T[];
    }

    if (normalizedSql.includes("R4099_PERIODO") || normalizedSql.includes("TOTALIZADORES_R4000")) {
      const [empresaId, comp, recibo] = params as [string, string, string];
      const matched = this.dataset.r4000Totals.filter(
        (t) =>
          String(t.CODI_EMP) === String(empresaId) &&
          t.COMPETENCIA === comp &&
          t.RECIBO_FECHAMENTO === recibo,
      );
      return matched as unknown as T[];
    }

    if (
      normalizedSql.includes("TIPO_SERIE") ||
      normalizedSql.includes("FROM BETHADBA.EFD_REINF_ENVIO_ARQUIVOS") ||
      normalizedSql.includes("FROM EFD_REINF_EVENTOS_CONTROLE")
    ) {
      const [empresaId, comp] = params as [string, string];
      const matched = this.dataset.closings.filter(
        (c) => String(c.CODI_EMP) === String(empresaId) && c.COMPETENCIA === comp,
      );
      return matched as unknown as T[];
    }

    return [];
  }
}

export function createDefaultMockDctfwebProvider(): (cnpj: string, comp: string) => Promise<string | null> {
  return async (cnpj: string, comp: string): Promise<string | null> => {
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
}

