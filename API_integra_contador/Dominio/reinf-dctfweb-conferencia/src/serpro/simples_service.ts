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
  valorTotalDas?: number;
  dataVencimentoDas?: string;
  operacoes?: Array<any>;
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
      any
    >({
      contribuinteCnpj: cnpj,
      idSistema: "PGDASD",
      idServico: "CONSDECLARACAO13",
      versaoSistema: "1.0",
      dados: payload,
    });

    const result: DeclaracaoPgdasdItem[] = [];
    const rawData = resp.dadosParsed?.declaracoesEntregues || resp.dadosParsed;
    if (!rawData) return result;

    const periodos = rawData.periodos || (rawData.periodo ? [rawData.periodo] : []);
    for (const p of periodos) {
      const paStr = String(p.periodoApuracao || "");
      const ops = Array.isArray(p.operacoes) ? p.operacoes : [];
      if (ops.length === 0) continue;

      // Localiza a última declaração transmitida (Original ou Retificadora)
      const declOps = ops.filter(
        (o: any) => o.indiceDeclaracao && o.indiceDeclaracao.numeroDeclaracao
      );
      const latestDeclOp = declOps.length > 0 ? declOps[declOps.length - 1] : null;

      // Localiza a última operação referente ao DAS gerado
      const dasOps = ops.filter((o: any) => o.indiceDas && o.indiceDas.numeroDas);
      const latestDasOp = dasOps.length > 0 ? dasOps[dasOps.length - 1] : null;

      const decInd = latestDeclOp?.indiceDeclaracao;
      const dasInd = latestDasOp?.indiceDas;

      result.push({
        periodoApuracao: paStr,
        tipoOperacao: String(latestDeclOp?.tipoOperacao || latestDasOp?.tipoOperacao || "Declaração Original"),
        numeroDeclaracao: decInd?.numeroDeclaracao,
        dataHoraTransmissao: decInd?.dataHoraTransmissao
          ? String(decInd.dataHoraTransmissao)
          : undefined,
        malha: decInd?.malha || null,
        numeroDas: dasInd?.numeroDas,
        dataHoraEmissaoDas: dasInd?.datahoraEmissaoDas || dasInd?.dataHoraEmissaoDas
          ? String(dasInd.datahoraEmissaoDas || dasInd.dataHoraEmissaoDas)
          : undefined,
        dasPago: typeof dasInd?.dasPago === "boolean" ? dasInd.dasPago : undefined,
        operacoes: ops,
      });
    }

    return result;
  }

  /**
   * Consulta a última declaração transmitida e o recibo de entrega em PDF
   * Serviço: PGDASD.CONSULTIMADECREC14 (POST /Consultar)
   */
  public async consultarUltimaDeclaracaoRecibo(
    cnpj: string,
    periodoApuracao: string,
  ): Promise<{
    numeroDeclaracao?: string;
    reciboPdfBase64?: string;
    declaracaoPdfBase64?: string;
    nomeArquivoRecibo?: string;
    nomeArquivoDeclaracao?: string;
  }> {
    const paClean = periodoApuracao.replace(/\D/g, "");
    const resp = await this.client.callConsultar<
      { periodoApuracao: string },
      any
    >({
      contribuinteCnpj: cnpj,
      idSistema: "PGDASD",
      idServico: "CONSULTIMADECREC14",
      versaoSistema: "1.0",
      dados: { periodoApuracao: paClean },
    });

    const d = resp.dadosParsed as any;
    return {
      numeroDeclaracao: d?.numeroDeclaracao,
      reciboPdfBase64: d?.recibo?.pdf,
      declaracaoPdfBase64: d?.declaracao?.pdf,
      nomeArquivoRecibo: d?.recibo?.nomeArquivo || `recibo-pgdasd-${paClean}.pdf`,
      nomeArquivoDeclaracao: d?.declaracao?.nomeArquivo || `declaracao-pgdasd-${paClean}.pdf`,
    };
  }

  /**
   * Gera o DAS de apuração mensal do PGDAS-D com valores detalhados
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
      any
    >({
      contribuinteCnpj: cnpj,
      idSistema: "PGDASD",
      idServico: "GERARDAS12",
      versaoSistema: "1.0",
      dados: payload,
    });

    const rawParsed = resp.dadosParsed as any;
    const item = Array.isArray(rawParsed) ? rawParsed[0] : rawParsed;
    const d = item?.detalhamentoDas || item?.detalhamento;
    const v = d?.valores;

    return {
      pdfBase64: item?.pdf || item?.pdfBase64 || rawParsed?.pdf,
      numeroDocumento: d?.numeroDocumento,
      dataVencimento: d?.dataVencimento ? String(d.dataVencimento) : undefined,
      valorTotal: Number(v?.total ?? 0),
      valorPrincipal: Number(v?.principal ?? 0),
      valorMulta: Number(v?.multa ?? 0),
      valorJuros: Number(v?.juros ?? 0),
      composicao: Array.isArray(d?.composicao)
        ? d.composicao.map((c: any) => ({
            codigo: String(c.codigo || ""),
            denominacao: String(c.denominacao || ""),
            valor: Number(c.valores?.total ?? c.valor ?? 0),
          }))
        : undefined,
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
      dados: "",
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
