import { RegimeFiscal } from "./types";

const UF_BY_LOCALIDADE: Record<string, string> = {
  ACRE: "AC",
  ALAGOAS: "AL",
  AMAPA: "AP",
  AMAZONAS: "AM",
  BAHIA: "BA",
  CEARA: "CE",
  DISTRITO_FEDERAL: "DF",
  ESPIRITO_SANTO: "ES",
  GOIAS: "GO",
  MARANHAO: "MA",
  MATO_GROSSO: "MT",
  MATO_GROSSO_DO_SUL: "MS",
  MINAS_GERAIS: "MG",
  PARA: "PA",
  PARAIBA: "PB",
  PARANA: "PR",
  PERNAMBUCO: "PE",
  PIAUI: "PI",
  RIO_DE_JANEIRO: "RJ",
  RIO_GRANDE_DO_NORTE: "RN",
  RIO_GRANDE_DO_SUL: "RS",
  RONDONIA: "RO",
  RORAIMA: "RR",
  SANTA_CATARINA: "SC",
  SAO_PAULO: "SP",
  SERGIPE: "SE",
  TOCANTINS: "TO",
};

export function normalizarTexto(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function normalizarChave(value: unknown): string {
  return normalizarTexto(value).replace(/\s+/g, "");
}

export function normalizarCnpj(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function formatarRegime(regime: RegimeFiscal): string {
  if (regime === "simples_nacional") return "Simples Nacional";
  return "Fiscal Normal";
}

export function getPositiveIntegerEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Variavel ${name} invalida: use um inteiro positivo.`);
  }

  return Math.floor(parsed);
}

export function extrairUfDaTarefa(tarefa: string): string | undefined {
  const matches = [...tarefa.matchAll(/\(([^)]+)\)/g)];
  for (const match of matches) {
    const key = normalizarTexto(match[1]).replace(/\s+/g, "_");
    const direct = match[1].trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(direct)) return direct;
    if (UF_BY_LOCALIDADE[key]) return UF_BY_LOCALIDADE[key];
  }
  return undefined;
}

export function asArray<T>(data: unknown, docsKey = "docs"): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && docsKey in data) {
    const docs = (data as Record<string, unknown>)[docsKey];
    return Array.isArray(docs) ? (docs as T[]) : [];
  }
  return [];
}
