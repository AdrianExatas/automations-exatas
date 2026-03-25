import path from "node:path";

const INVALID_FILE_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function normalizeDigits(value: unknown): string {
  return String(value ?? "").replace(/\D+/g, "");
}

export function normalizeCpf(value: unknown): string {
  const digits = normalizeDigits(value);
  return digits ? digits.padStart(11, "0") : "";
}

export function normalizeCnpj(value: unknown): string {
  const digits = normalizeDigits(value);
  return digits ? digits.padStart(14, "0") : "";
}

export function normalizeIe(value: unknown): string {
  const digits = normalizeDigits(value);
  return digits ? digits.padStart(9, "0") : "";
}

export function isBlank(value: unknown): boolean {
  return String(value ?? "").trim() === "";
}

export function parseInteger(value: string, fieldName: string): number {
  const digits = normalizeDigits(value);
  if (!digits) {
    throw new Error(`Nao foi possivel interpretar o campo "${fieldName}" com valor "${value}".`);
  }

  return Number.parseInt(digits, 10);
}

export function parseBrazilianDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatCompetencia(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${month}/${date.getFullYear()}`;
}

export function monthYearKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getCurrentMonthKey(referenceDate = new Date()): string {
  return monthYearKey(referenceDate);
}

export function getMonthKeyFromBrazilianDate(value: string): string | null {
  const parsed = parseBrazilianDate(value);
  return parsed ? monthYearKey(parsed) : null;
}

export function buildParcelLabel(totalInstallments: number, paidInstallments: number, overdueInstallments: number): string {
  if (totalInstallments <= 0) {
    throw new Error("Qtde de parcelas precisa ser maior que zero para montar o nome do PDF.");
  }

  const nextInstallment = overdueInstallments > 0
    ? paidInstallments + overdueInstallments
    : paidInstallments + 1;
  const boundedInstallment = Math.min(Math.max(nextInstallment, 1), totalInstallments);

  return `${String(boundedInstallment).padStart(2, "0")}-${String(totalInstallments).padStart(2, "0")}`;
}

export function extractPdfNumber(filename: string): string {
  const basename = path.basename(filename);
  const withoutExtension = basename.replace(/\.pdf$/i, "");
  const withoutPrefix = withoutExtension.replace(/^DAE_/i, "");
  const cleaned = withoutPrefix.trim();

  if (!cleaned) {
    throw new Error(`Nao foi possivel extrair o numero do DAE a partir do arquivo "${filename}".`);
  }

  return cleaned;
}

export function sanitizeFileName(filename: string): string {
  return filename.replace(INVALID_FILE_CHARS, " ").replace(/\s+/g, " ").trim();
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
  parcelLabel: string,
  empresa: string | undefined,
  vencimento: string,
): string {
  const companyName = empresa?.trim() ? empresa.trim() : "SEM EMPRESA";
  const dueDate = formatDueDateForFileName(vencimento);
  const dueDateLabel = dueDate ? `Vencimento ${dueDate}` : "Vencimento";
  const rawName = `${codigo} - PARCELA ${parcelLabel} - ${companyName} - ${dueDateLabel}.pdf`;
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
