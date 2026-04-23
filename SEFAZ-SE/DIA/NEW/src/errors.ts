export function isNonRetriablePortalError(error: unknown): boolean {
  const message = messageOf(error).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return (
    message.includes("sem dados para gerar o relatorio") ||
    message.includes("referencia adiada") ||
    message.includes("nao existem dados") ||
    message.includes("nenhum registro")
  );
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
