import path from "node:path";

export const SAO_PAULO_TIMEZONE = "America/Sao_Paulo" as const;

export function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D+/g, "");
}

export function isValidCnpj(value: unknown): boolean {
  const cnpj = digitsOnly(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calculateDigit = (base: string, weights: number[]): number => {
    const sum = base
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * (weights[index] ?? 0), 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const first = calculateDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calculateDigit(`${cnpj.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.endsWith(`${first}${second}`);
}

export function requireValidCnpj(value: unknown, label = "CNPJ"): string {
  const cnpj = digitsOnly(value);
  if (!isValidCnpj(cnpj)) throw new Error(`${label} invalido: informe 14 digitos validos.`);
  return cnpj;
}

export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function formatRunTimestamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}_${get("hour")}-${get("minute")}-${get("second")}`;
}

export function resolveFromCwd(value: string): string {
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(process.cwd(), value);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function stringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["descricao", "description", "nome", "name", "valor", "value", "codigo", "code"]) {
      if (key in record) return stringValue(record[key]);
    }
  }
  return "";
}

export function booleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || normalizeText(value) === "true") return true;
  if (value === 0 || value === "0" || normalizeText(value) === "false") return false;
  return null;
}
