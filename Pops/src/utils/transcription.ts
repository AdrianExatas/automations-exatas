export function parseTranscriptionFile(
  filename: string,
  content: string,
): string {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".json")) {
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      if (typeof parsed.transcription === "string") {
        return parsed.transcription.trim();
      }
      if (typeof parsed.text === "string") {
        return parsed.text.trim();
      }
      if (typeof parsed.content === "string") {
        return parsed.content.trim();
      }
    } catch {
      throw new Error(`JSON inválido no arquivo ${filename}`);
    }
    throw new Error(
      `JSON em ${filename} deve conter campo "transcription", "text" ou "content"`,
    );
  }

  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error(`Arquivo ${filename} está vazio`);
  }
  return trimmed;
}

export function shouldRetryValidation(
  approved: boolean,
  attempt: number,
  maxRetries: number,
): boolean {
  return !approved && attempt < maxRetries;
}

export function formatValidationFeedback(result: {
  issues: string[];
  missingSteps: string[];
  hallucinations: string[];
}): string {
  const parts: string[] = [];
  if (result.issues.length) parts.push(`Problemas: ${result.issues.join("; ")}`);
  if (result.missingSteps.length)
    parts.push(`Etapas omitidas: ${result.missingSteps.join("; ")}`);
  if (result.hallucinations.length)
    parts.push(`Alucinações: ${result.hallucinations.join("; ")}`);
  return parts.join(" | ") || "Rejeitado pelo Inspetor";
}
