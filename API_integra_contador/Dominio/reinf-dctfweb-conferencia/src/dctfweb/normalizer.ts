/**
 * Normalizador de dados da declaração DCTFWeb
 * Filtra estritamente as origens Reinf CP (6) e Reinf RET (7),
 * descartando origens alheias (como eSocial = 1).
 */
import type {
  DctfwebParsedDeclaration,
  DctfwebTributoItem,
  OrigemDctfweb,
} from "../types.ts";

export function normalizeCodigoReceita(code: string | number | undefined | null): string {
  if (!code) return "";
  const raw = String(code).trim().toUpperCase();
  // Se for código com 6 dígitos (ex: 116201 -> 1162-01)
  if (/^\d{6}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}`;
  }
  // Se for código com 5 dígitos (ex: 56107 -> 0561-07)
  if (/^\d{5}$/.test(raw)) {
    const padded = `0${raw}`;
    return `${padded.slice(0, 4)}-${padded.slice(4, 6)}`;
  }
  // Se for código numérico de 3 dígitos (ex: 588 que perdeu zero -> 0588)
  if (/^\d{3}$/.test(raw)) {
    return `0${raw}`;
  }
  return raw;
}

export function parseOrigem(val: unknown): OrigemDctfweb | null {
  if (val === 6 || val === "6") return 6;
  if (val === 7 || val === "7") return 7;
  if (typeof val === "string") {
    const upper = val.toUpperCase().trim();
    if (upper.includes("REINF_CP") || upper.includes("REINF CP") || upper === "CP") return 6;
    if (upper.includes("REINF_RET") || upper.includes("REINF RET") || upper === "RET") return 7;
  }
  const num = Number(val);
  if (!isNaN(num) && (num === 6 || num === 7)) return num as OrigemDctfweb;
  return null;
}

export function inferOrigemFromCodigoReceita(
  codigoReceita: string,
  ctCodGrupo?: unknown,
  ctDescGrupo?: unknown,
): OrigemDctfweb | null {
  const norm = normalizeCodigoReceita(codigoReceita);
  const grupoStr = String(ctCodGrupo ?? "").trim();
  const descGrupoStr = String(ctDescGrupo ?? "").toUpperCase();

  // 1. Grupo 37 = Retenções de Contribuições (PIS/COFINS/CSLL - Série R-4000)
  if (grupoStr === "37" || descGrupoStr.includes("CSRF") || descGrupoStr.includes("RET DE CONTRIBUICOES")) {
    return 7;
  }

  // 2. Códigos auditados e homologados da Série R-4000 (Origem 7: Reinf RET)
  if (
    norm.startsWith("1708") ||
    norm.startsWith("1841") ||
    norm.startsWith("3208") ||
    norm.startsWith("3280") ||
    norm.startsWith("5232") ||
    norm.startsWith("5706") ||
    norm.startsWith("5952") ||
    norm.startsWith("5960") ||
    norm.startsWith("5979") ||
    norm.startsWith("5987") ||
    norm.startsWith("6147") ||
    norm.startsWith("6190") ||
    norm.startsWith("6256") ||
    norm.startsWith("8045") ||
    norm.startsWith("8053") ||
    norm.startsWith("0588") ||
    norm.startsWith("0473") ||
    norm.startsWith("2484")
  ) {
    return 7;
  }

  // 3. Códigos auditados da Série R-2000 (Origem 6: Reinf CP)
  // 1162 (Serviços tomados - R-2010)
  // 2985, 2991 (CPRB Contribuição Previdenciária sobre Receita Bruta - R-2060)
  // 1656, 1213, 1646-03 (Aquisição de Produção Rural - R-2055)
  if (
    norm.startsWith("1162") ||
    norm.startsWith("2985") ||
    norm.startsWith("2991") ||
    norm.startsWith("1656") ||
    norm.startsWith("1213") ||
    norm === "1646-03" ||
    norm === "164603"
  ) {
    return 6;
  }

  // Se o grupo for 14 (IRRF) mas NÃO for folha/assalariado (0561)
  if (grupoStr === "14" && !norm.startsWith("0561") && !norm.startsWith("561")) {
    return 7;
  }

  return null;
}

export function parseDecimal(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : round2(val);
  if (typeof val === "string") {
    let clean = val.trim();
    if (!clean) return 0;
    // Se estiver no formato brasileiro 1.234,56 -> 1234.56
    if (clean.includes(",") && clean.includes(".")) {
      clean = clean.replace(/\./g, "").replace(",", ".");
    } else if (clean.includes(",")) {
      clean = clean.replace(",", ".");
    }
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : round2(num);
  }
  return 0;
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export class DctfwebNormalizer {
  public normalize(parsedXml: Record<string, unknown>): DctfwebParsedDeclaration {
    const root = this.findRootObject(parsedXml);

    const cnpj = this.extractCnpj(root);
    const competencia = this.extractCompetencia(root);
    const numeroRecibo = this.extractRecibo(root);
    const tipoDeclaracao = this.extractTipoDeclaracao(root);

    // Encontrar todos os itens de débito/tributo
    const rawItems = this.collectDebitItems(root);

    const tributos: DctfwebTributoItem[] = [];
    let totalOrigem6 = 0;
    let totalOrigem7 = 0;

    for (const raw of rawItems) {
      const rawOrigem =
        raw.origem ??
        raw.origemDebito ??
        raw.origemTributo ??
        raw.tipoOrigem ??
        raw["@_origem"];

      let origem = parseOrigem(rawOrigem);

      const codigoReceitaRaw =
        raw.codigoReceita ??
        raw.codReceita ??
        raw.codigoTributo ??
        raw.cdReceita ??
        raw.codigo;

      const codigoReceita = normalizeCodigoReceita(codigoReceitaRaw);

      // Se a origem não veio explícita no XML (como no XML oficial SERPRO DCTFWeb),
      // inferir a partir do código de receita e grupo tributário
      if (origem === null) {
        origem = inferOrigemFromCodigoReceita(
          codigoReceita,
          raw.ctCodGrupo,
          raw.ctDescGrupo ?? raw.ctDescricaoTributo,
        );
      }

      // REGRA: Considerar SOMENTE origens 6 (Reinf CP) e 7 (Reinf RET)
      // Origens como 1 (eSocial) são totalmente ignoradas
      if (origem !== 6 && origem !== 7) {
        continue;
      }

      const descricao = String(
        raw.descricao ??
        raw.descricaoReceita ??
        raw.nomeTributo ??
        raw.ctDescricaoTributo ??
        raw.ctDescGrupo ??
        "",
      );

      const baseCalculo = parseDecimal(
        raw.baseCalculo ?? raw.vlrBaseCalculo ?? raw.valorBaseCalculo ?? raw.base,
      );
      const valorDevido = parseDecimal(
        raw.valorPrincipal ??
          raw.vlrApurado ??
          raw.valorDevido ??
          raw.vlrDebitoApurado ??
          raw.valorDebito ??
          raw.ctValor,
      );
      const valorDeducao = parseDecimal(
        raw.valorDeducao ??
          raw.vlrDeducao ??
          raw.vlrCreditoVinculado ??
          raw.deducoes ??
          raw.vlTotalCred,
      );
      const valorRetencao = parseDecimal(
        raw.valorRetencao ?? raw.vlrRetencao ?? raw.retencao,
      );
      const valorSuspenso = parseDecimal(
        raw.valorSuspenso ?? raw.vlrSuspenso ?? raw.suspenso,
      );

      let saldoExigivel = parseDecimal(
        raw.saldoPagar ??
          raw.vlrSaldoPagar ??
          raw.saldoExigivel ??
          raw.vlrSaldoExigivel ??
          raw.saldoaPagar,
      );

      // Se saldo a pagar não estiver explicitado, calcular devido - dedução - suspenso
      if (saldoExigivel === 0 && valorDevido > 0) {
        saldoExigivel = round2(Math.max(0, valorDevido - valorDeducao - valorSuspenso));
      }

      const item: DctfwebTributoItem = {
        origem,
        codigoReceita,
        descricao,
        baseCalculo,
        valorDevido,
        valorDeducao,
        valorRetencao,
        valorSuspenso,
        saldoExigivel,
      };

      tributos.push(item);

      if (origem === 6) {
        totalOrigem6 = round2(totalOrigem6 + valorDevido);
      } else if (origem === 7) {
        totalOrigem7 = round2(totalOrigem7 + valorDevido);
      }
    }

    return {
      cnpj,
      competencia,
      categoria: "GERAL_MENSAL",
      numeroRecibo,
      tipoDeclaracao,
      totalApuradoOrigem6: totalOrigem6,
      totalApuradoOrigem7: totalOrigem7,
      tributos,
    };
  }

  private findRootObject(data: Record<string, unknown>): Record<string, unknown> {
    if (data.ProcDctf && typeof data.ProcDctf === "object") {
      return data.ProcDctf as Record<string, unknown>;
    }
    if (data.Dctfweb && typeof data.Dctfweb === "object") {
      return data.Dctfweb as Record<string, unknown>;
    }
    if (data.declaracao && typeof data.declaracao === "object") {
      return data.declaracao as Record<string, unknown>;
    }
    if (data.retornoConsultaXml && typeof data.retornoConsultaXml === "object") {
      return data.retornoConsultaXml as Record<string, unknown>;
    }
    return data;
  }

  private extractCnpj(root: Record<string, unknown>): string {
    const val =
      this.findDeep(root, "cnpj") ||
      this.findDeep(root, "cpfCnpj") ||
      this.findDeep(root, "inscContrib") ||
      this.findDeep(root, "numeroInscricao") ||
      "";
    return String(val).replace(/\D/g, "");
  }

  private extractCompetencia(root: Record<string, unknown>): string {
    const pa =
      this.findDeep(root, "periodoApuracao") ||
      this.findDeep(root, "perApuracao") ||
      this.findDeep(root, "perApur") ||
      "";

    const paStr = String(pa).trim();
    if (/^\d{4}-\d{2}$/.test(paStr)) return paStr;

    // Se for formato de 6 dígitos
    if (/^\d{6}$/.test(paStr)) {
      const p1 = paStr.slice(0, 4);
      const p2 = paStr.slice(4, 6);
      // Caso 1: YYYYMM (ex: 202608 -> 2026-08)
      if (Number(p1) >= 2000) {
        return `${p1}-${p2}`;
      }
      // Caso 2: MMYYYY (ex: 082026 -> 2026-08)
      const mes = paStr.slice(0, 2);
      const ano = paStr.slice(2, 6);
      if (Number(ano) >= 2000) {
        return `${ano}-${mes}`;
      }
    }

    const ano = this.findDeep(root, "anoPA") || this.findDeep(root, "ano");
    const mes = this.findDeep(root, "mesPA") || this.findDeep(root, "mes");
    if (ano && mes) {
      const mesPad = String(mes).padStart(2, "0");
      return `${ano}-${mesPad}`;
    }
    return "";
  }

  private extractRecibo(root: Record<string, unknown>): string {
    const val =
      this.findDeep(root, "numeroRecibo") ||
      this.findDeep(root, "numRecibo") ||
      this.findDeep(root, "reciboEntrega") ||
      this.findDeep(root, "recibo") ||
      "";
    return String(val).trim();
  }

  private extractTipoDeclaracao(root: Record<string, unknown>): "ORIGINAL" | "RETIFICADORA" {
    const val =
      this.findDeep(root, "tipoDeclaracao") ||
      this.findDeep(root, "tpDeclaracao") ||
      this.findDeep(root, "indRetificacao") ||
      "ORIGINAL";
    const str = String(val).toUpperCase();
    if (str === "2" || str.includes("RETIF")) return "RETIFICADORA";
    return "ORIGINAL";
  }

  private collectDebitItems(root: Record<string, unknown>): Array<Record<string, unknown>> {
    const items: Array<Record<string, unknown>> = [];

    const walk = (node: unknown) => {
      if (!node || typeof node !== "object") return;

      if (Array.isArray(node)) {
        for (const child of node) walk(child);
        return;
      }

      const obj = node as Record<string, unknown>;

      // Se este nó tem indícios de ser um débito/tributo:
      // Formato 1: Sintético/Mock com tag de origem explícita
      const hasOrigem =
        obj.origem !== undefined ||
        obj.origemDebito !== undefined ||
        obj.origemTributo !== undefined ||
        obj.tipoOrigem !== undefined ||
        obj["@_origem"] !== undefined;

      const hasReceita =
        obj.codigoReceita !== undefined ||
        obj.codReceita !== undefined ||
        obj.codigoTributo !== undefined ||
        obj.cdReceita !== undefined ||
        obj.codigo !== undefined;

      // Formato 2: XML oficial SERPRO DCTFWeb (<CreditoTributarioApurado>)
      const isSerproCredito =
        hasReceita &&
        (obj.ctValor !== undefined ||
          obj.saldoaPagar !== undefined ||
          obj.ctCodGrupo !== undefined ||
          obj.ctDescricaoTributo !== undefined);

      if ((hasOrigem && hasReceita) || isSerproCredito) {
        items.push(obj);
      }

      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === "object" && obj[key] !== null) {
          walk(obj[key]);
        }
      }
    };

    walk(root);
    return items;
  }

  private findDeep(obj: unknown, targetKey: string): unknown {
    if (!obj || typeof obj !== "object") return undefined;
    const record = obj as Record<string, unknown>;

    for (const key of Object.keys(record)) {
      if (key.toLowerCase() === targetKey.toLowerCase()) {
        return record[key];
      }
    }

    for (const key of Object.keys(record)) {
      if (typeof record[key] === "object" && record[key] !== null) {
        const found = this.findDeep(record[key], targetKey);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }
}
