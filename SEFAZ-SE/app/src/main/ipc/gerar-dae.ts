import { type GerarDaeConfig, type Resultado, runGerarDaeBase } from "@sefaz/core";
import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";

type StartDaePayload = {
  user: string;
  password: string;
  modelDir: string;
  outDir: string;
  headless: boolean;
  referencia?: { ano: number; mes: number };
};

let running = false;
let abortController: AbortController | null = null;

function defaultOutDir(): string {
  return join(app.getPath("documents"), "SEFAZ-SE", "dae");
}

export function registerDaeHandlers(mainWindow: BrowserWindow | null): void {
  ipcMain.handle("dae:start", async (event, payload: StartDaePayload) => {
    if (running) throw new Error("Ja existe uma execucao em andamento.");

    if (!payload.user.trim()) throw new Error("Informe o login da SEFAZ.");
    if (!payload.password.trim()) throw new Error("Informe a senha da SEFAZ.");
    if (!payload.modelDir.trim()) throw new Error("Informe a pasta com os modelos de planilha.");

    running = true;
    abortController = new AbortController();

    const config: GerarDaeConfig = {
      user: payload.user.trim(),
      password: payload.password,
      headless: payload.headless,
      timeoutMs: 60_000,
      modelDir: payload.modelDir,
      outDir: payload.outDir || defaultOutDir(),
      referencia: payload.referencia,
      browserChannel: "chrome",
    };

    try {
      const resultados: Resultado[] = await runGerarDaeBase(config);

      for (const r of resultados) {
        event.sender.send("dae:progress", r);
      }

      return resultados;
    } finally {
      running = false;
      abortController = null;
    }
  });

  ipcMain.handle("dae:cancel", () => {
    abortController?.abort();
    running = false;
  });
}
