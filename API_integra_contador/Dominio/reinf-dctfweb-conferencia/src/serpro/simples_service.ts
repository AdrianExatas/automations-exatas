/**
 * Serviço de Integração com o Simples Nacional e DEFIS — SERPRO Integra Contador
 * Família: integra-sn
 */
import type { SerproClient } from "./client.ts";

export interface DeclaracaoPgdasdItem {
  periodoApuracao: string;
  tipoOperacao: string;
  numeroDeclaracao?: string;
  dataHoraTransmissao?: string;
  malha?: string | null;
  numeroDas?: string;
  dataHoraEmissaoDas?: string;
  dasPago?: boolean;
}

export interface DefisItem {
  anoCalendario: number;
  idDefis: string;
  tipo: string;
  dataHora: string;
}

export interface DasGeradoResult {
  pdfBase64?: string;
  numeroDocumento?: string;
  dataVencimento?: string;
  valorTotal?: number;
  valorPrincipal?: number;
  valorMulta?: number;
  valorJuros?: number;
  composicao?: Array<{
    codigo: string;
    denominacao: string;
    valor: number;
  }>;
}

export class SimplesService {
  constructor(private readonly client: SerproClient) {}

  /**
   * Consulta declarações PGDAS-D transmitidas por ano-calendário ou período de apuração
   * Serviço: PGDASD.CONSDECLARACAO13 (POST /Consultar)
   */
  public async consultarDeclaracoes(
    cnpj: string,
    options: { anoCalendario?: string; periodoApuracao?: string },
  ): Promise<DeclaracaoPgdasdItem[]> {
    const payload: Record<string, unknown> = {};
    if (options.periodoApuracao) {
      payload.periodoApuracao = options.periodoApuracao.replace(/\D/g, "");
    } else if (options.anoCalendario) {
      payload.anoCalendario = String(options.anoCalendario);
    } else {
      payload.anoCalendario = String(new Date().getFullYear());
    }

    const resp = await this.client.callConsultar<
      Record<string, unknown>,
      {
        declaracoesEntregues?: {
          periodos?: Array<{
            periodoApuracao: number | string;
            operacoes?: Array<{
              tipoOperacao?: string;
              indiceDeclaracao?: {
                numeroDeclaracao?: string;
                dataHoraTransmissao?: number | string;
                malha?: string | null;
              };
              indiceDas?: {
                numeroDas?: string;
                dataHoraEmissaoDas?: number | string;
                dasPago?: boolean;
              };
            }>;
          }>;
          periodo?: {
            periodoApuracao: number | string;
            operacoes?: Array<any>;
          };
        };
      }
    >({
      contribuinteCnpj: cnpj,
      idSistema: "PGDASD",
      idServico: "CONSDECLARACAO13",
      versaoSistema: "1.0",
      dados: payload,
    });

    const result: DeclaracaoPgdasdItem[] = [];
    const de = resp.dadosParsed?.declaracoesEntregues;
    if (!de) return result;

    const periodos = de.periodos || (de.periodo ? [de.periodo] : []);
    for (const p of periodos) {
      const paStr = String(p.periodoApuracao || "");
      if (Array.isArray(p.operacoes)) {
        for (const op of p.operacoes) {
          result.push({
            periodoApuracao: paStr,
            tipoOperacao: String(op.tipoOperacao || "Declaração Original"),
            numeroDeclaracao: op.indiceDeclaracao?.numeroDeclaracao,
            dataHoraTransmissao: op.indiceDeclaracao?.dataHoraTransmissao
              ? String(op.indiceDeclaracao.dataHoraTransmissao)
              : undefined,
            malha: op.indiceDeclaracao?.malha || null,
            numeroDas: op.indiceDas?.numeroDas,
            dataHoraEmissaoDas: op.indiceDas?.dataHoraEmissaoDas
              ? String(op.indiceDas.dataHoraEmissaoDas)
              : undefined,
            dasPago: op.indiceDas?.dasPago,
          });
        }
      }
    }

    return result;
  }

