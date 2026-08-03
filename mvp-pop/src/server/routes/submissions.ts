import { Elysia, t } from "elysia";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getStoragePaths } from "../../config";
import {
  addAudit,
  createSubmission,
  getSubmissionById,
  listDocumentsBySubmission,
  listSubmissions,
  updateSubmission,
  listAuditBySubmission,
} from "../../db/repository";
import { enqueueSubmission } from "../../workers/queue";
import type { DocType } from "../../types/status";

const DOC_TYPE_SET = new Set<string>(["pop", "it", "form", "mp"]);

function parseDocumentos(raw: unknown): DocType[] {
  const fallback: DocType[] = ["it", "form"];
  if (raw == null || raw === "") return fallback;

  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      list = Array.isArray(parsed) ? parsed : trimmed.split(/[,\s]+/);
    } catch {
      list = trimmed.split(/[,\s]+/);
    }
  } else {
    return fallback;
  }

  const docs = list
    .map((v) => String(v).trim().toLowerCase())
    .filter((v): v is DocType => DOC_TYPE_SET.has(v));
  return docs.length ? docs : fallback;
}

export const submissionsRoutes = new Elysia({ prefix: "/api/submissions" })
  .get("/", () => {
    return listSubmissions().map((s) => ({
      id: s.id,
      status: s.status,
      setor: s.setor,
      atividade: s.atividade,
      responsavel: s.responsavel,
      sistema: s.sistema,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      errorMessage: s.errorMessage,
    }));
  })
  .get("/:id", ({ params, set }) => {
    const sub = getSubmissionById(params.id);
    if (!sub) {
      set.status = 404;
      return { error: "Não encontrado" };
    }
    return {
      ...sub,
      documents: listDocumentsBySubmission(sub.id),
      audit: listAuditBySubmission(sub.id),
      contentV2: sub.contentV2Json ? JSON.parse(sub.contentV2Json) : null,
      validationFeedback: sub.validationFeedbackJson
        ? JSON.parse(sub.validationFeedbackJson)
        : null,
      printPlan: sub.printPlanJson ? JSON.parse(sub.printPlanJson) : null,
      documentosSolicitados: JSON.parse(sub.documentosSolicitados),
      attachments: JSON.parse(sub.attachmentsJson),
    };
  })
  .post(
    "/",
    async ({ body, set }) => {
      const video = body.video;
      if (!video || typeof video === "string" || typeof video.arrayBuffer !== "function") {
        set.status = 422;
        return { error: "Selecione o vídeo da execução antes de enviar." };
      }

      const id = crypto.randomUUID();
      const { uploads } = getStoragePaths();
      const uploadDir = join(uploads, id);
      mkdirSync(uploadDir, { recursive: true });

      const videoName = video.name || "video.mp4";
      const videoPath = join(uploadDir, videoName);
      const bytes = new Uint8Array(await video.arrayBuffer());
      writeFileSync(videoPath, bytes);

      const attachments: { name: string; path: string }[] = [];
      const extra = body.attachments;
      if (extra) {
        const list = Array.isArray(extra) ? extra : [extra];
        for (const file of list) {
          if (!file || typeof file === "string") continue;
          const name = file.name || "anexo";
          const path = join(uploadDir, name);
          writeFileSync(path, new Uint8Array(await file.arrayBuffer()));
          attachments.push({ name, path });
        }
      }

      const docs = parseDocumentos(body.documentos);

      createSubmission({
        id,
        setor: body.setor,
        atividade: body.atividade,
        responsavel: body.responsavel,
        sistema: body.sistema,
        frequencia: body.frequencia,
        prazo: body.prazo,
        observacoes: body.observacoes,
        videoPath,
        videoOriginalName: videoName,
        attachmentsJson: JSON.stringify(attachments),
        documentosSolicitados: JSON.stringify(docs),
        updateOfCode: body.updateOfCode || undefined,
      });

      addAudit({
        id: crypto.randomUUID(),
        submissionId: id,
        action: "recebido",
        actor: body.responsavel,
        details: `Vídeo ${videoName}`,
      });

      await enqueueSubmission(id, "full");
      set.status = 201;
      return { id, status: "recebido" };
    },
    {
      body: t.Object({
        setor: t.String(),
        atividade: t.String(),
        responsavel: t.String(),
        sistema: t.String(),
        frequencia: t.String(),
        prazo: t.String(),
        observacoes: t.Optional(t.String()),
        // Bun/Elysia pode promover JSON de FormData para array
        documentos: t.Optional(t.Union([t.String(), t.Array(t.String())])),
        updateOfCode: t.Optional(t.String()),
        video: t.File(),
        attachments: t.Optional(t.Any()),
      }),
    },
  )
  .post("/:id/reprocess", async ({ params, set }) => {
    const sub = getSubmissionById(params.id);
    if (!sub) {
      set.status = 404;
      return { error: "Não encontrado" };
    }
    updateSubmission(params.id, {
      status: "recebido",
      errorMessage: null,
    });
    addAudit({
      id: crypto.randomUUID(),
      submissionId: params.id,
      action: "reprocessamento",
      actor: "sistema",
      details: "Reprocessamento solicitado (reusa transcrição se existir)",
    });
    await enqueueSubmission(params.id, "full");
    return { id: params.id, status: "recebido" };
  })
  .post(
    "/:id/approve",
    async ({ params, body, set }) => {
      const sub = getSubmissionById(params.id);
      if (!sub) {
        set.status = 404;
        return { error: "Não encontrado" };
      }
      if (!["em_validacao", "documento_atualizado", "documentacao_gerada"].includes(sub.status)) {
        set.status = 400;
        return { error: `Status atual não permite aprovação: ${sub.status}` };
      }

      updateSubmission(params.id, { status: "aprovado" });
      addAudit({
        id: crypto.randomUUID(),
        submissionId: params.id,
        action: "aprovado",
        actor: body.approvedBy,
        details: body.comment,
      });

      const { publishSubmission } = await import("../../services/publish");
      await publishSubmission({
        submissionId: params.id,
        approvedBy: body.approvedBy,
        bumpMajor: body.bumpMajor,
      });

      return { id: params.id, status: "vigente" };
    },
    {
      body: t.Object({
        approvedBy: t.String(),
        comment: t.Optional(t.String()),
        bumpMajor: t.Optional(t.Boolean()),
      }),
    },
  )
  .post(
    "/:id/request-adjustment",
    async ({ params, body, set }) => {
      const sub = getSubmissionById(params.id);
      if (!sub) {
        set.status = 404;
        return { error: "Não encontrado" };
      }

      updateSubmission(params.id, {
        status: "ajuste_solicitado",
        adjustmentComment: body.comment,
      });
      addAudit({
        id: crypto.randomUUID(),
        submissionId: params.id,
        action: "ajuste_solicitado",
        actor: body.requestedBy,
        details: body.comment,
      });

      await enqueueSubmission(params.id, "adjust");
      return { id: params.id, status: "ajuste_solicitado" };
    },
    {
      body: t.Object({
        comment: t.String({ minLength: 3 }),
        requestedBy: t.String(),
      }),
    },
  );
