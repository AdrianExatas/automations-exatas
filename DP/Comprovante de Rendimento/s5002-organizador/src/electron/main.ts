import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { messageOf } from "../errors";
import { runS5002Organizer } from "../organizer";
import type { StartRunRequest } from "./ipc-types";

let mainWindow: BrowserWindow | undefined;
let currentRun: AbortController | undefined;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 860,
    minHeight: 620,
    title: "Organizador S-5002 e S-2501",
    backgroundColor: "#f7f7f4",
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
    inputDir: "",
    outputDir: path.join(app.getPath("downloads"), "S5002-S2501-Organizado"),
  }));

  ipcMain.handle("dialog:selectInputDir", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "Selecionar pasta com ZIPs",
      properties: ["openDirectory"],
    });
    return result.canceled ? undefined : result.filePaths[0];
  });

  ipcMain.handle("dialog:selectOutputDir", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "Selecionar pasta de saida",
      properties: ["openDirectory", "createDirectory"],
    });
    return result.canceled ? undefined : result.filePaths[0];
  });

  ipcMain.handle("run:start", async (event, request: StartRunRequest) => {
    if (currentRun) {
      throw new Error("Ja existe uma execucao em andamento.");
    }

    currentRun = new AbortController();
    try {
      return await runS5002Organizer(
        {
          inputDir: request.inputDir,
          outputDir: request.outputDir,
        },
        {
          signal: currentRun.signal,
          onLog: (message) => event.sender.send("run:log", message),
          onProgress: (progress) => event.sender.send("run:progress", progress),
        },
      );
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
