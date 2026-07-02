import { XMLParser } from "fast-xml-parser";

export type SupportedEventType = "S-5002" | "S-2501";

export type EventMetadata = {
  eventType: SupportedEventType;
  cpf: string;
  period: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
});

export function detectSupportedEventType(entryName: string): SupportedEventType | undefined {
  const normalized = entryName.replaceAll("\\", "/").toLowerCase();
  if (!normalized.endsWith(".xml")) {
    return undefined;
  }
  if (normalized.includes("s-5002")) {
    return "S-5002";
  }
  if (normalized.includes("s-2501")) {
    return "S-2501";
  }
  return undefined;
}

export function isSupportedEventXmlEntry(entryName: string): boolean {
  return detectSupportedEventType(entryName) !== undefined;
}

export function isS5002XmlEntry(entryName: string): boolean {
  return detectSupportedEventType(entryName) === "S-5002";
}

export function parseEventMetadata(xml: string, eventType: SupportedEventType): EventMetadata {
  const parsed = parser.parse(xml) as unknown;
  return eventType === "S-5002" ? parseS5002Metadata(parsed) : parseS2501Metadata(parsed);
}

export function parseS5002Metadata(xml: string): EventMetadata;
export function parseS5002Metadata(parsed: unknown): EventMetadata;
export function parseS5002Metadata(input: string | unknown): EventMetadata {
  const parsed = typeof input === "string" ? parser.parse(input) : input;
  const cpf = extractTextFromObjectWithKey(parsed, "ideTrabalhador", "cpfBenef");
  const period = extractTextFromObjectWithKey(parsed, "ideEvento", "perApur");

  validateCpf(cpf, "CPF do beneficiario nao encontrado no XML.");
  validatePeriod(period, "Periodo de apuracao nao encontrado no XML.");

  return { eventType: "S-5002", cpf, period };
}

function parseS2501Metadata(parsed: unknown): EventMetadata {
  const cpfValues = extractTextsFromObjectsWithKey(parsed, "ideTrab", "cpfTrab");
  if (cpfValues.length > 0) {
    return buildS2501Metadata(cpfValues, extractTextFromObjectWithKey(parsed, "ideProc", "perApurPgto"));
  }

  const evtPgtosCpfValues = extractTextsFromObjectsWithKey(parsed, "ideBenef", "cpfBenef");
  return buildS2501Metadata(evtPgtosCpfValues, extractTextFromObjectWithKey(parsed, "ideEvento", "perApur"));
}

function buildS2501Metadata(cpfValues: string[], period: string | undefined): EventMetadata {
  const cpfs = cpfValues.filter((cpf) => /^\d{11}$/.test(cpf));
  const distinctCpfs = [...new Set(cpfs)];

  if (cpfValues.length === 0 || cpfs.length !== cpfValues.length) {
    throw new MissingXmlFieldError("cpf_ausente", "CPF do beneficiario nao encontrado no XML.");
  }

  if (distinctCpfs.length > 1) {
    throw new MissingXmlFieldError("multiplos_cpfs", "XML S-2501 contem mais de um CPF de trabalhador.");
  }

  validatePeriod(period, "Periodo de apuracao nao encontrado no XML.");

  return { eventType: "S-2501", cpf: distinctCpfs[0]!, period };
}

export class MissingXmlFieldError extends Error {
  constructor(
    public readonly code: "cpf_ausente" | "periodo_ausente" | "multiplos_cpfs",
    message: string,
  ) {
    super(message);
    this.name = "MissingXmlFieldError";
  }
}

function validateCpf(cpf: string | undefined, message: string): asserts cpf is string {
  if (!cpf || !/^\d{11}$/.test(cpf)) {
    throw new MissingXmlFieldError("cpf_ausente", message);
  }
}

function validatePeriod(period: string | undefined, message: string): asserts period is string {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    throw new MissingXmlFieldError("periodo_ausente", message);
  }
}

function extractTextFromObjectWithKey(root: unknown, objectKey: string, valueKey: string): string | undefined {
  const target = findObjectWithKey(root, objectKey);
  if (!isRecord(target)) {
    return undefined;
  }

  const value = target[valueKey];
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number") {
    return String(value);
  }
  return undefined;
}

function extractTextsFromObjectsWithKey(root: unknown, objectKey: string, valueKey: string): string[] {
  return findObjectsWithKey(root, objectKey)
    .flatMap((target) => (Array.isArray(target) ? target : [target]))
    .filter(isRecord)
    .map((target) => target[valueKey])
    .map(textOf)
    .filter((value): value is string => value !== undefined);
}

function textOf(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number") {
    return String(value);
  }
  return undefined;
}

function findObjectWithKey(value: unknown, key: string): unknown {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findObjectWithKey(item, key);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  if (key in value) {
    return value[key];
  }

  for (const child of Object.values(value)) {
    const found = findObjectWithKey(child, key);
    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

function findObjectsWithKey(value: unknown, key: string): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => findObjectsWithKey(item, key));
  }

  if (!isRecord(value)) {
    return [];
  }

  const matches = key in value ? [value[key]] : [];
  return [...matches, ...Object.values(value).flatMap((child) => findObjectsWithKey(child, key))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
