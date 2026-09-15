import fs from "fs";
import path from "path";

import type { CompanyReference, TaskReference } from "./types";

export type ProcessingStage =
  | "completion_started"
  | "attachment_uploaded"
  | "task_completed"
  | "document_published"
  | "due_date_applied";

export interface ProcessedRecord {
  sha256: string;
  taskId: string;
  fileName?: string;
  stage: ProcessingStage;
  company?: CompanyReference;
  task?: TaskReference;
  attachmentId?: string;
  publicationCorrelationId?: string;
  portalDocumentId?: string;
  portalFolderId?: string;
  dueDate?: string;
  calendarShown?: boolean;
  lastError?: string;
  updatedAt: string;
}

interface StoreFile {
  version: 2;
  records: ProcessedRecord[];
}

export class ProcessedDocumentStore {
  constructor(private readonly filePath: string) {}

  has(sha256: string, taskId?: string): boolean {
    return this.read().records.some((record) => record.sha256 === sha256 && (!taskId || record.taskId === taskId));
  }

  get(sha256: string, taskId?: string): ProcessedRecord | undefined {
    return this.read().records.find((record) => record.sha256 === sha256 && (!taskId || record.taskId === taskId));
  }

  add(record: ProcessedRecord): void {
    const data = this.read();
    const existing = data.records.find((item) => item.sha256 === record.sha256 && item.taskId === record.taskId);
    if (existing) {
      Object.assign(existing, record);
    } else {
      data.records.push(record);
    }
    this.write(data);
  }

  remove(sha256: string, taskId: string): boolean {
    const data = this.read();
    const records = data.records.filter((record) => record.sha256 !== sha256 || record.taskId !== taskId);
    if (records.length === data.records.length) return false;
    this.write({ version: 2, records });
    return true;
  }

  private write(data: StoreFile): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }

  private read(): StoreFile {
    if (!fs.existsSync(this.filePath)) return { version: 2, records: [] };
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8")) as Partial<StoreFile> & { version?: number };
      const records = Array.isArray(parsed.records) ? parsed.records.map((record) => {
        const legacy = record as ProcessedRecord & { completedAt?: string };
        return {
          ...legacy,
          stage: legacy.stage || (legacy.portalDocumentId ? "document_published" : "task_completed"),
          updatedAt: legacy.updatedAt || legacy.completedAt || new Date(0).toISOString(),
        } as ProcessedRecord;
      }) : [];
      return { version: 2, records };
    } catch {
      return { version: 2, records: [] };
    }
  }
}
