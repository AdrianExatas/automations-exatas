import { XMLParser } from "fast-xml-parser";

export type S5002Metadata = {
  cpfBenef: string;
  perApur: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
});

export function isS5002XmlEntry(entryName: string): boolean {
  const normalized = entryName.replaceAll("\\", "/").toLowerCase();
  return normalized.endsWith(".xml") && normalized.includes("s-5002");
}

export function parseS5002Metadata(xml: string): S5002Metadata {
  const parsed = parser.parse(xml) as unknown;
  const cpfBenef = extractTextFromObjectWithKey(parsed, "ideTrabalhador", "cpfBenef");
  const perApur = extractTextFromObjectWithKey(parsed, "ideEvento", "perApur");

  if (!cpfBenef || !/^\d{11}$/.test(cpfBenef)) {
    throw new MissingXmlFieldError("cpf_ausente", "CPF do beneficiario nao encontrado no XML.");
  }

  if (!perApur || !/^\d{4}-\d{2}$/.test(perApur)) {
    throw new MissingXmlFieldError("periodo_ausente", "Periodo de apuracao nao encontrado no XML.");
  }

  return { cpfBenef, perApur };
}

export class MissingXmlFieldError extends Error {
  constructor(
    public readonly code: "cpf_ausente" | "periodo_ausente",
    message: string,
  ) {
    super(message);
    this.name = "MissingXmlFieldError";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
