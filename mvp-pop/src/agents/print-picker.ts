import { callLlmJson, loadSkill } from "./base";
import { printPlanSchema, type ContentV2, type PrintPlan } from "../types/content-v2";

export async function pickPrints(input: {
  transcription: string;
  content: ContentV2;
  candidateTimestamps: number[];
}): Promise<PrintPlan> {
  const system = loadSkill("print-picker");
  const user = JSON.stringify(
    {
      transcription: input.transcription,
      it_secoes: input.content.it?.secoes ?? [],
      candidate_timestamps_seconds: input.candidateTimestamps,
    },
    null,
    2,
  );
  return callLlmJson(system, user, (data) => printPlanSchema.parse(data));
}
