import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { runAutomation } from "../automation.js";
import { readInputWorkbook, writeTemplateWorkbook } from "../workbook.js";

interface RunPayload {
  inputPath: string;
  headed: boolean;
}

let mainWindow: BrowserWindow | null = null;
let running = false;

function getAppWorkDir(): string {
  return path.join(app.getPath("documents"), "Exatas", "Parcelamentos SEFAZ-SE");
}

function getOutputDir(): string {
  return path.join(getAppWorkDir(), "output");
}

function ensureAppDirs(): void {
  fs.mkdirSync(getOutputDir(), { recursive: true });
}

function sendLog(message: string): void {
  mainWindow?.webContents.send("automation:log", `${message}\n`);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 860,
    minHeight: 620,
    title: "Parcelamentos SEFAZ-SE",
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

ipcMain.handle("sheet:select", async () => {
  const options: Electron.OpenDialogOptions = {
    title: "Selecionar planilha",
    properties: ["openFile"],
    filters: [
      { name: "Planilhas Excel", extensions: ["xlsx", "xls"] },
      { name: "Todos os arquivos", extensions: ["*"] },
    ],
  };
  const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);

  return {
    canceled: result.canceled,
    filePath: result.filePaths[0] ?? "",
  };
});

ipcMain.handle("sheet:inspect", (_event, payload: { filePath: string }) => {
  const filePath = payload.filePath.trim();

  if (!filePath || !fs.existsSync(filePath)) {
    return { ok: false, error: "Planilha nao encontrada." };
  }

  try {
    const rows = readInputWorkbook(filePath);
    return {
      ok: true,
      rowCount: rows.length,
      preview: rows.slice(0, 5).map((row) => ({
        rowNumber: row.rowNumber,
        codigo: row.codigo,
        empresa: row.empresa ?? "",
        cnpj: row.cnpj ?? "",
        inscricaoEstadual: row.inscricaoEstadual,
        saveDir: row.saveDir,
      })),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle("template:create", async () => {
  const defaultPath = path.join(getAppWorkDir(), "modelo-parcelamentos-sefaz-se.xlsx");
  const options: Electron.SaveDialogOptions = {
    title: "Salvar planilha modelo",
    defaultPath,
    filters: [{ name: "Planilha Excel", extensions: ["xlsx"] }],
  };
  const result = mainWindow ? await dialog.showSaveDialog(mainWindow, options) : await dialog.showSaveDialog(options);

  if (result.canceled || !result.filePath) {
    return { canceled: true, filePath: "" };
  }

  try {
    await writeTemplateWorkbook(result.filePath);
    return { canceled: false, filePath: result.filePath };
  } catch (error) {
    return {
      canceled: false,
      filePath: result.filePath,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle("reports:open", async () => {
  ensureAppDirs();
  const error = await shell.openPath(getOutputDir());
  return { ok: !error, error };
});

ipcMain.handle("automation:run", async (_event, payload: RunPayload) => {
  if (running) {
    return { ok: false, error: "A automacao ja esta em execucao." };
  }

  const inputPath = payload.inputPath.trim();
  if (!inputPath || !fs.existsSync(inputPath)) {
    return { ok: false, error: "Selecione uma planilha valida." };
  }

  running = true;
  ensureAppDirs();
  sendLog("Iniciando automacao...");

  try {
    const result = await runAutomation({
      inputPath,
      cwd: getAppWorkDir(),
      headed: payload.headed,
      browserChannel: "msedge",
      log: sendLog,
    });

    const ok = result.errorCount === 0;
    mainWindow?.webContents.send("automation:done", { ok, ...result });
    return { ok, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendLog(`Falha na automacao: ${message}`);
    mainWindow?.webContents.send("automation:done", { ok: false, error: message });
    return { ok: false, error: message };
  } finally {
    running = false;
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
