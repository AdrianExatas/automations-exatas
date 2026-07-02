import {
  type RunAlterarNotaFiscalConfig,
  type RunProgress,
  type RunResult,
  runAlterarNotaFiscal,
} from "@sefaz/core";
import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";

type StartAlterarNotaPayload = {
  user: string;
  password: string;
  spreadsheetPath: string;
  outDir: string;
  headless: boolean;
  dryRun: boolean;
};

let running = false;
let abortController: AbortController | null = null;

function defaultOutDir(): string {
  return join(app.getPath("documents"), "SEFAZ-SE", "alterar-nota");
}

export function registerAlterarNotaHandlers(mainWindow: BrowserWindow | null): void {
  ipcMain.handle("alterar-nota:start", async (event, payload: StartAlterarNotaPayload) => {
    if (running) throw new Error("Ja existe uma execucao em andamento.");

    if (!payload.user.trim()) throw new Error("Informe o login da SEFAZ.");
    if (!payload.password.trim()) throw new Error("Informe a senha da SEFAZ.");
    if (!payload.spreadsheetPath.trim()) throw new Error("Selecione a planilha de notas fiscais.");

    running = true;
    abortController = new AbortController();

    const config: RunAlterarNotaFiscalConfig = {
      user: payload.user.trim(),
      password: payload.password,
      spreadsheetPath: payload.spreadsheetPath,
      outDir: payload.outDir || defaultOutDir(),
      headless: payload.headless,
      dryRun: payload.dryRun,
      stepDelayMs: 0,
      timeoutMs: 60_000,
    };

    try {
      const result: RunResult = await runAlterarNotaFiscal(config, {
        signal: abortController.signal,
        onProgress: (progress: RunProgress) => {
          event.sender.send("alterar-nota:progress", progress);
        },
        onLog: (message: string) => {
          event.sender.send("alterar-nota:log", message);
        },
      });

      return result;
    } finally {
      running = false;
      abortController = null;
    }
  });

  ipcMain.handle("alterar-nota:cancel", () => {
    abortController?.abort();
    running = false;
  });
}
