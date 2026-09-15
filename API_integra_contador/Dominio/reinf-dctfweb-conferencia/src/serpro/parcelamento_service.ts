/**
 * Serviço de Parcelamentos Fiscais (PARCSN / PARCMEI) — SERPRO Integra Contador
 * Família: integra-parcelamento
 */
import type { SerproClient } from "./client.ts";

export interface PedidoParcelamentoItem {
  numero: string;
  modalidade: "PARCSN" | "PARCMEI";
  dataDoPedido: string;
  situacao: string;
  dataDaSituacao?: string;
}

export interface ParcelaItem {
  parcela: string; // Formato AAAAMM
  valor: number;
}

export interface DasParcelaResult {
  pdfBase64?: string;
  parcela: string;
}

export class ParcelamentoService {
  constructor(private readonly client: SerproClient) {}

  /**
   * Consulta os pedidos de parcelamento existentes
   * Serviços: PARCSN.PEDIDOSPARC163 ou PARCMEI.PEDIDOSPARC203 (POST /Consultar)
   */
  public async consultarPedidos(
    cnpj: string,
    modalidade: "PARCSN" | "PARCMEI" = "PARCSN",
  ): Promise<PedidoParcelamentoItem[]> {
    const isMei = modalidade === "PARCMEI";
    const idSistema = isMei ? "PARCMEI" : "PARCSN";
    const idServico = isMei ? "PEDIDOSPARC203" : "PEDIDOSPARC163";

    const resp = await this.client.callConsultar<
      Record<string, unknown>,
      {
        parcelamentos?: Array<{
          numero: number | string;
          dataDoPedido: number | string;
          situacao: string;
          dataDaSituacao?: number | string;
        }>;
      }
    >({
      contribuinteCnpj: cnpj,
      idSistema,
      idServico,
      versaoSistema: "1.0",
      dados: {},
    });

    const list = resp.dadosParsed?.parcelamentos || [];
    return list.map((p) => ({
      numero: String(p.numero || ""),
      modalidade,
      dataDoPedido: String(p.dataDoPedido || ""),
      situacao: String(p.situacao || "Ativo"),
      dataDaSituacao: p.dataDaSituacao ? String(p.dataDaSituacao) : undefined,
    }));
  }

  /**
   * Consulta as parcelas disponíveis para geração do DAS
   * Serviços: PARCSN.PARCELASPARAGERAR162 ou PARCMEI.PARCELASPARAGERAR202 (POST /Consultar)
   */
  public async consultarParcelas(
    cnpj: string,
    modalidade: "PARCSN" | "PARCMEI" = "PARCSN",
  ): Promise<ParcelaItem[]> {
    const isMei = modalidade === "PARCMEI";
    const idSistema = isMei ? "PARCMEI" : "PARCSN";
    const idServico = isMei ? "PARCELASPARAGERAR202" : "PARCELASPARAGERAR162";

    const resp = await this.client.callConsultar<
      Record<string, unknown>,
      {
        listaParcela?: Array<{
          parcela: number | string;
          valor: number;
        }>;
      }
    >({
      contribuinteCnpj: cnpj,
      idSistema,
      idServico,
      versaoSistema: "1.0",
      dados: {},
    });

    const list = resp.dadosParsed?.listaParcela || [];
    return list.map((item) => ({
      parcela: String(item.parcela || ""),
      valor: Number(item.valor || 0),
    }));
  }

  /**
   * Emite o DAS da parcela de parcelamento em PDF
   * Serviços: PARCSN.GERARDAS161 ou PARCMEI.GERARDAS201 (POST /Emitir)
   */
  public async gerarDasParcela(
    cnpj: string,
    parcela: string,
    modalidade: "PARCSN" | "PARCMEI" = "PARCSN",
  ): Promise<DasParcelaResult> {
    const isMei = modalidade === "PARCMEI";
    const idSistema = isMei ? "PARCMEI" : "PARCSN";
    const idServico = isMei ? "GERARDAS201" : "GERARDAS161";

    const resp = await this.client.callEmitir<
      { parcelaParaEmitir: number },
      { docArrecadacaoPdfB64?: string; pdf?: string }
    >({
      contribuinteCnpj: cnpj,
      idSistema,
      idServico,
      versaoSistema: "1.0",
      dados: { parcelaParaEmitir: Number(parcela.replace(/\D/g, "")) },
    });

    const pdf = resp.dadosParsed?.docArrecadacaoPdfB64 || resp.dadosParsed?.pdf;
    return {
      pdfBase64: pdf,
      parcela,
    };
  }
}
