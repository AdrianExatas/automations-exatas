/**
 * Serviço de Situação Fiscal e CND (RFB / PGFN) — Integra Contador SERPRO
 * Família: integra-sitfis
 */
import type { SerproClient } from "./client.ts";

export interface ProtocoloResult {
  protocoloRelatorio: string;
  tempoEspera: number;
}

export interface RelatorioSitfisResult {
  status: number;
  pdfBase64?: string;
  tempoEspera?: number;
  mensagens: Array<{ codigo: string; texto: string }>;
  situacaoGeral?: "REGULAR" | "PENDENTE" | "PROCESSANDO" | "ERRO";
}

export class SitfisService {
  constructor(private readonly client: SerproClient) {}

  /**
   * Solicita a geração assíncrona de protocolo do relatório de Situação Fiscal
   * Serviço: SITFIS.SOLICITARPROTOCOLO91 (POST /Apoiar)
   */
  public async solicitarProtocolo(cnpj: string): Promise<ProtocoloResult> {
    const resp = await this.client.callApoiar<string, ProtocoloResult>({
      contribuinteCnpj: cnpj,
      idSistema: "SITFIS",
      idServico: "SOLICITARPROTOCOLO91",
      versaoSistema: "2.0",
      dados: "",
    });

    if (!resp.dadosParsed || !resp.dadosParsed.protocoloRelatorio) {
      throw new Error(
        `Falha ao obter protocolo da Situação Fiscal: ${resp.mensagens?.map((m) => m.texto).join(" | ") || "Resposta vazia do SERPRO"}`,
      );
    }

    return resp.dadosParsed;
  }

  /**
   * Consulta e emite o documento do Relatório de Situação Fiscal (PDF)
   * Serviço: SITFIS.RELATORIOSITFIS92 (POST /Emitir)
   */
  public async obterRelatorio(cnpj: string, protocoloRelatorio: string): Promise<RelatorioSitfisResult> {
    const resp = await this.client.callEmitir<{ protocoloRelatorio: string }, { pdf?: string; tempoEspera?: number }>({
      contribuinteCnpj: cnpj,
      idSistema: "SITFIS",
      idServico: "RELATORIOSITFIS92",
      versaoSistema: "2.0",
      dados: { protocoloRelatorio },
    });

    let situacaoGeral: RelatorioSitfisResult["situacaoGeral"] = "PROCESSANDO";
    if (resp.status === 200 && resp.dadosParsed?.pdf) {
      situacaoGeral = "REGULAR";
    } else if (resp.status === 202) {
      situacaoGeral = "PROCESSANDO";
    } else if (resp.status >= 400) {
      situacaoGeral = "ERRO";
    }

    return {
      status: resp.status,
      pdfBase64: resp.dadosParsed?.pdf,
      tempoEspera: resp.dadosParsed?.tempoEspera,
      mensagens: resp.mensagens || [],
      situacaoGeral,
    };
  }
}
