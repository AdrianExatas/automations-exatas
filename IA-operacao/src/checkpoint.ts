import fs from "node:fs";
import path from "node:path";

export interface CheckpointData {
  processed: string[];
  no_notas: string[];
  not_found: string[];
  failed: string[];
}

const DEFAULT_DATA: CheckpointData = {
  processed: [],
  no_notas: [],
  not_found: [],
  failed: [],
};

export class Checkpoint {
  constructor(private readonly checkpointPath: string) {}

  private data: CheckpointData = { ...DEFAULT_DATA };

  load(): void {
    if (!fs.existsSync(this.checkpointPath)) return;
    try {
      const raw = fs.readFileSync(this.checkpointPath, "utf-8");
      this.data = { ...DEFAULT_DATA, ...JSON.parse(raw) };
    } catch {
      this.data = { ...DEFAULT_DATA };
    }
  }

  private save(): void {
    const dir = path.dirname(this.checkpointPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.checkpointPath, JSON.stringify(this.data, null, 2), "utf-8");
  }

  isProcessed(cnpj: string): boolean {
    return (
      this.data.processed.includes(cnpj) ||
      this.data.no_notas.includes(cnpj) ||
      this.data.not_found.includes(cnpj)
    );
  }

  markSuccess(cnpj: string): void {
    if (!this.data.processed.includes(cnpj)) this.data.processed.push(cnpj);
    this.data.failed = this.data.failed.filter((c) => c !== cnpj);
    this.save();
  }

  markNoNotas(cnpj: string): void {
    if (!this.data.no_notas.includes(cnpj)) this.data.no_notas.push(cnpj);
    this.data.failed = this.data.failed.filter((c) => c !== cnpj);
    this.save();
  }

  markNotFound(cnpj: string): void {
    if (!this.data.not_found.includes(cnpj)) this.data.not_found.push(cnpj);
    this.data.failed = this.data.failed.filter((c) => c !== cnpj);
    this.save();
  }

  markFailed(cnpj: string): void {
    if (!this.data.failed.includes(cnpj)) this.data.failed.push(cnpj);
    this.save();
  }

  getStats(): { processed: number; no_notas: number; not_found: number; failed: number } {
    return {
      processed: this.data.processed.length,
      no_notas: this.data.no_notas.length,
      not_found: this.data.not_found.length,
      failed: this.data.failed.length,
    };
  }

  clear(): void {
    this.data = { ...DEFAULT_DATA };
    if (fs.existsSync(this.checkpointPath)) fs.unlinkSync(this.checkpointPath);
  }
}
