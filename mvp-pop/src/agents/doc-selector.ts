import { z } from "zod";
import { callLlmJson, loadSkill } from "./base";
import type { DocType } from "../types/status";

const schema = z.object({
  documentos_solicitados: z.array(z.enum(["pop", "it", "form", "mp"])).min(1),
  motivo: z.string().optional(),
});

export async function suggestDocuments(input: {
  setor: string;
  atividade: string;
  sistema: string;
  observacoes?: string | null;
  override?: DocType[] | null;
}): Promise<DocType[]> {
  if (input.override && input.override.length > 0) {
    return input.override;
  }

  const system = loadSkill("doc-selector");
  const user = JSON.stringify(input, null, 2);
  try {
    const result = await callLlmJson(system, user, (data) => schema.parse(data));
    return result.documentos_solicitados;
  } catch {
    return ["it", "form"];
  }
}
