/**
 * Motor de Conciliação Fiscal: EFD-Reinf (Domínio) × DCTFWeb (SERPRO)
 * Regra de tolerância zero (diferença >= R$ 0,01 é DIVERGENTE).
 */
import { createHash } from "node:crypto";
import type {
  DominioReinfData,
  DctfwebParsedDeclaration,
  ReconciliationResult,
  ReconciliationDetailItem,
  StatusConferencia,
  SituacaoDetalhe,
  ReinfSeries,
} from "../types.ts";
import { round2 } from "../dctfweb/normalizer.ts";

export class ReconciliationComparator {
  public compare(
    dominioData: DominioReinfData,
    dctfwebData: DctfwebParsedDeclaration | null,
    errosSerpro: string[] = [],
  ): ReconciliationResult {
    const empresa = dominioData.empresa;
    const competencia = dominioData.competencia;
    const mensagens: string[] = [...errosSerpro];
    const pendencias: string[] = [...dominioData.pendencias];
    const fechamentosUtilizados: string[] = [];

    if (dominioData.fechamentoR2000?.recibo) {
      fechamentosUtilizados.push(
        `R-2000: Recibo ${dominioData.fechamentoR2000.recibo} (${dominioData.fechamentoR2000.dataHoraEnvio})`,
      );
    }
    if (dominioData.fechamentoR4000?.recibo) {
      fechamentosUtilizados.push(
        `R-4000: Recibo ${dominioData.fechamentoR4000.recibo} (${dominioData.fechamentoR4000.dataHoraEnvio})`,
      );
    }

    // Se houve erro grave no SERPRO (ex: falha de autenticação ou transporte)
    if (errosSerpro.length > 0 && !dctfwebData) {
      return this.buildResult({
        empresa,
        competencia,
        status: "ERRO",
        detalhes: [],
        fechamentosUtilizados,
        pendencias,
        mensagens,
        reciboReinfR2000: dominioData.fechamentoR2000?.recibo,
        reciboReinfR4000: dominioData.fechamentoR4000?.recibo,
        reciboDctfweb: undefined,
        totalDominioOrigem6: 0,
        totalDctfwebOrigem6: 0,
        totalDominioOrigem7: 0,
        totalDctfwebOrigem7: 0,
      });
    }

    // REGRA MANDATÓRIA: Se houver pendência no Domínio (fechamento ausente, reabertura, erro de transmissão),
    // o período é classificado como PENDENTE e NÃO PODE declarar conformidade.
    if (pendencias.length > 0) {
      mensagens.push("Período com pendências de fechamento no Domínio. Conformidade não avaliada.");
      return this.buildResult({
        empresa,
        competencia,
        status: "PENDENTE",
        detalhes: [],
        fechamentosUtilizados,
        pendencias,
        mensagens,
        reciboReinfR2000: dominioData.fechamentoR2000?.recibo,
        reciboReinfR4000: dominioData.fechamentoR4000?.recibo,
        reciboDctfweb: dctfwebData?.numeroRecibo,
        totalDominioOrigem6: 0,
        totalDctfwebOrigem6: 0,
        totalDominioOrigem7: 0,
        totalDctfwebOrigem7: 0,
      });
    }

    // Se não há declaração DCTFWeb encontrada
    if (!dctfwebData) {
      mensagens.push("Nenhuma declaração DCTFWeb localizada no SERPRO para o contribuinte e competência.");
      return this.buildResult({
        empresa,
        competencia,
        status: "SEM_DCTFWEB",
        detalhes: [],
        fechamentosUtilizados,
        pendencias,
        mensagens,
        reciboReinfR2000: dominioData.fechamentoR2000?.recibo,
        reciboReinfR4000: dominioData.fechamentoR4000?.recibo,
        reciboDctfweb: undefined,
        totalDominioOrigem6: 0,
        totalDctfwebOrigem6: 0,
        totalDominioOrigem7: 0,
        totalDctfwebOrigem7: 0,
      });
    }

    // --- Início da Conciliação de Valores ---
    const detalhes: ReconciliationDetailItem[] = [];

    // Agrupar itens do Domínio por (origem + codigoReceita)
    const domMap = new Map<string, {
      serie: ReinfSeries;
      origem: 6 | 7;
      codigoReceita: string;
      baseCalculo: number;
      valorDevido: number;
      valorDeducao: number;
      valorRetencao: number;
      valorSuspenso: number;
      saldoExigivel: number;
    }>();

    let totalDomOrigem6 = 0;
    let totalDomOrigem7 = 0;

    for (const item of dominioData.itens) {
      const key = `${item.origem}::${item.codigoReceita}`;
      const existing = domMap.get(key) || {
        serie: item.serie,
        origem: item.origem,
        codigoReceita: item.codigoReceita,
        baseCalculo: 0,
        valorDevido: 0,
        valorDeducao: 0,
        valorRetencao: 0,
        valorSuspenso: 0,
        saldoExigivel: 0,
      };

      existing.baseCalculo = round2(existing.baseCalculo + item.baseCalculo);
      existing.valorDevido = round2(existing.valorDevido + item.valorDevido);
      existing.valorDeducao = round2(existing.valorDeducao + item.valorDeducao);
      existing.valorRetencao = round2(existing.valorRetencao + item.valorRetencao);
      existing.valorSuspenso = round2(existing.valorSuspenso + item.valorSuspenso);
      existing.saldoExigivel = round2(existing.saldoExigivel + item.saldoExigivel);

      domMap.set(key, existing);

      if (item.origem === 6) totalDomOrigem6 = round2(totalDomOrigem6 + item.valorDevido);
      if (item.origem === 7) totalDomOrigem7 = round2(totalDomOrigem7 + item.valorDevido);
    }

    // Agrupar itens da DCTFWeb por (origem + codigoReceita)
    const dctfMap = new Map<string, {
      origem: 6 | 7;
      codigoReceita: string;
      baseCalculo: number;
      valorDevido: number;
      valorDeducao: number;
      valorRetencao: number;
      valorSuspenso: number;
      saldoExigivel: number;
    }>();

    for (const item of dctfwebData.tributos) {
      const origemNum = item.origem === 6 ? 6 : item.origem === 7 ? 7 : null;
      if (!origemNum) continue;

      const key = `${origemNum}::${item.codigoReceita}`;
      const existing = dctfMap.get(key) || {
        origem: origemNum,
        codigoReceita: item.codigoReceita,
        baseCalculo: 0,
        valorDevido: 0,
        valorDeducao: 0,
        valorRetencao: 0,
        valorSuspenso: 0,
        saldoExigivel: 0,
      };

      existing.baseCalculo = round2(existing.baseCalculo + item.baseCalculo);
      existing.valorDevido = round2(existing.valorDevido + item.valorDevido);
      existing.valorDeducao = round2(existing.valorDeducao + item.valorDeducao);
      existing.valorRetencao = round2(existing.valorRetencao + item.valorRetencao);
      existing.valorSuspenso = round2(existing.valorSuspenso + item.valorSuspenso);
      existing.saldoExigivel = round2(existing.saldoExigivel + item.saldoExigivel);

      dctfMap.set(key, existing);
    }

    const totalDctfOrigem6 = dctfwebData.totalApuradoOrigem6;
    const totalDctfOrigem7 = dctfwebData.totalApuradoOrigem7;

    const diferencaOrigem6 = round2(totalDomOrigem6 - totalDctfOrigem6);
    const diferencaOrigem7 = round2(totalDomOrigem7 - totalDctfOrigem7);

    // Comparar todos os códigos encontrados em qualquer dos lados
    const allKeys = new Set<string>([...domMap.keys(), ...dctfMap.keys()]);
    let hasDivergence = false;
    let hasUnilateral = false;

    // Diferença em qualquer dos totais por origem
    if (Math.abs(diferencaOrigem6) >= 0.01 || Math.abs(diferencaOrigem7) >= 0.01) {
      hasDivergence = true;
    }

    for (const key of Array.from(allKeys).sort()) {
      const [origemStr, codigoReceita] = key.split("::");
      const origem = Number(origemStr) as 6 | 7;
      const serie: ReinfSeries = origem === 6 ? "R-2000" : "R-4000";

      const domItem = domMap.get(key);
      const dctfItem = dctfMap.get(key);

      if (domItem && dctfItem) {
        // Presente nos dois lados -> comparação detalhada
        const vlrDom = domItem.valorDevido;
        const vlrDctf = dctfItem.valorDevido;
        const diff = round2(vlrDom - vlrDctf);
        const isDiv = Math.abs(diff) >= 0.01;

        if (isDiv) hasDivergence = true;

        detalhes.push({
          serie,
          origem,
          codigoReceita,
          tipoValor: "devido",
          valorDominio: vlrDom,
          valorDctfweb: vlrDctf,
          diferenca: diff,
          situacao: isDiv ? "divergente" : "conforme",
          observacao: isDiv
            ? `Divergência de R$ ${diff.toFixed(2)} no débito apurado`
            : "Valores idênticos em centavos",
        });

        // Também checar saldo exigível se houver divergência
        const saldoDiff = round2(domItem.saldoExigivel - dctfItem.saldoExigivel);
        if (Math.abs(saldoDiff) >= 0.01) {
          hasDivergence = true;
          detalhes.push({
            serie,
            origem,
            codigoReceita,
            tipoValor: "saldo_exigivel",
            valorDominio: domItem.saldoExigivel,
            valorDctfweb: dctfItem.saldoExigivel,
            diferenca: saldoDiff,
            situacao: "divergente",
            observacao: `Divergência de R$ ${saldoDiff.toFixed(2)} no saldo a pagar`,
          });
        }
      } else if (domItem && !dctfItem) {
        // Somente no Domínio
        const vlrDom = domItem.valorDevido;
        const isSignificative = Math.abs(vlrDom) >= 0.01;
        if (isSignificative) {
          hasDivergence = true;
          hasUnilateral = true;
        }

        detalhes.push({
          serie,
          origem,
          codigoReceita,
          tipoValor: "devido",
          valorDominio: vlrDom,
          valorDctfweb: 0,
          diferenca: vlrDom,
          situacao: "somente_dominio",
          observacao: "Código constante na EFD-Reinf (Domínio), ausente na DCTFWeb (não comparável)",
        });
      } else if (!domItem && dctfItem) {
        // Somente na DCTFWeb
        const vlrDctf = dctfItem.valorDevido;
        const isSignificative = Math.abs(vlrDctf) >= 0.01;
        if (isSignificative) {
          hasDivergence = true;
          hasUnilateral = true;
        }

        detalhes.push({
          serie,
          origem,
          codigoReceita,
          tipoValor: "devido",
          valorDominio: 0,
          valorDctfweb: vlrDctf,
          diferenca: round2(-vlrDctf),
          situacao: "somente_dctfweb",
          observacao: "Código constante na DCTFWeb, ausente na EFD-Reinf (Domínio) (não comparável)",
        });
      }
    }

    let status: StatusConferencia = "CONFORME";
    if (hasDivergence || hasUnilateral) {
      status = "DIVERGENTE";
      if (hasDivergence) mensagens.push("Divergência de valores apurada entre Domínio e DCTFWeb (>= R$ 0,01).");
      if (hasUnilateral) mensagens.push("Códigos de receita presentes em apenas uma das fontes apurados.");
    } else {
      mensagens.push("Totalizadores e códigos de receita 100% coincidentes em centavos.");
    }

    return this.buildResult({
      empresa,
      competencia,
      status,
      detalhes,
      fechamentosUtilizados,
      pendencias,
      mensagens,
      reciboReinfR2000: dominioData.fechamentoR2000?.recibo,
      reciboReinfR4000: dominioData.fechamentoR4000?.recibo,
      reciboDctfweb: dctfwebData.numeroRecibo,
      totalDominioOrigem6: totalDomOrigem6,
      totalDctfwebOrigem6: totalDctfOrigem6,
      totalDominioOrigem7: totalDomOrigem7,
      totalDctfwebOrigem7: totalDctfOrigem7,
    });
  }

