import { loadSkill, callLlmJson } from "./base";
import {
  validationResultSchema,
  type PopDocument,
  type ValidationResult,
} from "../types/pop";

export async function validatePop(
  transcription: string,
  pop: PopDocument,
): Promise<ValidationResult> {
  const skill = loadSkill("inspector");

  const userPrompt = `Transcrição original:\n\n${transcription}\n\n---\n\nPOP gerado:\n\n${JSON.stringify(pop, null, 2)}\n\nValide o POP contra a transcrição e retorne o JSON de validação.`;

  return callLlmJson(skill, userPrompt, (data) =>
    validationResultSchema.parse(data),
  );
}
