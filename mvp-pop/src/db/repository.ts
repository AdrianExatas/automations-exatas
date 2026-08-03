import { eq, desc, and, like, sql } from "drizzle-orm";
import { getDb } from "./client";
import {
  submissions,
  documents,
  documentVersions,
  masterIndex,
  auditLog,
  type Submission,
  type DocumentRow,
  type MasterIndexRow,
} from "./schema";
import type { SubmissionStatus, DocType } from "../types/status";
import type { ContentV2, ValidationResult } from "../types/content-v2";

function nowIso(): string {
  return new Date().toISOString();
}

export function createSubmission(input: {
  id: string;
  setor: string;
  atividade: string;
  responsavel: string;
  sistema: string;
  frequencia: string;
  prazo: string;
  observacoes?: string;
  videoPath: string;
  videoOriginalName: string;
  attachmentsJson?: string;
  documentosSolicitados: string;
  entradaPath?: string;
  updateOfCode?: string;
}): Submission {
  const db = getDb();
  const ts = nowIso();
  db.insert(submissions)
    .values({
      id: input.id,
      status: "recebido",
      setor: input.setor,
      atividade: input.atividade,
      responsavel: input.responsavel,
      sistema: input.sistema,
      frequencia: input.frequencia,
      prazo: input.prazo,
      observacoes: input.observacoes ?? null,
      videoPath: input.videoPath,
      videoOriginalName: input.videoOriginalName,
      attachmentsJson: input.attachmentsJson ?? "[]",
      documentosSolicitados: input.documentosSolicitados,
      entradaPath: input.entradaPath ?? null,
      updateOfCode: input.updateOfCode ?? null,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
  return getSubmissionById(input.id)!;
}

export function getSubmissionById(id: string): Submission | undefined {
  return getDb().select().from(submissions).where(eq(submissions.id, id)).get();
}

export function listSubmissions(limit = 200): Submission[] {
  return getDb()
    .select()
    .from(submissions)
    .orderBy(desc(submissions.createdAt))
    .limit(limit)
    .all();
}

export function updateSubmission(
  id: string,
  patch: Partial<{
    status: SubmissionStatus;
    entradaPath: string;
    transcription: string;
    transcriptionStatus: string;
    transcriptionMetaJson: string;
    contentV2Json: string;
    validationFeedbackJson: string;
    printPlanJson: string;
    printsDir: string;
    outputDir: string;
    attempt: number;
    adjustmentComment: string | null;
    errorMessage: string | null;
    approvedBy: string;
    approvedAt: string;
    publishedAt: string;
  }>,
): Submission | undefined {
  const existing = getSubmissionById(id);
  if (!existing) return undefined;
  getDb()
    .update(submissions)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(submissions.id, id))
    .run();
  return getSubmissionById(id);
}

export function getContentV2(sub: Submission): ContentV2 | null {
  if (!sub.contentV2Json) return null;
  return JSON.parse(sub.contentV2Json) as ContentV2;
}

export function getValidationFeedback(sub: Submission): ValidationResult | null {
  if (!sub.validationFeedbackJson) return null;
  return JSON.parse(sub.validationFeedbackJson) as ValidationResult;
}

export function upsertDocument(input: {
  id: string;
  submissionId: string;
  docType: DocType;
  code: string;
  title: string;
  setor: string;
  version: string;
  status: string;
  editablePath?: string;
  pdfPath?: string;
  reviewDate?: string;
  responsible: string;
}): DocumentRow {
  const db = getDb();
  const ts = nowIso();
  const existing = db
    .select()
    .from(documents)
    .where(and(eq(documents.code, input.code), eq(documents.submissionId, input.submissionId)))
    .get();

  if (existing) {
    db.update(documents)
      .set({
        title: input.title,
        version: input.version,
        status: input.status,
        editablePath: input.editablePath ?? existing.editablePath,
        pdfPath: input.pdfPath ?? existing.pdfPath,
        reviewDate: input.reviewDate ?? existing.reviewDate,
        responsible: input.responsible,
        updatedAt: ts,
      })
      .where(eq(documents.id, existing.id))
      .run();
    return db.select().from(documents).where(eq(documents.id, existing.id)).get()!;
  }

  db.insert(documents)
    .values({
      id: input.id,
      submissionId: input.submissionId,
      docType: input.docType,
      code: input.code,
      title: input.title,
      setor: input.setor,
      version: input.version,
      status: input.status,
      editablePath: input.editablePath ?? null,
      pdfPath: input.pdfPath ?? null,
      reviewDate: input.reviewDate ?? null,
      responsible: input.responsible,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
  return db.select().from(documents).where(eq(documents.id, input.id)).get()!;
}

export function listDocumentsBySubmission(submissionId: string): DocumentRow[] {
  return getDb()
    .select()
    .from(documents)
    .where(eq(documents.submissionId, submissionId))
    .all();
}

export function addDocumentVersion(input: {
  id: string;
  documentId: string;
  version: string;
  status: string;
  editablePath?: string;
  pdfPath?: string;
  contentSnapshotJson?: string;
  changeSummary?: string;
  createdBy?: string;
}) {
  getDb()
    .insert(documentVersions)
    .values({
      id: input.id,
      documentId: input.documentId,
      version: input.version,
      status: input.status,
      editablePath: input.editablePath ?? null,
      pdfPath: input.pdfPath ?? null,
      contentSnapshotJson: input.contentSnapshotJson ?? null,
      changeSummary: input.changeSummary ?? null,
      createdAt: nowIso(),
      createdBy: input.createdBy ?? null,
    })
    .run();
}

export function getMasterByCode(code: string): MasterIndexRow | undefined {
  return getDb().select().from(masterIndex).where(eq(masterIndex.code, code)).get();
}

export function listMasterIndex(): MasterIndexRow[] {
  return getDb().select().from(masterIndex).orderBy(desc(masterIndex.updatedAt)).all();
}

export function getNextDocumentNumber(
  sectorCode: string,
  docType: DocType,
): number {
  const prefix =
    docType === "pop"
      ? "PR"
      : docType === "it"
        ? "IN"
        : docType === "form"
          ? "FORM"
          : "MP";
  const pattern = `${prefix}.${sectorCode}.%`;
  const rows = getDb()
    .select()
    .from(masterIndex)
    .where(
      and(
        eq(masterIndex.sectorCode, sectorCode),
        eq(masterIndex.docType, docType),
        like(masterIndex.code, pattern),
      ),
    )
    .all();

  const max = rows.reduce((acc, row) => Math.max(acc, row.number), 0);
  return max + 1;
}

export function upsertMasterIndex(row: {
  code: string;
  title: string;
  docType: DocType;
  setor: string;
  sectorCode: string;
  number: number;
  version: string;
  status: string;
  responsible: string;
  reviewDate?: string;
  documentId?: string;
  submissionId?: string;
}): MasterIndexRow {
  const db = getDb();
  const existing = getMasterByCode(row.code);
  const ts = nowIso();
  if (existing) {
    db.update(masterIndex)
      .set({
        title: row.title,
        version: row.version,
        status: row.status,
        responsible: row.responsible,
        reviewDate: row.reviewDate ?? existing.reviewDate,
        documentId: row.documentId ?? existing.documentId,
        submissionId: row.submissionId ?? existing.submissionId,
        updatedAt: ts,
      })
      .where(eq(masterIndex.code, row.code))
      .run();
  } else {
    db.insert(masterIndex)
      .values({
        code: row.code,
        title: row.title,
        docType: row.docType,
        setor: row.setor,
        sectorCode: row.sectorCode,
        number: row.number,
        version: row.version,
        status: row.status,
        responsible: row.responsible,
        reviewDate: row.reviewDate ?? null,
        documentId: row.documentId ?? null,
        submissionId: row.submissionId ?? null,
        updatedAt: ts,
      })
      .run();
  }
  return getMasterByCode(row.code)!;
}

export function markMasterObsolete(code: string): void {
  const existing = getMasterByCode(code);
  if (!existing) return;
  getDb()
    .update(masterIndex)
    .set({ status: "obsoleto", updatedAt: nowIso() })
    .where(eq(masterIndex.code, code))
    .run();
}

export function addAudit(input: {
  id: string;
  submissionId?: string;
  documentId?: string;
  action: string;
  actor: string;
  details?: string;
}) {
  getDb()
    .insert(auditLog)
    .values({
      id: input.id,
      submissionId: input.submissionId ?? null,
      documentId: input.documentId ?? null,
      action: input.action,
      actor: input.actor,
      details: input.details ?? null,
      createdAt: nowIso(),
    })
    .run();
}

export function listAuditBySubmission(submissionId: string) {
  return getDb()
    .select()
    .from(auditLog)
    .where(eq(auditLog.submissionId, submissionId))
    .orderBy(desc(auditLog.createdAt))
    .all();
}

export function panelStats() {
  const db = getDb();
  const byStatus = db
    .select({
      status: submissions.status,
      count: sql<number>`count(*)`,
    })
    .from(submissions)
    .groupBy(submissions.status)
    .all();

  const bySetor = db
    .select({
      setor: submissions.setor,
      count: sql<number>`count(*)`,
    })
    .from(submissions)
    .groupBy(submissions.setor)
    .all();

  const master = listMasterIndex();
  const vigentes = master.filter((m) => m.status === "vigente");
  const proximosRevisao = vigentes
    .filter((m) => m.reviewDate)
    .sort((a, b) => (a.reviewDate! > b.reviewDate! ? 1 : -1))
    .slice(0, 20);

  return { byStatus, bySetor, masterTotal: master.length, vigentes: vigentes.length, proximosRevisao };
}
