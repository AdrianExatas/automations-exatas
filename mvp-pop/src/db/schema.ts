import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("recebido"),
  setor: text("setor").notNull(),
  atividade: text("atividade").notNull(),
  responsavel: text("responsavel").notNull(),
  sistema: text("sistema").notNull(),
  frequencia: text("frequencia").notNull(),
  prazo: text("prazo").notNull(),
  observacoes: text("observacoes"),
  videoPath: text("video_path").notNull(),
  videoOriginalName: text("video_original_name").notNull(),
  attachmentsJson: text("attachments_json").notNull().default("[]"),
  documentosSolicitados: text("documentos_solicitados").notNull().default('["it","form"]'),
  entradaPath: text("entrada_path"),
  transcription: text("transcription"),
  transcriptionStatus: text("transcription_status"),
  transcriptionMetaJson: text("transcription_meta_json"),
  contentV2Json: text("content_v2_json"),
  validationFeedbackJson: text("validation_feedback_json"),
  printPlanJson: text("print_plan_json"),
  printsDir: text("prints_dir"),
  outputDir: text("output_dir"),
  attempt: integer("attempt").notNull().default(0),
  adjustmentComment: text("adjustment_comment"),
  errorMessage: text("error_message"),
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),
  publishedAt: text("published_at"),
  updateOfCode: text("update_of_code"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id")
    .notNull()
    .references(() => submissions.id),
  docType: text("doc_type").notNull(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  setor: text("setor").notNull(),
  version: text("version").notNull().default("1.0"),
  status: text("status").notNull().default("rascunho"),
  editablePath: text("editable_path"),
  pdfPath: text("pdf_path"),
  reviewDate: text("review_date"),
  responsible: text("responsible").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const documentVersions = sqliteTable("document_versions", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id),
  version: text("version").notNull(),
  status: text("status").notNull(),
  editablePath: text("editable_path"),
  pdfPath: text("pdf_path"),
  contentSnapshotJson: text("content_snapshot_json"),
  changeSummary: text("change_summary"),
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by"),
});

export const masterIndex = sqliteTable("master_index", {
  code: text("code").primaryKey(),
  title: text("title").notNull(),
  docType: text("doc_type").notNull(),
  setor: text("setor").notNull(),
  sectorCode: text("sector_code").notNull(),
  number: integer("number").notNull(),
  version: text("version").notNull(),
  status: text("status").notNull(),
  responsible: text("responsible").notNull(),
  reviewDate: text("review_date"),
  documentId: text("document_id"),
  submissionId: text("submission_id"),
  updatedAt: text("updated_at").notNull(),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id"),
  documentId: text("document_id"),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
  details: text("details"),
  createdAt: text("created_at").notNull(),
});

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type DocumentRow = typeof documents.$inferSelect;
export type MasterIndexRow = typeof masterIndex.$inferSelect;
export type AuditRow = typeof auditLog.$inferSelect;
