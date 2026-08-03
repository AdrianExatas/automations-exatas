import { callLlmJson, loadSkill } from "./base";
import {
  validationResultSchema,
  type ContentV2,
  type ValidationResult,
} from "../types/content-v2";

export async function inspectContentV2(input: {
  transcription: string;
  content: ContentV2;
  metadados: Record<string, string>;
}): Promise<ValidationResult> {
  const system = loadSkill("inspector");
  const user = JSON.stringify(
    {
      metadados: input.metadados,
      transcription: input.transcription,
      content_v2: input.content,
    },
    null,
    2,
  );
  return callLlmJson(system, user, (data) => validationResultSchema.parse(data));
}
