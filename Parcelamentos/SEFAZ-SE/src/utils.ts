import path from "node:path";
import type { CriterioRotulo, SituacaoVencimento } from "./types.js";

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

export function formatCnpj(value: unknown): string {
  const digits = normalizeCnpj(value);
  if (!digits) {
    return "";
  }

  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function normalizeIe(value: unknown): string {
  const digits = normalizeDigits(value);
  return digits ? digits.padStart(9, "0") : "";
}

export function isBlank(value: unknown): boolean {
  return String(value ?? "").trim() === "";
}

export function normalizeWhitespace(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
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

export function resolveParcelLabel(
  details: Record<string, string>,
  totalInstallments: number,
  paidInstallments: number,
  overdueInstallments: number,
): { parcelLabel: string; criterioRotulo: CriterioRotulo } {
  const labelFromDetails = extractParcelLabelFromDetails(details, totalInstallments);

  if (labelFromDetails) {
    return {
      parcelLabel: labelFromDetails,
      criterioRotulo: "tela",
    };
  }

  return {
    parcelLabel: buildParcelLabel(totalInstallments, paidInstallments, overdueInstallments),
    criterioRotulo: "fallback",
  };
}

function extractParcelLabelFromDetails(details: Record<string, string>, totalInstallments: number): string | null {
  for (const [rawKey, rawValue] of Object.entries(details)) {
    const key = normalizeWhitespace(rawKey).toLocaleLowerCase("pt-BR");

    if (!isParcelNumberKey(key)) {
      continue;
    }

    const parsed = parseParcelLabelValue(rawValue, totalInstallments);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function isParcelNumberKey(key: string): boolean {
  if (!key.includes("parcela")) {
    return false;
  }

  if (/(qtde|qtd|quantidade|pagas?|atrasadas?|vencidas?)/i.test(key)) {
    return false;
  }

  return /(^|\b)(n[ºo.]?\s*(da\s*)?)?parcela\b/i.test(key) || /n[uú]mero\s+da\s+parcela/i.test(key);
}

function parseParcelLabelValue(value: string, totalInstallments: number): string | null {
  const normalized = normalizeWhitespace(value);
  const explicitTotal = normalized.match(/\b(\d{1,3})\s*(?:\/|-|de)\s*(\d{1,3})\b/i);

  if (explicitTotal) {
    return formatParcelLabel(Number(explicitTotal[1]), Number(explicitTotal[2]));
  }

  const singleNumber = normalized.match(/\b(\d{1,3})\b/);
  if (singleNumber && totalInstallments > 0) {
    return formatParcelLabel(Number(singleNumber[1]), totalInstallments);
  }

  return null;
}

function formatParcelLabel(currentInstallment: number, totalInstallments: number): string | null {
  if (!Number.isInteger(currentInstallment) || !Number.isInteger(totalInstallments)) {
    return null;
  }

  if (currentInstallment <= 0 || totalInstallments <= 0 || currentInstallment > totalInstallments) {
    return null;
  }

  return `${String(currentInstallment).padStart(2, "0")}-${String(totalInstallments).padStart(2, "0")}`;
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

export function buildSolicitationMonthFolder(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${month}-${date.getFullYear()}`;
}

export function formatToastMessage(title: string | null | undefined, message: string | null | undefined): string {
  const normalizedTitle = normalizeWhitespace(title);
  const normalizedMessage = normalizeWhitespace(message);

  if (normalizedTitle && normalizedMessage) {
    return `${normalizedTitle}: ${normalizedMessage}`;
  }

  return normalizedTitle || normalizedMessage;
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