  private buildResult(params: {
    empresa: ReconciliationResult["empresa"];
    competencia: string;
    status: StatusConferencia;
    detalhes: ReconciliationDetailItem[];
    fechamentosUtilizados: string[];
    pendencias: string[];
    mensagens: string[];
    reciboReinfR2000?: string;
    reciboReinfR4000?: string;
    reciboDctfweb?: string;
    totalDominioOrigem6: number;
    totalDctfwebOrigem6: number;
    totalDominioOrigem7: number;
    totalDctfwebOrigem7: number;
  }): ReconciliationResult {
    const totalGeralDom = round2(params.totalDominioOrigem6 + params.totalDominioOrigem7);
    const totalGeralDctf = round2(params.totalDctfwebOrigem6 + params.totalDctfwebOrigem7);
    const diferencaGeral = round2(totalGeralDom - totalGeralDctf);

    const hashPayload = JSON.stringify({
      cnpj: params.empresa.cnpj,
      competencia: params.competencia,
      status: params.status,
      totalGeralDom,
      totalGeralDctf,
      diferencaGeral,
      reciboReinfR2000: params.reciboReinfR2000,
      reciboReinfR4000: params.reciboReinfR4000,
      reciboDctfweb: params.reciboDctfweb,
      detalhesCount: params.detalhes.length,
    });

    const hashResultado = createHash("sha256").update(hashPayload).digest("hex");

    return {
      empresa: params.empresa,
      competencia: params.competencia,
      status: params.status,
      reciboReinfR2000: params.reciboReinfR2000,
      reciboReinfR4000: params.reciboReinfR4000,
      reciboDctfweb: params.reciboDctfweb,
      totalDominioOrigem6: params.totalDominioOrigem6,
      totalDctfwebOrigem6: params.totalDctfwebOrigem6,
      diferencaOrigem6: round2(params.totalDominioOrigem6 - params.totalDctfwebOrigem6),
      totalDominioOrigem7: params.totalDominioOrigem7,
      totalDctfwebOrigem7: params.totalDctfwebOrigem7,
      diferencaOrigem7: round2(params.totalDominioOrigem7 - params.totalDctfwebOrigem7),
      totalGeralDominio: totalGeralDom,
      totalGeralDctfweb: totalGeralDctf,
      diferencaGeral,
      detalhes: params.detalhes,
      fechamentosUtilizados: params.fechamentosUtilizados,
      pendencias: params.pendencias,
      mensagens: params.mensagens,
      dataProcessamento: new Date().toISOString(),
      hashResultado,
    };
  }
}
