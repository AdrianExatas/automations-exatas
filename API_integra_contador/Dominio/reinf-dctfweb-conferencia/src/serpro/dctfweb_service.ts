/**
 * Serviço de consulta do XML da declaração DCTFWeb (DCTFWEB.CONSXMLDECLARACAO38)
 */
import { SerproClient } from "./client.ts";

export interface ConsultarXmlDctfwebRequest {
  categoria: string;
  anoPA: string;
  mesPA: string;
  numeroReciboEntrega?: number;
}

export interface ConsultarXmlDctfwebResponseData {
  XMLStringBase64?: string;
  [key: string]: unknown;
}

export interface DctfwebServiceResult {
  xmlBase64: string;
  status: number;
  mensagens: Array<{ codigo: string; texto: string }>;
}

export class DctfwebService {
  constructor(private readonly client: SerproClient) {}

  public async consultarXmlDeclaracao(input: {
    contribuinteCnpj: string;
    competencia: string; // formato AAAA-MM
    numeroRecibo?: string;
  }): Promise<DctfwebServiceResult> {
    const parts = input.competencia.split("-");
    if (parts.length !== 2 || parts[0].length !== 4 || parts[1].length !== 2) {
      throw new Error(`Formato de competência inválido: '${input.competencia}'. Esperado: 'AAAA-MM'`);
    }

    const [anoPA, mesPA] = parts;

    const requestDados: ConsultarXmlDctfwebRequest = {
      categoria: "GERAL_MENSAL",
      anoPA,
      mesPA,
    };

    if (input.numeroRecibo && input.numeroRecibo.trim()) {
      const numRecibo = Number(input.numeroRecibo.replace(/\D/g, ""));
      if (!isNaN(numRecibo) && numRecibo > 0) {
        requestDados.numeroReciboEntrega = numRecibo;
      }
    }

    const response = await this.client.callConsultar<
      ConsultarXmlDctfwebRequest,
      ConsultarXmlDctfwebResponseData
    >({
      contribuinteCnpj: input.contribuinteCnpj,
      idSistema: "DCTFWEB",
      idServico: "CONSXMLDECLARACAO38",
      versaoSistema: "1.0",
      dados: requestDados,
    });

    const xmlBase64 = response.dadosParsed?.XMLStringBase64 || "";

    return {
      xmlBase64,
      status: response.status,
      mensagens: response.mensagens || [],
    };
  }

  /**
   * Gera o DARF oficial em PDF com código de barras da declaração transmitida
   * Serviço: DCTFWEB.GERARGUIA31 (POST /Emitir)
   */
  public async gerarGuiaDarf(input: {
    contribuinteCnpj: string;
    competencia: string; // AAAA-MM
    categoria?: string;
  }): Promise<{ pdfBase64: string; status: number; mensagens: Array<{ codigo: string; texto: string }> }> {
    const [anoPA, mesPA] = input.competencia.split("-");
    const response = await this.client.callEmitir<
      { categoria: string; anoPA: string; mesPA: string },
      { PDFByteArrayBase64?: string; pdf?: string } | string
    >({
      contribuinteCnpj: input.contribuinteCnpj,
      idSistema: "DCTFWEB",
      idServico: "GERARGUIA31",
      versaoSistema: "1.0",
      dados: {
        categoria: input.categoria || "GERAL_MENSAL",
        anoPA,
        mesPA,
      },
    });

    let pdf = "";
    if (typeof response.dadosParsed === "string") {
      pdf = response.dadosParsed;
    } else if (response.dadosParsed && typeof response.dadosParsed === "object") {
      pdf = (response.dadosParsed as any).PDFByteArrayBase64 || (response.dadosParsed as any).pdf || "";
    }

    return {
      pdfBase64: pdf,
      status: response.status,
      mensagens: response.mensagens || [],
    };
  }

  /**
   * Consulta o recibo oficial de transmissão da DCTFWeb
   * Serviço: DCTFWEB.CONSRECIBO32 (POST /Consultar)
   */
  public async consultarRecibo(input: {
    contribuinteCnpj: string;
    competencia: string; // AAAA-MM
    categoria?: string;
  }): Promise<{ pdfBase64: string; status: number; mensagens: Array<{ codigo: string; texto: string }> }> {
    const [anoPA, mesPA] = input.competencia.split("-");
    const response = await this.client.callConsultar<
      { categoria: string; anoPA: string; mesPA: string },
      { PDFByteArrayBase64?: string; pdf?: string } | string
    >({
      contribuinteCnpj: input.contribuinteCnpj,
      idSistema: "DCTFWEB",
      idServico: "CONSRECIBO32",
      versaoSistema: "1.0",
      dados: {
        categoria: input.categoria || "GERAL_MENSAL",
        anoPA,
        mesPA,
      },
    });

    let pdf = "";
    if (typeof response.dadosParsed === "string") {
      pdf = response.dadosParsed;
    } else if (response.dadosParsed && typeof response.dadosParsed === "object") {
      pdf = (response.dadosParsed as any).PDFByteArrayBase64 || (response.dadosParsed as any).pdf || "";
    }

    return {
      pdfBase64: pdf,
      status: response.status,
      mensagens: response.mensagens || [],
    };
  }
}
