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

    const resp = await this.client.callEmitir<{
      cnpj?: string;
      pdf?: string;
    }>(cleanCnpj, "CCMEI", "EMITIRCCMEI121", "");

    return {
      cnpj: cleanCnpj,
      pdfBase64: resp.dados?.pdf,
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
      Array<{
        pdf?: string;
        cnpjCompleto?: string;
        detalhamento?: {
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
        };
      }>
    >(cleanCnpj, "PGMEI", "GERARDASPDF21", payload);

    const dasList = Array.isArray(resp.dados) ? resp.dados : [];
    const first = dasList[0];

    return {
      cnpj: cleanCnpj,
      pdfBase64: first?.pdf,
      numeroDocumento: first?.detalhamento?.numeroDocumento,
      periodoApuracao: first?.detalhamento?.periodoApuracao || cleanPA,
      dataVencimento: first?.detalhamento?.dataVencimento,
      valorTotal: first?.detalhamento?.valores?.total,
      valorPrincipal: first?.detalhamento?.valores?.principal,
      valorMulta: first?.detalhamento?.valores?.multa,
      valorJuros: first?.detalhamento?.valores?.juros,
      composicao: first?.detalhamento?.composicao,
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

    const resp = await this.client.callConsultar<DebitoMeiItem[]>(
      cleanCnpj,
      "PGMEI",
      "DIVIDAATIVA24",
      { anoCalendario: ano },
    );

    return Array.isArray(resp.dados) ? resp.dados : [];
  }
}
