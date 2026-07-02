import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from "electron";
import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { criarPlanilhaPadrao } from "../planilha-padrao";
import { lerEstruturaPlanilha } from "../planilha-estrutura";

interface StoredCredentials {
  email?: string;
  encryptedPassword?: string;
}

interface RunAutomationPayload {
  email: string;
  password: string;
  saveCredentials: boolean;
  startWithoutCheckpoint: boolean;
  planilhaPath: string;
}

interface RunRollbackPayload {
  email: string;
  password: string;
  saveCredentials: boolean;
}

let mainWindow: BrowserWindow | null = null;
let runningProcess: ChildProcess | null = null;

function getProjectRoot(): string {
  return path.resolve(__dirname, "..", "..");
}

function getCredentialsPath(): string {
  return path.join(app.getPath("userData"), "credentials.json");
}

function readStoredCredentials(): StoredCredentials {
  const filePath = getCredentialsPath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as StoredCredentials;
  } catch {
    return {};
  }
}

function writeStoredCredentials(credentials: StoredCredentials): void {
  const filePath = getCredentialsPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(credentials, null, 2), "utf8");
}

function decryptPassword(encryptedPassword: string | undefined): string {
  if (!encryptedPassword || !safeStorage.isEncryptionAvailable()) return "";
  try {
    return safeStorage.decryptString(Buffer.from(encryptedPassword, "base64"));
  } catch {
    return "";
  }
}

function saveCredentials(email: string, password: string, savePassword: boolean): void {
  if (!savePassword) {
    writeStoredCredentials({ email });
    return;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    writeStoredCredentials({ email });
    return;
  }

  const encryptedPassword = safeStorage.encryptString(password).toString("base64");
  writeStoredCredentials({ email, encryptedPassword });
}

function sendLog(message: string): void {
  mainWindow?.webContents.send("automation:log", message);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 820,
    minHeight: 600,
    title: "Alterar Responsavel Gestta",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(getProjectRoot(), "src", "electron", "renderer.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("credentials:load", () => {
  const stored = readStoredCredentials();
  return {
    email: stored.email ?? "",
    password: decryptPassword(stored.encryptedPassword),
    canSavePassword: safeStorage.isEncryptionAvailable(),
    hasSavedPassword: Boolean(stored.encryptedPassword),
  };
});

ipcMain.handle("credentials:save", (_event, payload: { email: string; password: string; savePassword: boolean }) => {
  saveCredentials(payload.email.trim(), payload.password, payload.savePassword);
  return { ok: true };
});

