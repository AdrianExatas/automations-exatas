import { app, BrowserWindow, dialog, ipcMain, safeStorage, type OpenDialogOptions } from "electron";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { AgapeNfseClient, defaultDownloadsDir } from "../agape";
import type { DownloadPeriodInput } from "../agape";

interface StoredCredentials {
  login: string;
  password: string;
}

interface DownloadRunInput {
  login: string;
  password: string;
  startDate: string;
  endDate: string;
  outputDir?: string;
  saveCredentials: boolean;
}

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 820,
    height: 640,
    minWidth: 720,
    minHeight: 560,
    title: "Agape NFS-e - Download XML",
    webPreferences: {
      preload: appAssetPath("build", "preload", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  await mainWindow.loadFile(appAssetPath("build", "renderer", "index.html"));
}

app.whenReady().then(async () => {
  registerIpc();
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function registerIpc() {
  ipcMain.handle("credentials:load", async () => {
    return loadCredentials();
  });

  ipcMain.handle("credentials:save", async (_event, credentials: StoredCredentials | null) => {
    if (!credentials) {
      await clearCredentials();
      return { saved: false };
    }
    await saveCredentials(credentials);
    return { saved: true };
  });

  ipcMain.handle("folder:select", async (_event, currentPath?: string) => {
    const owner = BrowserWindow.getFocusedWindow() ?? mainWindow;
    owner?.show();
    owner?.focus();
    const defaultPath = normalizeDialogPath(currentPath);
    await mkdir(defaultPath, { recursive: true });

    const options: OpenDialogOptions = {
      title: "Selecionar pasta de destino",
      defaultPath,
      properties: ["openDirectory", "createDirectory"],
    };
    const filePaths = dialog.showOpenDialogSync(options);
    if (!filePaths?.[0]) {
      return "";
    }
    return filePaths[0];
  });

  ipcMain.handle("download:run", async (event, input: DownloadRunInput) => {
    const outputDir = input.outputDir?.trim() || defaultDownloadsDir();
    const client = new AgapeNfseClient();
    const downloadInput: DownloadPeriodInput = {
      login: input.login,
      password: input.password,
      startDate: input.startDate,
      endDate: input.endDate,
      outputDir,
      onLog: (message) => event.sender.send("download:log", message),
    };

    if (input.saveCredentials) {
      await saveCredentials({ login: input.login, password: input.password });
    } else {
      await clearCredentials();
    }

    try {
      const result = await client.downloadPeriod(downloadInput);
      event.sender.send("download:done", result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      event.sender.send("download:done", { error: message, destino: outputDir });
      throw error;
    }
  });
}

async function loadCredentials(): Promise<StoredCredentials & { available: boolean; saved: boolean }> {
  if (!safeStorage.isEncryptionAvailable()) {
    return { login: "", password: "", available: false, saved: false };
  }

  try {
    const encrypted = await readFile(credentialsPath(), "utf8");
    const payload = safeStorage.decryptString(Buffer.from(encrypted, "base64"));
    const parsed = JSON.parse(payload) as StoredCredentials;
    return {
      login: parsed.login ?? "",
      password: parsed.password ?? "",
      available: true,
      saved: true,
    };
  } catch {
    return { login: "", password: "", available: true, saved: false };
  }
}

async function saveCredentials(credentials: StoredCredentials): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Armazenamento seguro indisponivel neste Windows.");
  }
  await mkdir(path.dirname(credentialsPath()), { recursive: true });
  const encrypted = safeStorage.encryptString(JSON.stringify(credentials)).toString("base64");
  await writeFile(credentialsPath(), encrypted, "utf8");
}

async function clearCredentials(): Promise<void> {
  await rm(credentialsPath(), { force: true });
}

function credentialsPath(): string {
  return path.join(app.getPath("userData"), "credentials.dat");
}

function appAssetPath(...segments: string[]): string {
  return path.join(app.getAppPath(), ...segments);
}

function normalizeDialogPath(currentPath?: string): string {
  const value = currentPath?.trim();
  if (value && path.isAbsolute(value)) {
    return value;
  }
  return defaultDownloadsDir();
}
