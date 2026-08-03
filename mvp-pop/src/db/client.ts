import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";
import { getConfig } from "../config";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqliteInstance: Database | null = null;

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'recebido',
  setor TEXT NOT NULL,
  atividade TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  sistema TEXT NOT NULL,
  frequencia TEXT NOT NULL,
  prazo TEXT NOT NULL,
  observacoes TEXT,
  video_path TEXT NOT NULL,
  video_original_name TEXT NOT NULL,
  attachments_json TEXT NOT NULL DEFAULT '[]',
  documentos_solicitados TEXT NOT NULL DEFAULT '["it","form"]',
  entrada_path TEXT,
  transcription TEXT,
  transcription_status TEXT,
  transcription_meta_json TEXT,
  content_v2_json TEXT,
  validation_feedback_json TEXT,
  print_plan_json TEXT,
  prints_dir TEXT,
  output_dir TEXT,
  attempt INTEGER NOT NULL DEFAULT 0,
  adjustment_comment TEXT,
  error_message TEXT,
  approved_by TEXT,
  approved_at TEXT,
  published_at TEXT,
  update_of_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id),
  doc_type TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  setor TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'rascunho',
  editable_path TEXT,
  pdf_path TEXT,
  review_date TEXT,
  responsible TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  version TEXT NOT NULL,
  status TEXT NOT NULL,
  editable_path TEXT,
  pdf_path TEXT,
  content_snapshot_json TEXT,
  change_summary TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS master_index (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  setor TEXT NOT NULL,
  sector_code TEXT NOT NULL,
  number INTEGER NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL,
  responsible TEXT NOT NULL,
  review_date TEXT,
  document_id TEXT,
  submission_id TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  submission_id TEXT,
  document_id TEXT,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_documents_code ON documents(code);
CREATE INDEX IF NOT EXISTS idx_master_sector ON master_index(sector_code, doc_type);
`;

export function getDb() {
  if (!dbInstance) {
    const { DATABASE_PATH } = getConfig();
    mkdirSync(dirname(DATABASE_PATH), { recursive: true });
    sqliteInstance = new Database(DATABASE_PATH);
    sqliteInstance.exec(MIGRATION_SQL);
    dbInstance = drizzle(sqliteInstance, { schema });
  }
  return dbInstance;
}

export function resetDbForTests() {
  try {
    sqliteInstance?.close();
  } catch {
    /* ignore */
  }
  sqliteInstance = null;
  dbInstance = null;
}
