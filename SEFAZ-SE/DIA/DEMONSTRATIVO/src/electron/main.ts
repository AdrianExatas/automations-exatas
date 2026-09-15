import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { runAlterarNotaFiscal } from "../../../ALTERAR NOTA FISCAL - DIA ATUAL/src/runner";
import { previousMonthCompetencia } from "../dates";
import { messageOf } from "../errors";
import { runSefazDia } from "../runner";
import { runXmlDownload } from "../xml-downloads";
import { buildAlterarRunConfig } from "./alterar-request-builders";
import { clearCredentials, readCredentials, saveCredentials } from "./credentials-store";
import type { StartAlterarRunRequest, StartRunRequest, StartXmlDownloadRequest } from "./ipc-types";
import { buildRunConfig, buildXmlDownloadConfig } from "./request-builders";

let mainWindow: BrowserWindow | undefined;
let currentRun: AbortController | undefined;
let currentXmlDownload: AbortController | undefined;
let currentAlterarRun: AbortController | undefined;

function isBusy(): boolean {
  return Boolean(currentRun || currentXmlDownload || currentAlterarRun);
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 1080,
    minHeight: 700,
    title: "SEFAZ-SE DIA",
    backgroundColor: "#f6f4ef",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(app.getAppPath(), "dist", "electron", "preload.cjs"),
    },
  });

  await mainWindow.loadFile(path.join(app.getAppPath(), "dist", "electron", "index.html"));
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  await createWindow();
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function registerIpcHandlers(): void {
  ipcMain.handle("app:getDefaults", () => ({
    competencia: previousMonthCompetencia().value,
    outDir: path.join(app.getPath("downloads"), "SEFAZ-SE-DIA"),
    alterarOutDir: path.join(app.getPath("downloads"), "SEFAZ-SE-DIA-ALTERAR-NOTA-ATUAL"),
    headless: false,
  }));

  ipcMain.handle("credentials:get", () => readCredentials(credentialsPath()));
  ipcMain.handle(
    "credentials:save",
    (_event, credentials: { user: string; certPath: string; certPassword: string }) =>
      saveCredentials(credentialsPath(), credentials),
  );
  ipcMain.handle("credentials:clear", () => clearCredentials(credentialsPath()));

  ipcMain.handle("dialog:selectOutDir", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "Selecionar pasta de saída",
      properties: ["openDirectory", "createDirectory"],
    });
    return result.canceled ? undefined : result.filePaths[0];
  });

  ipcMain.handle("dialog:selectCert", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "Selecionar certificado digital A1",
      properties: ["openFile"],
      filters: [{ name: "Certificado PFX", extensions: ["pfx", "p12"] }],
    });
    return result.canceled ? undefined : result.filePaths[0];
  });

  ipcMain.handle("dialog:selectSpreadsheet", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "Selecionar planilha",
      properties: ["openFile"],
      filters: [{ name: "Planilha", extensions: ["xlsx", "xls", "xlsm"] }],
    });
    return result.canceled ? undefined : result.filePaths[0];
  });

  ipcMain.handle("run:start", async (event, request: StartRunRequest) => {
    if (isBusy()) {
      throw new Error("Já existe uma execução em andamento.");
    }

    const config = buildRunConfig(request);
    currentRun = new AbortController();

    try {
      if (request.rememberCredentials) {
        await saveCredentials(credentialsPath(), {
          user: request.user,
          certPath: request.certPath,
          certPassword: request.certPassword,
        });
      } else {
        await clearCredentials(credentialsPath());
      }

      const result = await runSefazDia(config, {
        signal: currentRun.signal,
        onLog: (message) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send("run:log", message);
          }
        },
        onProgress: (progress) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send("run:progress", progress);
          }
        },
      });
      return result;
    } catch (error) {
      const message = messageOf(error);
      if (!event.sender.isDestroyed()) {
        event.sender.send("run:log", message);
      }
      throw new Error(message);
    } finally {
      currentRun = undefined;
    }
  });

  ipcMain.handle("run:cancel", () => {
    currentRun?.abort();
  });

  ipcMain.handle("xml:start", async (event, request: StartXmlDownloadRequest) => {
    if (isBusy()) {
      throw new Error("Já existe uma execução em andamento.");
    }

    const config = buildXmlDownloadConfig(request);

    currentXmlDownload = new AbortController();
    try {
      return await runXmlDownload(config, {
        signal: currentXmlDownload.signal,
        onLog: (message) => event.sender.send("xml:log", message),
        onProgress: (progress) => event.sender.send("xml:progress", progress),
      });
    } catch (error) {
      event.sender.send("xml:log", messageOf(error));
      throw error;
    } finally {
      currentXmlDownload = undefined;
    }
  });

  ipcMain.handle("xml:cancel", () => {
    currentXmlDownload?.abort();
  });

  ipcMain.handle("alterar:run:start", async (event, request: StartAlterarRunRequest) => {
    if (isBusy()) {
      throw new Error("Já existe uma execução em andamento.");
    }

    const config = buildAlterarRunConfig(request);
    currentAlterarRun = new AbortController();

    try {
      if (request.rememberCredentials) {
        await saveCredentials(credentialsPath(), {
          user: request.user,
          certPath: request.certPath,
          certPassword: request.certPassword,
        });
      } else {
        await clearCredentials(credentialsPath());
      }

      const result = await runAlterarNotaFiscal(config, {
        signal: currentAlterarRun.signal,
        onLog: (message) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send("alterar:run:log", message);
          }
        },
        onProgress: (progress) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send("alterar:run:progress", progress);
          }
        },
      });
      return result;
    } catch (error) {
      const message = messageOf(error);
      if (!event.sender.isDestroyed()) {
        event.sender.send("alterar:run:log", message);
      }
      throw new Error(message);
    } finally {
      currentAlterarRun = undefined;
    }
  });

  ipcMain.handle("alterar:run:cancel", () => {
    currentAlterarRun?.abort();
  });

  ipcMain.handle("shell:openPath", async (_event, targetPath: string) => {
    const result = await shell.openPath(targetPath);
    if (result) {
      throw new Error(result);
    }
  });
}

function credentialsPath(): string {
  return path.join(app.getPath("userData"), "credentials.json");
}
