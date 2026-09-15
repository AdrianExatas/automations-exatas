/**
 * Serviço de Caixa Postal Fiscal e DTE — Integra Contador SERPRO
 * Família: integra-caixapostal
 */
import type { SerproClient } from "./client.ts";

export interface CaixaPostalMensagem {
  isn: number;
  assuntoModelo: string;
  dataEnvio: number | string;
  horaEnvio?: number | string;
  indicadorLeitura: number | string; // 0 = não lida, 1 = lida
  descricaoOrigem?: string;
  relevancia?: number;
  numeroControle?: string;
}

export interface IndicadorMensagensNovasResult {
  codigo: number;
  indicadorMensagensNovas: number; // 0 = sem novas, 1 = uma nova, 2 = mais de uma
  temNovas: boolean;
}

export interface CaixaPostalListaResult {
  quantidadeMensagens: number;
  indicadorUltimaPagina?: string;
  listaMensagens: CaixaPostalMensagem[];
}

export interface DteResult {
  optanteDte: boolean;
  indicadorSituacaoDte: number;
  situacaoDteTexto: string;
}

export class CaixaPostalService {
  constructor(private readonly client: SerproClient) {}

  /**
   * Obtém indicador rápido e não-bilhetado de novas mensagens na Caixa Postal
   * Serviço: CAIXAPOSTAL.INNOVAMSG63 (POST /Monitorar)
   */
  public async obterIndicadorNovasMensagens(cnpj: string): Promise<IndicadorMensagensNovasResult> {
    const resp = await this.client.callMonitorar<string, { codigo: number; indicadorMensagensNovas: number }>({
      contribuinteCnpj: cnpj,
      idSistema: "CAIXAPOSTAL",
      idServico: "INNOVAMSG63",
      versaoSistema: "1.0",
      dados: "",
    });

    const ind = resp.dadosParsed?.indicadorMensagensNovas ?? 0;
    return {
      codigo: resp.dadosParsed?.codigo ?? 0,
      indicadorMensagensNovas: ind,
      temNovas: ind > 0,
    };
  }

  /**
   * Lista as mensagens da Caixa Postal do contribuinte
   * Serviço: CAIXAPOSTAL.MSGCONTRIBUINTE61 (POST /Consultar)
   * @param statusLeitura 0 = todas, 1 = lidas, 2 = não lidas
   */
  public async listarMensagens(cnpj: string, statusLeitura = 0): Promise<CaixaPostalListaResult> {
    const resp = await this.client.callConsultar<
      { statusLeitura: number; indicadorPagina: number; ponteiroPagina?: string },
      { quantidadeMensagens: number; indicadorUltimaPagina: string; listaMensagens: CaixaPostalMensagem[] }
    >({
      contribuinteCnpj: cnpj,
      idSistema: "CAIXAPOSTAL",
      idServico: "MSGCONTRIBUINTE61",
      versaoSistema: "1.0",
      dados: {
        statusLeitura,
        indicadorPagina: 0,
      },
    });

    return {
      quantidadeMensagens: resp.dadosParsed?.quantidadeMensagens ?? 0,
      indicadorUltimaPagina: resp.dadosParsed?.indicadorUltimaPagina,
      listaMensagens: resp.dadosParsed?.listaMensagens || [],
    };
  }

  /**
   * Consulta o Indicador de Domicílio Tributário Eletrônico (DTE)
   * Serviço: DTE.CONSULTASITUACAODTE111 (POST /Consultar)
   */
  public async consultarDte(cnpj: string): Promise<DteResult> {
    const resp = await this.client.callConsultar<
      string,
      { codigoRetorno?: number; indicadorSituacaoDte?: number; situacaoDte?: string }
    >({
      contribuinteCnpj: cnpj,
      idSistema: "DTE",
      idServico: "CONSULTASITUACAODTE111",
      versaoSistema: "1.0",
      dados: "",
    });

    const ind = resp.dadosParsed?.indicadorSituacaoDte ?? 0;
    const optante = ind === 1 || String(resp.dadosParsed?.situacaoDte || "").toUpperCase().includes("OPTANTE");

    return {
      optanteDte: optante,
      indicadorSituacaoDte: ind,
      situacaoDteTexto: optante ? "Optante pelo DTE" : "Não optante / Sem DTE",
    };
  }
}
