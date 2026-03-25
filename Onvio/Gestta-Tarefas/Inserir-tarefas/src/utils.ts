export function normalizarTexto(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

export function normalizarNome(valor: string): string {
  return normalizarTexto(valor);
}

export function normalizarNomeTarefa(valor: string): string {
  return normalizarTexto(valor);
}

export function normalizarCnpj(valor: unknown): string {
  if (valor == null) return "";
  return String(valor).replace(/\D/g, "");
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
