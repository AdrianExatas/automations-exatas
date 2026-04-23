import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from "electron";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseCompetencia, previousMonthCompetencia } from "../dates";
import { messageOf } from "../errors";
import { runSefazDia } from "../runner";
import type { ReportFormat, RunConfig } from "../types";

type CredentialsFile = {
  user: string;
  encryptedPassword: string;
};

type StartRunRequest = {
  user: string;
  password: string;
  rememberCredentials: boolean;
  competencia: string;
  formats: ReportFormat[];
  outDir: string;
};

const DEFAULT_TIMEOUT_MS = 30_000;
let mainWindow: BrowserWindow | undefined;
let currentRun: AbortController | undefined;

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

  ipcMain.handle("credentials:get", () => readCredentials());
  ipcMain.handle("credentials:save", (_event, credentials: { user: string; password: string }) => saveCredentials(credentials));
  ipcMain.handle("credentials:clear", () => clearCredentials());

  ipcMain.handle("dialog:selectOutDir", async () => {
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

    const config = buildRunConfig(request);
    currentRun = new AbortController();

    try {
      if (request.rememberCredentials) {
        await saveCredentials({ user: request.user, password: request.password });
      } else {
        await clearCredentials();
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

  ipcMain.handle("shell:openPath", async (_event, targetPath: string) => {
    const result = await shell.openPath(targetPath);
    if (result) {
      throw new Error(result);
    }
  });
}

function buildRunConfig(request: StartRunRequest): RunConfig {
  const user = request.user.trim();
  const password = request.password;
  const formats = request.formats.filter((format) => format === "pdf" || format === "xls");
  const outDir = request.outDir.trim();

  if (!user) {
    throw new Error("Informe o login da SEFAZ.");
  }
  if (!password) {
    throw new Error("Informe a senha da SEFAZ.");
  }
  if (formats.length === 0) {
    throw new Error("Selecione pelo menos um formato.");
  }
  if (!outDir) {
    throw new Error("Selecione uma pasta de saida.");
  }

  return {
    user,
    password,
    competencia: parseCompetencia(request.competencia),
    formats,
    outDir,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

async function readCredentials(): Promise<{ user: string; password: string; remembered: boolean }> {
  try {
    const text = await readFile(credentialsPath(), "utf8");
    const data = JSON.parse(text) as CredentialsFile;
    const encrypted = Buffer.from(data.encryptedPassword, "base64");
    return {
      user: data.user,
      password: safeStorage.decryptString(encrypted),
      remembered: true,
    };
  } catch {
    return { user: "", password: "", remembered: false };
  }
}

async function saveCredentials(credentials: { user: string; password: string }): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("A criptografia local do Electron nao esta disponivel neste Windows.");
  }

  const file: CredentialsFile = {
    user: credentials.user.trim(),
    encryptedPassword: safeStorage.encryptString(credentials.password).toString("base64"),
  };
  await mkdir(path.dirname(credentialsPath()), { recursive: true });
  await writeFile(credentialsPath(), `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

async function clearCredentials(): Promise<void> {
  await rm(credentialsPath(), { force: true }).catch(() => undefined);
}

function credentialsPath(): string {
  return path.join(app.getPath("userData"), "credentials.json");
}
