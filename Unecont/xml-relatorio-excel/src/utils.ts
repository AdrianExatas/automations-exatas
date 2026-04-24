export function normalizeWhitespace(value: string | undefined | null): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripNonDigits(value: string | undefined | null): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeServiceCode(value: string | undefined | null): string {
  const digits = stripNonDigits(value);
  if (digits.length < 4) return "";
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}`;
}

export function parseDecimal(value: string | undefined | null): number {
  const normalized = normalizeWhitespace(value).replace(",", ".");
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatDateToBrazilian(value: string | undefined | null): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return "";
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return normalized;
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${day}/${month}/${year}`;
}

export function mapSimpleNationalFlag(value: string | undefined | null): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return "";
  if (normalized === "1") return "Simples Nacional";
  if (normalized === "2") return "Não Simples Nacional";
  return "";
}

export function formatTaxId(value: string | undefined | null): string {
  const digits = stripNonDigits(value);
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return normalizeWhitespace(value);
}

export function buildTimestampForFileName(date = new Date()): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}
