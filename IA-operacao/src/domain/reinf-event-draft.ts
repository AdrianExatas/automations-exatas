import { normalizeCnpj } from "./empresa-normalization";
import type { EmpresaBatchItem, NotaFiscalRow } from "../types";

export type StatusRascunho = "rascunho";

export interface ReinfEventDraftBase {
  evento: "R-2010" | "R-4020";
  /** 1 = original; 2 = retificação */
  indRetif: 1 | 2;
  /** Competência no formato YYYY-MM */
  perApur: string;
  cnpjContribuinte: string;
  cnpjPrestador: string;
  numDocto: string;
  vlrBruto: number;
  origemUnecontId?: string;
  statusRascunho: StatusRascunho;
  /** Nome do prestador (auxiliar para CSV/checklist; não faz parte do XML). */
  nomePrestador?: string;
}

export interface ReinfEventDraftR2010 extends ReinfEventDraftBase {
  evento: "R-2010";
  vlrBaseRet: number;
  /** Retenção INSS (tipicamente 11%). */
  vlrRetencao: number;
}

export interface ReinfEventDraftR4020 extends ReinfEventDraftBase {
  evento: "R-4020";
  vlrIr: number;
  vlrCsll?: number;
  vlrCofins?: number;
  vlrPis?: number;
  /** Total CSRF quando Unecont nao particiona CSLL/COFINS/PIS. */
  vlrCsrfTotal?: number;
  observacao?: string;
}

export type ReinfEventDraft = ReinfEventDraftR2010 | ReinfEventDraftR4020;

const MESES_PT: Record<string, string> = {
  janeiro: "01",
  fevereiro: "02",
  marco: "03",
  março: "03",
  abril: "04",
  maio: "05",
  junho: "06",
  julho: "07",
  agosto: "08",
  setembro: "09",
  outubro: "10",
  novembro: "11",
  dezembro: "12",
};

/** Converte label de competência (ex.: "03/2026", "Março / 2026", "01/03/2026") para YYYY-MM. */
export function parseCompetenciaToPerApur(label: string | undefined | null): string {
  if (!label) return "";
  const raw = String(label).replace(/\s+/g, " ").trim();
  if (!raw) return "";

  const iso = raw.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (iso) return `${iso[1]}-${iso[2]}`;

  const mmYyyy = raw.match(/\b(\d{1,2})\/(\d{4})\b/);
  if (mmYyyy) {
    const mm = mmYyyy[1].padStart(2, "0");
    if (Number(mm) >= 1 && Number(mm) <= 12) return `${mmYyyy[2]}-${mm}`;
  }

  const ddMmYyyy = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (ddMmYyyy) {
    const mm = ddMmYyyy[2].padStart(2, "0");
    if (Number(mm) >= 1 && Number(mm) <= 12) return `${ddMmYyyy[3]}-${mm}`;
  }

  const nomeMes = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(
      /\b(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/,
    );
  const ano = raw.match(/\b(20\d{2})\b/);
  if (nomeMes && ano) {
    const mm = MESES_PT[nomeMes[1]];
    if (mm) return `${ano[1]}-${mm}`;
  }

  return "";
}

/** Converte valor monetário BR ("R$ 1.100,00") para number. */
export function parseMoneyBr(value: string | undefined | null): number {
  if (value == null) return 0;
  let s = String(value).trim();
  if (!s || s === "-" || s === "—") return 0;

  s = s.replace(/R\$\s*/gi, "").replace(/\s/g, "");
  if (!s) return 0;

  // Formato BR com milhar e decimal: 1.100,00
  if (/^\d{1,3}(\.\d{3})*,\d{1,2}$/.test(s) || /^\d+,\d{1,2}$/.test(s)) {
    const n = Number(s.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  // Formato com ponto decimal (ou inteiro)
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  // Fallback: remove tudo exceto digitos, virgula e ponto; assume ultimo separador = decimal
  const cleaned = s.replace(/[^\d.,-]/g, "");
  if (!cleaned) return 0;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;
  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = cleaned.replace(/,/g, "");
  } else if (lastComma >= 0) {
    normalized = cleaned.replace(",", ".");
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function resolvePerApur(nota: NotaFiscalRow, competenciaLabel: string): string {
  return (
    parseCompetenciaToPerApur(competenciaLabel) ||
    parseCompetenciaToPerApur(nota.dataCompetencia) ||
    parseCompetenciaToPerApur(nota.dataEmissaoNfe) ||
    ""
  );
}

function buildR2010(
  empresa: EmpresaBatchItem,
  nota: NotaFiscalRow,
  perApur: string,
): ReinfEventDraftR2010 {
  const detalhe = nota.detalhe;
  const vlrBruto = parseMoneyBr(detalhe?.valorNfe || nota.valorNfe);
  const vlrBaseRet = parseMoneyBr(detalhe?.baseCalculo) || vlrBruto;
  const vlrRetencao = parseMoneyBr(detalhe?.retencoes.inss);

  return {
    evento: "R-2010",
    indRetif: 1,
    perApur,
    cnpjContribuinte: normalizeCnpj(empresa.cnpj),
    cnpjPrestador: normalizeCnpj(nota.cnpjPrestador),
    numDocto: nota.numeroNfe,
    vlrBruto,
    vlrBaseRet,
    vlrRetencao,
    origemUnecontId: nota.unecontId,
    statusRascunho: "rascunho",
    nomePrestador: nota.prestador,
  };
}

function buildR4020(
  empresa: EmpresaBatchItem,
  nota: NotaFiscalRow,
  perApur: string,
): ReinfEventDraftR4020 {
  const detalhe = nota.detalhe;
  const vlrBruto = parseMoneyBr(detalhe?.valorNfe || nota.valorNfe);
  const vlrIr = parseMoneyBr(detalhe?.retencoes.irrf);
  const vlrCsrfTotal = parseMoneyBr(detalhe?.retencoes.csrf);

  const draft: ReinfEventDraftR4020 = {
    evento: "R-4020",
    indRetif: 1,
    perApur,
    cnpjContribuinte: normalizeCnpj(empresa.cnpj),
    cnpjPrestador: normalizeCnpj(nota.cnpjPrestador),
    numDocto: nota.numeroNfe,
    vlrBruto,
    vlrIr,
    origemUnecontId: nota.unecontId,
    statusRascunho: "rascunho",
    nomePrestador: nota.prestador,
  };

  // Unecont expoe CSRF agregado (CSLL+COFINS+PIS), sem partilha.
  if (vlrCsrfTotal > 0) {
    draft.vlrCsrfTotal = vlrCsrfTotal;
    draft.observacao = "CSRF nao particionado";
  }

  return draft;
}

/**
 * Filtra notas candidatas a R-2010 / R-4020 e monta rascunhos tipados.
 * Exclui bloqueada_interacao, sem_fato_reinf e revisar_manual.
 */
export function buildReinfEventDrafts(
  empresa: EmpresaBatchItem,
  notas: NotaFiscalRow[],
  competenciaLabel: string,
): ReinfEventDraft[] {
  const drafts: ReinfEventDraft[] = [];

  for (const nota of notas) {
    if (nota.classificacao === "candidato_r2010") {
      drafts.push(buildR2010(empresa, nota, resolvePerApur(nota, competenciaLabel)));
      continue;
    }
    if (nota.classificacao === "candidato_r4020") {
      drafts.push(buildR4020(empresa, nota, resolvePerApur(nota, competenciaLabel)));
    }
  }

  return drafts;
}
