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
