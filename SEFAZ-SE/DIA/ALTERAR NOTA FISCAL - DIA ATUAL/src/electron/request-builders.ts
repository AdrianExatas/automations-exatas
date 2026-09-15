import path from "node:path";
import { resolveSefazAuthConfig } from "../../../shared/sefaz-auth";
import type { RunAlterarNotaFiscalConfig } from "../nf-types";
import type { StartRunRequest } from "./ipc-types";

export const DEFAULT_TIMEOUT_MS = 30_000;

export function buildRunConfig(request: StartRunRequest): RunAlterarNotaFiscalConfig {
  const user = request.user.trim();
  const certPath = request.certPath.trim();
  const spreadsheetPath = request.spreadsheetPath.trim();
  const outDir = request.outDir.trim();

  if (!user) {
    throw new Error("Informe o codigo do vinculo Contador.");
  }
  if (!certPath) {
    throw new Error("Selecione o certificado digital A1 (.pfx).");
  }
  if (!spreadsheetPath) {
    throw new Error("Selecione a planilha.");
  }
  if (!outDir) {
    throw new Error("Selecione uma pasta de saida.");
  }

  const auth = resolveSefazAuthConfig(process.env, {
    authMode: "certificate",
    certPath,
    certPassword: request.certPassword,
  });

  return {
    user,
    password: "",
    spreadsheetPath: path.resolve(spreadsheetPath),
    outDir: path.resolve(outDir),
    headless: request.headless,
    dryRun: false,
    stepDelayMs: 0,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    ...auth,
  };
}
