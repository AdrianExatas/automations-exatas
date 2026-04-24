import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { previousMonthCompetencia } from "../dates";
import { messageOf } from "../errors";
import { runSefazDia } from "../runner";
import { runXmlDownload } from "../xml-downloads";
import { clearCredentials, readCredentials, saveCredentials } from "./credentials-store";
import type { StartRunRequest, StartXmlDownloadRequest } from "./ipc-types";
import { buildRunConfig, buildXmlDownloadConfig } from "./request-builders";

let mainWindow: BrowserWindow | undefined;
let currentRun: AbortController | undefined;
let currentXmlDownload: AbortController | undefined;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 920,
    minHeight: 680,
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
  }));

  ipcMain.handle("credentials:get", () => readCredentials(credentialsPath()));
  ipcMain.handle("credentials:save", (_event, credentials: { user: string; password: string }) => saveCredentials(credentialsPath(), credentials));
  ipcMain.handle("credentials:clear", () => clearCredentials(credentialsPath()));

  ipcMain.handle("dialog:selectOutDir", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "Selecionar pasta de saida",
      properties: ["openDirectory", "createDirectory"],
    });
    return result.canceled ? undefined : result.filePaths[0];
  });

  ipcMain.handle("run:start", async (event, request: StartRunRequest) => {
    if (currentRun || currentXmlDownload) {
      throw new Error("Ja existe uma execucao em andamento.");
    }

    const config = buildRunConfig(request);
    currentRun = new AbortController();

    try {
      if (request.rememberCredentials) {
        await saveCredentials(credentialsPath(), { user: request.user, password: request.password });
      } else {
        await clearCredentials(credentialsPath());
      }

      return await runSefazDia(config, {
        signal: currentRun.signal,
        onLog: (message) => event.sender.send("run:log", message),
        onProgress: (progress) => event.sender.send("run:progress", progress),
      });
    } catch (error) {
      event.sender.send("run:log", messageOf(error));
      throw error;
    } finally {
      currentRun = undefined;
    }
  });

  ipcMain.handle("run:cancel", () => {
    currentRun?.abort();
  });

  ipcMain.handle("xml:start", async (event, request: StartXmlDownloadRequest) => {
    if (currentRun || currentXmlDownload) {
      throw new Error("Ja existe uma execucao em andamento.");
    }

    const config = buildXmlDownloadConfig(request);

    currentXmlDownload = new AbortController();
    try {
      return await runXmlDownload(
        config,
        {
          signal: currentXmlDownload.signal,
          onLog: (message) => event.sender.send("xml:log", message),
          onProgress: (progress) => event.sender.send("xml:progress", progress),
        },
      );
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
