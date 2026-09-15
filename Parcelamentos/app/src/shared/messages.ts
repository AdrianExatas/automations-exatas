export function toFriendlyMessage(raw: string): string {
  const text = String(raw ?? "").trim();
  const lower = text.toLowerCase();

  if (!text) {
    return "Ocorreu um erro inesperado.";
  }

  if (
    lower.includes("senha") &&
    (lower.includes("invalid") || lower.includes("incorreta") || lower.includes("credencial"))
  ) {
    return "Senha invalida.";
  }

  if (lower.includes("credencial") || lower.includes("usuario") && lower.includes("invalid")) {
    return "Usuario ou senha invalidos.";
  }

  if (
    lower.includes("sem consolidacao") ||
    lower.includes("sem_consolidacao") ||
    lower.includes("sem parcelamento") ||
    lower.includes("nenhum parcelamento") ||
    lower.includes("nao ha parcelamento") ||
    lower.includes("não há parcelamento")
  ) {
    return "Sem parcelamentos ativos.";
  }

  if (
    lower.includes("timeout") ||
    lower.includes("net::") ||
    lower.includes("econn") ||
    lower.includes("navigation") ||
    lower.includes("instavel") ||
    lower.includes("instável") ||
    lower.includes("target closed") ||
    lower.includes("browser has been closed")
  ) {
    return "Site da SEFAZ instavel. Tente novamente em alguns minutos.";
  }

  if (lower.includes("inscricao") && (lower.includes("nao encontrada") || lower.includes("não encontrada"))) {
    return "Inscricao estadual nao encontrada.";
  }

  if (lower.includes("vazia") || lower.includes("obrigatoria") || lower.includes("obrigatória")) {
    return "Dados incompletos na planilha ou na lista colada.";
  }

  if (text.length > 180) {
    return `${text.slice(0, 177)}...`;
  }

  return text;
}

export function statusLabel(status: string): string {
  if (status === "sucesso") return "Sucesso";
  if (status === "ignorado") return "Ignorado";
  return "Falha";
}
