import fs from "node:fs";
import path from "node:path";
import type { EmpresaBatchItem } from "./types";

export interface UploadCheckpointEntry {
  key: string;
  codigo: string;
  cnpj: string;
  nome: string;
  ticketId?: string;
  message?: string;
  updatedAt: string;
}

export interface UploadCheckpointData {
  processed: UploadCheckpointEntry[];
  failed: UploadCheckpointEntry[];
}

const DEFAULT_DATA: UploadCheckpointData = {
  processed: [],
  failed: [],
};

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeCode(value: string): string {
  return value.trim().replace(/^0+/, "") || value.trim();
}

function buildKey(row: Pick<EmpresaBatchItem, "codigo" | "cnpj">): string {
  return `${normalizeCode(row.codigo)}|${onlyDigits(row.cnpj)}`;
}

function buildEntry(
  row: EmpresaBatchItem,
  details: { ticketId?: string; message?: string } = {},
): UploadCheckpointEntry {
  return {
    key: buildKey(row),
    codigo: row.codigo,
    cnpj: row.cnpj,
    nome: row.nome,
    ticketId: details.ticketId,
    message: details.message,
    updatedAt: new Date().toISOString(),
  };
}

function removeByKey(entries: UploadCheckpointEntry[], key: string): UploadCheckpointEntry[] {
  return entries.filter((entry) => entry.key !== key);
}

export class UploadCheckpoint {
  constructor(private readonly checkpointPath: string) {}

  private data: UploadCheckpointData = {
    processed: [...DEFAULT_DATA.processed],
    failed: [...DEFAULT_DATA.failed],
  };

  get path(): string {
    return this.checkpointPath;
  }

  load(): void {
    if (!fs.existsSync(this.checkpointPath)) return;
    try {
      const raw = fs.readFileSync(this.checkpointPath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<UploadCheckpointData>;
      this.data = {
        processed: Array.isArray(parsed.processed) ? parsed.processed : [],
        failed: Array.isArray(parsed.failed) ? parsed.failed : [],
      };
    } catch {
      this.data = {
        processed: [...DEFAULT_DATA.processed],
        failed: [...DEFAULT_DATA.failed],
      };
    }
  }

  private save(): void {
    const dir = path.dirname(this.checkpointPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.checkpointPath, JSON.stringify(this.data, null, 2), "utf-8");
  }

  isProcessed(row: Pick<EmpresaBatchItem, "codigo" | "cnpj">): boolean {
    const key = buildKey(row);
    return this.data.processed.some((entry) => entry.key === key);
  }

  markSuccess(row: EmpresaBatchItem, ticketId?: string, message?: string): void {
    const key = buildKey(row);
    this.data.processed = [...removeByKey(this.data.processed, key), buildEntry(row, { ticketId, message })];
    this.data.failed = removeByKey(this.data.failed, key);
    this.save();
  }

  markFailed(row: EmpresaBatchItem, message?: string): void {
    const key = buildKey(row);
    this.data.failed = [...removeByKey(this.data.failed, key), buildEntry(row, { message })];
    this.save();
  }

  getStats(): { processed: number; failed: number } {
    return {
      processed: this.data.processed.length,
      failed: this.data.failed.length,
    };
  }
}
