/**
 * Serviço de Auditoria de Procurações Eletrônicas RFB e Vínculos REDESIM — SERPRO Integra Contador
 * Famílias: integra-procuracoes e integra-redesim
 */
import type { SerproClient } from "./client.ts";

export type StatusProcuracao = "VIGENTE" | "ALERTA" | "CRITICA" | "EXPIRADA" | "NAO_LOCALIZADA";

export interface ProcuracaoItem {
  dtexpiracao: string; // "aaaaMMdd"
  dataExpiracaoFormatada?: string; // "DD/MM/AAAA"
  diasRestantes?: number;
  situacao?: StatusProcuracao;
  nrsistemas?: number;
  sistemas?: string[];
}

export interface ConsultaProcuracaoResult {
  cnpj: string;
  outorgado: string;
  procuracoes: ProcuracaoItem[];
  statusGeral: StatusProcuracao;
  menorDiasRestantes: number | null;
  dataExpiracaoMaisProxima: string | null;
  dataConsulta: string;
  totalSistemas: number;
}

export interface EmpresaVinculadaItem {
  cnpj: string;
  tipoEstabelecimento?: string;
  situacaoCadastral?: {
    uf?: string;
    codigoMunicipio?: string;
    nomeMunicipio?: string;
    descricao?: string;
  };
}

export interface VinculosContadorResult {
  cnpjs: EmpresaVinculadaItem[];
  totalInThePage: number;
  totalInTheDatabase: number;
  lastCnpj?: string;
}

export class ProcuracaoService {
  constructor(
    private readonly client: SerproClient,
    private readonly contratanteCnpj: string,
  ) {}

  /**
   * Consulta a vigência da procuração eletrônica RFB do cliente para o escritório de contabilidade
   * Serviço: PROCURACOES.OBTERPROCURACAO41 (POST /Consultar)
   */
  public async obterProcuracao(
    cnpjCliente: string,
    tipoOutorgante: "1" | "2" = "2",
  ): Promise<ConsultaProcuracaoResult> {
    const cleanCliente = cnpjCliente.replace(/\D/g, "");
    const cleanContratante = this.contratanteCnpj.replace(/\D/g, "");
    const now = new Date();

    const payload = {
      outorgante: cleanCliente,
      tipoOutorgante,
      outorgado: cleanContratante,
      tipoOutorgado: "2", // CNPJ do escritório
    };

    const resp = await this.client.callConsultar<
      Array<{
        dtexpiracao: string;
        nrsistemas?: number;
        sistemas?: string[];
      }>
    >(cleanCliente, "PROCURACOES", "OBTERPROCURACAO41", payload, {
      versaoSistema: "1",
    });

    const rawList = Array.isArray(resp.dados) ? resp.dados : [];

    if (rawList.length === 0) {
      return {
        cnpj: cleanCliente,
        outorgado: cleanContratante,
        procuracoes: [],
        statusGeral: "NAO_LOCALIZADA",
        menorDiasRestantes: null,
        dataExpiracaoMaisProxima: null,
        dataConsulta: now.toISOString(),
        totalSistemas: 0,
      };
    }

    let minDias: number | null = null;
    let nextExp: string | null = null;
    let piorStatus: StatusProcuracao = "VIGENTE";
    const allSistemasSet = new Set<string>();

    const procuracoes: ProcuracaoItem[] = rawList.map((item) => {
      let diasRestantes = 0;
      let dataFormatada = item.dtexpiracao;
      let situacao: StatusProcuracao = "VIGENTE";

      if (item.dtexpiracao && item.dtexpiracao.length === 8) {
        const ano = parseInt(item.dtexpiracao.substring(0, 4), 10);
        const mes = parseInt(item.dtexpiracao.substring(4, 6), 10) - 1;
        const dia = parseInt(item.dtexpiracao.substring(6, 8), 10);
        const expDate = new Date(ano, mes, dia, 23, 59, 59);

        dataFormatada = `${String(dia).padStart(2, "0")}/${String(mes + 1).padStart(2, "0")}/${ano}`;
        diasRestantes = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diasRestantes <= 0) {
          situacao = "EXPIRADA";
        } else if (diasRestantes <= 30) {
          situacao = "CRITICA";
        } else if (diasRestantes <= 60) {
          situacao = "ALERTA";
        } else {
          situacao = "VIGENTE";
        }

        if (minDias === null || diasRestantes < minDias) {
          minDias = diasRestantes;
          nextExp = dataFormatada;
        }

        // Determina pior status geral
        if (situacao === "EXPIRADA") {
          piorStatus = "EXPIRADA";
        } else if (situacao === "CRITICA" && piorStatus !== "EXPIRADA") {
          piorStatus = "CRITICA";
        } else if (situacao === "ALERTA" && piorStatus !== "EXPIRADA" && piorStatus !== "CRITICA") {
          piorStatus = "ALERTA";
        }
      }

      if (Array.isArray(item.sistemas)) {
        item.sistemas.forEach((s) => allSistemasSet.add(s));
      }

      return {
        dtexpiracao: item.dtexpiracao,
        dataExpiracaoFormatada: dataFormatada,
        diasRestantes,
        situacao,
        nrsistemas: item.nrsistemas || (item.sistemas ? item.sistemas.length : 0),
        sistemas: item.sistemas || [],
      };
    });

    return {
      cnpj: cleanCliente,
      outorgado: cleanContratante,
      procuracoes,
      statusGeral: piorStatus,
      menorDiasRestantes: minDias,
      dataExpiracaoMaisProxima: nextExp,
      dataConsulta: now.toISOString(),
      totalSistemas: allSistemasSet.size,
    };
  }

  /**
   * Consulta os vínculos ativos da contabilidade cadastrados na REDESIM/RFB
   * Serviço: PNRCONTADOR.CONSVINCULOS261 (POST /Consultar)
   */
  public async consultarVinculosContador(
    size: number = 50,
    lastCnpj?: string,
  ): Promise<VinculosContadorResult> {
    const cleanContratante = this.contratanteCnpj.replace(/\D/g, "");
    const payload: { pagination: { size: number; lastCnpj?: string } } = {
      pagination: {
        size: Math.min(Math.max(size, 1), 50),
        ...(lastCnpj ? { lastCnpj: lastCnpj.replace(/\D/g, "") } : {}),
      },
    };

    const resp = await this.client.callConsultar<{
      cnpjs?: EmpresaVinculadaItem[];
      totalInThePage?: number;
      totalInTheDatabase?: number;
      lastCnpj?: string;
    }>(cleanContratante, "PNRCONTADOR", "CONSVINCULOS261", payload, {
      versaoSistema: "1.0",
    });

    const dados = resp.dados || {};
    return {
      cnpjs: Array.isArray(dados.cnpjs) ? dados.cnpjs : [],
      totalInThePage: typeof dados.totalInThePage === "number" ? dados.totalInThePage : (dados.cnpjs?.length || 0),
      totalInTheDatabase: typeof dados.totalInTheDatabase === "number" ? dados.totalInTheDatabase : 0,
      lastCnpj: dados.lastCnpj,
    };
  }
}
