import { z } from "zod";

export const transcriptionStatusSchema = z.enum([
  "concluida",
  "fornecida",
  "inconclusiva",
  "sem_audio",
  "falhou",
  "nao_executada",
]);

export const contentV2Schema = z
  .object({
    schema_version: z.literal("2.0"),
    documentos_solicitados: z.array(z.enum(["pop", "it", "form", "mp"])).min(1),
    saida: z.record(z.string()).default({}),
    documento: z.object({
      titulo: z.string(),
      codigo_pop: z.string().optional(),
      codigo_it: z.string().optional(),
      codigo_form: z.string().optional(),
      codigo_mp: z.string().optional(),
      sigla_setor: z.string(),
      numero: z.string(),
      setor: z.string(),
      emissao: z.string().optional(),
      revisao: z.string().optional(),
      versao: z.string().optional(),
      elaborador: z.string().optional(),
      verificador: z.string().optional(),
      aprovador: z.string().optional(),
      objetivo: z.string().optional(),
      resultado_esperado: z.string().optional(),
      frequencia: z.string().optional(),
    }),
    abreviaturas: z.array(z.unknown()).default([]),
    documentacao_complementar: z.array(z.string()).default([]),
    pop: z
      .object({
        etapas: z.array(
          z.object({
            id: z.string(),
            o_que: z.string(),
            como: z.string(),
            setor: z.string(),
            registro: z.string(),
          }),
        ),
      })
      .default({ etapas: [] }),
    it: z
      .object({
        perfil_redacao: z.string().optional(),
        secoes: z.array(z.record(z.unknown())),
      })
      .default({ secoes: [] }),
    form: z
      .object({
        campos_contexto: z.array(z.unknown()).default([]),
        prazo_dias: z.number().nullable().optional(),
        blocos: z.array(z.unknown()).default([]),
        observacoes: z.array(z.string()).default([]),
      })
      .default({ campos_contexto: [], blocos: [], observacoes: [] }),
    mp: z
      .object({
        cadeia: z.record(z.unknown()).default({}),
        riscos: z.array(z.unknown()).default([]),
      })
      .default({ cadeia: {}, riscos: [] }),
    revisoes: z.array(z.unknown()).default([]),
    pontos_validacao: z.array(z.string()).default([]),
    transcricao: z
      .object({
        status: transcriptionStatusSchema.default("nao_executada"),
        idioma: z.string().optional(),
        observacao: z.string().optional(),
      })
      .default({ status: "nao_executada" }),
  })
  .passthrough();

export type ContentV2 = z.infer<typeof contentV2Schema>;

export const validationResultSchema = z.object({
  approved: z.boolean(),
  issues: z.array(z.string()).default([]),
  missingSteps: z.array(z.string()).default([]),
  hallucinations: z.array(z.string()).default([]),
});

export type ValidationResult = z.infer<typeof validationResultSchema>;

export const printPlanSchema = z.object({
  prints: z.array(
    z.object({
      etapa_id: z.string(),
      timestamp_seconds: z.number().nonnegative(),
      rotulo: z.string(),
      needs_pii_review: z.boolean().default(true),
    }),
  ),
});

export type PrintPlan = z.infer<typeof printPlanSchema>;
