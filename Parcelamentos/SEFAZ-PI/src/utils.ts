import path from "node:path";

const INVALID_FILE_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export const DEFAULT_TIPO_RECEITA =
  "113004 - ICMS - PARCELAMENTO - IMPOSTO, JUROS E MULTA";

export function normalizeDigits(value: unknown): string {
  return String(value ?? "").replace(/\D+/g, "");
}

/** IE PI: apenas digitos, sem padding fixo (tamanho varia). */
export function normalizeIePi(value: unknown): string {
  return normalizeDigits(value);
}

export function normalizeCnpj(value: unknown): string {
  const digits = normalizeDigits(value);
  return digits ? digits.padStart(14, "0") : "";
}

export function isBlank(value: unknown): boolean {
  return String(value ?? "").trim() === "";
}

export function normalizeWhitespace(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function sanitizeFileName(filename: string): string {
  return filename.replace(INVALID_FILE_CHARS, " ").replace(/\s+/g, " ").trim();
}

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDueDateForFileName(vencimento: string): string {
  const trimmed = vencimento.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (match) {
    const [, day, month, year] = match;
    return `${day}-${month}-${year}`;
  }

  return sanitizeFileName(trimmed);
}

export function buildPdfFileName(
  codigo: string,
  parcela: string,
  empresa: string | undefined,
  vencimento: string,
): string {
  const companyName = empresa?.trim() ? empresa.trim() : "SEM EMPRESA";
  const dueDate = formatDueDateForFileName(vencimento);
  const dueDateLabel = dueDate ? `Vencimento ${dueDate}` : "Vencimento";
  const parcelLabel = parcela.trim() || "PARCELA";
  const rawName = `${codigo} - PI PARCELA ${parcelLabel} - ${companyName} - ${dueDateLabel}.pdf`;
  return sanitizeFileName(rawName);
}

export function timestampForFile(date = new Date()): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

export function resolveSaveDir(cwd: string, saveDir: string): string {
  return path.isAbsolute(saveDir) ? saveDir : path.resolve(cwd, saveDir);
}

export type SituacaoVencimento = "vencida" | "mes_atual" | "futura";

function parseBrazilianDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

function monthYearKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function classifyDueDate(vencimento: string, referenceDate = new Date()): SituacaoVencimento {
  const parsed = parseBrazilianDate(vencimento);
  if (!parsed) {
    throw new Error(`Nao foi possivel classificar o vencimento "${vencimento}".`);
  }

  if (dateOnly(parsed).getTime() < dateOnly(referenceDate).getTime()) {
    return "vencida";
  }

  if (monthYearKey(parsed) === monthYearKey(referenceDate)) {
    return "mes_atual";
  }

  return "futura";
}

export function shouldEmitParcelByDueStatus(situacaoVencimento: SituacaoVencimento): boolean {
  return situacaoVencimento === "vencida" || situacaoVencimento === "mes_atual";
}

export function extractBrazilianDates(text: string): string[] {
  return [...text.matchAll(/\b(\d{2}\/\d{2}\/\d{4})\b/g)].map((match) => match[1]!);
}
