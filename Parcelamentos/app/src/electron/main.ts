import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { resolveUfs, runOrchestrator } from "../adapters/orchestrator.js";
import { detectUfFromSheet, inspectSheetPreview } from "../shared/input.js";
import { modelColumnsHint, writeUfTemplate } from "../shared/templates.js";
import type { RunRequest, UfCode, UfSelection } from "../shared/types.js";

let mainWindow: BrowserWindow | null = null;
let running = false;
let cancelRequested = false;
let lastReportPath = "";
let lastDownloadDir = "";

function getAppWorkDir(): string {
  return path.join(app.getPath("documents"), "Exatas", "Parcelamentos SEFAZ");
}

function getOutputDir(): string {
  return path.join(getAppWorkDir(), "output");
}

function getTempDir(): string {
  return path.join(getAppWorkDir(), "tmp");
}

function ensureAppDirs(): void {
  fs.mkdirSync(getOutputDir(), { recursive: true });
  fs.mkdirSync(getTempDir(), { recursive: true });
}

function sendLog(message: string): void {
  mainWindow?.webContents.send("automation:log", `${message}\n`);
}

function sendProgress(payload: unknown): void {
  mainWindow?.webContents.send("automation:progress", payload);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 820,
    minWidth: 880,
    minHeight: 680,
    title: "Parcelamentos SEFAZ",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function edgeInstalled(): boolean {
  const candidates = [
    process.env["PROGRAMFILES"],
    process.env["PROGRAMFILES(X86)"],
    process.env.LOCALAPPDATA,
  ]
    .filter(Boolean)
    .map((base) => path.join(String(base), "Microsoft", "Edge", "Application", "msedge.exe"));

  return candidates.some((candidate) => fs.existsSync(candidate));
}

ipcMain.handle("app:bootstrap", () => {
  ensureAppDirs();
  return {
    defaultDownloadDir: path.join(getAppWorkDir(), "downloads"),
    edgeOk: edgeInstalled(),
  };
});

ipcMain.handle("sheet:select", async () => {
  const options: Electron.OpenDialogOptions = {
    title: "Selecionar planilha",
    properties: ["openFile"],
    filters: [
      { name: "Planilhas", extensions: ["xlsx", "xls", "csv"] },
      { name: "Todos os arquivos", extensions: ["*"] },
    ],
  };
  const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
  return {
    canceled: result.canceled,
    filePath: result.filePaths[0] ?? "",
  };
});

ipcMain.handle("folder:select", async () => {
  const options: Electron.OpenDialogOptions = {
    title: "Selecionar pasta de downloads",
    properties: ["openDirectory", "createDirectory"],
    defaultPath: path.join(getAppWorkDir(), "downloads"),
  };
  const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
  return {
    canceled: result.canceled,
    folderPath: result.filePaths[0] ?? "",
  };
});

ipcMain.handle("sheet:inspect", (_event, payload: { filePath: string; uf: UfCode }) => {
  const filePath = payload.filePath.trim();
  if (!filePath || !fs.existsSync(filePath)) {
    return { ok: false, error: "Planilha nao encontrada." };
  }

  try {
    const detected = detectUfFromSheet(filePath);
    if (detected && detected !== payload.uf) {
      return {
        ok: false,
        error: `Esta planilha parece ser da SEFAZ-${detected}. Abra a aba ${detected} ou use o modelo correto.`,
      };
    }

    const preview = inspectSheetPreview(filePath, payload.uf);
    return { ok: true, ...preview, uf: payload.uf };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle("template:create", async (_event, payload: { uf: UfCode }) => {
  const modelsDir = path.join(getAppWorkDir(), "modelos");
  const filePath = path.join(modelsDir, `modelo-${payload.uf.toLowerCase()}.xlsx`);

  try {
    fs.mkdirSync(modelsDir, { recursive: true });
    await writeUfTemplate(payload.uf, filePath);
    shell.showItemInFolder(filePath);
    return { canceled: false, filePath };
  } catch (error) {
    return {
      canceled: false,
      filePath,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle("hint:columns", (_event, payload: { uf: UfCode }) => modelColumnsHint(payload.uf));

ipcMain.handle("downloads:open", async () => {
  const target = lastDownloadDir || path.join(getAppWorkDir(), "downloads");
  fs.mkdirSync(target, { recursive: true });
  const error = await shell.openPath(target);
  return { ok: !error, error };
});

ipcMain.handle("report:open", async () => {
  if (!lastReportPath || !fs.existsSync(lastReportPath)) {
    return { ok: false, error: "Nenhum relatorio disponivel ainda." };
  }

  const error = await shell.openPath(lastReportPath);
  return { ok: !error, error };
});

ipcMain.handle("automation:cancel", () => {
  cancelRequested = true;
  sendLog("Cancelamento solicitado. A execucao sera interrompida apos o item atual.");
  return { ok: true };
});

ipcMain.handle("automation:run", async (_event, payload: {
  uf: UfSelection;
  sheetPath?: string;
  downloadDir: string;
  headed: boolean;
}) => {
  if (running) {
    return { ok: false, error: "A automacao ja esta em execucao." };
  }

  if (!edgeInstalled()) {
    return {
      ok: false,
      error: "Microsoft Edge nao encontrado. Instale o Edge para executar as automacoes.",
    };
  }

  const downloadDir = payload.downloadDir.trim();
  if (!downloadDir) {
    return { ok: false, error: "Selecione a pasta onde os downloads serao salvos." };
  }

  let ufs: UfCode[];
  try {
    ufs = resolveUfs(payload.uf);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const request: RunRequest = {
    ufs,
    inputMode: "sheet",
    sheetPath: payload.sheetPath,
    downloadDir,
    headed: payload.headed,
  };

  running = true;
  cancelRequested = false;
  ensureAppDirs();
  sendLog("Iniciando download de parcelamentos...");
  sendProgress({ current: 0, total: 1, label: "Preparando..." });

  try {
    const result = await runOrchestrator({
      request,
      workDir: getAppWorkDir(),
      log: sendLog,
      shouldCancel: () => cancelRequested,
      onProgress: sendProgress,
    });

    lastReportPath = result.reportPath;
    lastDownloadDir = result.downloadDir;
    mainWindow?.webContents.send("automation:done", result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendLog(`Falha na automacao: ${message}`);
    const failure = { ok: false, error: message };
    mainWindow?.webContents.send("automation:done", failure);
    return failure;
  } finally {
    running = false;
    cancelRequested = false;
  }
});

app.whenReady().then(() => {
  ensureAppDirs();
  createWindow();

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
