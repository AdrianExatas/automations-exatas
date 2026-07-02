import {
  parseCompetencia,
  previousMonthCompetencia,
  type ReportFormat,
  type RunConfig,
  type RunProgress,
  type RunResult,
  runSefazDia,
} from "@sefaz/core";
import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";

type StartDemonstrativoPayload = {
  user: string;
  password: string;
  competencia: string;
  formats: ReportFormat[];
  outDir: string;
};

let running = false;
let abortController: AbortController | null = null;

function defaultOutDir(): string {
  return join(app.getPath("documents"), "SEFAZ-SE", "demonstrativos");
}

export function registerDemonstrativoHandlers(mainWindow: BrowserWindow | null): void {
  ipcMain.handle("demonstrativo:start", async (event, payload: StartDemonstrativoPayload) => {
    if (running) throw new Error("Ja existe uma execucao em andamento.");

    if (!payload.user.trim()) throw new Error("Informe o login da SEFAZ.");
    if (!payload.password.trim()) throw new Error("Informe a senha da SEFAZ.");
    if (!payload.formats.length) throw new Error("Selecione ao menos um formato (PDF ou XLS).");

    running = true;
    abortController = new AbortController();

    const competencia = payload.competencia
      ? parseCompetencia(payload.competencia)
      : previousMonthCompetencia();

    const config: RunConfig = {
      user: payload.user.trim(),
      password: payload.password,
      competencia,
      formats: payload.formats,
      outDir: payload.outDir || defaultOutDir(),
      timeoutMs: 60_000,
    };

    try {
      const result: RunResult = await runSefazDia(config, {
        signal: abortController.signal,
        onProgress: (progress: RunProgress) => {
          event.sender.send("demonstrativo:progress", progress);
        },
        onLog: (message: string) => {
          event.sender.send("demonstrativo:log", message);
        },
      });

      return result;
    } finally {
      running = false;
      abortController = null;
    }
  });

  ipcMain.handle("demonstrativo:cancel", () => {
    abortController?.abort();
    running = false;
  });
}