  /**
   * Gera o DAS de apuração mensal do PGDAS-D
   * Serviço: PGDASD.GERARDAS12 (POST /Emitir)
   */
  public async gerarDas(
    cnpj: string,
    periodoApuracao: string,
    dataConsolidacao?: string,
  ): Promise<DasGeradoResult> {
    const paClean = periodoApuracao.replace(/\D/g, "");
    const payload: Record<string, unknown> = {
      periodoApuracao: paClean,
    };
    if (dataConsolidacao) {
      payload.dataConsolidacao = dataConsolidacao.replace(/\D/g, "");
    }

    const resp = await this.client.callEmitir<
      Record<string, unknown>,
      {
        pdf?: string;
        detalhamento?: {
          numeroDocumento?: string;
          dataVencimento?: string;
          valores?: {
            total?: number;
            principal?: number;
            multa?: number;
            juros?: number;
          };
          composicao?: Array<{
            codigo?: string;
            denominacao?: string;
            valores?: { total?: number };
          }>;
        };
      }
    >({
      contribuinteCnpj: cnpj,
      idSistema: "PGDASD",
      idServico: "GERARDAS12",
      versaoSistema: "1.0",
      dados: payload,
    });

    const d = resp.dadosParsed?.detalhamento;
    return {
      pdfBase64: resp.dadosParsed?.pdf,
      numeroDocumento: d?.numeroDocumento,
      dataVencimento: d?.dataVencimento,
      valorTotal: d?.valores?.total ?? 0,
      valorPrincipal: d?.valores?.principal ?? 0,
      valorMulta: d?.valores?.multa ?? 0,
      valorJuros: d?.valores?.juros ?? 0,
      composicao: d?.composicao?.map((c) => ({
        codigo: String(c.codigo || ""),
        denominacao: String(c.denominacao || ""),
        valor: Number(c.valores?.total ?? 0),
      })),
    };
  }

  /**
   * Consulta o extrato do DAS em PDF
   * Serviço: PGDASD.CONSEXTRATO16 (POST /Consultar)
   */
  public async consultarExtratoDas(
    cnpj: string,
    numeroDas: string,
  ): Promise<{ pdfBase64?: string; nomeArquivo?: string }> {
    const resp = await this.client.callConsultar<
      { numeroDas: string },
      {
        extrato?: {
          nomeArquivo?: string;
          pdf?: string;
        };
        pdf?: string;
      }
    >({
      contribuinteCnpj: cnpj,
      idSistema: "PGDASD",
      idServico: "CONSEXTRATO16",
      versaoSistema: "1.0",
      dados: { numeroDas: numeroDas.replace(/\D/g, "") },
    });

    return {
      pdfBase64: resp.dadosParsed?.extrato?.pdf || resp.dadosParsed?.pdf,
      nomeArquivo: resp.dadosParsed?.extrato?.nomeArquivo || `extrato-das-${numeroDas}.pdf`,
    };
  }

  /**
   * Consulta declarações DEFIS anuais transmitidas
   * Serviço: DEFIS.CONSDECLARACAO142 (POST /Consultar)
   */
  public async consultarDefis(cnpj: string): Promise<DefisItem[]> {
    const resp = await this.client.callConsultar<
      Record<string, unknown>,
      Array<{
        anoCalendario?: number;
        idDefis?: string;
        tipo?: string;
        dataHora?: number | string;
      }> | { declaracoes?: Array<any> }
    >({
      contribuinteCnpj: cnpj,
      idSistema: "DEFIS",
      idServico: "CONSDECLARACAO142",
      versaoSistema: "1.0",
      dados: {},
    });

    let list: Array<any> = [];
    if (Array.isArray(resp.dadosParsed)) {
      list = resp.dadosParsed;
    } else if (resp.dadosParsed && Array.isArray((resp.dadosParsed as any).declaracoes)) {
      list = (resp.dadosParsed as any).declaracoes;
    }

    return list.map((item) => ({
      anoCalendario: Number(item.anoCalendario || 0),
      idDefis: String(item.idDefis || ""),
      tipo: String(item.tipo || "1-Original Normal"),
      dataHora: String(item.dataHora || ""),
    }));
  }
}
