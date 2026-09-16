/**
 * Extrator e validador de fechamentos e totalizadores da EFD-Reinf no Domínio
 */
import type {
  Empresa,
  FechamentoReinf,
  DominioReinfData,
  TotalizadorItem,
} from "../types.ts";
import { normalizeCodigoReceita, round2 } from "../dctfweb/normalizer.ts";
import type { IDominioClient } from "./client.ts";
import {
  QUERY_REINF_CLOSINGS,
  QUERY_R2000_TOTALS,
  QUERY_R4000_TOTALS,
} from "./queries.ts";

interface RawClosingRow {
  CODI_EMP: string;
  TIPO_SERIE: string;
  EVENTO: string;
  COMPETENCIA: string;
  RECIBO: string | null;
  DATA_HORA_ENVIO: string;
  SITUACAO_LOTE: string;
  EXCLUIDO: number | boolean;
  SEM_MOVIMENTO: number | boolean;
  MENSAGEM_ERRO: string | null;
}

interface RawTotalizerRow {
  CODI_EMP: string;
  COMPETENCIA: string;
  EVENTO_ORIGEM?: string;
  CODIGO_RECEITA: string;
  BASE_CALCULO?: number;
  VALOR_CONTRIBUICAO?: number;
  VALOR_IRRF?: number;
  VALOR_RETENCAO?: number;
  VALOR_DEDUCAO?: number;
  VALOR_SUSPENSO?: number;
  VALOR_EXIGIVEL?: number;
}

export class DominioReinfExtractor {
  constructor(private readonly client: IDominioClient) {}

  public async extract(empresa: Empresa, competencia: string): Promise<DominioReinfData> {
    const pendencias: string[] = [];

    // 1. Consultar todos os eventos de controle de fechamento/reabertura da competência
    const rawClosings = await this.client.executeSelect<RawClosingRow>(
      QUERY_REINF_CLOSINGS,
      [empresa.codiEmp, competencia],
    );

    // 2. Avaliar série R-2000
    const fechamentoR2000 = this.evaluateClosingSeries(
      "R-2000",
      rawClosings.filter((c) => c.TIPO_SERIE === "R-2000" || c.EVENTO.startsWith("R-20")),
      pendencias,
    );

    // 3. Avaliar série R-4000
    const fechamentoR4000 = this.evaluateClosingSeries(
      "R-4000",
      rawClosings.filter((c) => c.TIPO_SERIE === "R-4000" || c.EVENTO.startsWith("R-40")),
      pendencias,
    );

    // Se nenhuma série teve nem tentativa de fechamento e não há fechamentos aceitos
    if (!fechamentoR2000 && !fechamentoR4000) {
      pendencias.push("Nenhum evento de fechamento (R-2099 ou R-4099) localizado para a competência.");
    }

    const itens: TotalizadorItem[] = [];

    // 4. Buscar totalizadores R-2000 se fechamento for válido e sem reabertura
    if (fechamentoR2000 && fechamentoR2000.aceito && !fechamentoR2000.reabertoPosteriormente) {
      if (fechamentoR2000.temMovimento) {
        const rawTotalsR2000 = await this.client.executeSelect<RawTotalizerRow>(
          QUERY_R2000_TOTALS,
          [empresa.codiEmp, competencia, fechamentoR2000.recibo],
        );

        for (const row of rawTotalsR2000) {
          const base = round2(Number(row.BASE_CALCULO || 0));
          const devido = round2(Number(row.VALOR_CONTRIBUICAO || row.VALOR_RETENCAO || 0));
          const retencao = round2(Number(row.VALOR_RETENCAO || 0));
          const deducao = round2(Number(row.VALOR_DEDUCAO || 0));
          const suspenso = round2(Number(row.VALOR_SUSPENSO || 0));
          let exigivel = round2(Number(row.VALOR_EXIGIVEL || 0));

          if (exigivel === 0 && devido > 0) {
            exigivel = round2(Math.max(0, devido - deducao - suspenso));
          }

          itens.push({
            serie: "R-2000",
            origem: 6,
            eventoOrigem: row.EVENTO_ORIGEM as any,
            codigoReceita: normalizeCodigoReceita(row.CODIGO_RECEITA),
            baseCalculo: base,
            valorDevido: devido,
            valorDeducao: deducao,
            valorRetencao: retencao,
            valorSuspenso: suspenso,
            saldoExigivel: exigivel,
          });
        }
      }
    }

    // 5. Buscar totalizadores R-4000 se fechamento for válido e sem reabertura
    if (fechamentoR4000 && fechamentoR4000.aceito && !fechamentoR4000.reabertoPosteriormente) {
      if (fechamentoR4000.temMovimento) {
        const rawTotalsR4000 = await this.client.executeSelect<RawTotalizerRow>(
          QUERY_R4000_TOTALS,
          [empresa.codiEmp, competencia, fechamentoR4000.recibo],
        );

        for (const row of rawTotalsR4000) {
          const base = round2(Number(row.BASE_CALCULO || 0));
          const devido = round2(Number(row.VALOR_IRRF || row.VALOR_RETENCAO || 0));
          const retencao = round2(Number(row.VALOR_RETENCAO || 0));
          const deducao = round2(Number(row.VALOR_DEDUCAO || 0));
          const suspenso = round2(Number(row.VALOR_SUSPENSO || 0));
          let exigivel = round2(Number(row.VALOR_EXIGIVEL || 0));

          if (exigivel === 0 && devido > 0) {
            exigivel = round2(Math.max(0, devido - deducao - suspenso));
          }

          itens.push({
            serie: "R-4000",
            origem: 7,
            eventoOrigem: row.EVENTO_ORIGEM as any,
            codigoReceita: normalizeCodigoReceita(row.CODIGO_RECEITA),
            baseCalculo: base,
            valorDevido: devido,
            valorDeducao: deducao,
            valorRetencao: retencao,
            valorSuspenso: suspenso,
            saldoExigivel: exigivel,
          });
        }
      }
    }

    return {
      empresa,
      competencia,
      fechamentoR2000,
      fechamentoR4000,
      itens,
      pendencias,
    };
  }

