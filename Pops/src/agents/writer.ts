import { loadSkill, callLlmJson } from "./base";
import { popDocumentSchema, type PopDocument } from "../types/pop";
import type { ValidationResult } from "../types/pop";

export async function generatePop(
  transcription: string,
  previousFeedback?: ValidationResult | null,
): Promise<PopDocument> {
  const skill = loadSkill("writer");

  let userPrompt = `Transcrição original:\n\n${transcription}\n\nGere o POP em JSON conforme a estrutura definida.`;

  if (previousFeedback && !previousFeedback.approved) {
    userPrompt += `\n\n--- FEEDBACK DO INSPETOR (corrija estes pontos) ---\n`;
    userPrompt += `Problemas: ${previousFeedback.issues.join("; ") || "N/A"}\n`;
    userPrompt += `Etapas omitidas: ${previousFeedback.missingSteps.join("; ") || "N/A"}\n`;
    userPrompt += `Alucinações: ${previousFeedback.hallucinations.join("; ") || "N/A"}\n`;
    userPrompt += `\nCorrija o POP mantendo fidelidade total à transcrição original.`;
  }

  return callLlmJson(skill, userPrompt, (data) => popDocumentSchema.parse(data));
}
