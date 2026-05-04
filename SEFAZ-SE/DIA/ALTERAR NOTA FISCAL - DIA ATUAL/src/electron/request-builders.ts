import path from "node:path";
import type { RunAlterarNotaFiscalConfig } from "../nf-types";
import type { StartRunRequest } from "./ipc-types";

export const DEFAULT_TIMEOUT_MS = 30_000;

export function buildRunConfig(request: StartRunRequest): RunAlterarNotaFiscalConfig {
  const user = request.user.trim();
  const password = request.password;
  const spreadsheetPath = request.spreadsheetPath.trim();
  const outDir = request.outDir.trim();

  if (!user) {
    throw new Error("Informe o login da SEFAZ.");
  }
  if (!password) {
    throw new Error("Informe a senha da SEFAZ.");
  }
  if (!spreadsheetPath) {
    throw new Error("Selecione a planilha.");
  }
  if (!outDir) {
    throw new Error("Selecione uma pasta de saida.");
  }

  return {
    user,
    password,
    spreadsheetPath: path.resolve(spreadsheetPath),
    outDir: path.resolve(outDir),
    headless: request.headless,
    dryRun: false,
    stepDelayMs: 0,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}
