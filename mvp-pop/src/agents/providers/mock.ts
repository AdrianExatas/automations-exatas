import type { LlmProvider } from "./types";

/** Respostas JSON mínimas para smoke sem Ollama/Gemini. */
export class MockProvider implements LlmProvider {
  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const lower = `${systemPrompt}\n${userPrompt}`.toLowerCase();

    if (lower.includes("inspetor") || lower.includes("approved")) {
      return JSON.stringify({
        approved: true,
        issues: [],
        missingSteps: [],
        hallucinations: [],
      });
    }

    if (lower.includes("seletor de prints") || lower.includes("print-picker") || lower.includes("candidate_timestamps")) {
      return JSON.stringify({
        prints: [
          {
            etapa_id: "E01",
            timestamp_seconds: 5,
            rotulo: "Tela inicial",
            needs_pii_review: true,
          },
        ],
      });
    }

    if (
      lower.includes("seletor de documentos") ||
      (lower.includes("doc-selector") && !lower.includes("escritor"))
    ) {
      try {
        const parsed = JSON.parse(userPrompt) as { override?: string[] };
        if (parsed.override?.length) {
          return JSON.stringify({
            documentos_solicitados: parsed.override,
            motivo: "override",
          });
        }
      } catch {
        /* ignore */
      }
      return JSON.stringify({
        documentos_solicitados: ["it", "form"],
        motivo: "mock",
      });
    }

    // writer content-v2
    let meta: {
      metadados?: {
        atividade?: string;
        setor?: string;
        responsavel?: string;
        sistema?: string;
        frequencia?: string;
      };
      codes?: {
        sectorCode?: string;
        numero?: string;
        codigo_it?: string;
        codigo_form?: string;
        codigo_pop?: string;
        codigo_mp?: string;
      };
      documentos_solicitados?: string[];
      transcription?: string;
      transcription_status?: string;
      adjustment_comment?: string | null;
    } = {};
    try {
      meta = JSON.parse(userPrompt);
    } catch {
      /* ignore */
    }

    const atividade = meta.metadados?.atividade ?? "Atividade";
    const setor = meta.metadados?.setor ?? "Atendimento";
    const sistema = meta.metadados?.sistema ?? "Sistema";
    const sc = meta.codes?.sectorCode ?? "ATE";
    const num = meta.codes?.numero ?? "001";
    const docs = meta.documentos_solicitados ?? ["it", "form"];
    const codigoIt = meta.codes?.codigo_it ?? `IN.${sc}.${num}`;
    const codigoForm = meta.codes?.codigo_form ?? `FORM.${sc}.${num}`;
    const codigoPop = meta.codes?.codigo_pop ?? `PR.${sc}.${num}`;

    const transcriptLines = String(meta.transcription ?? "")
      .split(/\r?\n|[.!?]\s+/)
      .map((l) => l.replace(/^\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*/, "").trim())
      .filter((l) => l.length > 12)
      .slice(0, 8);

    const instrucoes =
      transcriptLines.length > 0
        ? transcriptLines
        : [
            `Acesse o ${sistema} com o perfil adequado.`,
            `Execute a atividade: ${atividade}.`,
            "Confira os dados e finalize o registro.",
          ];

    const etapas = instrucoes.map((texto, i) => {
      const id = `E${String(i + 1).padStart(2, "0")}`;
      return {
        id,
        o_que: texto.slice(0, 80),
        como: texto,
        setor,
        registro: sistema,
      };
    });

    const secoes = etapas.map((e, i) => ({
      id: e.id,
      etapa_id: e.id,
      titulo: `${i + 1}. ${e.o_que.toUpperCase()}`,
      caminho: `${sistema} > Menu > Tela`,
      instrucoes: [e.como],
      atencoes: i === 0 ? ["Confira o colaborador correto antes de salvar."] : [],
      campo_print: {
        incluir: true,
        id: e.id,
        rotulo: `Tela — ${e.o_que.slice(0, 40)}`,
        orientacao: "Capture a tela correspondente a esta etapa.",
        legenda: `Imagem ${i + 1} - ${e.o_que.slice(0, 40)}.`,
        obrigatorio: true,
      },
    }));

    const saida: Record<string, string> = {};
    if (docs.includes("it")) saida.arquivo_it = `${codigoIt} - ${atividade}.docx`;
    if (docs.includes("form")) saida.arquivo_form = `${codigoForm} - ${atividade}.xlsx`;
    if (docs.includes("pop")) saida.arquivo_pop = `${codigoPop} - ${atividade}.docx`;

    return JSON.stringify({
      schema_version: "2.0",
      documentos_solicitados: docs,
      saida,
      documento: {
        titulo: atividade.toUpperCase(),
        codigo_it: docs.includes("it") ? codigoIt : undefined,
        codigo_form: docs.includes("form") ? codigoForm : undefined,
        codigo_pop: docs.includes("pop") ? codigoPop : undefined,
        codigo_mp: meta.codes?.codigo_mp,
        sigla_setor: sc,
        numero: num,
        setor,
        emissao: new Date().toLocaleDateString("pt-BR"),
        revisao: new Date().toLocaleDateString("pt-BR"),
        versao: "00",
        elaborador: meta.metadados?.responsavel ?? "Responsavel",
        verificador: "Qualidade",
        aprovador: "Gestor",
        objetivo: `Executar ${atividade} no sistema ${sistema}.`,
        resultado_esperado: "Atividade concluída com evidência registrada.",
        frequencia: meta.metadados?.frequencia ?? "Sob demanda",
      },
      abreviaturas: [],
      documentacao_complementar: Object.values(saida).map((f) => f.replace(/\.(docx|xlsx)$/i, "")),
      pop: { etapas },
      it: { perfil_redacao: "passo_a_passo", secoes },
      form: {
        campos_contexto: [
          { id: "colaborador", rotulo: "Colaborador", valor_inicial: "" },
        ],
        prazo_dias: null,
        blocos: [
          {
            id: "B01",
            etapa_id: etapas[0]?.id ?? "E01",
            titulo: "CONFERENCIA",
            setor,
            itens: [
              {
                id: "C01",
                pergunta: `A atividade "${atividade}" foi concluída corretamente?`,
                resposta_conforme: "SIM",
              },
              {
                id: "C02",
                pergunta: "Os dados do colaborador foram conferidos?",
                resposta_conforme: "SIM",
              },
            ],
            campo_evidencia: true,
          },
        ],
        observacoes: [],
      },
      mp: { cadeia: {}, riscos: [] },
      revisoes: [
        {
          numero: "00",
          alteracao: meta.adjustment_comment
            ? `Ajuste: ${meta.adjustment_comment}`
            : "Emissão inicial (mock a partir da transcrição).",
        },
      ],
      pontos_validacao: [
        "Ponto para validação: revisar passos com o líder do setor.",
      ],
      transcricao: {
        status: meta.transcription_status ?? "fornecida",
        idioma: "pt",
        observacao: "Estruturado por MOCK_LLM a partir da transcrição.",
      },
    });
  }
}
