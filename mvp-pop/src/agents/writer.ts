import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { callLlmJson, loadPadraoDocumental, loadSkill } from "./base";
import { contentV2Schema, type ContentV2 } from "../types/content-v2";
import type { DocType } from "../types/status";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadMinimalFixture(): string {
  try {
    return readFileSync(
      join(__dirname, "..", "..", "tests", "fixtures", "content-v2-minimal.json"),
      "utf-8",
    );
  } catch {
    return "{}";
  }
}

export async function generateContentV2(input: {
  metadados: {
    setor: string;
    atividade: string;
    responsavel: string;
    sistema: string;
    frequencia: string;
    prazo: string;
    observacoes?: string | null;
  };
  transcription: string;
  transcriptionStatus: string;
  documentosSolicitados: DocType[];
  codes: {
    sectorCode: string;
    numero: string;
    codigo_pop?: string;
    codigo_it?: string;
    codigo_form?: string;
    codigo_mp?: string;
  };
  adjustmentComment?: string | null;
  previousContent?: ContentV2 | null;
}): Promise<ContentV2> {
  const system = [
    loadSkill("writer"),
    "",
    "## Padrão documental",
    loadPadraoDocumental(),
    "",
    "## Exemplo mínimo válido",
    loadMinimalFixture(),
  ].join("\n");

  const user = JSON.stringify(
    {
      metadados: input.metadados,
      transcription_status: input.transcriptionStatus,
      transcription: input.transcription,
      documentos_solicitados: input.documentosSolicitados,
      codes: input.codes,
      adjustment_comment: input.adjustmentComment ?? null,
      previous_content: input.previousContent ?? null,
      instrucao:
        "Gere content-v2 completo usando os códigos fornecidos. Título baseado na atividade.",
    },
    null,
    2,
  );

  return callLlmJson(system, user, (data) => contentV2Schema.parse(data));
}
