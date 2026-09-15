export function normalizeCodigo(value: unknown): string {
  if (value == null || value === "") return "";
  const asString = typeof value === "number" ? String(Math.floor(value)) : String(value).trim();
  return /^\d+$/.test(asString) ? String(parseInt(asString, 10)) : asString;
}

export function normalizeForMatch(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
