/**
 * Serviço de Cálculo de Acréscimos Legais e Emissão de DARF Avulso Sicalc — SERPRO Integra Contador
 * Família: integra-sicalc
 */
import type { SerproClient } from "./client.ts";

export interface SicalcConsolidadoInfo {
  valorPrincipalMoedaCorrente?: number;
  valorTotalConsolidado?: number;
  valorMultaMora?: number;
  percentualMultaMora?: number;
  valorJuros?: number;
  percentualJuros?: number;
  termoInicialJuros?: string;
  dataArrecadacaoConsolidacao?: string;
  dataValidadeCalculo?: string;
}

export interface GerarDarfSicalcParams {
  uf?: string;
  municipio?: string | number;
  codigoReceita: string | number;
  codigoReceitaExtensao?: string | number;
  tipoPA?: "ME" | "TR" | "AN" | "DI";
  dataPA: string; // "MM/AAAA" ou "DD/MM/AAAA"
  vencimento?: string; // "AAAA-MM-DD"
  cota?: string | number;
  valorImposto: number | string;
  dataConsolidacao?: string; // "AAAA-MM-DD"
  observacao?: string;
}

export interface DarfSicalcResult {
  pdfBase64?: string;
  numeroDocumento?: string;
  consolidado?: SicalcConsolidadoInfo;
  valorTotal?: number;
  valorPrincipal?: number;
  valorMulta?: number;
  valorJuros?: number;
  dataValidade?: string;
}

export class SicalcService {
  constructor(private readonly client: SerproClient) {}

  /**
   * Consolidar e Emitir um DARF com acréscimos legais calculados pela RFB
   * Serviço: SICALC.CONSOLIDARGERARDARF51 (POST /Emitir)
   */
  public async consolidarGerarDarf(
    cnpjContribuinte: string,
    params: GerarDarfSicalcParams,
  ): Promise<DarfSicalcResult> {
    const cleanCnpj = cnpjContribuinte.replace(/\D/g, "");
    const todayIso = new Date().toISOString().split("T")[0] + "T00:00:00";
    const dataConsolidacao = params.dataConsolidacao
      ? (params.dataConsolidacao.includes("T") ? params.dataConsolidacao : `${params.dataConsolidacao}T00:00:00`)
      : todayIso;

    let vencimentoFormatted: string | undefined = undefined;
    if (params.vencimento) {
      vencimentoFormatted = params.vencimento.includes("T")
        ? params.vencimento
        : `${params.vencimento}T00:00:00`;
    }

    const payload = {
      uf: params.uf || "SP",
      municipio: params.municipio ? String(params.municipio) : undefined,
      codigoReceita: String(params.codigoReceita).padStart(4, "0"),
      codigoReceitaExtensao: params.codigoReceitaExtensao ? String(params.codigoReceitaExtensao).padStart(2, "0") : "01",
      tipoPA: params.tipoPA || "ME",
      dataPA: params.dataPA,
      vencimento: vencimentoFormatted,
      cota: params.cota ? String(params.cota) : undefined,
      valorImposto: typeof params.valorImposto === "number" ? params.valorImposto.toFixed(2) : String(params.valorImposto),
      dataConsolidacao,
      observacao: params.observacao || "DARF emitido via Exatas Contabilidade - Integra Contador",
    };

    const resp = await this.client.callEmitir<{
      consolidado?: SicalcConsolidadoInfo;
      darf?: string;
      numeroDocumento?: string;
    }>(cleanCnpj, "SICALC", "CONSOLIDARGERARDARF51", payload, {
      versaoSistema: "2.9",
    });

    const dados = resp.dados || {};
    const cons = dados.consolidado || {};

    return {
      pdfBase64: dados.darf,
      numeroDocumento: dados.numeroDocumento,
      consolidado: cons,
      valorTotal: typeof cons.valorTotalConsolidado === "number" ? cons.valorTotalConsolidado : undefined,
      valorPrincipal: typeof cons.valorPrincipalMoedaCorrente === "number" ? cons.valorPrincipalMoedaCorrente : undefined,
      valorMulta: typeof cons.valorMultaMora === "number" ? cons.valorMultaMora : undefined,
      valorJuros: typeof cons.valorJuros === "number" ? cons.valorJuros : undefined,
      dataValidade: cons.dataValidadeCalculo,
    };
  }
}