ipcMain.handle("sheet:select", async () => {
  const options: Electron.OpenDialogOptions = {
    title: "Selecionar planilha",
    properties: ["openFile"],
    filters: [
      { name: "Planilhas Excel", extensions: ["xlsx", "xls"] },
      { name: "Todos os arquivos", extensions: ["*"] },
    ],
  };
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, options)
    : await dialog.showOpenDialog(options);

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
    return { ok: true, structure: lerEstruturaPlanilha(filePath) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle("template:download", async () => {
  const options: Electron.SaveDialogOptions = {
    title: "Baixar planilha padrao",
    defaultPath: "DP RESPONSAVEL - MODELO.xlsx",
    filters: [{ name: "Planilha Excel", extensions: ["xlsx"] }],
  };
  const result = mainWindow
    ? await dialog.showSaveDialog(mainWindow, options)
    : await dialog.showSaveDialog(options);

  if (result.canceled || !result.filePath) {
    return { canceled: true, filePath: "" };
  }

  criarPlanilhaPadrao(result.filePath);
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle("reports:open", async () => {
  const reportsDir = path.join(getProjectRoot(), "relatorios");
  fs.mkdirSync(reportsDir, { recursive: true });
  const error = await shell.openPath(reportsDir);
  return { ok: !error, error };
});

ipcMain.handle("rollback:run", async (_event, payload: RunRollbackPayload) => {
  if (runningProcess) {
    return { ok: false, error: "A automacao ja esta em execucao." };
  }

  const email = payload.email.trim();
  const password = payload.password;
  if (!email || !password) {
    return { ok: false, error: "Informe e-mail e senha." };
  }

  const projectRoot = getProjectRoot();
  const reportsDir = path.join(projectRoot, "relatorios");
  fs.mkdirSync(reportsDir, { recursive: true });
  const result = await (mainWindow
    ? dialog.showOpenDialog(mainWindow, {
        title: "Selecionar relatorio para reversao",
        defaultPath: reportsDir,
        properties: ["openFile"],
        filters: [{ name: "Relatorio JSON", extensions: ["json"] }],
      })
    : dialog.showOpenDialog({
        title: "Selecionar relatorio para reversao",
        defaultPath: reportsDir,
        properties: ["openFile"],
        filters: [{ name: "Relatorio JSON", extensions: ["json"] }],
      }));

  if (result.canceled || !result.filePaths[0]) {
    return { ok: false, canceled: true };
  }

  saveCredentials(email, password, payload.saveCredentials);

  const scriptPath = path.join(projectRoot, "dist", "index.js");
  const nodeCommand = process.platform === "win32" ? "node.exe" : "node";
  sendLog("Iniciando reversao...\n");
  const child = spawn(nodeCommand, [scriptPath, "--reverter", result.filePaths[0]], {
    cwd: projectRoot,
    env: {
      ...process.env,
      ONVIO_EMAIL: email,
      ONVIO_PASSWORD: password,
      GESTTA_FORCE_ARTIFACT_AUTH: "true",
      JWT_GESTTA: "",
      GESTTA_JWT_TOKEN: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  runningProcess = child;

  child.stdout?.on("data", (chunk) => sendLog(String(chunk)));
  child.stderr?.on("data", (chunk) => sendLog(String(chunk)));
  child.on("error", (error) => {
    sendLog(`Falha ao iniciar reversao: ${error.message}\n`);
    mainWindow?.webContents.send("automation:done", { ok: false, code: null });
    runningProcess = null;
  });
  child.on("close", (code) => {
    sendLog(`\nProcesso finalizado com codigo ${code ?? "N/A"}.\n`);
    mainWindow?.webContents.send("automation:done", { ok: code === 0, code });
    runningProcess = null;
  });

  return { ok: true };
});

ipcMain.handle("automation:run", async (_event, payload: RunAutomationPayload) => {
  if (runningProcess) {
    return { ok: false, error: "A automacao ja esta em execucao." };
  }

  const email = payload.email.trim();
  const password = payload.password;
  const planilhaPath = payload.planilhaPath.trim();

  if (!email || !password) {
    return { ok: false, error: "Informe e-mail e senha." };
  }
  if (!planilhaPath || !fs.existsSync(planilhaPath)) {
    return { ok: false, error: "Selecione uma planilha valida." };
  }

  saveCredentials(email, password, payload.saveCredentials);

  const projectRoot = getProjectRoot();
  const scriptPath = path.join(projectRoot, "dist", "index.js");
  const nodeCommand = process.platform === "win32" ? "node.exe" : "node";
  const automationArgs = payload.startWithoutCheckpoint
    ? [scriptPath, "--sem-checkpoint", planilhaPath]
    : [scriptPath, "--continuar", planilhaPath];

  sendLog("Iniciando automacao...\n");
  const child = spawn(nodeCommand, automationArgs, {
    cwd: projectRoot,
    env: {
      ...process.env,
      ONVIO_EMAIL: email,
      ONVIO_PASSWORD: password,
      GESTTA_FORCE_ARTIFACT_AUTH: "true",
      JWT_GESTTA: "",
      GESTTA_JWT_TOKEN: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  runningProcess = child;

  child.stdout?.on("data", (chunk) => sendLog(String(chunk)));
  child.stderr?.on("data", (chunk) => sendLog(String(chunk)));
  child.on("error", (error) => {
    sendLog(`Falha ao iniciar automacao: ${error.message}\n`);
    mainWindow?.webContents.send("automation:done", { ok: false, code: null });
    runningProcess = null;
  });
  child.on("close", (code) => {
    sendLog(`\nProcesso finalizado com codigo ${code ?? "N/A"}.\n`);
    mainWindow?.webContents.send("automation:done", { ok: code === 0, code });
    runningProcess = null;
  });

  return { ok: true };
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  if (runningProcess) {
    runningProcess.kill();
    runningProcess = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
