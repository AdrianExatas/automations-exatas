const DATE_PATTERN = /\b([0-3]?\d)[/.\-]([01]?\d)[/.\-](\d{4})\b/g;

export function normalizeBrazilianDate(day: string, month: string, year: string): string | undefined {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return undefined;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return undefined;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return Boolean(match && normalizeBrazilianDate(match[3], match[2], match[1]) === value);
}

export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function extractLabeledDueDates(text: string): string[] {
  const normalized = text.replace(/\r/g, "\n").replace(/[\t ]+/g, " ");
  const candidates = new Set<string>();
  const labels = /\b(?:(?:data\s+de\s+)?vencimento|pagar(?:\s+este\s+documento)?\s+at[eé])(?=\s|:|$)/gi;
  let label: RegExpExecArray | null;
  while ((label = labels.exec(normalized))) {
    const window = normalized.slice(label.index + label[0].length, label.index + label[0].length + 90);
    DATE_PATTERN.lastIndex = 0;
    const match = DATE_PATTERN.exec(window);
    if (!match) continue;
    const date = normalizeBrazilianDate(match[1], match[2], match[3]);
    if (date) candidates.add(date);
  }
  return [...candidates].sort();
}

export interface CompetenceCandidate {
  value: string;
  source: string;
}

const MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

const QUARTER_END_MONTH: Record<string, number> = { 1: 3, 2: 6, 3: 9, 4: 12 };
const NAMED_MONTH = /([a-záàâãéêíóôõúç]+)\s*[/\.\-]\s*(\d{4})/gi;
const APURATION_LABEL = /\bper[ií]odo\s+de\s+apura[cç][aã]o/gi;

function monthFromName(value: string): number | undefined {
  const key = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return MONTHS[key];
}

function competenceValue(year: string, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function uniqueCandidates(candidates: CompetenceCandidate[]): CompetenceCandidate[] {
  return candidates.filter((candidate, index) =>
    candidates.findIndex((item) => item.value === candidate.value && item.source === candidate.source) === index,
  );
}

export function extractCompetences(text: string): CompetenceCandidate[] {
  const candidates: CompetenceCandidate[] = [];
  const numeric = /\b(compet[eê]ncia|PA)\s*[:\-]?\s*(0?[1-9]|1[0-2])[/\.\-](\d{4})\b/gi;
  for (const match of text.matchAll(numeric)) {
    candidates.push({
      value: competenceValue(match[3], Number(match[2])),
      source: match[1].toLowerCase() === "pa" ? "PA" : "Competência",
    });
  }

  const quarter = /\bPA\s*[:\-]?\s*([1-4])[ºª°o]?\s*trimestre\s*[/\.\-]\s*(\d{4})\b/gi;
  for (const match of text.matchAll(quarter)) {
    const month = QUARTER_END_MONTH[match[1]];
    if (month) candidates.push({ value: competenceValue(match[2], month), source: "PA" });
  }

  const named = /\bper[ií]odo\s+de\s+apura[cç][aã]o\s*[:\-]?\s*([a-záàâãéêíóôõúç]+)\s*[/\.\-]\s*(\d{4})\b/gi;
  for (const match of text.matchAll(named)) {
    const month = monthFromName(match[1]);
    if (month) candidates.push({ value: competenceValue(match[2], month), source: "Período de Apuração" });
  }

  APURATION_LABEL.lastIndex = 0;
  let label: RegExpExecArray | null;
  while ((label = APURATION_LABEL.exec(text))) {
    const window = text.slice(label.index + label[0].length, label.index + label[0].length + 500);
    NAMED_MONTH.lastIndex = 0;
    for (const match of window.matchAll(NAMED_MONTH)) {
      const month = monthFromName(match[1]);
      if (month) candidates.push({ value: competenceValue(match[2], month), source: "Período de Apuração" });
    }
  }
  return uniqueCandidates(candidates);
}

export function extractFgtsTagCompetences(text: string): CompetenceCandidate[] {
  const candidates: CompetenceCandidate[] = [];
  const tag = /\bTag\s*(?:\r?\n|:)\s*\d{8}\s+(0[1-9]|1[0-2])\/(\d{4})\s+MENSAL\b/gi;
  for (const match of text.matchAll(tag)) {
    candidates.push({ value: `${match[2]}-${match[1]}`, source: "Tag FGTS Digital" });
  }
  return uniqueCandidates(candidates);
}

export function extractFgtsCompositionCompetences(text: string): CompetenceCandidate[] {
  const candidates: CompetenceCandidate[] = [];
  const composition = /\bcompet[eê]ncia[\s\S]{0,240}?(0[1-9]|1[0-2])\/(\d{4})/gi;
  for (const match of text.matchAll(composition)) {
    candidates.push({ value: `${match[2]}-${match[1]}`, source: "Composicao FGTS Digital" });
  }
  return uniqueCandidates(candidates);
}

export function extractCompetence(text: string): string | undefined {
  const values = [...new Set(extractCompetences(text).map((candidate) => candidate.value))];
  return values.length === 1 ? values[0] : undefined;
}
