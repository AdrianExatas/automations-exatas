export function normalizeEtiqueta(value: string): string {
  const digits = onlyDigits(value);
  const normalized = digits.replace(/^0+/, "");
  return normalized || digits;
}

export function normalizeIcms(value: string): string {
  const compact = value
    .replace(/\s+/g, "")
    .replace(/[R$]/gi, "");
  const cleaned = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact;
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) {
    return cleaned;
  }

  return numeric.toFixed(2);
}

export function normalizeRecolhimento(value: string): string {
  return value.replace(/\s+/g, " ").trim().toUpperCase();
}

export function matchesNotaFiscal(
  actual: { etiqueta: string; icms: string; recolhimento: string },
  expected: { etiqueta: string; icms: string; recolhimento: string },
): boolean {
  return normalizeEtiqueta(actual.etiqueta) === normalizeEtiqueta(expected.etiqueta)
    && normalizeIcms(actual.icms) === normalizeIcms(expected.icms)
    && normalizeRecolhimento(actual.recolhimento) === normalizeRecolhimento(expected.recolhimento);
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}
