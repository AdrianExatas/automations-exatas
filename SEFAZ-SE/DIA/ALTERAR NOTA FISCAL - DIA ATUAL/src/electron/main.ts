import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { messageOf } from "../errors";
import { runAlterarNotaFiscal } from "../runner";
import { clearCredentials, readCredentials, saveCredentials } from "./credentials-store";
import type { StartRunRequest } from "./ipc-types";
import { buildRunConfig } from "./request-builders";

let mainWindow: BrowserWindow | undefined;
let currentRun: AbortController | undefined;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 920,
    minHeight: 680,
    title: "Alterar Nota Fiscal - DIA Atual",
    backgroundColor: "#f4f6f8",
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
    outDir: path.join(app.getPath("downloads"), "SEFAZ-SE-DIA-ALTERAR-NOTA-ATUAL"),
    headless: false,
  }));

  ipcMain.handle("credentials:get", () => readCredentials(credentialsPath()));
  ipcMain.handle(
    "credentials:save",
    (_event, credentials: { user: string; certPath: string; certPassword: string }) =>
      saveCredentials(credentialsPath(), credentials),
  );
  ipcMain.handle("credentials:clear", () => clearCredentials(credentialsPath()));

  ipcMain.handle("dialog:selectSpreadsheet", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "Selecionar planilha",
      properties: ["openFile"],
      filters: [{ name: "Planilhas Excel", extensions: ["xlsx", "xls"] }],
    });
    return result.canceled ? undefined : result.filePaths[0];
  });

  ipcMain.handle("dialog:selectOutDir", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "Selecionar pasta de saida",
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

  ipcMain.handle("run:start", async (event, request: StartRunRequest) => {
    if (currentRun) {
      throw new Error("Ja existe uma execucao em andamento.");
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

      return await runAlterarNotaFiscal(config, {
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
