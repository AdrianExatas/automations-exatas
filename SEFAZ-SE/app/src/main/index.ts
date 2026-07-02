import { BrowserWindow, app, dialog, ipcMain, shell } from "electron";
import { join } from "node:path";
import { registerAgilHandlers } from "./ipc/agil";
import { registerAlterarNotaHandlers } from "./ipc/alterar-nota";
import { registerDaeHandlers } from "./ipc/gerar-dae";
import { registerDemonstrativoHandlers } from "./ipc/demonstrativo";
import { sefazStore } from "./store";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: "SEFAZ-SE",
    backgroundColor: "#0f172a",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, "../preload/index.js"),
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  registerIpcHandlers();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function registerIpcHandlers(): void {
  registerAgilHandlers(mainWindow);
  registerDaeHandlers(mainWindow);
  registerAlterarNotaHandlers(mainWindow);
  registerDemonstrativoHandlers(mainWindow);

  ipcMain.handle("store:load-sefaz-credentials", () => sefazStore.loadSefazCredentials());
  ipcMain.handle("store:save-sefaz-credentials", (_e, creds) =>
    sefazStore.saveSefazCredentials(creds),
  );
  ipcMain.handle("store:clear-sefaz-credentials", () => sefazStore.clearSefazCredentials());

  ipcMain.handle("store:load-agil-credentials", () => sefazStore.loadAgilCredentials());
  ipcMain.handle("store:save-agil-credentials", (_e, creds) =>
    sefazStore.saveAgilCredentials(creds),
  );
  ipcMain.handle("store:clear-agil-credentials", () => sefazStore.clearAgilCredentials());

  ipcMain.handle("dialog:open-file", async (_e, opts) => {
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, opts)
      : await dialog.showOpenDialog(opts);
    return result;
  });

  ipcMain.handle("dialog:open-directory", async () => {
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory"] })
      : await dialog.showOpenDialog({ properties: ["openDirectory"] });
    return result;
  });

  ipcMain.handle("dialog:save-file", async (_e, opts) => {
    const result = mainWindow
      ? await dialog.showSaveDialog(mainWindow, opts)
      : await dialog.showSaveDialog(opts);
    return result;
  });

  ipcMain.handle("shell:open-path", (_e, path: string) => shell.openPath(path));

  ipcMain.handle("app:get-version", () => app.getVersion());
}
