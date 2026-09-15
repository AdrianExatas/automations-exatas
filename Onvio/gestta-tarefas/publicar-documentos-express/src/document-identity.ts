const FORMATTED_CNPJ = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g;
const LABELED_PLAIN_CNPJ = /\bCNPJ\s*[:\-]?\s*(\d{14})\b/gi;

export interface ExtractedCnpjs {
  all: string[];
  valid: string[];
  invalid: string[];
}

export type DocumentKind =
  | "dctfweb"
  | "fgts_digital"
  | "fgts_consignado"
  | "darf_6012"
  | "darf_3373"
  | "darf_6012_3373";

export function isDarfCotaKind(kind: DocumentKind | undefined): boolean {
  return kind === "darf_6012" || kind === "darf_3373" || kind === "darf_6012_3373";
}

export interface ExtractedCompanyIdentifier {
  type?: "cnpj" | "cnpj_root" | "cpf";
  value?: string;
  companyName?: string;
  unsupportedType?: "caepf";
  invalid?: boolean;
}

export function cnpjDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCnpj(value: string): string {
  const digits = cnpjDigits(value);
  if (digits.length !== 14) return value;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatCpf(value: string): string {
  const digits = cnpjDigits(value);
  if (digits.length !== 11) return value;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function isValidCpf(value: string): boolean {
  const digits = cnpjDigits(value);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const calculateDigit = (length: number): number => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(digits[9]) && calculateDigit(10) === Number(digits[10]);
}

export function isValidCnpj(value: string): boolean {
  const digits = cnpjDigits(value);
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;

  const calculateDigit = (length: number): number => {
    let factor = length - 7;
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * factor--;
      if (factor < 2) factor = 9;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculateDigit(12) === Number(digits[12]) && calculateDigit(13) === Number(digits[13]);
}

export function extractCnpjs(text: string): ExtractedCnpjs {
  const values = new Set<string>();
  FORMATTED_CNPJ.lastIndex = 0;
  for (const match of text.matchAll(FORMATTED_CNPJ)) values.add(formatCnpj(match[0]));
  LABELED_PLAIN_CNPJ.lastIndex = 0;
  for (const match of text.matchAll(LABELED_PLAIN_CNPJ)) values.add(formatCnpj(match[1]));
  const all = [...values];
  return {
    all,
    valid: all.filter(isValidCnpj),
    invalid: all.filter((value) => !isValidCnpj(value)),
  };
}

export function normalizeCompanyName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function extractCompanyName(text: string, cnpj?: string): string | undefined {
  const companyLine = /^\s*Empresa\s*:\s*(?:\d+\s*-\s*)?(.+?)\s*$/im.exec(text)?.[1];
  if (companyLine) return companyLine.trim();
  if (!cnpj) return undefined;

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const target = cnpjDigits(cnpj);
  const index = lines.findIndex((line) => cnpjDigits(line).includes(target));
  if (index < 0) return undefined;

  for (const line of lines.slice(index + 1, index + 4)) {
    if (/^(?:PA|compet[eê]ncia|per[ií]odo|vencimento|data\s+de|c[oó]digo)\b/i.test(line)) continue;
    if (/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/.test(line)) continue;
    if (/[A-Za-zÀ-ÿ]{3}/.test(line)) return line;
  }
  return undefined;
}

function labeledValue(text: string, label: RegExp): string | undefined {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const index = lines.findIndex((line) => label.test(line));
  if (index < 0) return undefined;
  const sameLine = lines[index].replace(label, "").replace(/^\s*[:\-]?\s*/, "").trim();
  return sameLine || lines[index + 1];
}

export function extractFgtsCompanyIdentifier(text: string): ExtractedCompanyIdentifier {
  const rawIdentifier = labeledValue(text, /^CPF\s*\/\s*CNPJ\s+do\s+Empregador\b/i);
  const companyName = labeledValue(text, /^Nome\s*\/\s*Raz[aã]o\s+Social\s+do\s+Empregador\b/i);
  if (!rawIdentifier) return { companyName };
  if (/\bCAEPF\b/i.test(rawIdentifier) || /^\d{3}\.\d{3}\.\d{3}\/\d{3}-\d$/.test(rawIdentifier)) {
    return { companyName, unsupportedType: "caepf" };
  }
  const digits = cnpjDigits(rawIdentifier);
  if (digits.length === 11) {
    const value = formatCpf(digits);
    return isValidCpf(value) ? { type: "cpf", value, companyName } : { companyName, invalid: true };
  }
  if (digits.length === 8) return { type: "cnpj_root", value: digits, companyName };
  if (digits.length === 14) {
    const value = formatCnpj(digits);
    return isValidCnpj(value) ? { type: "cnpj", value, companyName } : { companyName, invalid: true };
  }
  return { companyName, invalid: true };
}

export function identifyDocumentKind(text: string): DocumentKind | undefined {
  const normalized = normalizeCompanyName(text);
  const isFgtsDigital = normalized.includes("GFD GUIA DO FGTS DIGITAL")
    && normalized.includes("CPF CNPJ DO EMPREGADOR")
    && normalized.includes("INFORMACOES DE RECOLHIMENTOS DO FGTS");
  if (isFgtsDigital) {
    const hasFgtsValues = normalized.includes("TOTAL FGTS");
    const hasConsignadoValues = normalized.includes("TOTAL CONSIGNADO") && normalized.includes("ENCARGOS CONSIGNADO");
    if (hasConsignadoValues && !hasFgtsValues) return "fgts_consignado";
    return "fgts_digital";
  }
  const isFederalCollection = normalized.includes("DOCUMENTO DE ARRECADACAO DE RECEITAS FEDERAIS");
  const hasDeclarationReceipt = normalized.includes("RECIBO DECLARACAO");
  const hasSocialSecurityComposition = normalized.includes("CP DESCONTADA") || normalized.includes("CP SEGURADOS");
  if (isFederalCollection && hasDeclarationReceipt && hasSocialSecurityComposition) return "dctfweb";
  const has6012 = normalized.includes("6012CSLL") || /6012\s*CSLL/i.test(text);
  const has3373 = normalized.includes("3373IRPJ") || /3373\s*IRPJ/i.test(text);
  if (isFederalCollection && hasDeclarationReceipt && has6012 && has3373) return "darf_6012_3373";
  if (isFederalCollection && hasDeclarationReceipt && has6012) return "darf_6012";
  if (isFederalCollection && hasDeclarationReceipt && has3373) return "darf_3373";
  return undefined;
}
