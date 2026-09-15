export function isNonRetriablePortalError(error: unknown): boolean {
  const message = messageOf(error).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (error instanceof Error && error.name === "PortalBusinessError") {
    return true;
  }
  return (
    message.includes("sem dados para gerar o relatorio") ||
    message.includes("referencia adiada") ||
    message.includes("nao existem dados") ||
    message.includes("nenhum registro")
  );
}

export function isSessionUnauthorizedError(error: unknown): boolean {
  const message = messageOf(error).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return (
    /\b401\b/.test(message) ||
    message.includes("unauthorized") ||
    message.includes("access is denied") ||
    message.includes("invalid credentials")
  );
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
