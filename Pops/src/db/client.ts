import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";
import { getConfig } from "../config";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempt INTEGER NOT NULL DEFAULT 0,
  transcription TEXT NOT NULL,
  pop_content TEXT,
  validation_feedback TEXT,
  error_message TEXT,
  output_path TEXT,
  feedback_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS feedbacks (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  author_name TEXT NOT NULL,
  author_email TEXT,
  section TEXT NOT NULL,
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);
`;

export function getDb() {
  if (!dbInstance) {
    const { DATABASE_PATH } = getConfig();
    mkdirSync(dirname(DATABASE_PATH), { recursive: true });

    const sqlite = new Database(DATABASE_PATH);
    sqlite.exec(MIGRATION_SQL);

    dbInstance = drizzle(sqlite, { schema });
  }

  return dbInstance;
}

export function resetDbForTests() {
  dbInstance = null;
}
