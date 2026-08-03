import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { getConfig, getStoragePaths } from "../config";
import {
  addAudit,
  getContentV2,
  getSubmissionById,
  updateSubmission,
  upsertDocument,
  upsertMasterIndex,
} from "../db/repository";
import { generateContentV2 } from "../agents/writer";
import { inspectContentV2 } from "../agents/inspector";
import { suggestDocuments } from "../agents/doc-selector";
import { allocateCodes, fileNameFor } from "../services/numbering";
import {
  buildDocuments,
  transcribeVideo,
} from "../services/powershell";
import { extractAndInsertPrints } from "../services/prints";
import { moveToValidationFolder } from "../services/publish";
import { exportMasterIndexFiles } from "../services/master-index-file";
import type { DocType } from "../types/status";
import { contentV2Schema } from "../types/content-v2";

function safeName(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, "-").trim() || "sem-nome";
}

/** Normaliza status do whisper/scripts para o enum content-v2. */
export function normalizeTranscriptionStatus(raw: string | null | undefined): string {
  const s = String(raw ?? "").toLowerCase().trim();
  if (["concluida", "fornecida", "inconclusiva", "sem_audio", "falhou", "nao_executada"].includes(s)) {
    return s;
  }
  if (["success", "ok", "done", "completed", "complete"].includes(s)) return "concluida";
  if (["failed", "error", "erro"].includes(s)) return "falhou";
  if (["no_audio", "no-audio", "silent"].includes(s)) return "sem_audio";
  if (["pending", "partial"].includes(s)) return "inconclusiva";
  return raw?.trim() ? "fornecida" : "nao_executada";
}

async function ensureEntrada(submissionId: string): Promise<string> {
  const sub = getSubmissionById(submissionId)!;
  const { entrada } = getStoragePaths();
  const dir = join(entrada, safeName(sub.setor), safeName(sub.atividade), submissionId);
  mkdirSync(dir, { recursive: true });
  const videoDest = join(dir, sub.videoOriginalName || "video.mp4");
  if (!existsSync(videoDest)) {
    copyFileSync(sub.videoPath, videoDest);
  }
  updateSubmission(submissionId, { entradaPath: dir });
  return dir;
}

