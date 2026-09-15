export function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function findColumn(
  columns: string[],
  keywords: string[],
  mode: "exact" | "contains" = "contains",
): string | undefined {
  const normalizedColumns = columns.map((column) => ({
    original: column,
    normalized: normalizeHeader(column),
  }));
  const normalizedKeywords = keywords.map(normalizeHeader);

  for (const keyword of normalizedKeywords) {
    const exactMatch = normalizedColumns.find((column) => column.normalized === keyword);
    if (exactMatch) return exactMatch.original;
  }

  if (mode === "contains") {
    for (const keyword of normalizedKeywords) {
      const partialMatch = normalizedColumns.find((column) => column.normalized.includes(keyword));
      if (partialMatch) return partialMatch.original;
    }
  }

  return undefined;
}

export function normalizeCodigo(value: unknown): string {
  if (value == null || value === "") return "";
  const asString = typeof value === "number" ? String(Math.floor(value)) : String(value).trim();
  return /^\d+$/.test(asString) ? String(parseInt(asString, 10)) : asString;
}

export function normalizeCnpj(value: unknown): string {
  if (value == null) return "";
  return String(value).replace(/\D/g, "");
}

export function normalizeComparableText(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}
