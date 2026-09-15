import fs from "node:fs";
import path from "node:path";
import type { ServiceRequestRow } from "@exatas/onvio-solicitacoes-servico";
import type { CheckpointState } from "./types";

export function checkpointKey(row: ServiceRequestRow, index: number): string {
  return `${index}|${row.codigo || ""}|${row.cnpj || ""}`;
}

export function readCheckpoint(filePath: string): CheckpointState | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as CheckpointState;
  } catch {
    return null;
  }
}

export function writeCheckpoint(filePath: string, state: CheckpointState): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
}

export function checkpointPathForSheet(userDataDir: string, planilhaPath: string): string {
  const stamp = path.basename(planilhaPath).replace(/[^a-zA-Z0-9._-]+/g, "_") || "lote";
  return path.join(userDataDir, "checkpoints", `${stamp}.json`);
}