export async function processSubmission(
  submissionId: string,
  mode: "full" | "adjust" = "full",
): Promise<void> {
  const sub = getSubmissionById(submissionId);
  if (!sub) throw new Error(`Submission ${submissionId} não encontrada`);

  const { work, outputs } = getStoragePaths();
  const workDir = join(work, submissionId);
  const outputDir = join(outputs, submissionId);
  mkdirSync(workDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });

  try {
    updateSubmission(submissionId, {
      status: "em_processamento",
      errorMessage: null,
      outputDir,
    });
    addAudit({
      id: crypto.randomUUID(),
      submissionId,
      action: mode === "adjust" ? "reprocessamento_ajuste" : "processamento_iniciado",
      actor: "sistema",
    });

    await ensureEntrada(submissionId);

    // --- Transcription ---
    let transcription = sub.transcription ?? "";
    let transcriptionStatus = sub.transcriptionStatus ?? "nao_executada";

    // Reusa transcrição existente (ex.: reprocessamento após falha no Office/LLM)
    if (!transcription.trim()) {
      updateSubmission(submissionId, { status: "transcrevendo" });
      const transcriptPath = join(workDir, "transcript.txt");
      const resultJson = join(workDir, "transcript-result.json");
      const skipHeavy =
        getConfig().SKIP_OFFICE && getConfig().LLM_PROVIDER === "mock";

      if (skipHeavy) {
        transcription =
          `Piloto/mock — ${sub.atividade}.\n` +
          `Sistema: ${sub.sistema}. Setor: ${sub.setor}.\n` +
          `Responsável: ${sub.responsavel}. Frequência: ${sub.frequencia}.\n` +
          `Passos: acessar o sistema, abrir a solicitação, preencher campos, definir responsável e finalizar.\n` +
          (sub.observacoes ?? "");
        transcriptionStatus = "fornecida";
        writeFileSync(transcriptPath, transcription, "utf-8");
      } else if (existsSync(sub.videoPath)) {
        const tr = await transcribeVideo({
          videoPath: sub.videoPath,
          outputPath: transcriptPath,
          resultJson,
        });
        if (existsSync(transcriptPath)) {
          transcription = readFileSync(transcriptPath, "utf-8");
        }
        if (existsSync(resultJson)) {
          try {
            const meta = JSON.parse(readFileSync(resultJson, "utf-8")) as {
              status?: string;
            };
            transcriptionStatus = normalizeTranscriptionStatus(
              meta.status ?? (transcription ? "concluida" : "falhou"),
            );
            updateSubmission(submissionId, {
              transcriptionMetaJson: JSON.stringify(meta),
            });
          } catch {
            transcriptionStatus = transcription ? "concluida" : "falhou";
          }
        } else {
          transcriptionStatus =
            tr.exitCode === 0 && transcription ? "concluida" : "falhou";
        }
      } else {
        transcriptionStatus = "falhou";
        transcription = transcription || "(vídeo não encontrado)";
      }

      if (!transcription.trim()) {
        transcription =
          `Atividade: ${sub.atividade}\nSistema: ${sub.sistema}\nSetor: ${sub.setor}\n` +
          (sub.observacoes ?? "");
        transcriptionStatus =
          transcriptionStatus === "falhou" ? "inconclusiva" : transcriptionStatus;
      }

      transcriptionStatus = normalizeTranscriptionStatus(transcriptionStatus);
      updateSubmission(submissionId, {
        transcription,
        transcriptionStatus,
      });
    } else {
      transcriptionStatus = normalizeTranscriptionStatus(transcriptionStatus);
      updateSubmission(submissionId, { transcriptionStatus });
    }

    // --- Document selection + numbering ---
    updateSubmission(submissionId, { status: "estruturando" });
    const override = JSON.parse(sub.documentosSolicitados) as DocType[];
    const docs = await suggestDocuments({
      setor: sub.setor,
      atividade: sub.atividade,
      sistema: sub.sistema,
      observacoes: sub.observacoes,
      override,
    });

    const allocated = allocateCodes(sub.setor, docs, sub.updateOfCode);
    const previous = getContentV2(sub);

    let content = await generateContentV2({
      metadados: {
        setor: sub.setor,
        atividade: sub.atividade,
        responsavel: sub.responsavel,
        sistema: sub.sistema,
        frequencia: sub.frequencia,
        prazo: sub.prazo,
        observacoes: sub.observacoes,
      },
      transcription,
      transcriptionStatus,
      documentosSolicitados: docs,
      codes: {
        sectorCode: allocated.sectorCode,
        numero: allocated.numero,
        codigo_pop: allocated.codes.pop,
        codigo_it: allocated.codes.it,
        codigo_form: allocated.codes.form,
        codigo_mp: allocated.codes.mp,
      },
      adjustmentComment: mode === "adjust" ? sub.adjustmentComment : null,
      previousContent: mode === "adjust" ? previous : null,
    });

    // force codes / saida filenames
    content.documentos_solicitados = docs;
    content.documento.sigla_setor = allocated.sectorCode;
    content.documento.numero = allocated.numero;
    content.documento.setor = sub.setor;
    content.documento.titulo = sub.atividade.toUpperCase();
    content.documento.elaborador = sub.responsavel;
    content.documento.frequencia = sub.frequencia;
    if (allocated.codes.pop) {
      content.documento.codigo_pop = allocated.codes.pop;
      content.saida.arquivo_pop = fileNameFor(allocated.codes.pop, sub.atividade, "docx");
    }
    if (allocated.codes.it) {
      content.documento.codigo_it = allocated.codes.it;
      content.saida.arquivo_it = fileNameFor(allocated.codes.it, sub.atividade, "docx");
    }
    if (allocated.codes.form) {
      content.documento.codigo_form = allocated.codes.form;
      content.saida.arquivo_form = fileNameFor(allocated.codes.form, sub.atividade, "xlsx");
    }
    if (allocated.codes.mp) {
      content.documento.codigo_mp = allocated.codes.mp;
      content.saida.arquivo_mp = fileNameFor(allocated.codes.mp, sub.atividade, "xlsx");
    }
    content.transcricao = {
      ...content.transcricao,
      status: normalizeTranscriptionStatus(transcriptionStatus) as typeof content.transcricao.status,
      idioma: "pt",
    };

    content = contentV2Schema.parse(content);

    let attempt = (sub.attempt ?? 0) + 1;
    let validation = await inspectContentV2({
      transcription,
      content,
      metadados: {
        setor: sub.setor,
        atividade: sub.atividade,
        sistema: sub.sistema,
      },
    });

    const { MAX_RETRIES } = getConfig();
    while (!validation.approved && attempt < MAX_RETRIES) {
      content = await generateContentV2({
        metadados: {
          setor: sub.setor,
          atividade: sub.atividade,
          responsavel: sub.responsavel,
          sistema: sub.sistema,
          frequencia: sub.frequencia,
          prazo: sub.prazo,
          observacoes: sub.observacoes,
        },
        transcription,
        transcriptionStatus,
        documentosSolicitados: docs,
        codes: {
          sectorCode: allocated.sectorCode,
          numero: allocated.numero,
          codigo_pop: allocated.codes.pop,
          codigo_it: allocated.codes.it,
          codigo_form: allocated.codes.form,
          codigo_mp: allocated.codes.mp,
        },
        adjustmentComment: [
          sub.adjustmentComment,
          `Corrija: ${validation.issues.join("; ")}`,
          validation.hallucinations.length
            ? `Remova alucinações: ${validation.hallucinations.join("; ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
        previousContent: content,
      });
      content.documentos_solicitados = docs;
      content = contentV2Schema.parse(content);
      attempt += 1;
      validation = await inspectContentV2({
        transcription,
        content,
        metadados: {
          setor: sub.setor,
          atividade: sub.atividade,
          sistema: sub.sistema,
        },
      });
    }

    const contentPath = join(workDir, "content-v2.json");
    writeFileSync(contentPath, JSON.stringify(content, null, 2), "utf-8");
    updateSubmission(submissionId, {
      contentV2Json: JSON.stringify(content),
      validationFeedbackJson: JSON.stringify(validation),
      attempt,
    });

    // reserve codes in master as "em_validacao"
    for (const type of docs) {
      const code = allocated.codes[type];
      if (!code) continue;
      const number = allocated.numbers[type] ?? Number(allocated.numero);
      upsertMasterIndex({
        code,
        title: sub.atividade,
        docType: type,
        setor: sub.setor,
        sectorCode: allocated.sectorCode,
        number,
        version: "0.1",
        status: "em_validacao",
        responsible: sub.responsavel,
        submissionId,
      });
      upsertDocument({
        id: crypto.randomUUID(),
        submissionId,
        docType: type,
        code,
        title: sub.atividade,
        setor: sub.setor,
        version: "0.1",
        status: "em_validacao",
        responsible: sub.responsavel,
      });
    }
    exportMasterIndexFiles();

    // --- Build Office docs ---
    updateSubmission(submissionId, { status: "gerando_docs" });
    // Limpa saídas anteriores para evitar lock de Word/Excel em reprocessamento
    try {
      for (const name of existsSync(outputDir) ? readdirSync(outputDir) : []) {
        if (/\.(docx|xlsx|pdf|md)$/i.test(name)) {
          try {
            const { unlinkSync } = await import("node:fs");
            unlinkSync(join(outputDir, name));
          } catch {
            /* ignore lock transitório */
          }
        }
      }
    } catch {
      /* ignore */
    }
    if (getConfig().SKIP_OFFICE) {
      for (const type of docs) {
        const code = allocated.codes[type]!;
        const ext = type === "form" || type === "mp" ? "xlsx" : "docx";
        const name = fileNameFor(code, sub.atividade, ext);
        writeFileSync(
          join(outputDir, name),
          `SKIP_OFFICE placeholder — ${name}\nGerado a partir de content-v2.\n`,
          "utf-8",
        );
      }
      writeFileSync(
        join(outputDir, "content-v2.json"),
        JSON.stringify(content, null, 2),
        "utf-8",
      );
    } else {
      let build = await buildDocuments({
        contentJson: contentPath,
        outputDir,
      });
      if (build.exitCode !== 0) {
        const wordOnly = docs.filter((d) => d === "pop" || d === "it");
        if (wordOnly.length > 0 && docs.some((d) => d === "form" || d === "mp")) {
          console.warn(
            "[pipeline] Excel falhou; tentando somente Word (POP/IT)...",
            (build.stderr || build.stdout).slice(0, 200),
          );
          const fallback = {
            ...content,
            documentos_solicitados: wordOnly,
          };
          const fallbackPath = join(workDir, "content-v2-word-only.json");
          writeFileSync(fallbackPath, JSON.stringify(fallback, null, 2), "utf-8");
          build = await buildDocuments({
            contentJson: fallbackPath,
            outputDir,
          });
          if (build.exitCode === 0) {
            content.pontos_validacao = [
              ...(content.pontos_validacao ?? []),
              "Ponto para validação: FORM/MP não gerado (Excel COM indisponível); revisar checklist manualmente.",
            ];
          }
        }
      }
      if (build.exitCode !== 0) {
        throw new Error(
          `build_documents falhou: ${build.stderr || build.stdout}`,
        );
      }
      writeFileSync(
        join(outputDir, "content-v2.json"),
        JSON.stringify(content, null, 2),
        "utf-8",
      );
    }

    // --- Prints (Fase 2) ---
    const prints = await extractAndInsertPrints({
      submissionId,
      videoPath: sub.videoPath,
      transcription,
      content,
      outputDir,
    });
    updateSubmission(submissionId, {
      printsDir: prints.printsDir,
      printPlanJson: prints.printPlanJson,
      status: mode === "adjust" ? "documento_atualizado" : "documentacao_gerada",
    });

    await moveToValidationFolder(submissionId);
    updateSubmission(submissionId, { status: "em_validacao" });

    addAudit({
      id: crypto.randomUUID(),
      submissionId,
      action: "documentacao_pronta",
      actor: "sistema",
      details: `Arquivos: ${readdirSync(outputDir).join(", ")}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateSubmission(submissionId, { status: "erro", errorMessage: message });
    addAudit({
      id: crypto.randomUUID(),
      submissionId,
      action: "erro",
      actor: "sistema",
      details: message,
    });
    throw err;
  }
}
