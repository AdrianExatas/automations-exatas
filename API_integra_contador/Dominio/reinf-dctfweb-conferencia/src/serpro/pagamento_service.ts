/**
 * Serviço de Consulta de Pagamentos e Comprovantes de Arrecadação — Integra Contador SERPRO
 * Família: integra-pagamento
 */
import type { SerproClient } from "./client.ts";

export interface PagamentoItem {
  numeroDocumento: string;
  tipoDocumento: string; // DARF, DAS, DAE, DJE
  periodoApuracao: string;
  dataArrecadacao: string;
  dataVencimento: string;
  receitaPrincipalCodigo: string;
  receitaPrincipalDescricao: string;
  valorTotal: number;
  valorPrincipal: number;
  valorMulta: number;
  valorJuros: number;
}

export class PagamentoService {
  constructor(private readonly client: SerproClient) {}

  /**
   * Consulta pagamentos e tributos federais arrecadados
   * Serviço: PAGTOWEB.PAGAMENTOS71 (POST /Consultar)
   */
  public async consultarPagamentos(
    cnpj: string,
    options?: { dataInicial?: string; dataFinal?: string },
  ): Promise<PagamentoItem[]> {
    const payload: Record<string, unknown> = {
      tamanhoDaPagina: 100,
      primeiroDaPagina: 0,
    };

    if (options?.dataInicial) {
      payload.intervaloDataArrecadacao = {
        dataInicial: options.dataInicial,
        dataFinal: options.dataFinal || options.dataInicial,
      };
    }

    const resp = await this.client.callConsultar<
      Record<string, unknown>,
      { listaDocumentos?: Array<any>; listaDocumentoArrecadacao?: Array<any> } | Array<any>
    >({
      contribuinteCnpj: cnpj,
      idSistema: "PAGTOWEB",
      idServico: "PAGAMENTOS71",
      versaoSistema: "1.0",
      dados: payload,
    });

    let rawList: Array<any> = [];
    if (Array.isArray(resp.dadosParsed)) {
      rawList = resp.dadosParsed;
    } else if (resp.dadosParsed && typeof resp.dadosParsed === "object") {
      rawList = (resp.dadosParsed as any).listaDocumentoArrecadacao ||
        (resp.dadosParsed as any).listaDocumentos ||
        (resp.dadosParsed as any).documentos ||
        [];
    }

    return rawList.map((doc: any) => ({
      numeroDocumento: String(doc.numeroDocumento || ""),
      tipoDocumento: String(doc.tipo?.descricaoAbreviada || doc.tipo?.descricao || doc.tipo || "DARF"),
      periodoApuracao: String(doc.periodoApuracao || ""),
      dataArrecadacao: String(doc.dataArrecadacao || ""),
      dataVencimento: String(doc.dataVencimento || ""),
      receitaPrincipalCodigo: String(doc.receitaPrincipal?.codigo || ""),
      receitaPrincipalDescricao: String(doc.receitaPrincipal?.descricao || ""),
      valorTotal: Number(doc.valorTotal || 0),
      valorPrincipal: Number(doc.valorPrincipal || 0),
      valorMulta: Number(doc.valorMulta || 0),
      valorJuros: Number(doc.valorJuros || 0),
    }));
  }

  /**
   * Emite o comprovante oficial de arrecadação em PDF
   * Serviço: PAGTOWEB.COMPARRECADACAO72 (POST /Emitir)
   */
  public async emitirComprovante(cnpj: string, numeroDocumento: string): Promise<{ pdfBase64?: string }> {
    const resp = await this.client.callEmitir<
      { numeroDocumento: string },
      { comprovanteArrecadacaoPDF?: string; pdf?: string }
    >({
      contribuinteCnpj: cnpj,
      idSistema: "PAGTOWEB",
      idServico: "COMPARRECADACAO72",
      versaoSistema: "1.0",
      dados: { numeroDocumento },
    });

    const pdf = resp.dadosParsed?.comprovanteArrecadacaoPDF || resp.dadosParsed?.pdf;
    return { pdfBase64: pdf };
  }
}