  private evaluateClosingSeries(
    serie: "R-2000" | "R-4000",
    events: RawClosingRow[],
    pendencias: string[],
  ): FechamentoReinf | undefined {
    const fechamentoEvento = serie === "R-2000" ? "R-2099" : "R-4099";
    const reaberturaEvento = serie === "R-2000" ? "R-2098" : "R-4098";

    // Ordenar decrescente por data/hora de envio
    const sorted = [...events].sort(
      (a, b) => new Date(b.DATA_HORA_ENVIO).getTime() - new Date(a.DATA_HORA_ENVIO).getTime(),
    );

    // Encontrar último fechamento
    const closings = sorted.filter((e) => e.EVENTO === fechamentoEvento);
    if (closings.length === 0) {
      return undefined;
    }

    // O mais recente
    const latestClosing = closings[0];
    const isAceito = String(latestClosing.SITUACAO_LOTE).toUpperCase() === "ACEITO";
    const isExcluido = Boolean(latestClosing.EXCLUIDO);
    const hasRecibo = Boolean(latestClosing.RECIBO && String(latestClosing.RECIBO).trim());
    const semMovimento = Boolean(latestClosing.SEM_MOVIMENTO);

    // Verificar se existe reabertura posterior
    const closingTime = new Date(latestClosing.DATA_HORA_ENVIO).getTime();
    const reopeningsAfter = sorted.filter(
      (e) =>
        e.EVENTO === reaberturaEvento &&
        String(e.SITUACAO_LOTE).toUpperCase() === "ACEITO" &&
        new Date(e.DATA_HORA_ENVIO).getTime() > closingTime,
    );

    const reaberto = reopeningsAfter.length > 0;

    if (!isAceito) {
      pendencias.push(
        `${serie}: Último fechamento (${fechamentoEvento}) não foi aceito. Situação: ${latestClosing.SITUACAO_LOTE}.${latestClosing.MENSAGEM_ERRO ? ` Motivo: ${latestClosing.MENSAGEM_ERRO}` : ""}`,
      );
    } else if (isExcluido) {
      // Excluído apenas faz sentido verificar quando o lote foi aceito
      pendencias.push(`${serie}: Último fechamento (${fechamentoEvento}) consta como excluído.`);
    } else if (!hasRecibo) {
      // "Sem recibo" só é relevante quando o fechamento foi aceito e não foi excluído
      pendencias.push(`${serie}: Fechamento (${fechamentoEvento}) aceito porém sem número de recibo registrado.`);
    }

    if (reaberto) {
      pendencias.push(
        `${serie}: Período reaberto posteriormente (${reaberturaEvento}) em ${reopeningsAfter[0].DATA_HORA_ENVIO} sem novo fechamento aceito.`,
      );
    }

    return {
      serie,
      eventoFechamento: fechamentoEvento,
      competencia: latestClosing.COMPETENCIA,
      recibo: latestClosing.RECIBO || "",
      dataHoraEnvio: latestClosing.DATA_HORA_ENVIO,
      aceito: isAceito,
      excluido: isExcluido,
      reabertoPosteriormente: reaberto,
      temMovimento: !semMovimento,
      errosTransmissao: latestClosing.MENSAGEM_ERRO ? [latestClosing.MENSAGEM_ERRO] : [],
    };
  }
}
