/**
 * Serviço de Integração MEI Expresso — SERPRO Integra Contador
 * Família: integra-mei (CCMEI e PGMEI)
 */
import type { SerproClient } from "./client.ts";

export interface CcmeiResult {
  cnpj: string;
  pdfBase64?: string;
}

export interface DasMeiResult {
  cnpj: string;
  pdfBase64?: string;
  numeroDocumento?: string;
  periodoApuracao?: string;
  dataVencimento?: string;
  valorTotal?: number;
  valorPrincipal?: number;
  valorMulta?: number;
  valorJuros?: number;
  composicao?: Array<{
    codigo: string;
    denominacao: string;
    valores?: {
      principal?: number;
      multa?: number;
      juros?: number;
      total?: number;
    };
  }>;
}

export interface DebitoMeiItem {
  periodoApuracao: string;
  tributo: string;
  valor: number;
  enteFederado: string;
  situacaoDebito: string;
}

export class MeiService {
  constructor(private readonly client: SerproClient) {}

  /**
   * Emite o Certificado da Condição de Microempreendedor Individual (CCMEI) em PDF
   * Serviço: CCMEI.EMITIRCCMEI121 (POST /Emitir)
   */
  public async emitirCCMEI(cnpj: string): Promise<CcmeiResult> {
    const cleanCnpj = cnpj.replace(/\D/g, "");

    const resp = await this.client.callEmitir<
      string,
      Array<{ cnpj?: string; pdf?: string }> | { cnpj?: string; pdf?: string }
    >({
      contribuinteCnpj: cleanCnpj,
      idSistema: "CCMEI",
      idServico: "EMITIRCCMEI121",
      versaoSistema: "1.0",
      dados: "",
    });

    const list = Array.isArray(resp.dadosParsed) ? resp.dadosParsed : (resp.dadosParsed ? [resp.dadosParsed] : []);
    const first = list[0] as any;

    return {
      cnpj: cleanCnpj,
      pdfBase64: first?.pdf || first?.pdfBase64,
    };
  }

  /**
   * Gera o DAS do MEI em PDF para o período informado
   * Serviço: PGMEI.GERARDASPDF21 (POST /Emitir)
   */
  public async gerarDasMei(
    cnpj: string,
    periodoApuracao: string,
    dataConsolidacao?: string,
  ): Promise<DasMeiResult> {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const cleanPA = periodoApuracao.replace(/\D/g, "");

    const payload: { periodoApuracao: string; dataConsolidacao?: string } = {
      periodoApuracao: cleanPA,
      ...(dataConsolidacao ? { dataConsolidacao: dataConsolidacao.replace(/\D/g, "") } : {}),
    };

    const resp = await this.client.callEmitir<
      typeof payload,
      Array<{
        pdf?: string;
        cnpjCompleto?: string;
        detalhamento?: Array<{
          periodoApuracao?: string;
          numeroDocumento?: string;
          dataVencimento?: string;
          valores?: {
            principal?: number;
            multa?: number;
            juros?: number;
            total?: number;
          };
          composicao?: Array<{
            codigo: string;
            denominacao: string;
            valores?: {
              principal?: number;
              multa?: number;
              juros?: number;
              total?: number;
            };
          }>;
        }> | {
          periodoApuracao?: string;
          numeroDocumento?: string;
          dataVencimento?: string;
          valores?: {
            principal?: number;
            multa?: number;
            juros?: number;
            total?: number;
          };
          composicao?: Array<any>;
        };
      }>
    >({
      contribuinteCnpj: cleanCnpj,
      idSistema: "PGMEI",
      idServico: "GERARDASPDF21",
      versaoSistema: "1.0",
      dados: payload,
    });

    const dasList = Array.isArray(resp.dadosParsed) ? resp.dadosParsed : (resp.dadosParsed ? [resp.dadosParsed] : []);
    const first = dasList[0] as any;
    const det = Array.isArray(first?.detalhamento) ? first.detalhamento[0] : (first?.detalhamento || {});

    return {
      cnpj: cleanCnpj,
      pdfBase64: first?.pdf,
      numeroDocumento: det?.numeroDocumento,
      periodoApuracao: det?.periodoApuracao || cleanPA,
      dataVencimento: det?.dataVencimento,
      valorTotal: det?.valores?.total,
      valorPrincipal: det?.valores?.principal,
      valorMulta: det?.valores?.multa,
      valorJuros: det?.valores?.juros,
      composicao: det?.composicao,
    };
  }

  /**
   * Consulta débitos inscritos em Dívida Ativa da União para MEI
   * Serviço: PGMEI.DIVIDAATIVA24 (POST /Consultar)
   */
  public async consultarDividaAtiva(
    cnpj: string,
    anoCalendario?: string,
  ): Promise<DebitoMeiItem[]> {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const ano = (anoCalendario || String(new Date().getFullYear())).replace(/\D/g, "");
    const payload = { anoCalendario: ano };

    const resp = await this.client.callConsultar<typeof payload, DebitoMeiItem[]>({
      contribuinteCnpj: cleanCnpj,
      idSistema: "PGMEI",
      idServico: "DIVIDAATIVA24",
      versaoSistema: "1.0",
      dados: payload,
    });

    return Array.isArray(resp.dadosParsed) ? resp.dadosParsed : [];
  }
}
